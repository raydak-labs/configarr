/**
 * Live Sonarr e2e: every configarr feature, against the Sonarr container only.
 *
 * One file per *arr, each with its own literal payloads - the YAML differs per app, and a
 * shared factory would hide that behind branches. Shared code stays in `helpers.ts`.
 */
import { randomUUID } from "node:crypto";

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, onTestFinished, test } from "vitest";
import { SonarrClient } from "../../src/clients/sonarr-client";
import { DownloadProtocol } from "../../src/__generated__/sonarr/data-contracts";
import type { IndexerResource as SonarrIndexerResource } from "../../src/__generated__/sonarr-v5/data-contracts";
import { StandardDelayProfileSync } from "../../src/delayProfiles/delayProfileBase";
import { InputConfigDelayProfileSchema } from "../../src/types/config.types";
import {
  E2E_ROOT_A,
  E2E_ROOT_B,
  arrConnection,
  cfAssignBlock,
  downloadClientConfigBlock,
  e2eCustomFormatDefinition,
  e2eMediaSettings,
  mediaConfig,
} from "./config";
import {
  MediaBaseline,
  assertDiffUpToDate,
  assertNoErrorLogs,
  assertPipelineSucceeded,
  blackholeFromSchema,
  cfReleaseTitleValue,
  cleanupMediaE2e,
  cleanupMediaIndexerFixtures,
  defaultDelayProfile,
  findNamed,
  nonE2eNames,
  preservedRootFolderPaths,
  restoreMediaBaseline,
  snapshotMediaBaseline,
  stripVolatile,
  syncConfig,
  teardown,
  waitUntil,
} from "./helpers";

const qualityProfile = (min_format_score = 0) => ({
  name: "e2e-qp",
  upgrade: { allowed: true, until_quality: "WEB 1080p", until_score: 100 },
  min_format_score,
  qualities: [{ name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] }],
});

const qualityDefinition = (min: number) => ({ qualities: [{ quality: "WEBDL-1080p", min, preferred: 50, max: 199.9 }] });

const delayDefault = (usenetDelay: number) => ({
  enableUsenet: true,
  enableTorrent: true,
  preferredProtocol: "usenet",
  usenetDelay,
  torrentDelay: 0,
  bypassIfHighestQuality: true,
  bypassIfAboveCustomFormatScore: false,
  minimumCustomFormatScore: 0,
});

const delayProfiles = (usenetDelay: number, additional: boolean) => ({
  default: delayDefault(usenetDelay),
  ...(additional ? { additional: [{ ...delayDefault(usenetDelay), order: 1, tags: ["e2e-delay"] }] } : {}),
});

const releaseProfileIndexerNames = ["e2e-release-indexer-1", "e2e-release-indexer-2"];

async function cleanupReleaseProfileIndexers(client: SonarrClient, baseUrl: string, apiKey: string): Promise<void> {
  if (!(await client.supportsReleaseProfileControls())) return;

  for (const indexer of await client.getIndexers()) {
    if (indexer.id != null && releaseProfileIndexerNames.includes(indexer.name ?? "")) {
      const response = await fetch(`${baseUrl}/api/v5/indexer/${indexer.id}`, {
        method: "DELETE",
        headers: { "X-Api-Key": apiKey },
      });
      if (!response.ok) {
        throw new Error(`Failed to delete test Sonarr indexer '${indexer.name}': HTTP ${response.status}`);
      }
    }
  }
}

async function createReleaseProfileIndexers(
  client: SonarrClient,
  baseUrl: string,
  apiKey: string,
): Promise<Array<{ id: number; name: string }>> {
  const schemaResponse = await fetch(`${baseUrl}/api/v5/indexer/schema`, {
    headers: { "X-Api-Key": apiKey },
  });
  if (!schemaResponse.ok) {
    throw new Error(`Failed to load Sonarr indexer schemas: HTTP ${schemaResponse.status}`);
  }
  const schemas: SonarrIndexerResource[] = await schemaResponse.json();
  const schema = schemas.find((candidate) => candidate.implementation === "Newznab");
  if (schema == null) {
    throw new Error("Sonarr does not expose the Newznab indexer schema required by the release-profile e2e test.");
  }

  const created: Array<{ id: number; name: string }> = [];
  try {
    for (const name of releaseProfileIndexerNames) {
      const payload: SonarrIndexerResource = {
        ...schema,
        id: 0,
        name,
        fields: schema.fields?.map((field) => ({
          ...field,
          value: field.name === "baseUrl" ? "http://127.0.0.1:1" : field.name === "apiKey" ? "e2e" : field.value,
        })),
        tags: [],
        enableRss: false,
        enableAutomaticSearch: false,
        enableInteractiveSearch: false,
      };
      const response = await fetch(`${baseUrl}/api/v5/indexer`, {
        method: "POST",
        headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`Failed to create test Sonarr indexer '${name}': HTTP ${response.status} ${await response.text()}`);
      }
      const indexer = (await client.getIndexers()).find((candidate) => candidate.name === name);
      if (indexer?.id == null) {
        throw new Error(`Sonarr did not return the created test indexer '${name}'.`);
      }
      created.push({ id: indexer.id, name });
    }
  } catch (error) {
    await cleanupReleaseProfileIndexers(client, baseUrl, apiKey);
    throw error;
  }

  return created;
}

