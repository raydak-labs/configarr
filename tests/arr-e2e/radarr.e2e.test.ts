/**
 * Live Radarr e2e: every configarr feature, against the Radarr container only.
 *
 * One file per *arr, each with its own literal payloads - the YAML differs per app, and a
 * shared factory would hide that behind branches. Shared code stays in `helpers.ts`.
 */
import { afterAll, beforeAll, describe, expect, onTestFinished, test } from "vitest";
import { randomUUID } from "node:crypto";
import { RadarrClient } from "../../src/clients/radarr-client";
import { DownloadProtocol } from "../../src/__generated__/radarr/data-contracts";
import { StandardDelayProfileSync } from "../../src/delayProfiles/delayProfileBase";
import { InputConfigDelayProfileSchema } from "../../src/types/config.types";
import {
  E2E_TAG_LISTED,
  E2E_TAG_ORPHAN,
  E2E_TAG_REFERENCED,
  E2E_ROOT_A,
  E2E_ROOT_B,
  arrConnection,
  cfAssignBlock,
  downloadClientConfigBlock,
  e2eCustomFormatDefinition,
  e2eMediaSettings,
  mediaConfig,
  instanceTagBlock,
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
  nonE2eLabels,
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

describe("radarr (live)", () => {
  const { baseUrl, apiKey } = arrConnection("RADARR");
  const client = new RadarrClient(baseUrl, apiKey);
  let baseline: MediaBaseline;
  let setupComplete = false;
  let preexistingDelayProfileIds = new Set<number>();
  let preexistingTagIds = new Set<number>();

  beforeAll(async () => {
    const status = await client.getSystemStatus();
    if (process.env.RADARR_EXPECTED_MAJOR) {
      expect(status.version?.split(".")[0]).toBe(process.env.RADARR_EXPECTED_MAJOR);
    }
    await cleanupMediaIndexerFixtures(client, baseUrl, apiKey, "v3");
    await cleanupMediaE2e(client);
    const snapshot = await snapshotMediaBaseline(client);
    const [profiles, tags] = await Promise.all([client.getDelayProfiles(), client.getTags()]);
    preexistingDelayProfileIds = new Set(profiles.flatMap((profile) => (profile.id == null ? [] : [profile.id])));
    preexistingTagIds = new Set(tags.flatMap((tag) => (tag.id == null ? [] : [tag.id])));
    baseline = snapshot;
    setupComplete = true;
  }, 180_000);

  afterAll(async () => {
    if (!setupComplete) return;
    const snapshot = baseline;
    await teardown(
      () => restoreMediaBaseline(client, snapshot),
      () => cleanupMediaIndexerFixtures(client, baseUrl, apiKey, "v3"),
      () => cleanupMediaE2e(client),
      async () => {
        const tags = await client.getTags();
        const referenced = tags.find((tag) => tag.label === E2E_TAG_REFERENCED)?.id;
        for (const profile of await client.getDelayProfiles()) {
          if (
            profile.id != null &&
            !preexistingDelayProfileIds.has(profile.id) &&
            referenced != null &&
            profile.tags?.includes(referenced)
          ) {
            await client.deleteDelayProfile(String(profile.id));
          }
        }
        for (const tag of tags) {
          if (
            tag.id != null &&
            !preexistingTagIds.has(tag.id) &&
            [E2E_TAG_LISTED, E2E_TAG_REFERENCED, E2E_TAG_ORPHAN].includes(tag.label ?? "")
          ) {
            await client.deleteTag(String(tag.id));
          }
        }
      },
    );
  });

  test("instance tags preserve managed references and prune orphan labels", async () => {
    await client.createTag({ label: E2E_TAG_ORPHAN });
    const keepLabels = nonE2eLabels(await client.getTags());
    const config = mediaConfig("RADARR", instanceTagBlock(keepLabels));
    const first = await syncConfig(config);
    assertPipelineSucceeded(first.result, ["RADARR"]);

    const tags = await client.getTags();
    const labels = tags.map((tag) => tag.label);
    expect(labels).toContain(E2E_TAG_LISTED);
    expect(labels).toContain(E2E_TAG_REFERENCED);
    expect(labels).not.toContain(E2E_TAG_ORPHAN);
    for (const label of keepLabels) expect(labels).toContain(label);
    const referencedId = tags.find((tag) => tag.label === E2E_TAG_REFERENCED)?.id;
    if (referencedId == null) throw new Error("Referenced tag was not created");
    expect((await client.getDelayProfiles()).some((profile) => profile.tags?.includes(referencedId))).toBe(true);

    const second = await syncConfig(config, first.workspace);
    assertPipelineSucceeded(second.result, ["RADARR"]);
    assertDiffUpToDate(second.result, ["RADARR"]);
  });

  test("host settings merge configured values and remain idempotent", async () => {
    const major = Number((await client.getSystemStatus()).version?.split(".")[0]);
    if (major < 7) return;
    const headers = { "X-Api-Key": apiKey, "Content-Type": "application/json" };
    const read = async (): Promise<Record<string, unknown>> => {
      const response = await fetch(`${baseUrl}/api/v3/config/host`, { headers });
      if (!response.ok) throw new Error(`Failed to load host settings: ${response.status}`);
      return response.json();
    };
    let original = await read();
    // The fixture disables local authentication; v7 requires a nonempty allowed-hosts
    // list on any General-settings write, even when it booted with an empty default.
    if (!original.allowedHosts) {
      const response = await fetch(`${baseUrl}/api/v3/config/host/${original.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ ...original, allowedHosts: "localhost,127.0.0.1" }),
      });
      if (!response.ok) throw new Error(`Failed to prepare host settings: ${response.status}`);
      original = await read();
    }
    const scopes = original.oidcScopes === "openid profile" ? "openid email" : "openid profile";
    try {
      const config = mediaConfig("RADARR", { host_config: { oidcScopes: scopes } });
      const first = await syncConfig(config);
      assertPipelineSucceeded(first.result, ["RADARR"]);
      const updated = await read();
      expect(updated.oidcScopes).toBe(scopes);
      expect(updated.authenticationMethod).toBe(original.authenticationMethod);
      const second = await syncConfig(config, first.workspace);
      assertPipelineSucceeded(second.result, ["RADARR"]);
      assertDiffUpToDate(second.result, ["RADARR"]);
    } finally {
      const response = await fetch(`${baseUrl}/api/v3/config/host/${original.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(original),
      });
      if (!response.ok) throw new Error(`Failed to restore host settings: ${response.status}`);
    }
  });

  test.each([
    { label: "invalid enum", host_config: { authenticationMethod: "invalid" } },
    { label: "unsupported field", host_config: { apiKey: "not-managed" } },
  ])("rejects $label in host settings before applying other changes", async ({ host_config }) => {
    const major = Number((await client.getSystemStatus()).version?.split(".")[0]);
    if (major < 7) return;
    const before = await client.getUiConfig();
    const changed = before.firstDayOfWeek === 6 ? 5 : 6;
    try {
      const run = await syncConfig(
        mediaConfig("RADARR", {
          host_config,
          ui_config: { firstDayOfWeek: changed },
        }),
      );
      expect(run.result.exitCode).not.toBe(0);
      expect((await client.getUiConfig()).firstDayOfWeek).toBe(before.firstDayOfWeek);
    } finally {
      await client.updateUiConfig(String(before.id), before);
    }
  });

  test("rejects v7 host settings on older Radarr before applying other changes", async () => {
    const major = Number((await client.getSystemStatus()).version?.split(".")[0]);
    if (major >= 7) return;
    const before = await client.getUiConfig();
    const config = mediaConfig("RADARR", { host_config: { oidcScopes: "openid" }, ui_config: { firstDayOfWeek: 6 } });
    const run = await syncConfig(config);
    expect(run.result.exitCode).not.toBe(0);
    expect(run.result.stdout + run.result.stderr).toContain("host_config requires Radarr v7 or Sonarr v5");
    expect((await client.getUiConfig()).firstDayOfWeek).toBe(before.firstDayOfWeek);
  });

  test("syncs host settings, metadata, and an import list in one run", async () => {
    if (Number((await client.getSystemStatus()).version?.split(".")[0]) < 7) return;
    const original = await client.getHostConfig();
    const metadata = (await client.getMetadata()).find((item) => item.implementation === "XbmcMetadata");
    if (!metadata?.id) throw new Error("Metadata provider is required");
    const profile = (await client.getQualityProfiles()).find((item) => item.name);
    if (!original.id || !profile?.name) throw new Error("Host settings and a quality profile are required");
    const name = `e2e-import-${randomUUID()}`;
    const scopes = original.oidcScopes === "openid profile" ? "openid email" : "openid profile";
    try {
      const config = mediaConfig("RADARR", {
        host_config: { oidcScopes: scopes },
        metadata: { data: [{ type: "XbmcMetadata", enable: !metadata.enable }] },
        root_folders: [E2E_ROOT_A, ...(await preservedRootFolderPaths(client))],
        import_lists: {
          data: [
            {
              name,
              type: "IMDbListImport",
              enabled: false,
              quality_profile: profile.name,
              root_folder: E2E_ROOT_A,
              fields: { list_id: "ls123456789" },
            },
          ],
        },
      });
      const first = await syncConfig(config);
      assertPipelineSucceeded(first.result, ["RADARR"]);
      expect((await client.getHostConfig()).oidcScopes).toBe(scopes);
      expect((await client.getMetadata()).find((item) => item.id === metadata.id)?.enable).toBe(!metadata.enable);
      expect((await client.getImportLists()).some((item) => item.name === name)).toBe(true);
      const second = await syncConfig(config, first.workspace);
      assertPipelineSucceeded(second.result, ["RADARR"]);
      assertDiffUpToDate(second.result, ["RADARR"]);
    } finally {
      const list = (await client.getImportLists()).find((item) => item.name === name);
      if (list?.id != null) await client.deleteImportList(String(list.id));
      await client.updateMetadata(String(metadata.id), metadata);
      await client.updateHostConfig(String(original.id), original);
    }
  });

  test("preserves Trakt credentials when updating a smart list", async () => {
    const major = Number((await client.getSystemStatus()).version?.split(".")[0]);
    if (major < 7) return;
    const name = `e2e-trakt-${randomUUID()}`;
    const profile = (await client.getQualityProfiles()).find((item) => item.name);
    if (!profile?.name) throw new Error("A quality profile is required for the import-list fixture");
    const existingRoots = await preservedRootFolderPaths(client);
    const config = (slug: string, credentials: boolean) =>
      mediaConfig("RADARR", {
        root_folders: [E2E_ROOT_A, ...existingRoots],
        import_lists: {
          data: [
            {
              name,
              type: "TraktSmartListImport",
              enabled: false,
              enable_auto: false,
              quality_profile: profile.name,
              root_folder: E2E_ROOT_A,
              fields: {
                smart_list_id: slug,
                ...(credentials
                  ? { access_token: "fixture-access-token", refresh_token: "fixture-refresh-token", expires: "2099-01-01T00:00:00Z" }
                  : {}),
              },
            },
          ],
        },
      });
    try {
      const first = await syncConfig(config("first-list", true));
      assertPipelineSucceeded(first.result, ["RADARR"]);
      expect(first.result.stdout).not.toContain("fixture-access-token");
      expect(first.result.stdout).not.toContain("fixture-refresh-token");
      const updated = await syncConfig(config("second-list", false), first.workspace);
      assertPipelineSucceeded(updated.result, ["RADARR"]);
      const fields = findNamed(await client.getImportLists(), name)?.fields;
      expect(fields?.find((field) => field.name === "smartListId")?.value).toBe("second-list");
      expect(fields?.find((field) => field.name === "accessToken")?.value).toBe("fixture-access-token");
      expect(fields?.find((field) => field.name === "refreshToken")?.value).toBe("fixture-refresh-token");
      expect(updated.result.stdout).not.toContain("fixture-access-token");
      expect(updated.result.stdout).not.toContain("fixture-refresh-token");
      const stored = findNamed(await client.getImportLists(), name);
      if (stored?.id == null) throw new Error("Expected a stored Trakt list");
      await client.updateImportList(String(stored.id), {
        ...stored,
        fields: stored.fields?.map((field) => (field.name === "refreshToken" ? { ...field, value: "fixture-refreshed-token" } : field)),
      });
      const repeated = await syncConfig(config("second-list", true), first.workspace);
      assertPipelineSucceeded(repeated.result, ["RADARR"]);
      assertDiffUpToDate(repeated.result, ["RADARR"]);
      expect(findNamed(await client.getImportLists(), name)?.fields?.find((field) => field.name === "refreshToken")?.value).toBe(
        "fixture-refreshed-token",
      );
    } finally {
      const list = findNamed(await client.getImportLists(), name);
      if (list?.id != null) await client.deleteImportList(String(list.id));
    }
  });

  test("rejects an invalid list before writing any import lists", async () => {
    const name = `e2e-import-${randomUUID()}`;
    const profile = (await client.getQualityProfiles()).find((item) => item.name);
    if (!profile?.name) throw new Error("A quality profile is required for the import-list fixture");
    const config = mediaConfig(
      "RADARR",
      {
        custom_formats: cfAssignBlock(),
        root_folders: [E2E_ROOT_A, ...(await preservedRootFolderPaths(client))],
        import_lists: {
          data: [
            {
              name,
              type: "IMDbListImport",
              enabled: false,
              quality_profile: profile.name,
              root_folder: E2E_ROOT_A,
              fields: { list_id: "ls123456789" },
            },
            {
              name: `${name}-invalid`,
              type: "IMDbListImport",
              enabled: false,
              quality_profile: profile.name,
              root_folder: E2E_ROOT_A,
              fields: { unknown_field: "invalid" },
            },
          ],
        },
      },
      { customFormatDefinitions: [e2eCustomFormatDefinition()] },
    );
    try {
      const result = await syncConfig(config);
      expect(result.result.exitCode).not.toBe(0);
      expect(result.result.stderr).toContain("unknown field");
      expect(findNamed(await client.getImportLists(), name)).toBeUndefined();
      expect(findNamed(await client.getCustomFormats(), "e2e-rt")).toBeUndefined();
    } finally {
      const list = findNamed(await client.getImportLists(), name);
      if (list?.id != null) await client.deleteImportList(String(list.id));
    }
  });

  test("dry-runs an import list referencing a root folder created in the same run", async () => {
    const profile = (await client.getQualityProfiles()).find((item) => item.name);
    if (!profile?.name) throw new Error("A quality profile is required for the import-list fixture");
    const root = `/data/dry-run-${randomUUID()}`;
    const name = `e2e-import-${randomUUID()}`;
    const result = await syncConfig(
      mediaConfig("RADARR", {
        root_folders: [root, ...(await preservedRootFolderPaths(client))],
        import_lists: {
          data: [
            {
              name,
              type: "IMDbListImport",
              enabled: false,
              quality_profile: profile.name,
              root_folder: root,
              fields: { list_id: "ls123456789" },
            },
          ],
        },
      }),
      undefined,
      { dryRun: true },
    );
    assertPipelineSucceeded(result.result, ["RADARR"]);
    expect((await client.getImportLists()).some((list) => list.name === name)).toBe(false);
    expect((await client.getRootfolders()).some((folder) => folder.path === root)).toBe(false);
  });

  test("creates an import list using a profile and root folder from the same run", async () => {
    const name = `e2e-import-${randomUUID()}`;
    const profileName = `e2e-qp-${randomUUID()}`;
    try {
      const result = await syncConfig(
        mediaConfig("RADARR", {
          root_folders: [E2E_ROOT_A, ...(await preservedRootFolderPaths(client))],
          quality_profiles: [{ ...qualityProfile(), name: profileName }],
          import_lists: {
            data: [
              {
                name,
                type: "IMDbListImport",
                enabled: false,
                quality_profile: profileName,
                root_folder: E2E_ROOT_A,
                fields: { list_id: "ls123456789" },
              },
            ],
          },
        }),
      );
      assertPipelineSucceeded(result.result, ["RADARR"]);
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

  test("creates and updates a disabled schema-based import list", async () => {
    const name = `e2e-import-${randomUUID()}`;
    const tagName = `e2e-import-tag-${randomUUID()}`;
    const originalTags = await client.getTags();
    const profile = (await client.getQualityProfiles()).find((item) => item.id != null && item.name);
    if (!profile?.name) throw new Error("A quality profile is required for the import-list fixture");
    const headers = { "X-Api-Key": apiKey };
    const getLists = async (): Promise<
      Array<{
        id?: number;
        name?: string;
        qualityProfileId?: number;
        rootFolderPath?: string;
        tags?: number[];
        fields?: Array<{ name?: string; value?: unknown }>;
      }>
    > => {
      const response = await fetch(`${baseUrl}/api/v3/importlist`, { headers });
      if (!response.ok) throw new Error(`Failed to load import lists: ${response.status}`);
      return response.json();
    };
    try {
      const preserved = await preservedRootFolderPaths(client);
      const existingNames = nonE2eNames(await getLists());
      const config = (listId: string) =>
        mediaConfig("RADARR", {
          root_folders: [E2E_ROOT_A, ...preserved],
          delete_unmanaged_tags: { enabled: true, ignore: originalTags.flatMap((tag) => (tag.label ? [tag.label] : [])) },
          import_lists: {
            data: [
              {
                name,
                type: "IMDbListImport",
                enabled: false,
                enable_auto: false,
                quality_profile: profile.name,
                root_folder: E2E_ROOT_A,
                tags: [tagName],
                fields: { list_id: listId },
              },
            ],
          },
        });
      const first = await syncConfig(config("ls123456789"));
      assertPipelineSucceeded(first.result, ["RADARR"]);
      const created = findNamed(await getLists(), name);
      expect(created?.qualityProfileId).toBe(profile.id);
      expect(created?.rootFolderPath).toBe(E2E_ROOT_A);
      expect(created?.fields?.find((field) => field.name === "listId")?.value).toBe("ls123456789");
      const tag = (await client.getTags()).find((item) => item.label === tagName);
      expect(tag?.id).toBeDefined();
      expect(created?.tags).toContain(tag?.id);
      const second = await syncConfig(config("ls123456789"), first.workspace);
      assertPipelineSucceeded(second.result, ["RADARR"]);
      assertDiffUpToDate(second.result, ["RADARR"]);
      const changed = await syncConfig(config("ls987654321"), first.workspace);
      assertPipelineSucceeded(changed.result, ["RADARR"]);
      expect(findNamed(await getLists(), name)?.fields?.find((field) => field.name === "listId")?.value).toBe("ls987654321");
      const removed = await syncConfig(
        mediaConfig("RADARR", { import_lists: { data: [], delete_unmanaged: { enabled: true, ignore: existingNames } } }),
        first.workspace,
      );
      assertPipelineSucceeded(removed.result, ["RADARR"]);
      expect(findNamed(await getLists(), name)).toBeUndefined();
    } finally {
      const list = findNamed(await getLists(), name);
      if (list?.id != null) await fetch(`${baseUrl}/api/v3/importlist/${list.id}`, { method: "DELETE", headers });
      const tag = (await client.getTags()).find((item) => item.label === tagName);
      if (tag?.id != null) await client.deleteTag(String(tag.id));
    }
  });

  test("syncs metadata provider settings", async () => {
    const url = `${baseUrl}/api/v3/metadata`;
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
    const existing = original.fields?.find((field) => field.name === "movieMetadata")?.value;
    if (typeof existing !== "boolean") throw new Error("Metadata field not available");
    try {
      const config = mediaConfig("RADARR", {
        metadata: { data: [{ type: "XbmcMetadata", enable: true, fields: { movie_metadata: !existing } }] },
      });
      const dryRun = await syncConfig(config, undefined, { dryRun: true });
      assertPipelineSucceeded(dryRun.result, ["RADARR"]);
      expect((await read()).find((item) => item.id === original.id)).toEqual(original);
      const invalid = await syncConfig(
        mediaConfig("RADARR", {
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
          "RADARR",
          { custom_formats: cfAssignBlock(), metadata: { data: [{ type: "XbmcMetadata", fields: { bad_field: true } }] } },
          { customFormatDefinitions: [e2eCustomFormatDefinition()] },
        ),
        dryRun.workspace,
      );
      expect(unknownField.result.exitCode).not.toBe(0);
      expect((await read()).find((item) => item.id === original.id)).toEqual(original);
      expect(findNamed(await client.getCustomFormats(), "e2e-rt")).toBeUndefined();
      const first = await syncConfig(config);
      assertPipelineSucceeded(first.result, ["RADARR"]);
      const current = (await read()).find((item) => item.id === original.id);
      expect(current?.enable).toBe(true);
      expect(current?.fields?.find((field) => field.name === "movieMetadata")?.value).toBe(!existing);
      expect(current?.fields?.filter((field) => field.name !== "movieMetadata")).toEqual(
        original.fields?.filter((field) => field.name !== "movieMetadata"),
      );
      expect((await read()).filter((item) => item.id !== original.id)).toEqual(providers.filter((item) => item.id !== original.id));
      const second = await syncConfig(config, first.workspace);
      assertPipelineSucceeded(second.result, ["RADARR"]);
      assertDiffUpToDate(second.result, ["RADARR"]);
      const disabled = await syncConfig(
        mediaConfig("RADARR", { metadata: { data: [{ type: "XbmcMetadata", enable: false }] } }),
        first.workspace,
      );
      assertPipelineSucceeded(disabled.result, ["RADARR"]);
      const disabledProvider = (await read()).find((item) => item.id === original.id);
      expect(disabledProvider?.enable).toBe(false);
      expect(disabledProvider?.fields?.find((field) => field.name === "movieMetadata")?.value).toBe(!existing);
    } finally {
      const response = await fetch(`${url}/${original.id}`, { method: "PUT", headers, body: JSON.stringify(original) });
      if (!response.ok) throw new Error(`Failed to restore metadata: ${response.status}`);
    }
  });

  test("updates existing indexer settings and preserves its credentials", async () => {
    const version = "v3";
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
    const config = mediaConfig("RADARR", {
      download_clients: { data: [{ name: clientName, type: blackhole.type, enable: false, fields: blackhole.fields }] },
      indexer_settings: {
        data: [{ name, multi_languages: ["Hindi", "English"], fail_downloads: ["Executables"], download_client: clientName }],
      },
    });
    const dryRun = await syncConfig(config, undefined, { dryRun: true });
    assertPipelineSucceeded(dryRun.result, ["RADARR"]);
    expect((await client.getDownloadClients()).some((item) => item.name === clientName)).toBe(false);
    expect((await client.getIndexers()).find((item) => item.id === saved.id)?.downloadClientId).toBe(saved.downloadClientId);
    const first = await syncConfig(config);
    assertPipelineSucceeded(first.result, ["RADARR"]);
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
    assertPipelineSucceeded(second.result, ["RADARR"]);
    assertDiffUpToDate(second.result, ["RADARR"]);
  });

  test("custom formats", async () => {
    const preexisting = nonE2eNames(await client.getCustomFormats());
    const withValue = (value: string) =>
      mediaConfig("RADARR", { custom_formats: cfAssignBlock() }, { customFormatDefinitions: [e2eCustomFormatDefinition(value)] });

    const created = await syncConfig(withValue("e2e-release"));
    assertPipelineSucceeded(created.result, ["RADARR"]);
    const afterCreate = findNamed(await client.getCustomFormats(), "e2e-rt");
    expect(afterCreate).toBeTruthy();
    expect(cfReleaseTitleValue(afterCreate)).toBe("e2e-release");
    const snap = stripVolatile(afterCreate);

    const second = await syncConfig(withValue("e2e-release"), created.workspace);
    assertPipelineSucceeded(second.result, ["RADARR"]);
    assertDiffUpToDate(second.result, ["RADARR"]);
    expect(stripVolatile(findNamed(await client.getCustomFormats(), "e2e-rt"))).toEqual(snap);

    const updated = await syncConfig(withValue("e2e-release-2"), created.workspace);
    assertPipelineSucceeded(updated.result, ["RADARR"]);
    expect(cfReleaseTitleValue(findNamed(await client.getCustomFormats(), "e2e-rt"))).toBe("e2e-release-2");

    const deleted = await syncConfig(
      mediaConfig(
        "RADARR",
        { delete_unmanaged_custom_formats: { enabled: true, ignore: preexisting } },
        { customFormatDefinitions: [e2eCustomFormatDefinition()] },
      ),
      created.workspace,
    );
    assertPipelineSucceeded(deleted.result, ["RADARR"]);
    expect(findNamed(await client.getCustomFormats(), "e2e-rt")).toBeUndefined();
  });

  test("quality profiles", async () => {
    const preexisting = nonE2eNames(await client.getQualityProfiles());
    const withScore = (min_format_score: number) =>
      mediaConfig(
        "RADARR",
        {
          custom_formats: [{ trash_ids: ["e2e-rt"], assign_scores_to: [{ name: "e2e-qp", score: 10 }] }],
          quality_profiles: [qualityProfile(min_format_score)],
        },
        { customFormatDefinitions: [e2eCustomFormatDefinition()] },
      );

    const created = await syncConfig(withScore(0));
    assertPipelineSucceeded(created.result, ["RADARR"]);
    const afterCreate = findNamed(await client.getQualityProfiles(), "e2e-qp");
    expect(afterCreate).toBeTruthy();
    expect(afterCreate?.minFormatScore ?? 0).toBe(0);
    const snap = stripVolatile(afterCreate);

    const second = await syncConfig(withScore(0), created.workspace);
    assertPipelineSucceeded(second.result, ["RADARR"]);
    assertDiffUpToDate(second.result, ["RADARR"]);
    expect(stripVolatile(findNamed(await client.getQualityProfiles(), "e2e-qp"))).toEqual(snap);

    const updated = await syncConfig(withScore(5), created.workspace);
    assertPipelineSucceeded(updated.result, ["RADARR"]);
    expect(findNamed(await client.getQualityProfiles(), "e2e-qp")?.minFormatScore).toBe(5);

    const deleted = await syncConfig(
      mediaConfig("RADARR", {
        custom_formats: cfAssignBlock(),
        delete_unmanaged_quality_profiles: { enabled: true, ignore: preexisting },
      }),
      created.workspace,
    );
    assertPipelineSucceeded(deleted.result, ["RADARR"]);
    expect(findNamed(await client.getQualityProfiles(), "e2e-qp")).toBeUndefined();
  });

  test("quality definitions", async () => {
    const webdl = async () => (await client.getQualityDefinitions()).find((d) => d.quality?.name === "WEBDL-1080p");

    const created = await syncConfig(mediaConfig("RADARR", { quality_definition: qualityDefinition(2) }));
    assertPipelineSucceeded(created.result, ["RADARR"]);
    // Radarr applies the bulk update asynchronously, so the first GET can still be stale.
    await waitUntil(async () => (await webdl())?.minSize === 2);
    expect((await webdl())?.maxSize).toBe(199.9);
    expect((await webdl())?.preferredSize).toBe(50);

    const second = await syncConfig(mediaConfig("RADARR", { quality_definition: qualityDefinition(2) }), created.workspace);
    assertPipelineSucceeded(second.result, ["RADARR"]);
    assertDiffUpToDate(second.result, ["RADARR"]);

    const updated = await syncConfig(mediaConfig("RADARR", { quality_definition: qualityDefinition(3) }), created.workspace);
    assertPipelineSucceeded(updated.result, ["RADARR"]);
    await waitUntil(async () => (await webdl())?.minSize === 3);
  });

  test("media settings", async () => {
    const created = await syncConfig(mediaConfig("RADARR", e2eMediaSettings(1)));
    assertPipelineSucceeded(created.result, ["RADARR"]);
    expect(((await client.getMediamanagement()) as { recycleBin?: string }).recycleBin).toBe("/tmp");
    expect(((await client.getNaming()) as { replaceIllegalCharacters?: boolean }).replaceIllegalCharacters).toBe(true);
    expect(((await client.getUiConfig()) as { firstDayOfWeek?: number }).firstDayOfWeek).toBe(1);

    const updated = await syncConfig(mediaConfig("RADARR", e2eMediaSettings(0)), created.workspace);
    assertPipelineSucceeded(updated.result, ["RADARR"]);
    expect(((await client.getUiConfig()) as { firstDayOfWeek?: number }).firstDayOfWeek).toBe(0);
    expect(((await client.getMediamanagement()) as { recycleBin?: string }).recycleBin).toBe("/tmp");

    const second = await syncConfig(mediaConfig("RADARR", e2eMediaSettings(0)), created.workspace);
    assertPipelineSucceeded(second.result, ["RADARR"]);
    assertDiffUpToDate(second.result, ["RADARR"]);
  });

  test("delay profiles", async () => {
    const yaml = (usenetDelay: number, additional: boolean) =>
      mediaConfig("RADARR", { delay_profiles: delayProfiles(usenetDelay, additional) });
    const tagged = async () => (await client.getDelayProfiles()).filter((p) => Array.isArray(p.tags) && p.tags.length > 0);

    const created = await syncConfig(yaml(1, true));
    assertPipelineSucceeded(created.result, ["RADARR"]);
    expect(defaultDelayProfile(await client.getDelayProfiles())).toBeTruthy();
    expect(await tagged()).toHaveLength(1);

    const second = await syncConfig(yaml(1, true), created.workspace);
    assertPipelineSucceeded(second.result, ["RADARR"]);
    assertDiffUpToDate(second.result, ["RADARR"]);

    const updated = await syncConfig(yaml(9, true), created.workspace);
    assertPipelineSucceeded(updated.result, ["RADARR"]);
    expect(defaultDelayProfile(await client.getDelayProfiles())?.usenetDelay).toBe(9);
    expect((await tagged())[0]?.usenetDelay).toBe(9);

    const omitted = await syncConfig(yaml(9, false), created.workspace);
    assertPipelineSucceeded(omitted.result, ["RADARR"]);
    expect(await tagged()).toHaveLength(0);
  });

  test("release profiles", async () => {
    const yaml = (required: string[], include: boolean) =>
      mediaConfig("RADARR", {
        release_profiles: include ? [{ name: "e2e-hevc", required, ignored: ["xvid"], tags: ["e2e-release"] }] : [],
      });
    const managed = async () => (await client.getReleaseProfiles()).filter((p) => p.name === "e2e-hevc");

    const created = await syncConfig(yaml(["hevc"], true));
    assertPipelineSucceeded(created.result, ["RADARR"]);
    expect(await managed()).toHaveLength(1);

    const second = await syncConfig(yaml(["hevc"], true), created.workspace);
    assertPipelineSucceeded(second.result, ["RADARR"]);
    assertDiffUpToDate(second.result, ["RADARR"]);

    const updated = await syncConfig(yaml(["hevc", "x265"], true), created.workspace);
    assertPipelineSucceeded(updated.result, ["RADARR"]);
    expect((await managed())[0]?.required).toEqual(expect.arrayContaining(["hevc", "x265"]));

    const removed = await syncConfig(yaml(["hevc"], false), created.workspace);
    assertPipelineSucceeded(removed.result, ["RADARR"]);
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
      mediaConfig("RADARR", {
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
    assertPipelineSucceeded(created.result, ["RADARR"]);
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
    assertPipelineSucceeded(flipped.result, ["RADARR"]);
    expect(findNamed(await client.getDownloadClients(), "e2e-blackhole")?.priority).toBe(5);
    expect(await handlingNow()).toBe(original);

    const second = await syncConfig(yaml(true, true, 5, original), created.workspace);
    assertPipelineSucceeded(second.result, ["RADARR"]);
    assertDiffUpToDate(second.result, ["RADARR"]);

    const droppedPath = await syncConfig(yaml(true, false, 5, original), created.workspace);
    assertPipelineSucceeded(droppedPath.result, ["RADARR"]);
    expect((await client.getRemotePathMappings()).some((p) => p.host === "e2e-host")).toBe(false);

    const deleted = await syncConfig(yaml(false, false, 5, original), created.workspace);
    assertPipelineSucceeded(deleted.result, ["RADARR"]);
    expect(findNamed(await client.getDownloadClients(), "e2e-blackhole")).toBeUndefined();
  });

  test("root folders", async () => {
    const preserved = await preservedRootFolderPaths(client);
    const yaml = (paths: string[]) => mediaConfig("RADARR", { root_folders: [...paths, ...preserved] });
    const pathsOf = async () => (await client.getRootfolders()).map((f) => f.path ?? "");

    const created = await syncConfig(yaml([E2E_ROOT_A, E2E_ROOT_B]));
    assertPipelineSucceeded(created.result, ["RADARR"]);
    expect(await pathsOf()).toEqual(expect.arrayContaining([E2E_ROOT_A, E2E_ROOT_B]));

    const second = await syncConfig(yaml([E2E_ROOT_A, E2E_ROOT_B]), created.workspace);
    assertPipelineSucceeded(second.result, ["RADARR"]);
    assertDiffUpToDate(second.result, ["RADARR"]);

    const deleted = await syncConfig(yaml([E2E_ROOT_A]), created.workspace);
    assertPipelineSucceeded(deleted.result, ["RADARR"]);
    expect(await pathsOf()).toContain(E2E_ROOT_A);
    expect(await pathsOf()).not.toContain(E2E_ROOT_B);
  });

  test("recyclarr HD Bluray + WEB template include", async () => {
    const keepCfs = new Set(nonE2eNames(await client.getCustomFormats()));
    const keepQps = new Set(nonE2eNames(await client.getQualityProfiles()));

    const run = await syncConfig(
      mediaConfig("RADARR", {
        include: [{ template: "radarr-quality-profile-hd-bluray-web" }, { template: "radarr-custom-formats-hd-bluray-web" }],
      }),
    );
    assertPipelineSucceeded(run.result, ["RADARR"]);
    assertNoErrorLogs(run.result);
    expect(findNamed(await client.getQualityProfiles(), "HD Bluray + WEB")).toBeTruthy();

    for (const qp of await client.getQualityProfiles()) {
      if (qp.id != null && qp.name && qp.name !== "Any" && !keepQps.has(qp.name)) await client.deleteQualityProfile(String(qp.id));
    }
    for (const cf of await client.getCustomFormats()) {
      if (cf.id != null && cf.name && !keepCfs.has(cf.name)) await client.deleteCustomFormat(String(cf.id));
    }
  });
});
