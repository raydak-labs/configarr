/**
 * Live Sonarr e2e: every configarr feature, against the Sonarr container only.
 *
 * One file per *arr, each with its own literal payloads - the YAML differs per app, and a
 * shared factory would hide that behind branches. Shared code stays in `helpers.ts`.
 */
import { afterAll, beforeAll, describe, expect, test } from "vitest";
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
    await cleanupMediaE2e(client);
    await cleanupReleaseProfileIndexers(client, baseUrl, apiKey);
    baseline = await snapshotMediaBaseline(client);
  }, 180_000);

  afterAll(async () => {
    await teardown(
      () => restoreMediaBaseline(client, baseline),
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
