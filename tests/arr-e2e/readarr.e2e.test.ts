/**
 * Live Readarr e2e: every configarr feature, against the Readarr container only.
 *
 * One file per *arr, each with its own literal payloads - the YAML differs per app, and a
 * shared factory would hide that behind branches. Shared code stays in `helpers.ts`.
 */
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { DownloadProtocol } from "../../src/__generated__/readarr/data-contracts";
import { ReadarrClient } from "../../src/clients/readarr-client";
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
  waitUntil,
} from "./helpers";

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

describe("readarr (live)", () => {
  const { baseUrl, apiKey } = arrConnection("READARR");
  const client = new ReadarrClient(baseUrl, apiKey);
  let baseline: MediaBaseline;

  beforeAll(async () => {
    await cleanupMediaE2e(client);
    await cleanupMetadataProfilesE2e(client);
    baseline = await snapshotMediaBaseline(client);
  }, 180_000);

  afterAll(async () => {
    await restoreMediaBaseline(client, baseline);
    await cleanupMediaE2e(client);
    await cleanupMetadataProfilesE2e(client);
  });

  test("custom formats", async () => {
    const preexisting = nonE2eNames(await client.getCustomFormats());
    const withValue = (value: string) =>
      mediaConfig("READARR", { custom_formats: cfAssignBlock() }, { customFormatDefinitions: [e2eCustomFormatDefinition(value)] });

    const created = await syncConfig(withValue("e2e-release"));
    assertPipelineSucceeded(created.result, ["READARR"]);
    const afterCreate = findNamed(await client.getCustomFormats(), "e2e-rt");
    expect(afterCreate).toBeTruthy();
    expect(cfReleaseTitleValue(afterCreate)).toBe("e2e-release");
    const snap = stripVolatile(afterCreate);

    const second = await syncConfig(withValue("e2e-release"), created.workspace);
    assertPipelineSucceeded(second.result, ["READARR"]);
    assertDiffUpToDate(second.result, ["READARR"]);
    expect(stripVolatile(findNamed(await client.getCustomFormats(), "e2e-rt"))).toEqual(snap);

    const updated = await syncConfig(withValue("e2e-release-2"), created.workspace);
    assertPipelineSucceeded(updated.result, ["READARR"]);
    expect(cfReleaseTitleValue(findNamed(await client.getCustomFormats(), "e2e-rt"))).toBe("e2e-release-2");

    const deleted = await syncConfig(
      mediaConfig(
        "READARR",
        { delete_unmanaged_custom_formats: { enabled: true, ignore: preexisting } },
        { customFormatDefinitions: [e2eCustomFormatDefinition()] },
      ),
      created.workspace,
    );
    assertPipelineSucceeded(deleted.result, ["READARR"]);
    expect(findNamed(await client.getCustomFormats(), "e2e-rt")).toBeUndefined();
  });

  test("quality profiles", async () => {
    const preexisting = nonE2eNames(await client.getQualityProfiles());
    const withScore = (min_format_score: number) =>
      mediaConfig(
        "READARR",
        {
          custom_formats: [{ trash_ids: ["e2e-rt"], assign_scores_to: [{ name: "e2e-qp", score: 10 }] }],
          quality_profiles: [qualityProfile(min_format_score)],
        },
        { customFormatDefinitions: [e2eCustomFormatDefinition()] },
      );

    const created = await syncConfig(withScore(0));
    assertPipelineSucceeded(created.result, ["READARR"]);
    const afterCreate = findNamed(await client.getQualityProfiles(), "e2e-qp");
    expect(afterCreate).toBeTruthy();
    expect(afterCreate?.minFormatScore ?? 0).toBe(0);
    const snap = stripVolatile(afterCreate);

    const second = await syncConfig(withScore(0), created.workspace);
    assertPipelineSucceeded(second.result, ["READARR"]);
    assertDiffUpToDate(second.result, ["READARR"]);
    expect(stripVolatile(findNamed(await client.getQualityProfiles(), "e2e-qp"))).toEqual(snap);

    const updated = await syncConfig(withScore(5), created.workspace);
    assertPipelineSucceeded(updated.result, ["READARR"]);
    expect(findNamed(await client.getQualityProfiles(), "e2e-qp")?.minFormatScore).toBe(5);

    const deleted = await syncConfig(
      mediaConfig("READARR", {
        custom_formats: cfAssignBlock(),
        delete_unmanaged_quality_profiles: { enabled: true, ignore: preexisting },
      }),
      created.workspace,
    );
    assertPipelineSucceeded(deleted.result, ["READARR"]);
    expect(findNamed(await client.getQualityProfiles(), "e2e-qp")).toBeUndefined();
  });

  test("quality definitions", async () => {
    const epub = async () => (await client.getQualityDefinitions()).find((d) => d.quality?.name === "EPUB");

    const created = await syncConfig(mediaConfig("READARR", { quality_definition: qualityDefinition(2) }));
    assertPipelineSucceeded(created.result, ["READARR"]);
    // Readarr applies the bulk update asynchronously, so the first GET can still be stale.
    await waitUntil(async () => (await epub())?.minSize === 2);
    expect((await epub())?.maxSize).toBe(199.9);

    const second = await syncConfig(mediaConfig("READARR", { quality_definition: qualityDefinition(2) }), created.workspace);
    assertPipelineSucceeded(second.result, ["READARR"]);
    assertDiffUpToDate(second.result, ["READARR"]);

    const updated = await syncConfig(mediaConfig("READARR", { quality_definition: qualityDefinition(3) }), created.workspace);
    assertPipelineSucceeded(updated.result, ["READARR"]);
    await waitUntil(async () => (await epub())?.minSize === 3);
  });

  test("media settings", async () => {
    const created = await syncConfig(mediaConfig("READARR", e2eMediaSettings(1)));
    assertPipelineSucceeded(created.result, ["READARR"]);
    expect(((await client.getMediamanagement()) as { recycleBin?: string }).recycleBin).toBe("/tmp");
    expect(((await client.getNaming()) as { replaceIllegalCharacters?: boolean }).replaceIllegalCharacters).toBe(true);
    expect(((await client.getUiConfig()) as { firstDayOfWeek?: number }).firstDayOfWeek).toBe(1);

    const updated = await syncConfig(mediaConfig("READARR", e2eMediaSettings(0)), created.workspace);
    assertPipelineSucceeded(updated.result, ["READARR"]);
    expect(((await client.getUiConfig()) as { firstDayOfWeek?: number }).firstDayOfWeek).toBe(0);
    expect(((await client.getMediamanagement()) as { recycleBin?: string }).recycleBin).toBe("/tmp");

    const second = await syncConfig(mediaConfig("READARR", e2eMediaSettings(0)), created.workspace);
    assertPipelineSucceeded(second.result, ["READARR"]);
    assertDiffUpToDate(second.result, ["READARR"]);
  });

  test("delay profiles", async () => {
    const yaml = (usenetDelay: number, additional: boolean) =>
      mediaConfig("READARR", { delay_profiles: delayProfiles(usenetDelay, additional) });
    const tagged = async () => (await client.getDelayProfiles()).filter((p) => Array.isArray(p.tags) && p.tags.length > 0);

    const created = await syncConfig(yaml(1, true));
    assertPipelineSucceeded(created.result, ["READARR"]);
    expect(defaultDelayProfile(await client.getDelayProfiles())).toBeTruthy();
    expect(await tagged()).toHaveLength(1);

    const second = await syncConfig(yaml(1, true), created.workspace);
    assertPipelineSucceeded(second.result, ["READARR"]);
    assertDiffUpToDate(second.result, ["READARR"]);

    const updated = await syncConfig(yaml(9, true), created.workspace);
    assertPipelineSucceeded(updated.result, ["READARR"]);
    expect(defaultDelayProfile(await client.getDelayProfiles())?.usenetDelay).toBe(9);
    expect((await tagged())[0]?.usenetDelay).toBe(9);

    const omitted = await syncConfig(yaml(9, false), created.workspace);
    assertPipelineSucceeded(omitted.result, ["READARR"]);
    expect(await tagged()).toHaveLength(0);
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
      mediaConfig("READARR", {
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
    assertPipelineSucceeded(created.result, ["READARR"]);
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
    assertPipelineSucceeded(flipped.result, ["READARR"]);
    expect(findNamed(await client.getDownloadClients(), "e2e-blackhole")?.priority).toBe(5);
    expect(await handlingNow()).toBe(original);

    const second = await syncConfig(yaml(true, true, 5, original), created.workspace);
    assertPipelineSucceeded(second.result, ["READARR"]);
    assertDiffUpToDate(second.result, ["READARR"]);

    const droppedPath = await syncConfig(yaml(true, false, 5, original), created.workspace);
    assertPipelineSucceeded(droppedPath.result, ["READARR"]);
    expect((await client.getRemotePathMappings()).some((p) => p.host === "e2e-host")).toBe(false);

    const deleted = await syncConfig(yaml(false, false, 5, original), created.workspace);
    assertPipelineSucceeded(deleted.result, ["READARR"]);
    expect(findNamed(await client.getDownloadClients(), "e2e-blackhole")).toBeUndefined();
  });

  // Ahead of the root-folder test: a root folder referencing e2e-meta would block its delete.
  test("metadata profiles", async () => {
    const ignore = [...new Set([...nonE2eNames(await client.getMetadataProfiles()), "None"])];

    const created = await syncConfig(mediaConfig("READARR", { metadata_profiles: [metadataProfile()] }));
    assertPipelineSucceeded(created.result, ["READARR"]);
    expect(findNamed(await client.getMetadataProfiles(), "e2e-meta")).toBeTruthy();

    const second = await syncConfig(mediaConfig("READARR", { metadata_profiles: [metadataProfile()] }), created.workspace);
    assertPipelineSucceeded(second.result, ["READARR"]);
    assertDiffUpToDate(second.result, ["READARR"]);

    const updated = await syncConfig(mediaConfig("READARR", { metadata_profiles: [metadataProfile(1)] }), created.workspace);
    assertPipelineSucceeded(updated.result, ["READARR"]);
    expect(findNamed(await client.getMetadataProfiles(), "e2e-meta")?.minPopularity).toBe(1);

    const deleted = await syncConfig(
      mediaConfig("READARR", { delete_unmanaged_metadata_profiles: { enabled: true, ignore } }),
      created.workspace,
    );
    assertPipelineSucceeded(deleted.result, ["READARR"]);
    expect(findNamed(await client.getMetadataProfiles(), "e2e-meta")).toBeUndefined();
  });

  test("root folders", async () => {
    const preserved = await preservedRootFolderObjects(client);
    const yaml = (folders: Record<string, unknown>[]) =>
      mediaConfig("READARR", {
        quality_profiles: [qualityProfile()],
        metadata_profiles: [metadataProfile()],
        root_folders: [...folders, ...preserved],
      });
    const pathsOf = async () => (await client.getRootfolders()).map((f) => f.path ?? "");

    const created = await syncConfig(yaml([rootFolder(E2E_ROOT_A, "e2e-root"), rootFolder(E2E_ROOT_B, "e2e-root-b")]));
    assertPipelineSucceeded(created.result, ["READARR"]);
    expect(await pathsOf()).toEqual(expect.arrayContaining([E2E_ROOT_A, E2E_ROOT_B]));

    const second = await syncConfig(yaml([rootFolder(E2E_ROOT_A, "e2e-root"), rootFolder(E2E_ROOT_B, "e2e-root-b")]), created.workspace);
    assertPipelineSucceeded(second.result, ["READARR"]);
    assertDiffUpToDate(second.result, ["READARR"]);

    const renamed = await syncConfig(
      yaml([rootFolder(E2E_ROOT_A, "e2e-root-renamed"), rootFolder(E2E_ROOT_B, "e2e-root-b")]),
      created.workspace,
    );
    assertPipelineSucceeded(renamed.result, ["READARR"]);
    expect((await client.getRootfolders()).find((f) => f.path === E2E_ROOT_A)?.name).toBe("e2e-root-renamed");

    const deleted = await syncConfig(yaml([rootFolder(E2E_ROOT_A, "e2e-root-renamed")]), created.workspace);
    assertPipelineSucceeded(deleted.result, ["READARR"]);
    expect(await pathsOf()).toContain(E2E_ROOT_A);
    expect(await pathsOf()).not.toContain(E2E_ROOT_B);
  });
});
