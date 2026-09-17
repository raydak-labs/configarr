/**
 * Live Lidarr e2e: every configarr feature, against the Lidarr container only.
 *
 * One file per *arr, each with its own literal payloads - the YAML differs per app, and a
 * shared factory would hide that behind branches. Shared code stays in `helpers.ts`.
 */
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { LidarrClient } from "../../src/clients/lidarr-client";
import { DelayProfileLidarrSync, LidarrDelayProfile } from "../../src/delayProfiles/delayProfileLidarr";
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
  LEGACY_DELAY_PROFILE,
  MediaBaseline,
  assertDiffUpToDate,
  assertPipelineSucceeded,
  blackholeFromSchema,
  cfReleaseTitleValue,
  cleanupMediaE2e,
  cleanupMetadataProfilesE2e,
  defaultDelayProfile,
  findNamed,
  nonE2eNames,
  preservedRootFolderObjects,
  restoreMediaBaseline,
  snapshotMediaBaseline,
  stripVolatile,
  syncConfig,
  teardown,
  waitUntil,
} from "./helpers";

const qualityProfile = (min_format_score = 0) => ({
  name: "e2e-qp",
  upgrade: { allowed: true, until_quality: "FLAC", until_score: 100 },
  min_format_score,
  qualities: [{ name: "FLAC" }],
});

const qualityDefinition = (min: number) => ({ qualities: [{ quality: "FLAC", min, preferred: 50, max: 199.9 }] });

const metadataProfile = (primary_types: string[] = ["Album"]) => ({
  name: "e2e-meta",
  primary_types,
  secondary_types: ["Studio"],
  release_statuses: ["Official"],
});

/** Lidarr replaced the enableUsenet/enableTorrent fields with protocol items (#481). */
const delayDefault = (usenetDelay: number) => ({
  items: [
    { name: "Usenet", protocol: "UsenetDownloadProtocol", allowed: true, delay: usenetDelay },
    { name: "Torrent", protocol: "TorrentDownloadProtocol", allowed: true, delay: 0 },
  ],
  bypassIfHighestQuality: true,
  bypassIfAboveCustomFormatScore: false,
  minimumCustomFormatScore: 0,
});

const delayProfiles = (usenetDelay: number, additional: boolean) => ({
  default: delayDefault(usenetDelay),
  ...(additional ? { additional: [{ ...delayDefault(usenetDelay), order: 1, tags: ["e2e-delay"] }] } : {}),
});

/** Readarr root folders are objects and need both profiles by name. */
const rootFolder = (path: string, name: string) => ({ path, name, metadata_profile: "e2e-meta", quality_profile: "e2e-qp" });

