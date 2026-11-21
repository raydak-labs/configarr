/**
 * Live Chaptarr e2e: every configarr feature, against the Chaptarr container only.
 *
 * One file per *arr, each with its own literal payloads - the YAML differs per app, and a
 * shared factory would hide that behind branches. Shared code stays in `helpers.ts`.
 */
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { DownloadProtocol } from "../../src/__generated__/readarr/data-contracts";
import { ChaptarrClient } from "../../src/clients/chaptarr-client";
import { StandardDelayProfileSync } from "../../src/delayProfiles/delayProfileBase";
import { InputConfigDelayProfileSchema } from "../../src/types/config.types";
import {
  arrConnection,
  cfAssignBlock,
  downloadClientConfigBlock,
  E2E_ROOT_A,
  E2E_ROOT_B,
  e2eCustomFormatDefinition,
  e2eMediaSettings,
  mediaConfig,
} from "./config";
import {
  assertDiffUpToDate,
  assertPipelineSucceeded,
  blackholeFromSchema,
  cfReleaseTitleValue,
  cleanupMediaE2e,
  cleanupMetadataProfilesE2e,
  defaultDelayProfile,
  findNamed,
  type MediaBaseline,
  nonE2eNames,
  preservedRootFolderObjects,
  restoreMediaBaseline,
  seedHostConfigWrite,
  snapshotMediaBaseline,
  stripVolatile,
  syncConfig,
  teardown,
  waitUntil,
} from "./helpers";

const chaptarrConfig = (instance: Record<string, unknown> = {}, root: Record<string, unknown> = {}) =>
  mediaConfig("CHAPTARR", { media_type: "ebook", ...instance }, root);

const qualityProfile = (min_format_score = 0) => ({
  name: "e2e-qp",
  upgrade: { allowed: true, until_quality: "EPUB", until_score: 100 },
  min_format_score,
  qualities: [{ name: "EPUB" }],
});

const qualityDefinition = (min: number) => ({ qualities: [{ quality: "EPUB", min, preferred: 50, max: 199.9 }] });

const metadataProfile = (min_popularity = 0) => ({
  name: "e2e-meta",
  min_popularity,
  skip_missing_date: false,
  allowed_languages: ["eng"],
});

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

/** Readarr root folders are objects and need both profiles by name. */
const rootFolder = (path: string, name: string) => ({ path, name, metadata_profile: "e2e-meta", quality_profile: "e2e-qp" });