describe("sonarr (live)", () => {
  const { baseUrl, apiKey } = arrConnection("SONARR");
  const client = new SonarrClient(baseUrl, apiKey);
  let baseline: MediaBaseline;

  beforeAll(async () => {
    await cleanupMediaIndexerFixtures(client, baseUrl, apiKey, (await client.supportsMediaManagementControls()) ? "v5" : "v3");
    await cleanupMediaE2e(client);
    await cleanupReleaseProfileIndexers(client, baseUrl, apiKey);
    baseline = await snapshotMediaBaseline(client);
  }, 180_000);

  afterAll(async () => {
    await teardown(
      () => restoreMediaBaseline(client, baseline),
      async () => cleanupMediaIndexerFixtures(client, baseUrl, apiKey, (await client.supportsMediaManagementControls()) ? "v5" : "v3"),
      () => cleanupMediaE2e(client),
      () => cleanupReleaseProfileIndexers(client, baseUrl, apiKey),
    );
  });

  test("host settings sync on Sonarr v5 and reject v4 before writes", async () => {
    const isV5 = await client.supportsMediaManagementControls();
    if (!isV5) {
      const before = await client.getUiConfig();
      const run = await syncConfig(mediaConfig("SONARR", { host_config: { oidcScopes: "openid" }, ui_config: { firstDayOfWeek: 6 } }));
      expect(run.result.exitCode).not.toBe(0);
      expect(run.result.stdout + run.result.stderr).toContain("host_config requires Radarr v7 or Sonarr v5");
      expect((await client.getUiConfig()).firstDayOfWeek).toBe(before.firstDayOfWeek);
      return;
    }
    let original = await client.getHostConfig();
    if (!original.allowedHosts) {
      await client.updateHostConfig(String(original.id), { ...original, allowedHosts: "localhost,127.0.0.1" });
      original = await client.getHostConfig();
    }
    const scopes = original.oidcScopes === "openid profile" ? "openid email" : "openid profile";
    try {
      const config = mediaConfig("SONARR", { host_config: { oidcScopes: scopes } });
      const first = await syncConfig(config);
      assertPipelineSucceeded(first.result, ["SONARR"]);
      expect((await client.getHostConfig()).oidcScopes).toBe(scopes);
      expect((await client.getHostConfig()).authenticationMethod).toBe(original.authenticationMethod);
      const second = await syncConfig(config, first.workspace);
      assertPipelineSucceeded(second.result, ["SONARR"]);
      assertDiffUpToDate(second.result, ["SONARR"]);
    } finally {
      await client.updateHostConfig(String(original.id), original);
    }
  });

  test("syncs host settings, metadata, and an import list in one run", async () => {
    if (!(await client.supportsMediaManagementControls())) return;
    const original = await client.getHostConfig();
    const metadata = (await client.getMetadata()).find((item) => item.implementation === "XbmcMetadata");
    if (!metadata?.id) throw new Error("Metadata provider is required");
    const profile = (await client.getQualityProfiles()).find((item) => item.name);
    if (!original.id || !profile?.name) throw new Error("Host settings and a quality profile are required");
    const name = `e2e-import-${randomUUID()}`;
    const scopes = original.oidcScopes === "openid profile" ? "openid email" : "openid profile";
    try {
      const config = mediaConfig("SONARR", {
        host_config: { oidcScopes: scopes },
        metadata: { data: [{ type: "XbmcMetadata", enable: !metadata.enable }] },
        root_folders: [E2E_ROOT_A, ...(await preservedRootFolderPaths(client))],
        import_lists: {
          data: [
            {
              name,
              type: "CustomImport",
              enable_auto: false,
              language: "English",
              quality_profile: profile.name,
              root_folder: E2E_ROOT_A,
              fields: { base_url: "http://127.0.0.1:1" },
            },
          ],
        },
      });
      const first = await syncConfig(config);
      assertPipelineSucceeded(first.result, ["SONARR"]);
      expect((await client.getHostConfig()).oidcScopes).toBe(scopes);
      expect((await client.getMetadata()).find((item) => item.id === metadata.id)?.enable).toBe(!metadata.enable);
      expect((await client.getImportLists()).some((item) => item.name === name)).toBe(true);
      const second = await syncConfig(config, first.workspace);
      assertPipelineSucceeded(second.result, ["SONARR"]);
      assertDiffUpToDate(second.result, ["SONARR"]);
    } finally {
      const list = (await client.getImportLists()).find((item) => item.name === name);
      if (list?.id != null) await client.deleteImportList(String(list.id));
      await client.updateMetadata(String(metadata.id), metadata);
      await client.updateHostConfig(String(original.id), original);
    }
  });

  test("dry-runs a Sonarr import list referencing a new root folder", async () => {
    const profile = (await client.getQualityProfiles()).find((item) => item.name);
    if (!profile?.name) throw new Error("A quality profile is required for the import-list fixture");
    const root = `/data/dry-run-${randomUUID()}`;
    const name = `e2e-import-${randomUUID()}`;
    const version = (await client.getSystemStatus()).version?.startsWith("5.") ? "v5" : "v3";
    const result = await syncConfig(
      mediaConfig("SONARR", {
        root_folders: [root, ...(await preservedRootFolderPaths(client))],
        import_lists: {
          data: [
            {
              name,
              type: "CustomImport",
              enable_auto: false,
              ...(version === "v5" ? { language: "English" } : {}),
              quality_profile: profile.name,
              root_folder: root,
              fields: { base_url: "http://127.0.0.1:1" },
            },
          ],
        },
      }),
      undefined,
      { dryRun: true },
    );
    assertPipelineSucceeded(result.result, ["SONARR"]);
    expect((await client.getImportLists()).some((item) => item.name === name)).toBe(false);
    expect((await client.getRootfolders()).some((folder) => folder.path === root)).toBe(false);
  });

  test("rejects an invalid Sonarr list before writing any import lists", async () => {
    const profile = (await client.getQualityProfiles()).find((item) => item.name);
    if (!profile?.name) throw new Error("A quality profile is required for the import-list fixture");
    const name = `e2e-import-${randomUUID()}`;
    const version = (await client.getSystemStatus()).version?.startsWith("5.") ? "v5" : "v3";
    const common = {
      type: "CustomImport",
      enable_auto: false,
      ...(version === "v5" ? { language: "English" } : {}),
      quality_profile: profile.name,
      root_folder: E2E_ROOT_A,
    };
    try {
      const result = await syncConfig(
        mediaConfig(
          "SONARR",
          {
            custom_formats: cfAssignBlock(),
            root_folders: [E2E_ROOT_A, ...(await preservedRootFolderPaths(client))],
            import_lists: {
              data: [
                { name, ...common, fields: { base_url: "http://127.0.0.1:1" } },
                { name: `${name}-invalid`, ...common, fields: { unknown_field: "invalid" } },
              ],
            },
          },
          { customFormatDefinitions: [e2eCustomFormatDefinition()] },
        ),
      );
      expect(result.result.exitCode).not.toBe(0);
      expect(result.result.stderr).toContain("unknown field");
      expect((await client.getImportLists()).some((item) => item.name === name)).toBe(false);
      expect(findNamed(await client.getCustomFormats(), "e2e-rt")).toBeUndefined();
    } finally {
      const list = (await client.getImportLists()).find((item) => item.name === name);
      if (list?.id != null) await client.deleteImportList(String(list.id));
    }
  });

  test("rejects an invalid Sonarr import-list language before creating tags or other resources", async () => {
    const profile = (await client.getQualityProfiles()).find((item) => item.name);
    if (!profile?.name) throw new Error("A quality profile is required for the import-list fixture");
    const name = `e2e-import-${randomUUID()}`;
    const tag = `e2e-import-tag-${randomUUID()}`;
    const version = (await client.getSystemStatus()).version?.startsWith("5.") ? "v5" : "v3";
    const common = {
      type: "CustomImport",
      enable_auto: false,
      quality_profile: profile.name,
      root_folder: E2E_ROOT_A,
      fields: { base_url: "http://127.0.0.1:1" },
    };
    try {
      const result = await syncConfig(
        mediaConfig(
          "SONARR",
          {
            root_folders: [E2E_ROOT_A, ...(await preservedRootFolderPaths(client))],
            custom_formats: cfAssignBlock(),
            import_lists: {
              data: [
                { name, ...common, ...(version === "v5" ? { language: "English" } : {}) },
                { name: `${name}-invalid`, ...common, language: "No Such Language", tags: [tag] },
              ],
            },
          },
          { customFormatDefinitions: [e2eCustomFormatDefinition()] },
        ),
      );
      expect(result.result.exitCode).not.toBe(0);
      expect(result.result.stderr).toContain(version === "v5" ? "language not found" : "language is only supported by Sonarr v5");
      expect(findNamed(await client.getCustomFormats(), "e2e-rt")).toBeUndefined();
      expect((await client.getTags()).some((item) => item.label === tag)).toBe(false);
      expect((await client.getImportLists()).some((item) => item.name === name || item.name === `${name}-invalid`)).toBe(false);
    } finally {
      for (const item of await client.getImportLists())
        if (item.id != null && (item.name === name || item.name === `${name}-invalid`)) await client.deleteImportList(String(item.id));
      const createdTag = (await client.getTags()).find((item) => item.label === tag);
      if (createdTag?.id != null) await client.deleteTag(String(createdTag.id));
    }
  });

  test("rejects unsupported or missing Sonarr import-list language before any writes", async () => {
    const profile = (await client.getQualityProfiles()).find((item) => item.name);
    if (!profile?.name) throw new Error("A quality profile is required for the import-list fixture");
    const name = `e2e-import-${randomUUID()}`;
    const tag = `e2e-import-tag-${randomUUID()}`;
    const version = (await client.getSystemStatus()).version?.startsWith("5.") ? "v5" : "v3";
    const config = mediaConfig(
      "SONARR",
      {
        custom_formats: cfAssignBlock(),
        root_folders: [E2E_ROOT_A, ...(await preservedRootFolderPaths(client))],
        import_lists: {
          data: [
            {
              name,
              type: "CustomImport",
              enable_auto: false,
              ...(version === "v3" ? { language: "English" } : {}),
              quality_profile: profile.name,
              root_folder: E2E_ROOT_A,
              tags: [tag],
              fields: { base_url: "http://127.0.0.1:1" },
            },
          ],
        },
      },
      { customFormatDefinitions: [e2eCustomFormatDefinition()] },
    );
    try {
      const result = await syncConfig(config);
      expect(result.result.exitCode).not.toBe(0);
      expect(result.result.stderr).toContain(version === "v5" ? "language is required" : "language is only supported by Sonarr v5");
      expect(findNamed(await client.getCustomFormats(), "e2e-rt")).toBeUndefined();
      expect((await client.getTags()).some((item) => item.label === tag)).toBe(false);
      expect((await client.getImportLists()).some((item) => item.name === name)).toBe(false);
    } finally {
      const list = (await client.getImportLists()).find((item) => item.name === name);
      if (list?.id != null) await client.deleteImportList(String(list.id));
      const createdTag = (await client.getTags()).find((item) => item.label === tag);
      if (createdTag?.id != null) await client.deleteTag(String(createdTag.id));
    }
  });

  test("creates an import list using a profile and root folder from the same run", async () => {
    const name = `e2e-import-${randomUUID()}`;
    const profileName = `e2e-qp-${randomUUID()}`;
    const version = (await client.getSystemStatus()).version?.startsWith("5.") ? "v5" : "v3";
    try {
      const result = await syncConfig(
        mediaConfig("SONARR", {
          root_folders: [E2E_ROOT_A, ...(await preservedRootFolderPaths(client))],
          quality_profiles: [{ ...qualityProfile(), name: profileName }],
          import_lists: {
            data: [
              {
                name,
                type: "CustomImport",
                enable_auto: false,
                ...(version === "v5" ? { language: "English" } : {}),
                quality_profile: profileName,
                root_folder: E2E_ROOT_A,
                fields: { base_url: "http://127.0.0.1:1" },
              },
            ],
          },
        }),
      );
      assertPipelineSucceeded(result.result, ["SONARR"]);
      const profile = (await client.getQualityProfiles()).find((item) => item.name === profileName);
      expect(profile?.id).toBeDefined();
      expect((await client.getImportLists()).find((item) => item.name === name)?.qualityProfileId).toBe(profile?.id);
    } finally {
      const list = (await client.getImportLists()).find((item) => item.name === name);
      if (list?.id != null) await client.deleteImportList(String(list.id));
      const profile = (await client.getQualityProfiles()).find((item) => item.name === profileName);
      if (profile?.id != null) await client.deleteQualityProfile(String(profile.id));
    }
  });

  test("creates and updates a schema-based import list", async () => {
    const name = `e2e-import-${randomUUID()}`;
    const tagName = `e2e-import-tag-${randomUUID()}`;
    const profile = (await client.getQualityProfiles()).find((item) => item.id != null && item.name);
    if (!profile?.name) throw new Error("A quality profile is required for the import-list fixture");
    const version = (await client.getSystemStatus()).version?.startsWith("5.") ? "v5" : "v3";
    const url = `${baseUrl}/api/${version}/importlist`;
    const headers = { "X-Api-Key": apiKey };
    const getLists = async (): Promise<
      Array<{ id?: number; name?: string; tags?: number[]; fields?: Array<{ name?: string; value?: unknown }> }>
    > => {
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`Failed to load import lists: ${response.status}`);
      return response.json();
    };
    try {
      const preserved = await preservedRootFolderPaths(client);
      const existingNames = nonE2eNames(await getLists());
      const config = (baseUrl: string) =>
        mediaConfig("SONARR", {
          root_folders: [E2E_ROOT_A, ...preserved],
          import_lists: {
            data: [
              {
                name,
                type: "CustomImport",
                enable_auto: false,
                ...(version === "v5" ? { language: "English" } : {}),
                quality_profile: profile.name,
                root_folder: E2E_ROOT_A,
                tags: [tagName],
                fields: { base_url: baseUrl },
              },
            ],
          },
        });
      const first = await syncConfig(config("http://127.0.0.1:1"));
      assertPipelineSucceeded(first.result, ["SONARR"]);
      expect(findNamed(await getLists(), name)?.fields?.find((field) => field.name === "baseUrl")?.value).toBe("http://127.0.0.1:1");
      const tag = (await client.getTags()).find((item) => item.label === tagName);
      expect(tag?.id).toBeDefined();
      expect(findNamed(await getLists(), name)?.tags).toContain(tag?.id);
      const second = await syncConfig(config("http://127.0.0.1:1"), first.workspace);
      assertPipelineSucceeded(second.result, ["SONARR"]);
      assertDiffUpToDate(second.result, ["SONARR"]);
      if (version === "v5") {
        const omitLanguage = await syncConfig(
          mediaConfig("SONARR", {
            root_folders: [E2E_ROOT_A, ...preserved],
            import_lists: {
              data: [
                {
                  name,
                  type: "CustomImport",
                  enable_auto: false,
                  quality_profile: profile.name,
                  root_folder: E2E_ROOT_A,
                  tags: [tagName],
                  fields: { base_url: "http://127.0.0.1:1" },
                },
              ],
            },
          }),
          first.workspace,
        );
        assertPipelineSucceeded(omitLanguage.result, ["SONARR"]);
        assertDiffUpToDate(omitLanguage.result, ["SONARR"]);
      }
      const changed = await syncConfig(config("http://127.0.0.1:2"), first.workspace);
      assertPipelineSucceeded(changed.result, ["SONARR"]);
      expect(findNamed(await getLists(), name)?.fields?.find((field) => field.name === "baseUrl")?.value).toBe("http://127.0.0.1:2");
      const removed = await syncConfig(
        mediaConfig("SONARR", { import_lists: { data: [], delete_unmanaged: { enabled: true, ignore: existingNames } } }),
        first.workspace,
      );
      assertPipelineSucceeded(removed.result, ["SONARR"]);
      expect(findNamed(await getLists(), name)).toBeUndefined();
    } finally {
      const list = findNamed(await getLists(), name);
      if (list?.id != null) await fetch(`${url}/${list.id}`, { method: "DELETE", headers });
      const tag = (await client.getTags()).find((item) => item.label === tagName);
      if (tag?.id != null) await client.deleteTag(String(tag.id));
    }
  });

  test("syncs metadata provider settings", async () => {
    const version = (await client.getSystemStatus()).version?.startsWith("5.") ? "v5" : "v3";
    const url = `${baseUrl}/api/${version}/metadata`;
    const headers = { "X-Api-Key": apiKey, "Content-Type": "application/json" };
    const read = async (): Promise<
      Array<{ id?: number; implementation?: string; enable?: boolean; fields?: Array<{ name?: string; value?: unknown }> }>
    > => {
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`Failed to load metadata: ${response.status}`);
      return response.json();
    };
    const providers = await read();
    const original = providers.find((item) => item.implementation === "XbmcMetadata");
    if (!original?.id) throw new Error("Metadata provider not available");
    const existing = original.fields?.find((field) => field.name === "seriesMetadata")?.value;
    if (typeof existing !== "boolean") throw new Error("Metadata field not available");
    const templates = mkdtempSync(join(tmpdir(), "configarr-metadata-"));
    writeFileSync(join(templates, "metadata.yml"), "metadata:\n  data:\n    - type: XbmcMetadata\n      enable: true\n");
    try {
      const config = mediaConfig("SONARR", {
        metadata: { data: [{ type: "XbmcMetadata", enable: true, fields: { series_metadata: !existing } }] },
      });
      const dryRun = await syncConfig(config, undefined, { dryRun: true });
      assertPipelineSucceeded(dryRun.result, ["SONARR"]);
      expect((await read()).find((item) => item.id === original.id)).toEqual(original);
      const invalid = await syncConfig(
        mediaConfig("SONARR", {
          metadata: {
            data: [
              { type: "XbmcMetadata", enable: true },
              { type: "missing-provider", enable: true },
            ],
          },
        }),
        dryRun.workspace,
      );
      expect(invalid.result.exitCode).not.toBe(0);
      expect((await read()).find((item) => item.id === original.id)).toEqual(original);
      const unknownField = await syncConfig(
        mediaConfig(
          "SONARR",
          { custom_formats: cfAssignBlock(), metadata: { data: [{ type: "XbmcMetadata", fields: { bad_field: true } }] } },
          { customFormatDefinitions: [e2eCustomFormatDefinition()] },
        ),
        dryRun.workspace,
      );
      expect(unknownField.result.exitCode).not.toBe(0);
      expect((await read()).find((item) => item.id === original.id)).toEqual(original);
      expect(findNamed(await client.getCustomFormats(), "e2e-rt")).toBeUndefined();
      const first = await syncConfig(config);
      assertPipelineSucceeded(first.result, ["SONARR"]);
      const current = (await read()).find((item) => item.id === original.id);
      expect(current?.enable).toBe(true);
      expect(current?.fields?.find((field) => field.name === "seriesMetadata")?.value).toBe(!existing);
      expect(current?.fields?.filter((field) => field.name !== "seriesMetadata")).toEqual(
        original.fields?.filter((field) => field.name !== "seriesMetadata"),
      );
      expect((await read()).filter((item) => item.id !== original.id)).toEqual(providers.filter((item) => item.id !== original.id));
      const second = await syncConfig(config, first.workspace);
      assertPipelineSucceeded(second.result, ["SONARR"]);
      assertDiffUpToDate(second.result, ["SONARR"]);
      const disabled = await syncConfig(
        mediaConfig("SONARR", { metadata: { data: [{ type: "XbmcMetadata", enable: false }] } }),
        first.workspace,
      );
      assertPipelineSucceeded(disabled.result, ["SONARR"]);
      const disabledProvider = (await read()).find((item) => item.id === original.id);
      expect(disabledProvider?.enable).toBe(false);
      expect(disabledProvider?.fields?.find((field) => field.name === "seriesMetadata")?.value).toBe(!existing);
      const included = await syncConfig(
        mediaConfig("SONARR", { include: [{ template: "metadata" }] }, { localConfigTemplatesPath: templates }),
        first.workspace,
      );
      assertPipelineSucceeded(included.result, ["SONARR"]);
      expect((await read()).find((item) => item.id === original.id)?.enable).toBe(true);
      const overridden = await syncConfig(
        mediaConfig(
          "SONARR",
          { include: [{ template: "metadata" }], metadata: { data: [{ type: "XbmcMetadata", enable: false }] } },
          { localConfigTemplatesPath: templates },
        ),
        first.workspace,
      );
      assertPipelineSucceeded(overridden.result, ["SONARR"]);
      expect((await read()).find((item) => item.id === original.id)?.enable).toBe(false);
    } finally {
      rmSync(templates, { recursive: true, force: true });
      const response = await fetch(`${url}/${original.id}`, { method: "PUT", headers, body: JSON.stringify(original) });
      if (!response.ok) throw new Error(`Failed to restore metadata: ${response.status}`);
    }
  });

  test("updates existing indexer settings and preserves its credentials", async () => {
    const version = (await client.getSystemStatus()).version?.startsWith("5.") ? "v5" : "v3";
    const url = `${baseUrl}/api/${version}/indexer`;
    const headers = { "X-Api-Key": apiKey, "Content-Type": "application/json" };
    const schemaResponse = await fetch(`${url}/schema`, { headers });
    expect(schemaResponse.ok).toBe(true);
    const schemas = await schemaResponse.json();
    const schema = schemas.find((item: { implementation?: string }) => item.implementation === "Newznab");
    if (!schema) throw new Error("Newznab indexer schema missing");
    const name = `e2e-indexer-${randomUUID()}`;
    const clientName = `e2e-download-${randomUUID()}`;
    const blackhole = blackholeFromSchema(await client.getDownloadClientSchema());
    if (!blackhole) throw new Error("Blackhole client schema missing");
    const payload = {
      ...schema,
      id: 0,
      name,
      enableRss: false,
      enableAutomaticSearch: false,
      enableInteractiveSearch: false,
      fields: schema.fields.map((field: { name: string; value: unknown }) => ({
        ...field,
        value: field.name === "baseUrl" ? "http://127.0.0.1:1" : field.name === "apiKey" ? "fixture-secret" : field.value,
      })),
    };
    const created = await fetch(`${url}?forceSave=true&skipTesting=true`, { method: "POST", headers, body: JSON.stringify(payload) });
    expect(created.ok).toBe(true);
    const saved = await created.json();
    onTestFinished(async () => {
      await teardown(
        async () => {
          const response = await fetch(`${url}/${saved.id}`, { method: "DELETE", headers });
          if (!response.ok) throw new Error(`Failed to delete test indexer: ${response.status}`);
        },
        async () => {
          const downloadClient = (await client.getDownloadClients()).find((item) => item.name === clientName);
          if (downloadClient?.id != null) await client.deleteDownloadClient(String(downloadClient.id));
        },
      );
    });
    const config = mediaConfig("SONARR", {
      download_clients: { data: [{ name: clientName, type: blackhole.type, enable: false, fields: blackhole.fields }] },
      indexer_settings: {
        data: [{ name, multi_languages: ["Hindi", "English"], fail_downloads: ["Executables"], download_client: clientName }],
      },
    });
    const dryRun = await syncConfig(config, undefined, { dryRun: true });
    assertPipelineSucceeded(dryRun.result, ["SONARR"]);
    expect((await client.getDownloadClients()).some((item) => item.name === clientName)).toBe(false);
    expect((await client.getIndexers()).find((item) => item.id === saved.id)?.downloadClientId).toBe(saved.downloadClientId);
    const first = await syncConfig(config);
    assertPipelineSucceeded(first.result, ["SONARR"]);
    const current = (await client.getIndexers()).find((item) => item.id === saved.id);
    const downloadClient = (await client.getDownloadClients()).find((item) => item.name === clientName);
    expect(downloadClient?.id).toBeDefined();
    expect(current?.downloadClientId).toBe(downloadClient?.id);
    const languages = current?.fields?.find((field) => field.name === "multiLanguages");
    const failures = current?.fields?.find((field) => field.name === "failDownloads");
    const hindi = languages?.selectOptions?.find((option) => option.name === "Hindi")?.value;
    expect(languages?.value).toEqual(expect.arrayContaining([1, hindi]));
    expect(failures?.value).toEqual([0]);
    expect(current?.fields?.find((field) => field.name === "apiKey")?.value).toBe("********");
    const second = await syncConfig(config, first.workspace);
    assertPipelineSucceeded(second.result, ["SONARR"]);
    assertDiffUpToDate(second.result, ["SONARR"]);
  });

  test("custom formats", async () => {
    const preexisting = nonE2eNames(await client.getCustomFormats());
    const withValue = (value: string) =>
      mediaConfig("SONARR", { custom_formats: cfAssignBlock() }, { customFormatDefinitions: [e2eCustomFormatDefinition(value)] });

    const created = await syncConfig(withValue("e2e-release"));
    assertPipelineSucceeded(created.result, ["SONARR"]);
    const afterCreate = findNamed(await client.getCustomFormats(), "e2e-rt");
    expect(afterCreate).toBeTruthy();
    expect(cfReleaseTitleValue(afterCreate)).toBe("e2e-release");
    const snap = stripVolatile(afterCreate);

    const second = await syncConfig(withValue("e2e-release"), created.workspace);
    assertPipelineSucceeded(second.result, ["SONARR"]);
    assertDiffUpToDate(second.result, ["SONARR"]);
    expect(stripVolatile(findNamed(await client.getCustomFormats(), "e2e-rt"))).toEqual(snap);

    const updated = await syncConfig(withValue("e2e-release-2"), created.workspace);
    assertPipelineSucceeded(updated.result, ["SONARR"]);
    expect(cfReleaseTitleValue(findNamed(await client.getCustomFormats(), "e2e-rt"))).toBe("e2e-release-2");

    const deleted = await syncConfig(
      mediaConfig(
        "SONARR",
        { delete_unmanaged_custom_formats: { enabled: true, ignore: preexisting } },
        { customFormatDefinitions: [e2eCustomFormatDefinition()] },
      ),
      created.workspace,
    );
    assertPipelineSucceeded(deleted.result, ["SONARR"]);
    expect(findNamed(await client.getCustomFormats(), "e2e-rt")).toBeUndefined();
  });

  test("quality profiles", async () => {
    const preexisting = nonE2eNames(await client.getQualityProfiles());
    const withScore = (min_format_score: number) =>
      mediaConfig(
        "SONARR",
        {
          custom_formats: [{ trash_ids: ["e2e-rt"], assign_scores_to: [{ name: "e2e-qp", score: 10 }] }],
          quality_profiles: [qualityProfile(min_format_score)],
        },
        { customFormatDefinitions: [e2eCustomFormatDefinition()] },
      );

    const created = await syncConfig(withScore(0));
    assertPipelineSucceeded(created.result, ["SONARR"]);
    const afterCreate = findNamed(await client.getQualityProfiles(), "e2e-qp");
    expect(afterCreate).toBeTruthy();
    expect(afterCreate?.minFormatScore ?? 0).toBe(0);
    const snap = stripVolatile(afterCreate);

    const second = await syncConfig(withScore(0), created.workspace);
    assertPipelineSucceeded(second.result, ["SONARR"]);
    assertDiffUpToDate(second.result, ["SONARR"]);
    expect(stripVolatile(findNamed(await client.getQualityProfiles(), "e2e-qp"))).toEqual(snap);

    const updated = await syncConfig(withScore(5), created.workspace);
    assertPipelineSucceeded(updated.result, ["SONARR"]);
    expect(findNamed(await client.getQualityProfiles(), "e2e-qp")?.minFormatScore).toBe(5);

    const deleted = await syncConfig(
      mediaConfig("SONARR", {
        custom_formats: cfAssignBlock(),
        delete_unmanaged_quality_profiles: { enabled: true, ignore: preexisting },
      }),
      created.workspace,
    );
    assertPipelineSucceeded(deleted.result, ["SONARR"]);
    expect(findNamed(await client.getQualityProfiles(), "e2e-qp")).toBeUndefined();
  });

  test("per-profile quality sizes", async () => {
    if (!(await client.supportsProfileQualitySizes())) {
      return;
    }

    const profile = (name: string, min: number, preferred: number) => ({
      ...qualityProfile(),
      name,
      quality_sizes: [{ quality: "WEBDL-1080p", min, preferred, max: 200 }],
    });
    const yaml = (secondPreferred: number) =>
      mediaConfig("SONARR", {
        quality_definition: qualityDefinition(5),
        quality_profiles: [
          profile("e2e-size-a", 1, 60),
          profile("e2e-size-b", 2, secondPreferred),
          { ...qualityProfile(), name: "e2e-size-default" },
        ],
      });
    const sizes = async (name: string) => (await client.getProfileQualitySizes()).find((item) => item.name === name)?.items;

    const created = await syncConfig(yaml(80));
    assertPipelineSucceeded(created.result, ["SONARR"]);
    await waitUntil(async () => (await sizes("e2e-size-a"))?.find((item) => item.quality === "WEBDL-1080p")?.minSize === 1);
    expect((await sizes("e2e-size-a"))?.find((item) => item.quality === "WEBDL-1080p")).toMatchObject({
      minSize: 1,
      preferredSize: 60,
      maxSize: 200,
    });
    expect((await sizes("e2e-size-b"))?.find((item) => item.quality === "WEBDL-1080p")).toMatchObject({
      minSize: 2,
      preferredSize: 80,
      maxSize: 200,
    });
    expect((await sizes("e2e-size-default"))?.find((item) => item.quality === "WEBDL-1080p")).toMatchObject({
      minSize: 5,
      preferredSize: 50,
      maxSize: 199.9,
    });

    const second = await syncConfig(yaml(80), created.workspace);
    assertPipelineSucceeded(second.result, ["SONARR"]);
    assertDiffUpToDate(second.result, ["SONARR"]);

    const updated = await syncConfig(yaml(90), created.workspace);
    assertPipelineSucceeded(updated.result, ["SONARR"]);
    await waitUntil(async () => (await sizes("e2e-size-b"))?.find((item) => item.quality === "WEBDL-1080p")?.preferredSize === 90);
    expect((await sizes("e2e-size-a"))?.find((item) => item.quality === "WEBDL-1080p")?.preferredSize).toBe(60);
    expect((await sizes("e2e-size-default"))?.find((item) => item.quality === "WEBDL-1080p")?.preferredSize).toBe(50);
  });

  test("quality definitions", async () => {
    const webdl = async () => (await client.getQualityDefinitions()).find((d) => d.quality?.name === "WEBDL-1080p");

    const created = await syncConfig(mediaConfig("SONARR", { quality_definition: qualityDefinition(2) }));
    assertPipelineSucceeded(created.result, ["SONARR"]);
    // Sonarr applies the bulk update asynchronously, so the first GET can still be stale.
    await waitUntil(async () => (await webdl())?.minSize === 2);
    expect((await webdl())?.maxSize).toBe(199.9);
    expect((await webdl())?.preferredSize).toBe(50);

    const second = await syncConfig(mediaConfig("SONARR", { quality_definition: qualityDefinition(2) }), created.workspace);
    assertPipelineSucceeded(second.result, ["SONARR"]);
    assertDiffUpToDate(second.result, ["SONARR"]);

    const updated = await syncConfig(mediaConfig("SONARR", { quality_definition: qualityDefinition(3) }), created.workspace);
    assertPipelineSucceeded(updated.result, ["SONARR"]);
    await waitUntil(async () => (await webdl())?.minSize === 3);
  });

  test("media settings", async () => {
    const supportsV5Controls = await client.supportsMediaManagementControls();
    const mediaSettings = (firstDayOfWeek: number, seasonPackUpgradeThreshold: number) => ({
      ...e2eMediaSettings(firstDayOfWeek),
      media_management: {
        recycleBin: "/tmp",
        ...(supportsV5Controls
          ? {
              skipFreeSpaceCheckWhenGrabbing: true,
              seasonPackUpgrade: "threshold",
              seasonPackUpgradeThreshold,
              userRejectedExtensions: ".dog",
            }
          : {}),
      },
    });
    const created = await syncConfig(mediaConfig("SONARR", mediaSettings(1, 80.5)));
    assertPipelineSucceeded(created.result, ["SONARR"]);
    expect(((await client.getMediamanagement()) as { recycleBin?: string }).recycleBin).toBe("/tmp");
    if (supportsV5Controls) {
      expect(await client.getMediamanagement()).toMatchObject({
        skipFreeSpaceCheckWhenGrabbing: true,
        seasonPackUpgrade: "threshold",
        seasonPackUpgradeThreshold: 80.5,
        userRejectedExtensions: ".dog",
      });
    }
    expect(((await client.getNaming()) as { replaceIllegalCharacters?: boolean }).replaceIllegalCharacters).toBe(true);
    expect(((await client.getUiConfig()) as { firstDayOfWeek?: number }).firstDayOfWeek).toBe(1);

    const updated = await syncConfig(mediaConfig("SONARR", mediaSettings(0, 75.25)), created.workspace);
    assertPipelineSucceeded(updated.result, ["SONARR"]);
    expect(((await client.getUiConfig()) as { firstDayOfWeek?: number }).firstDayOfWeek).toBe(0);
    expect(((await client.getMediamanagement()) as { recycleBin?: string }).recycleBin).toBe("/tmp");
    if (supportsV5Controls) {
      expect(await client.getMediamanagement()).toMatchObject({
        skipFreeSpaceCheckWhenGrabbing: true,
        seasonPackUpgrade: "threshold",
        seasonPackUpgradeThreshold: 75.25,
        userRejectedExtensions: ".dog",
      });
    }

    const second = await syncConfig(mediaConfig("SONARR", mediaSettings(0, 75.25)), created.workspace);
    assertPipelineSucceeded(second.result, ["SONARR"]);
    assertDiffUpToDate(second.result, ["SONARR"]);
  });

  test("delay profiles", async () => {
    const yaml = (usenetDelay: number, additional: boolean) =>
      mediaConfig("SONARR", { delay_profiles: delayProfiles(usenetDelay, additional) });
    const tagged = async () => (await client.getDelayProfiles()).filter((p) => Array.isArray(p.tags) && p.tags.length > 0);

    const created = await syncConfig(yaml(1, true));
    assertPipelineSucceeded(created.result, ["SONARR"]);
    expect(defaultDelayProfile(await client.getDelayProfiles())).toBeTruthy();
    expect(await tagged()).toHaveLength(1);

    const second = await syncConfig(yaml(1, true), created.workspace);
    assertPipelineSucceeded(second.result, ["SONARR"]);
    assertDiffUpToDate(second.result, ["SONARR"]);

    const updated = await syncConfig(yaml(9, true), created.workspace);
    assertPipelineSucceeded(updated.result, ["SONARR"]);
    expect(defaultDelayProfile(await client.getDelayProfiles())?.usenetDelay).toBe(9);
    expect((await tagged())[0]?.usenetDelay).toBe(9);

    const omitted = await syncConfig(yaml(9, false), created.workspace);
    assertPipelineSucceeded(omitted.result, ["SONARR"]);
    expect(await tagged()).toHaveLength(0);
  });

  test("release profiles", async () => {
    const supportsV5Controls = await client.supportsReleaseProfileControls();
    const indexers = supportsV5Controls ? await createReleaseProfileIndexers(client, baseUrl, apiKey) : [];
    const selector = supportsV5Controls ? { indexers: releaseProfileIndexerNames } : { indexer: "" };
    const v5Controls = supportsV5Controls
      ? {
          ...selector,
          excluded_tags: ["e2e-release-excluded"],
          air_date_restriction: true,
          air_date_grace_period: 12,
          allow_season_pack_without_all_episodes_aired: true,
        }
      : selector;
    const yaml = (required: string[], include: boolean) =>
      mediaConfig("SONARR", {
        release_profiles: include ? [{ name: "e2e-hevc", required, ignored: ["xvid"], tags: ["e2e-release"], ...v5Controls }] : [],
      });
    const managed = async () => (await client.getReleaseProfiles()).filter((p) => p.name === "e2e-hevc");

    const created = await syncConfig(yaml(["hevc"], true));
    assertPipelineSucceeded(created.result, ["SONARR"]);
    expect(await managed()).toHaveLength(1);
    if (supportsV5Controls) {
      const excludedTag = (await client.getTags()).find((tag) => tag.label === "e2e-release-excluded");
      if (excludedTag?.id == null) {
        throw new Error("Sonarr did not create the excluded release-profile test tag.");
      }
      expect(await managed()).toMatchObject([
        {
          indexerIds: indexers.map((indexer) => indexer.id).sort((left, right) => left - right),
          excludedTags: [excludedTag.id],
          airDateRestriction: true,
          airDateGracePeriod: 12,
          allowSeasonPackWithoutAllEpisodesAired: true,
        },
      ]);
    }

    const second = await syncConfig(yaml(["hevc"], true), created.workspace);
    assertPipelineSucceeded(second.result, ["SONARR"]);
    assertDiffUpToDate(second.result, ["SONARR"]);

    const updated = await syncConfig(yaml(["hevc", "x265"], true), created.workspace);
    assertPipelineSucceeded(updated.result, ["SONARR"]);
    expect((await managed())[0]?.required).toEqual(expect.arrayContaining(["hevc", "x265"]));
    if (supportsV5Controls) {
      expect((await managed())[0]).toMatchObject({
        airDateRestriction: true,
        airDateGracePeriod: 12,
        allowSeasonPackWithoutAllEpisodesAired: true,
      });
    }

    const removed = await syncConfig(yaml(["hevc"], false), created.workspace);
    assertPipelineSucceeded(removed.result, ["SONARR"]);
    expect(await managed()).toHaveLength(0);
  });

  test("delay profile mapper writes the legacy payload", async () => {
    const parsed = InputConfigDelayProfileSchema.parse({
      enableUsenet: true,
      enableTorrent: true,
      preferredProtocol: "usenet",
      usenetDelay: 7,
      torrentDelay: 3,
      bypassIfHighestQuality: true,
      bypassIfAboveCustomFormatScore: false,
      minimumCustomFormatScore: 0,
    });
    const payload = new StandardDelayProfileSync(client, DownloadProtocol).mapToServer(parsed, []);
    expect(payload).not.toHaveProperty("items");

    // The default profile is not guaranteed to be id 1 on a server that already had one.
    const defaultId = defaultDelayProfile(await client.getDelayProfiles())?.id;
    expect(defaultId).toBeDefined();
    // The mapper returns the shared shape; the client wants this arr's generated resource.
    await client.updateDelayProfile(String(defaultId), payload as never);

    expect(defaultDelayProfile(await client.getDelayProfiles())).toMatchObject({
      usenetDelay: 7,
      torrentDelay: 3,
      bypassIfHighestQuality: true,
      preferredProtocol: "usenet",
    });
  });

  test("download clients, their config and remote paths", async () => {
    const preexisting = nonE2eNames(await client.getDownloadClients());
    const preexistingPaths = (await client.getRemotePathMappings())
      .filter((p) => p.host !== "e2e-host")
      .map((p) => ({ host: p.host ?? "", remote_path: p.remotePath ?? "", local_path: p.localPath ?? "" }));
    const blackhole = blackholeFromSchema(await client.getDownloadClientSchema());
    expect(blackhole, "TorrentBlackhole/UsenetBlackhole schema").toBeTruthy();

    const original = !!(baseline.downloadClientConfig as { enableCompletedDownloadHandling?: boolean }).enableCompletedDownloadHandling;
    const yaml = (includeClient: boolean, includeRemote: boolean, priority: number, handling: boolean) =>
      mediaConfig("SONARR", {
        download_clients: {
          data: includeClient ? [{ name: "e2e-blackhole", type: blackhole!.type, enable: false, priority, fields: blackhole!.fields }] : [],
          delete_unmanaged: { enabled: !includeClient, ignore: preexisting },
          config: downloadClientConfigBlock(handling),
          remote_paths: includeRemote
            ? [...preexistingPaths, { host: "e2e-host", remote_path: "/downloads", local_path: E2E_ROOT_A }]
            : preexistingPaths,
          delete_unmanaged_remote_paths: true,
        },
      });
    const handlingNow = async () =>
      ((await client.getDownloadClientConfig()) as { enableCompletedDownloadHandling?: boolean }).enableCompletedDownloadHandling;

    const created = await syncConfig(yaml(true, true, 20, !original));
    assertPipelineSucceeded(created.result, ["SONARR"]);
    const dc = findNamed(await client.getDownloadClients(), "e2e-blackhole");
    expect(dc, `e2e-blackhole did not persist\n${created.result.stdout}`).toBeTruthy();
    expect(dc?.enable).toBe(false);
    expect(dc?.priority).toBe(20);
    expect(await handlingNow()).toBe(!original);
    // *arr stores the local path with a trailing separator.
    const e2ePathMapped = async () =>
      (await client.getRemotePathMappings()).some((p) => p.host === "e2e-host" && (p.localPath ?? "").replace(/\/+$/, "") === E2E_ROOT_A);
    await waitUntil(e2ePathMapped);

    const flipped = await syncConfig(yaml(true, true, 5, original), created.workspace);
    assertPipelineSucceeded(flipped.result, ["SONARR"]);
    expect(findNamed(await client.getDownloadClients(), "e2e-blackhole")?.priority).toBe(5);
    expect(await handlingNow()).toBe(original);

    const second = await syncConfig(yaml(true, true, 5, original), created.workspace);
    assertPipelineSucceeded(second.result, ["SONARR"]);
    assertDiffUpToDate(second.result, ["SONARR"]);

    const droppedPath = await syncConfig(yaml(true, false, 5, original), created.workspace);
    assertPipelineSucceeded(droppedPath.result, ["SONARR"]);
    expect((await client.getRemotePathMappings()).some((p) => p.host === "e2e-host")).toBe(false);

    const deleted = await syncConfig(yaml(false, false, 5, original), created.workspace);
    assertPipelineSucceeded(deleted.result, ["SONARR"]);
    expect(findNamed(await client.getDownloadClients(), "e2e-blackhole")).toBeUndefined();
  });

  test("root folders", async () => {
    const preserved = await preservedRootFolderPaths(client);
    const yaml = (paths: string[]) => mediaConfig("SONARR", { root_folders: [...paths, ...preserved] });
    const pathsOf = async () => (await client.getRootfolders()).map((f) => f.path ?? "");

    const created = await syncConfig(yaml([E2E_ROOT_A, E2E_ROOT_B]));
    assertPipelineSucceeded(created.result, ["SONARR"]);
    expect(await pathsOf()).toEqual(expect.arrayContaining([E2E_ROOT_A, E2E_ROOT_B]));

    const second = await syncConfig(yaml([E2E_ROOT_A, E2E_ROOT_B]), created.workspace);
    assertPipelineSucceeded(second.result, ["SONARR"]);
    assertDiffUpToDate(second.result, ["SONARR"]);

    const deleted = await syncConfig(yaml([E2E_ROOT_A]), created.workspace);
    assertPipelineSucceeded(deleted.result, ["SONARR"]);
    expect(await pathsOf()).toContain(E2E_ROOT_A);
    expect(await pathsOf()).not.toContain(E2E_ROOT_B);
  });

  test("recyclarr WEB-1080p template include", async () => {
    const keepCfs = new Set(nonE2eNames(await client.getCustomFormats()));
    const keepQps = new Set(nonE2eNames(await client.getQualityProfiles()));

    const run = await syncConfig(
      mediaConfig("SONARR", {
        include: [{ template: "sonarr-v4-quality-profile-web-1080p" }, { template: "sonarr-v4-custom-formats-web-1080p" }],
      }),
    );
    assertPipelineSucceeded(run.result, ["SONARR"]);
    assertNoErrorLogs(run.result);
    expect(findNamed(await client.getQualityProfiles(), "WEB-1080p")).toBeTruthy();

    for (const qp of await client.getQualityProfiles()) {
      if (qp.id != null && qp.name && qp.name !== "Any" && !keepQps.has(qp.name)) await client.deleteQualityProfile(String(qp.id));
    }
    for (const cf of await client.getCustomFormats()) {
      if (cf.id != null && cf.name && !keepCfs.has(cf.name)) await client.deleteCustomFormat(String(cf.id));
    }
  });
});