describe("lidarr (live)", () => {
  const { baseUrl, apiKey } = arrConnection("LIDARR");
  const client = new LidarrClient(baseUrl, apiKey);
  let baseline: MediaBaseline;

  beforeAll(async () => {
    await cleanupMediaE2e(client);
    await cleanupMetadataProfilesE2e(client);
    baseline = await snapshotMediaBaseline(client);
  }, 180_000);

  afterAll(async () => {
    await teardown(
      () => restoreMediaBaseline(client, baseline),
      () => cleanupMediaE2e(client),
      () => cleanupMetadataProfilesE2e(client),
    );
  });

  test("custom formats", async () => {
    const preexisting = nonE2eNames(await client.getCustomFormats());
    const withValue = (value: string) =>
      mediaConfig("LIDARR", { custom_formats: cfAssignBlock() }, { customFormatDefinitions: [e2eCustomFormatDefinition(value)] });

    const created = await syncConfig(withValue("e2e-release"));
    assertPipelineSucceeded(created.result, ["LIDARR"]);
    const afterCreate = findNamed(await client.getCustomFormats(), "e2e-rt");
    expect(afterCreate).toBeTruthy();
    expect(cfReleaseTitleValue(afterCreate)).toBe("e2e-release");
    const snap = stripVolatile(afterCreate);

    const second = await syncConfig(withValue("e2e-release"), created.workspace);
    assertPipelineSucceeded(second.result, ["LIDARR"]);
    assertDiffUpToDate(second.result, ["LIDARR"]);
    expect(stripVolatile(findNamed(await client.getCustomFormats(), "e2e-rt"))).toEqual(snap);

    const updated = await syncConfig(withValue("e2e-release-2"), created.workspace);
    assertPipelineSucceeded(updated.result, ["LIDARR"]);
    expect(cfReleaseTitleValue(findNamed(await client.getCustomFormats(), "e2e-rt"))).toBe("e2e-release-2");

    const deleted = await syncConfig(
      mediaConfig(
        "LIDARR",
        { delete_unmanaged_custom_formats: { enabled: true, ignore: preexisting } },
        { customFormatDefinitions: [e2eCustomFormatDefinition()] },
      ),
      created.workspace,
    );
    assertPipelineSucceeded(deleted.result, ["LIDARR"]);
    expect(findNamed(await client.getCustomFormats(), "e2e-rt")).toBeUndefined();
  });

  test("quality profiles", async () => {
    const preexisting = nonE2eNames(await client.getQualityProfiles());
    const withScore = (min_format_score: number) =>
      mediaConfig(
        "LIDARR",
        {
          custom_formats: [{ trash_ids: ["e2e-rt"], assign_scores_to: [{ name: "e2e-qp", score: 10 }] }],
          quality_profiles: [qualityProfile(min_format_score)],
        },
        { customFormatDefinitions: [e2eCustomFormatDefinition()] },
      );

    const created = await syncConfig(withScore(0));
    assertPipelineSucceeded(created.result, ["LIDARR"]);
    const afterCreate = findNamed(await client.getQualityProfiles(), "e2e-qp");
    expect(afterCreate).toBeTruthy();
    expect(afterCreate?.minFormatScore ?? 0).toBe(0);
    const snap = stripVolatile(afterCreate);

    const second = await syncConfig(withScore(0), created.workspace);
    assertPipelineSucceeded(second.result, ["LIDARR"]);
    assertDiffUpToDate(second.result, ["LIDARR"]);
    expect(stripVolatile(findNamed(await client.getQualityProfiles(), "e2e-qp"))).toEqual(snap);

    const updated = await syncConfig(withScore(5), created.workspace);
    assertPipelineSucceeded(updated.result, ["LIDARR"]);
    expect(findNamed(await client.getQualityProfiles(), "e2e-qp")?.minFormatScore).toBe(5);

    const deleted = await syncConfig(
      mediaConfig("LIDARR", {
        custom_formats: cfAssignBlock(),
        delete_unmanaged_quality_profiles: { enabled: true, ignore: preexisting },
      }),
      created.workspace,
    );
    assertPipelineSucceeded(deleted.result, ["LIDARR"]);
    expect(findNamed(await client.getQualityProfiles(), "e2e-qp")).toBeUndefined();
  });

  test("quality definitions", async () => {
    const flac = async () => (await client.getQualityDefinitions()).find((d) => d.quality?.name === "FLAC");

    const created = await syncConfig(mediaConfig("LIDARR", { quality_definition: qualityDefinition(2) }));
    assertPipelineSucceeded(created.result, ["LIDARR"]);
    // Lidarr applies the bulk update asynchronously, so the first GET can still be stale.
    await waitUntil(async () => (await flac())?.minSize === 2);
    expect((await flac())?.maxSize).toBe(199.9);
    expect((await flac())?.preferredSize).toBe(50);

    const second = await syncConfig(mediaConfig("LIDARR", { quality_definition: qualityDefinition(2) }), created.workspace);
    assertPipelineSucceeded(second.result, ["LIDARR"]);
    assertDiffUpToDate(second.result, ["LIDARR"]);

    const updated = await syncConfig(mediaConfig("LIDARR", { quality_definition: qualityDefinition(3) }), created.workspace);
    assertPipelineSucceeded(updated.result, ["LIDARR"]);
    await waitUntil(async () => (await flac())?.minSize === 3);
  });

  test("media settings", async () => {
    const created = await syncConfig(mediaConfig("LIDARR", e2eMediaSettings(1)));
    assertPipelineSucceeded(created.result, ["LIDARR"]);
    expect(((await client.getMediamanagement()) as { recycleBin?: string }).recycleBin).toBe("/tmp");
    expect(((await client.getNaming()) as { replaceIllegalCharacters?: boolean }).replaceIllegalCharacters).toBe(true);
    expect(((await client.getUiConfig()) as { firstDayOfWeek?: number }).firstDayOfWeek).toBe(1);

    const updated = await syncConfig(mediaConfig("LIDARR", e2eMediaSettings(0)), created.workspace);
    assertPipelineSucceeded(updated.result, ["LIDARR"]);
    expect(((await client.getUiConfig()) as { firstDayOfWeek?: number }).firstDayOfWeek).toBe(0);
    expect(((await client.getMediamanagement()) as { recycleBin?: string }).recycleBin).toBe("/tmp");

    const second = await syncConfig(mediaConfig("LIDARR", e2eMediaSettings(0)), created.workspace);
    assertPipelineSucceeded(second.result, ["LIDARR"]);
    assertDiffUpToDate(second.result, ["LIDARR"]);
  });

  test("delay profiles", async () => {
    const yaml = (usenetDelay: number, additional: boolean) =>
      mediaConfig("LIDARR", { delay_profiles: delayProfiles(usenetDelay, additional) });
    const tagged = async () => (await client.getDelayProfiles()).filter((p) => Array.isArray(p.tags) && p.tags.length > 0);

    const created = await syncConfig(yaml(1, true));
    assertPipelineSucceeded(created.result, ["LIDARR"]);
    expect(defaultDelayProfile(await client.getDelayProfiles())).toBeTruthy();
    expect(await tagged()).toHaveLength(1);

    const second = await syncConfig(yaml(1, true), created.workspace);
    assertPipelineSucceeded(second.result, ["LIDARR"]);
    assertDiffUpToDate(second.result, ["LIDARR"]);

    const updated = await syncConfig(yaml(9, true), created.workspace);
    assertPipelineSucceeded(updated.result, ["LIDARR"]);
    const usenetDelayOf = (profile: LidarrDelayProfile | undefined) => profile?.items?.find((i) => i.name === "Usenet")?.delay;
    const profiles = (await client.getDelayProfiles()) as LidarrDelayProfile[];
    expect(usenetDelayOf(defaultDelayProfile(profiles))).toBe(9);
    expect(usenetDelayOf(profiles.find((p) => Array.isArray(p.tags) && p.tags.length > 0))).toBe(9);

    const omitted = await syncConfig(yaml(9, false), created.workspace);
    assertPipelineSucceeded(omitted.result, ["LIDARR"]);
    expect(await tagged()).toHaveLength(0);
  });

  test("delay profile mapper writes items[] and Lidarr rejects the legacy payload (#481)", async () => {
    // The default profile is not guaranteed to be id 1 on a server that already had one.
    const defaultId = defaultDelayProfile(await client.getDelayProfiles())?.id;
    expect(defaultId).toBeDefined();
    await expect(client.updateDelayProfile(String(defaultId), LEGACY_DELAY_PROFILE as never)).rejects.toThrow(/400/);

    const parsed = InputConfigDelayProfileSchema.parse({
      Items: [
        { name: "Usenet", protocol: "UsenetDownloadProtocol", allowed: true, delay: 2 },
        { name: "Torrent", protocol: "TorrentDownloadProtocol", allowed: true, delay: 0 },
      ],
      bypassIfHighestQuality: true,
      bypassIfAboveCustomFormatScore: true,
      minimumCustomFormatScore: 0,
    });
    const payload = new DelayProfileLidarrSync(client).mapToServer(parsed, []);
    expect(payload).not.toHaveProperty("enableUsenet");

    await client.updateDelayProfile(String(defaultId), payload);

    const def = defaultDelayProfile((await client.getDelayProfiles()) as LidarrDelayProfile[]);
    expect(def?.items).toEqual([
      { name: "Usenet", protocol: "UsenetDownloadProtocol", allowed: true, delay: 2 },
      { name: "Torrent", protocol: "TorrentDownloadProtocol", allowed: true, delay: 0 },
    ]);
    expect(def?.bypassIfAboveCustomFormatScore).toBe(true);
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
      mediaConfig("LIDARR", {
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
    assertPipelineSucceeded(created.result, ["LIDARR"]);
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
    assertPipelineSucceeded(flipped.result, ["LIDARR"]);
    expect(findNamed(await client.getDownloadClients(), "e2e-blackhole")?.priority).toBe(5);
    expect(await handlingNow()).toBe(original);

    const second = await syncConfig(yaml(true, true, 5, original), created.workspace);
    assertPipelineSucceeded(second.result, ["LIDARR"]);
    assertDiffUpToDate(second.result, ["LIDARR"]);

    const droppedPath = await syncConfig(yaml(true, false, 5, original), created.workspace);
    assertPipelineSucceeded(droppedPath.result, ["LIDARR"]);
    expect((await client.getRemotePathMappings()).some((p) => p.host === "e2e-host")).toBe(false);

    const deleted = await syncConfig(yaml(false, false, 5, original), created.workspace);
    assertPipelineSucceeded(deleted.result, ["LIDARR"]);
    expect(findNamed(await client.getDownloadClients(), "e2e-blackhole")).toBeUndefined();
  });

  // Ahead of the root-folder test: a root folder referencing e2e-meta would block its delete.
  test("metadata profiles", async () => {
    const ignore = [...new Set([...nonE2eNames(await client.getMetadataProfiles()), "None"])];

    const created = await syncConfig(mediaConfig("LIDARR", { metadata_profiles: [metadataProfile()] }));
    assertPipelineSucceeded(created.result, ["LIDARR"]);
    expect(findNamed(await client.getMetadataProfiles(), "e2e-meta")).toBeTruthy();

    const second = await syncConfig(mediaConfig("LIDARR", { metadata_profiles: [metadataProfile()] }), created.workspace);
    assertPipelineSucceeded(second.result, ["LIDARR"]);
    assertDiffUpToDate(second.result, ["LIDARR"]);

    const updated = await syncConfig(mediaConfig("LIDARR", { metadata_profiles: [metadataProfile(["Album", "EP"])] }), created.workspace);
    assertPipelineSucceeded(updated.result, ["LIDARR"]);
    const primaryTypes = findNamed(await client.getMetadataProfiles(), "e2e-meta")?.primaryAlbumTypes ?? [];
    const allowed = (name: string) => primaryTypes.some((item) => item.albumType?.name === name && item.allowed);
    expect(allowed("Album")).toBe(true);
    expect(allowed("EP")).toBe(true);

    const deleted = await syncConfig(
      mediaConfig("LIDARR", { delete_unmanaged_metadata_profiles: { enabled: true, ignore } }),
      created.workspace,
    );
    assertPipelineSucceeded(deleted.result, ["LIDARR"]);
    expect(findNamed(await client.getMetadataProfiles(), "e2e-meta")).toBeUndefined();
  });

  test("root folders", async () => {
    const preserved = await preservedRootFolderObjects(client);
    const yaml = (folders: Record<string, unknown>[]) =>
      mediaConfig("LIDARR", {
        quality_profiles: [qualityProfile()],
        metadata_profiles: [metadataProfile()],
        root_folders: [...folders, ...preserved],
      });
    const pathsOf = async () => (await client.getRootfolders()).map((f) => f.path ?? "");

    const created = await syncConfig(yaml([rootFolder(E2E_ROOT_A, "e2e-root"), rootFolder(E2E_ROOT_B, "e2e-root-b")]));
    assertPipelineSucceeded(created.result, ["LIDARR"]);
    expect(await pathsOf()).toEqual(expect.arrayContaining([E2E_ROOT_A, E2E_ROOT_B]));

    const second = await syncConfig(yaml([rootFolder(E2E_ROOT_A, "e2e-root"), rootFolder(E2E_ROOT_B, "e2e-root-b")]), created.workspace);
    assertPipelineSucceeded(second.result, ["LIDARR"]);
    assertDiffUpToDate(second.result, ["LIDARR"]);

    const renamed = await syncConfig(
      yaml([rootFolder(E2E_ROOT_A, "e2e-root-renamed"), rootFolder(E2E_ROOT_B, "e2e-root-b")]),
      created.workspace,
    );
    assertPipelineSucceeded(renamed.result, ["LIDARR"]);
    expect((await client.getRootfolders()).find((f) => f.path === E2E_ROOT_A)?.name).toBe("e2e-root-renamed");

    const deleted = await syncConfig(yaml([rootFolder(E2E_ROOT_A, "e2e-root-renamed")]), created.workspace);
    assertPipelineSucceeded(deleted.result, ["LIDARR"]);
    expect(await pathsOf()).toContain(E2E_ROOT_A);
    expect(await pathsOf()).not.toContain(E2E_ROOT_B);
  });
});