describe("chaptarr (live)", () => {
  const { baseUrl, apiKey } = arrConnection("CHAPTARR");
  const client = new ChaptarrClient(baseUrl, apiKey);
  let baseline: MediaBaseline;

  beforeAll(async () => {
    await cleanupMediaE2e(client);
    await cleanupMetadataProfilesE2e(client);
    await seedHostConfigWrite(client);
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
      chaptarrConfig({ custom_formats: cfAssignBlock() }, { customFormatDefinitions: [e2eCustomFormatDefinition(value)] });

    const created = await syncConfig(withValue("e2e-release"));
    assertPipelineSucceeded(created.result, ["CHAPTARR"]);
    const afterCreate = findNamed(await client.getCustomFormats(), "e2e-rt");
    expect(afterCreate).toBeTruthy();
    expect(cfReleaseTitleValue(afterCreate)).toBe("e2e-release");
    const snap = stripVolatile(afterCreate);

    const second = await syncConfig(withValue("e2e-release"), created.workspace);
    assertPipelineSucceeded(second.result, ["CHAPTARR"]);
    assertDiffUpToDate(second.result, ["CHAPTARR"]);
    expect(stripVolatile(findNamed(await client.getCustomFormats(), "e2e-rt"))).toEqual(snap);

    const updated = await syncConfig(withValue("e2e-release-2"), created.workspace);
    assertPipelineSucceeded(updated.result, ["CHAPTARR"]);
    expect(cfReleaseTitleValue(findNamed(await client.getCustomFormats(), "e2e-rt"))).toBe("e2e-release-2");

    const deleted = await syncConfig(
      chaptarrConfig(
        { delete_unmanaged_custom_formats: { enabled: true, ignore: preexisting } },
        { customFormatDefinitions: [e2eCustomFormatDefinition()] },
      ),
      created.workspace,
    );
    assertPipelineSucceeded(deleted.result, ["CHAPTARR"]);
    expect(findNamed(await client.getCustomFormats(), "e2e-rt")).toBeUndefined();
  });

  test("quality profiles", async () => {
    const preexisting = nonE2eNames(await client.getQualityProfiles());
    const withScore = (min_format_score: number) =>
      chaptarrConfig(
        {
          custom_formats: [{ trash_ids: ["e2e-rt"], assign_scores_to: [{ name: "e2e-qp", score: 10 }] }],
          quality_profiles: [qualityProfile(min_format_score)],
        },
        { customFormatDefinitions: [e2eCustomFormatDefinition()] },
      );

    const created = await syncConfig(withScore(0));
    assertPipelineSucceeded(created.result, ["CHAPTARR"]);
    const afterCreate = findNamed(await client.getQualityProfiles(), "e2e-qp");
    expect(afterCreate).toBeTruthy();
    expect(afterCreate?.minFormatScore ?? 0).toBe(0);
    expect((afterCreate as { profileType?: string })?.profileType).toBe("ebook");
    const snap = stripVolatile(afterCreate);

    const second = await syncConfig(withScore(0), created.workspace);
    assertPipelineSucceeded(second.result, ["CHAPTARR"]);
    assertDiffUpToDate(second.result, ["CHAPTARR"]);
    expect(stripVolatile(findNamed(await client.getQualityProfiles(), "e2e-qp"))).toEqual(snap);

    const updated = await syncConfig(withScore(5), created.workspace);
    assertPipelineSucceeded(updated.result, ["CHAPTARR"]);
    expect(findNamed(await client.getQualityProfiles(), "e2e-qp")?.minFormatScore).toBe(5);

    const deleted = await syncConfig(
      chaptarrConfig({
        custom_formats: cfAssignBlock(),
        delete_unmanaged_quality_profiles: { enabled: true, ignore: preexisting },
      }),
      created.workspace,
    );
    assertPipelineSucceeded(deleted.result, ["CHAPTARR"]);
    expect(findNamed(await client.getQualityProfiles(), "e2e-qp")).toBeUndefined();
  });

  test("quality profile groups keep their server ids across config reorders", async () => {
    const preexisting = nonE2eNames(await client.getQualityProfiles());
    const groups = [
      { name: "Text", qualities: ["EPUB", "MOBI"] },
      { name: "Converted", qualities: ["AZW3", "PDF"] },
    ];
    const yaml = (reverse: boolean) =>
      chaptarrConfig({
        quality_profiles: [
          {
            name: "e2e-qp-groups",
            upgrade: { allowed: false, until_quality: "Text" },
            min_format_score: 0,
            qualities: reverse ? [...groups].reverse() : groups,
          },
        ],
      });
    const groupIds = async () => {
      const profile = findNamed(await client.getQualityProfiles(), "e2e-qp-groups");
      const ids = new Map<string, number | undefined>();

      for (const item of profile?.items ?? []) {
        if (item.name != null) {
          ids.set(item.name, item.id);
        }
      }

      return ids;
    };

    const created = await syncConfig(yaml(false));
    assertPipelineSucceeded(created.result, ["CHAPTARR"]);
    const initial = await groupIds();
    const textId = initial.get("Text");
    const convertedId = initial.get("Converted");
    expect(textId).toBeDefined();
    expect(textId!).toBeGreaterThanOrEqual(1000);
    expect(convertedId).toBeDefined();
    expect(convertedId).not.toBe(textId);
    expect(findNamed(await client.getQualityProfiles(), "e2e-qp-groups")?.cutoff).toBe(textId);

    const second = await syncConfig(yaml(false), created.workspace);
    assertPipelineSucceeded(second.result, ["CHAPTARR"]);
    assertDiffUpToDate(second.result, ["CHAPTARR"]);

    // Reordering the groups must keep each id on its name instead of renumbering by config index.
    const reordered = await syncConfig(yaml(true), created.workspace);
    assertPipelineSucceeded(reordered.result, ["CHAPTARR"]);
    const afterReorder = await groupIds();
    expect(afterReorder.get("Text")).toBe(textId);
    expect(afterReorder.get("Converted")).toBe(convertedId);
    expect(findNamed(await client.getQualityProfiles(), "e2e-qp-groups")?.cutoff).toBe(textId);

    const third = await syncConfig(yaml(true), created.workspace);
    assertPipelineSucceeded(third.result, ["CHAPTARR"]);
    assertDiffUpToDate(third.result, ["CHAPTARR"]);

    const deleted = await syncConfig(
      chaptarrConfig({ delete_unmanaged_quality_profiles: { enabled: true, ignore: preexisting } }),
      created.workspace,
    );
    assertPipelineSucceeded(deleted.result, ["CHAPTARR"]);
    expect(findNamed(await client.getQualityProfiles(), "e2e-qp-groups")).toBeUndefined();
  });

  test("quality definitions", async () => {
    const epub = async () => (await client.getQualityDefinitions()).find((d) => d.quality?.name === "EPUB");

    const created = await syncConfig(chaptarrConfig({ quality_definition: qualityDefinition(2) }));
    assertPipelineSucceeded(created.result, ["CHAPTARR"]);
    // Readarr applies the bulk update asynchronously, so the first GET can still be stale.
    await waitUntil(async () => (await epub())?.minSize === 2);
    expect((await epub())?.maxSize).toBe(199.9);

    const second = await syncConfig(chaptarrConfig({ quality_definition: qualityDefinition(2) }), created.workspace);
    assertPipelineSucceeded(second.result, ["CHAPTARR"]);
    assertDiffUpToDate(second.result, ["CHAPTARR"]);

    const updated = await syncConfig(chaptarrConfig({ quality_definition: qualityDefinition(3) }), created.workspace);
    assertPipelineSucceeded(updated.result, ["CHAPTARR"]);
    await waitUntil(async () => (await epub())?.minSize === 3);
  });

  test("media settings", async () => {
    const created = await syncConfig(chaptarrConfig(e2eMediaSettings(1)));
    assertPipelineSucceeded(created.result, ["CHAPTARR"]);
    expect(((await client.getMediamanagement()) as { recycleBin?: string }).recycleBin).toBe("/tmp");
    expect(((await client.getNaming()) as { replaceIllegalCharacters?: boolean }).replaceIllegalCharacters).toBe(true);
    expect(((await client.getUiConfig()) as { firstDayOfWeek?: number }).firstDayOfWeek).toBe(1);

    const updated = await syncConfig(chaptarrConfig(e2eMediaSettings(0)), created.workspace);
    assertPipelineSucceeded(updated.result, ["CHAPTARR"]);
    expect(((await client.getUiConfig()) as { firstDayOfWeek?: number }).firstDayOfWeek).toBe(0);
    expect(((await client.getMediamanagement()) as { recycleBin?: string }).recycleBin).toBe("/tmp");

    const second = await syncConfig(chaptarrConfig(e2eMediaSettings(0)), created.workspace);
    assertPipelineSucceeded(second.result, ["CHAPTARR"]);
    assertDiffUpToDate(second.result, ["CHAPTARR"]);
  });

  test("maps book naming to the ebook keys", async () => {
    const config = chaptarrConfig({
      media_naming_api: {
        standardBookFormat: "{Book Title}/{Book Title}{ (PartNumber:smart)}",
        authorFolderFormat: "{Author NameFirstLast}",
      },
    });
    const first = await syncConfig(config);
    assertPipelineSucceeded(first.result, ["CHAPTARR"]);

    const naming = (await client.getNaming()) as Record<string, unknown>;
    expect(naming.ebookStandardBookFormat).toBe("{Book Title}/{Book Title}{ (PartNumber:smart)}");
    expect(naming.ebookAuthorFolderFormat).toBe("{Author NameFirstLast}");

    const second = await syncConfig(config, first.workspace);
    assertPipelineSucceeded(second.result, ["CHAPTARR"]);
    assertDiffUpToDate(second.result, ["CHAPTARR"]);
  });

  test("delay profiles", async () => {
    const yaml = (usenetDelay: number, additional: boolean) => chaptarrConfig({ delay_profiles: delayProfiles(usenetDelay, additional) });
    const tagged = async () => (await client.getDelayProfiles()).filter((p) => Array.isArray(p.tags) && p.tags.length > 0);

    const created = await syncConfig(yaml(1, true));
    assertPipelineSucceeded(created.result, ["CHAPTARR"]);
    expect(defaultDelayProfile(await client.getDelayProfiles())).toBeTruthy();
    expect(await tagged()).toHaveLength(1);

    const second = await syncConfig(yaml(1, true), created.workspace);
    assertPipelineSucceeded(second.result, ["CHAPTARR"]);
    assertDiffUpToDate(second.result, ["CHAPTARR"]);

    const updated = await syncConfig(yaml(9, true), created.workspace);
    assertPipelineSucceeded(updated.result, ["CHAPTARR"]);
    expect(defaultDelayProfile(await client.getDelayProfiles())?.usenetDelay).toBe(9);
    expect((await tagged())[0]?.usenetDelay).toBe(9);

    const omitted = await syncConfig(yaml(9, false), created.workspace);
    assertPipelineSucceeded(omitted.result, ["CHAPTARR"]);
    expect(await tagged()).toHaveLength(0);
  });

  test("release profiles", async () => {
    const yaml = (required: string[], include: boolean) =>
      chaptarrConfig({
        release_profiles: include ? [{ required, ignored: ["xvid"], tags: ["e2e-release"] }] : [],
      });
    const managed = async () => {
      const tag = (await client.getTags()).find((t) => t.label === "e2e-release");
      return (await client.getReleaseProfiles()).filter((p) => tag?.id != null && p.tags?.includes(tag.id));
    };

    const created = await syncConfig(yaml(["hevc"], true));
    assertPipelineSucceeded(created.result, ["CHAPTARR"]);
    expect(await managed()).toHaveLength(1);

    const second = await syncConfig(yaml(["hevc"], true), created.workspace);
    assertPipelineSucceeded(second.result, ["CHAPTARR"]);
    assertDiffUpToDate(second.result, ["CHAPTARR"]);

    const updated = await syncConfig(yaml(["hevc", "x265"], true), created.workspace);
    assertPipelineSucceeded(updated.result, ["CHAPTARR"]);
    expect((await managed())[0]?.required).toEqual(expect.arrayContaining(["hevc", "x265"]));

    const removed = await syncConfig(yaml(["hevc"], false), created.workspace);
    assertPipelineSucceeded(removed.result, ["CHAPTARR"]);
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
      .filter((p) => p.host !== "e2e-host" && p.host !== "e2e-unc")
      .map((p) => ({ host: p.host ?? "", remote_path: p.remotePath ?? "", local_path: p.localPath ?? "" }));
    const blackhole = blackholeFromSchema(await client.getDownloadClientSchema());
    expect(blackhole, "TorrentBlackhole/UsenetBlackhole schema").toBeTruthy();

    const original = !!(baseline.downloadClientConfig as { enableCompletedDownloadHandling?: boolean }).enableCompletedDownloadHandling;
    const yaml = (includeClient: boolean, includeRemote: boolean, priority: number, handling: boolean) =>
      chaptarrConfig({
        download_clients: {
          data: includeClient ? [{ name: "e2e-blackhole", type: blackhole!.type, enable: false, priority, fields: blackhole!.fields }] : [],
          delete_unmanaged: { enabled: !includeClient, ignore: preexisting },
          config: downloadClientConfigBlock(handling),
          remote_paths: includeRemote
            ? [
                ...preexistingPaths,
                { host: "e2e-host", remote_path: "/downloads", local_path: E2E_ROOT_A },
                { host: "e2e-unc", remote_path: "\\\\server\\share\\downloads", local_path: E2E_ROOT_A },
              ]
            : preexistingPaths,
          delete_unmanaged_remote_paths: true,
        },
      });
    const handlingNow = async () =>
      ((await client.getDownloadClientConfig()) as { enableCompletedDownloadHandling?: boolean }).enableCompletedDownloadHandling;

    const created = await syncConfig(yaml(true, true, 20, !original));
    assertPipelineSucceeded(created.result, ["CHAPTARR"]);
    const dc = findNamed(await client.getDownloadClients(), "e2e-blackhole");
    expect(dc, `e2e-blackhole did not persist\n${created.result.stdout}`).toBeTruthy();
    expect(dc?.enable).toBe(false);
    expect(dc?.priority).toBe(20);
    expect(await handlingNow()).toBe(!original);
    // *arr stores the local path with a trailing separator.
    const e2ePathMapped = async () =>
      (await client.getRemotePathMappings()).some((p) => p.host === "e2e-host" && (p.localPath ?? "").replace(/\/+$/, "") === E2E_ROOT_A);
    await waitUntil(e2ePathMapped);
    const mapped = (await client.getRemotePathMappings()).find((mapping) => mapping.host === "e2e-host");
    expect(mapped).toHaveProperty("downloadClientId", 0);
    // A UNC remote path keeps a trailing `\` in *arr; the next run must still match it.
    const e2eUncPath = async () => (await client.getRemotePathMappings()).find((p) => p.host === "e2e-unc");
    await waitUntil(async () => (await e2eUncPath())?.remotePath === "\\\\server\\share\\downloads\\");
    expect((await e2eUncPath())?.remotePath).toBe("\\\\server\\share\\downloads\\");
    expect(((await e2eUncPath())?.localPath ?? "").replace(/\/+$/, "")).toBe(E2E_ROOT_A);

    const flipped = await syncConfig(yaml(true, true, 5, original), created.workspace);
    assertPipelineSucceeded(flipped.result, ["CHAPTARR"]);
    expect(findNamed(await client.getDownloadClients(), "e2e-blackhole")?.priority).toBe(5);
    expect(await handlingNow()).toBe(original);

    const second = await syncConfig(yaml(true, true, 5, original), created.workspace);
    assertPipelineSucceeded(second.result, ["CHAPTARR"]);
    assertDiffUpToDate(second.result, ["CHAPTARR"]);

    const droppedPath = await syncConfig(yaml(true, false, 5, original), created.workspace);
    assertPipelineSucceeded(droppedPath.result, ["CHAPTARR"]);
    expect((await client.getRemotePathMappings()).some((p) => p.host === "e2e-host" || p.host === "e2e-unc")).toBe(false);

    const deleted = await syncConfig(yaml(false, false, 5, original), created.workspace);
    assertPipelineSucceeded(deleted.result, ["CHAPTARR"]);
    expect(findNamed(await client.getDownloadClients(), "e2e-blackhole")).toBeUndefined();
  });

  // Ahead of the root-folder test: a root folder referencing e2e-meta would block its delete.
  test("metadata profiles", async () => {
    const ignore = [...new Set([...nonE2eNames(await client.getMetadataProfiles()), "None"])];

    const created = await syncConfig(chaptarrConfig({ metadata_profiles: [metadataProfile()] }));
    assertPipelineSucceeded(created.result, ["CHAPTARR"]);
    expect(findNamed(await client.getMetadataProfiles(), "e2e-meta")).toBeTruthy();

    const second = await syncConfig(chaptarrConfig({ metadata_profiles: [metadataProfile()] }), created.workspace);
    assertPipelineSucceeded(second.result, ["CHAPTARR"]);
    assertDiffUpToDate(second.result, ["CHAPTARR"]);

    const updated = await syncConfig(chaptarrConfig({ metadata_profiles: [metadataProfile(1)] }), created.workspace);
    assertPipelineSucceeded(updated.result, ["CHAPTARR"]);
    expect(findNamed(await client.getMetadataProfiles(), "e2e-meta")?.minPopularity).toBe(1);

    const deleted = await syncConfig(chaptarrConfig({ delete_unmanaged_metadata_profiles: { enabled: true, ignore } }), created.workspace);
    assertPipelineSucceeded(deleted.result, ["CHAPTARR"]);
    expect(findNamed(await client.getMetadataProfiles(), "e2e-meta")).toBeUndefined();
  });

  test("root folders", async () => {
    const preserved = await preservedRootFolderObjects(client);
    const yaml = (folders: Record<string, unknown>[]) =>
      chaptarrConfig({
        quality_profiles: [qualityProfile()],
        metadata_profiles: [metadataProfile()],
        root_folders: [...folders, ...preserved],
      });
    const pathsOf = async () => (await client.getRootfolders()).map((f) => f.path ?? "");

    const created = await syncConfig(
      yaml([{ ...rootFolder(E2E_ROOT_A, "e2e-root"), tags: ["e2e-release"] }, rootFolder(E2E_ROOT_B, "e2e-root-b")]),
    );
    assertPipelineSucceeded(created.result, ["CHAPTARR"]);
    expect(await pathsOf()).toEqual(expect.arrayContaining([E2E_ROOT_A, E2E_ROOT_B]));
    const root = (await client.getRootfolders()).find((folder) => folder.path === E2E_ROOT_A);
    expect(root).toMatchObject({ folderType: 2 });
    expect(root).toHaveProperty("ebookQualityProfileId");
    // Typed folders use the per-media ids, not the Readarr defaults.
    expect(root).not.toHaveProperty("defaultQualityProfileId");
    expect(root).not.toHaveProperty("defaultMetadataProfileId");

    const second = await syncConfig(
      yaml([{ ...rootFolder(E2E_ROOT_A, "e2e-root"), tags: ["e2e-release"] }, rootFolder(E2E_ROOT_B, "e2e-root-b")]),
      created.workspace,
    );
    assertPipelineSucceeded(second.result, ["CHAPTARR"]);
    assertDiffUpToDate(second.result, ["CHAPTARR"]);

    const tagChanged = await syncConfig(
      yaml([{ ...rootFolder(E2E_ROOT_A, "e2e-root"), tags: ["e2e-release-excluded"] }, rootFolder(E2E_ROOT_B, "e2e-root-b")]),
      created.workspace,
    );
    assertPipelineSucceeded(tagChanged.result, ["CHAPTARR"]);
    const newTag = (await client.getTags()).find((tag) => tag.label === "e2e-release-excluded");
    expect((await client.getRootfolders()).find((folder) => folder.path === E2E_ROOT_A)?.defaultTags).toEqual([newTag?.id]);

    const renamed = await syncConfig(
      yaml([{ ...rootFolder(E2E_ROOT_A, "e2e-root-renamed"), tags: ["e2e-release-excluded"] }, rootFolder(E2E_ROOT_B, "e2e-root-b")]),
      created.workspace,
    );
    assertPipelineSucceeded(renamed.result, ["CHAPTARR"]);
    expect((await client.getRootfolders()).find((f) => f.path === E2E_ROOT_A)?.name).toBe("e2e-root-renamed");

    const deleted = await syncConfig(
      yaml([{ ...rootFolder(E2E_ROOT_A, "e2e-root-renamed"), tags: ["e2e-release-excluded"] }]),
      created.workspace,
    );
    assertPipelineSucceeded(deleted.result, ["CHAPTARR"]);
    expect(await pathsOf()).toContain(E2E_ROOT_A);
    expect(await pathsOf()).not.toContain(E2E_ROOT_B);
  });

  test("global indexer config", async () => {
    const yaml = (rss: number, retention: number) =>
      chaptarrConfig({
        indexer_config: {
          rss_sync_interval: rss,
          retention,
        },
      });

    const created = await syncConfig(yaml(60, 30));
    assertPipelineSucceeded(created.result, ["CHAPTARR"]);
    let current = await client.getIndexerConfig();
    expect(current.rssSyncInterval).toBe(60);
    expect(current.retention).toBe(30);

    const updated = await syncConfig(yaml(120, 60), created.workspace);
    assertPipelineSucceeded(updated.result, ["CHAPTARR"]);
    current = await client.getIndexerConfig();
    expect(current.rssSyncInterval).toBe(120);
    expect(current.retention).toBe(60);

    const second = await syncConfig(yaml(120, 60), created.workspace);
    assertPipelineSucceeded(second.result, ["CHAPTARR"]);
    assertDiffUpToDate(second.result, ["CHAPTARR"]);
  });

  test("notification connections", async () => {
    const preexisting = nonE2eNames(await client.getNotifications());
    const yaml = (includeNotif: boolean, onHealthIssue = false, includeHealthWarnings = false, listHealthEvent = true) =>
      chaptarrConfig({
        notifications: {
          data: includeNotif
            ? [
                {
                  name: "e2e-notification",
                  type: "CustomScript",
                  events: listHealthEvent ? { on_grab: true, on_health_issue: onHealthIssue } : { on_grab: true },
                  include_health_warnings: includeHealthWarnings,
                  fields: { path: "/data/e2e/e2e-notification.sh" },
                  tags: ["e2e-notif-tag"],
                },
              ]
            : [],
          delete_unmanaged: { enabled: true, ignore: preexisting },
        },
      });

    const created = await syncConfig(yaml(true, false, false));
    assertPipelineSucceeded(created.result, ["CHAPTARR"]);
    let notif = findNamed(await client.getNotifications(), "e2e-notification");
    expect(notif, "e2e-notification did not persist").toBeTruthy();
    expect(notif?.onGrab).toBe(true);
    expect(notif?.onHealthIssue).toBe(false);
    expect(notif?.includeHealthWarnings).toBe(false);
    const pathField = notif?.fields?.find((f: { name?: string | null }) => f.name === "path");
    expect(pathField?.value).toBe("/data/e2e/e2e-notification.sh");
    const tag = (await client.getTags()).find((item) => item.label === "e2e-notif-tag");
    expect(tag?.id).toBeTruthy();
    expect(notif?.tags).toContain(tag?.id);

    const updated = await syncConfig(yaml(true, true, true), created.workspace);
    assertPipelineSucceeded(updated.result, ["CHAPTARR"]);
    notif = findNamed(await client.getNotifications(), "e2e-notification");
    expect(notif?.onGrab).toBe(true);
    expect(notif?.onHealthIssue).toBe(true);
    expect(notif?.includeHealthWarnings).toBe(true);

    const omitted = await syncConfig(yaml(true, true, true, false), created.workspace);
    assertPipelineSucceeded(omitted.result, ["CHAPTARR"]);
    notif = findNamed(await client.getNotifications(), "e2e-notification");
    expect(notif?.onGrab).toBe(true);
    expect(notif?.onHealthIssue).toBe(true);
    expect(notif?.includeHealthWarnings).toBe(true);

    const second = await syncConfig(yaml(true, true, true, false), created.workspace);
    assertPipelineSucceeded(second.result, ["CHAPTARR"]);
    assertDiffUpToDate(second.result, ["CHAPTARR"]);

    const deleted = await syncConfig(yaml(false, false, false), created.workspace);
    assertPipelineSucceeded(deleted.result, ["CHAPTARR"]);
    expect(findNamed(await client.getNotifications(), "e2e-notification")).toBeUndefined();
  });

  test("syncs the backup policy and stays idempotent", async () => {
    const original = await client.getHostConfig();
    const backup_interval = original.backupInterval === 7 ? 1 : 7;
    const backup_retention = original.backupRetention === 28 ? 7 : 28;
    const backup_folder = original.backupFolder === "Backups-e2e" ? "Backups" : "Backups-e2e";
    try {
      const config = chaptarrConfig({ host_config: { backup_folder, backup_interval, backup_retention } });
      const first = await syncConfig(config);
      assertPipelineSucceeded(first.result, ["CHAPTARR"]);
      const updated = await client.getHostConfig();
      expect(updated.backupInterval).toBe(backup_interval);
      expect(updated.backupRetention).toBe(backup_retention);
      expect(updated.backupFolder).toBe(backup_folder);
      const second = await syncConfig(config, first.workspace);
      assertPipelineSucceeded(second.result, ["CHAPTARR"]);
      assertDiffUpToDate(second.result, ["CHAPTARR"]);
    } finally {
      await client.updateHostConfig(String(original.id), original);
    }
  });
});
