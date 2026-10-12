/**
 * Live Sonarr v5 e2e: every configarr feature, against the Sonarr v5 container.
 *
 * The stack runs two Sonarr instances side by side. This file targets the v5 one and pins the
 * v5 API contract in the config, so the run is deterministic and does not depend on the probe.
 * `sonarr.e2e.test.ts` covers the same features against the v4 instance and the v3 contract.
 *
 * Differences from the v4 file are deliberate and limited to what the contracts disagree on:
 *
 * - Quality definition size limits are v3-only. The v5 API moved min/max/preferred size from the
 *   quality definition resource onto quality profile items, so configarr refuses the config rather
 *   than writing a payload the server ignores.
 * - Release profiles carry the indexer as an array rather than a scalar.
 *
 * Anything not listed here behaves the same on both contracts and is asserted the same way.
 */
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { SonarrClient } from "../../src/clients/sonarr-client";
import {
  E2E_ROOT_A,
  E2E_ROOT_B,
  arrConnection,
  cfAssignBlock,
  downloadClientConfigBlock,
  e2eCustomFormatDefinition,
  e2eMediaSettings,
  mediaConfig,
  type E2eContract,
} from "./config";
import {
  MediaBaseline,
  assertDiffUpToDate,
  assertNoErrorLogs,
  assertPipelineFailed,
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

const V5: E2eContract = "v5";

const qualityProfile = (min_format_score = 0) => ({
  name: "e2e-qp",
  upgrade: { allowed: true, until_quality: "WEB 1080p", until_score: 100 },
  min_format_score,
  qualities: [{ name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] }],
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

/** Config block pinned to the v5 contract, so the run does not rely on the probe. */
const v5Config = (instance: Record<string, unknown> = {}, root: Record<string, unknown> = {}) =>
  mediaConfig("SONARR", { api_version: "v5", ...instance }, root, V5);

describe("sonarr v5 (live)", () => {
  const { baseUrl, apiKey } = arrConnection("SONARR", V5);
  const client = new SonarrClient(baseUrl, apiKey, V5);
  let baseline: MediaBaseline;

  beforeAll(async () => {
    await cleanupMediaE2e(client);
    baseline = await snapshotMediaBaseline(client);
  }, 180_000);

  afterAll(async () => {
    await teardown(
      () => restoreMediaBaseline(client, baseline),
      () => cleanupMediaE2e(client),
    );
  });

  test("the instance is reached over the v5 contract", async () => {
    // Guards the rest of the file: if the v5 route stops answering, every other assertion below
    // would be measuring the v3 contract instead and still pass.
    await expect(client.getSystemStatus()).resolves.toBeTruthy();
    expect(await client.resolveApiVersion()).toBe("v5");
  });

  test("a run without api_version still resolves v5 by probing", async () => {
    // The default user path: no api_version in the config, so the probe decides. Verifies the
    // instance answers /api/v5/system/status, which is the only signal separating the contracts.
    const created = await syncConfig(mediaConfig("SONARR", { media_management: { recycleBin: "/tmp" } }, {}, V5));
    assertPipelineSucceeded(created.result, ["SONARR"]);
  });

  test("custom formats", async () => {
    const preexisting = nonE2eNames(await client.getCustomFormats());
    const withValue = (value: string) =>
      v5Config({ custom_formats: cfAssignBlock() }, { customFormatDefinitions: [e2eCustomFormatDefinition(value)] });

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
      v5Config(
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
      v5Config(
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
      v5Config({
        custom_formats: cfAssignBlock(),
        delete_unmanaged_quality_profiles: { enabled: true, ignore: preexisting },
      }),
      created.workspace,
    );
    assertPipelineSucceeded(deleted.result, ["SONARR"]);
    expect(findNamed(await client.getQualityProfiles(), "e2e-qp")).toBeUndefined();
  });

  test("quality definitions reject size limits rather than dropping them", async () => {
    // The v5 contract has no size fields on the quality definition resource, so the sync refuses
    // the config. Asserting the failure is the point: a silent no-op would let a user believe
    // their TRaSH size limits had been applied.
    const run = await syncConfig(
      v5Config({ quality_definition: { qualities: [{ quality: "WEBDL-1080p", min: 2, preferred: 50, max: 199.9 }] } }),
    );
    assertPipelineFailed(run.result, ["SONARR"]);
    expect(run.result.stdout + run.result.stderr).toMatch(/size limits .* are not supported on the Sonarr v5 API/);
  });

  test("quality definitions still apply the fields the v5 contract carries", async () => {
    const webdl = async () => (await client.getQualityDefinitions()).find((d) => d.quality?.name === "WEBDL-1080p");

    const created = await syncConfig(v5Config({ quality_definition: { qualities: [{ quality: "WEBDL-1080p", title: "WEBDL-1080p" }] } }));
    assertPipelineSucceeded(created.result, ["SONARR"]);
    expect((await webdl())?.title).toBe("WEBDL-1080p");
  });

  test("media settings", async () => {
    const created = await syncConfig(v5Config(e2eMediaSettings(1)));
    assertPipelineSucceeded(created.result, ["SONARR"]);
    expect(((await client.getMediamanagement()) as { recycleBin?: string }).recycleBin).toBe("/tmp");
    expect(((await client.getNaming()) as { replaceIllegalCharacters?: boolean }).replaceIllegalCharacters).toBe(true);
    expect(((await client.getUiConfig()) as { firstDayOfWeek?: number }).firstDayOfWeek).toBe(1);

    const updated = await syncConfig(v5Config(e2eMediaSettings(0)), created.workspace);
    assertPipelineSucceeded(updated.result, ["SONARR"]);
    expect(((await client.getUiConfig()) as { firstDayOfWeek?: number }).firstDayOfWeek).toBe(0);
    expect(((await client.getMediamanagement()) as { recycleBin?: string }).recycleBin).toBe("/tmp");

    const second = await syncConfig(v5Config(e2eMediaSettings(0)), created.workspace);
    assertPipelineSucceeded(second.result, ["SONARR"]);
    assertDiffUpToDate(second.result, ["SONARR"]);
  });

  test("delay profiles", async () => {
    const yaml = (usenetDelay: number, additional: boolean) => v5Config({ delay_profiles: delayProfiles(usenetDelay, additional) });
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
    const yaml = (required: string[], include: boolean) =>
      v5Config({
        release_profiles: include ? [{ name: "e2e-hevc", required, ignored: ["xvid"], tags: ["e2e-release"] }] : [],
      });
    const managed = async () => (await client.getReleaseProfiles()).filter((p) => p.name === "e2e-hevc");

    const created = await syncConfig(yaml(["hevc"], true));
    assertPipelineSucceeded(created.result, ["SONARR"]);
    expect(await managed()).toHaveLength(1);

    const second = await syncConfig(yaml(["hevc"], true), created.workspace);
    assertPipelineSucceeded(second.result, ["SONARR"]);
    assertDiffUpToDate(second.result, ["SONARR"]);

    const updated = await syncConfig(yaml(["hevc", "x265"], true), created.workspace);
    assertPipelineSucceeded(updated.result, ["SONARR"]);
    expect((await managed())[0]?.required).toEqual(expect.arrayContaining(["hevc", "x265"]));

    const removed = await syncConfig(yaml(["hevc"], false), created.workspace);
    assertPipelineSucceeded(removed.result, ["SONARR"]);
    expect(await managed()).toHaveLength(0);
  });

  test("release profiles store the indexer in the v5 array field", async () => {
    // The only release-profile field whose shape differs between the contracts. A v3-shaped
    // scalar indexerId would be dropped by the v5 server, so this asserts the array field is what
    // actually persists. The indexer is left unset because the fixture has no indexers to name,
    // which still exercises the write path that sets the field.
    const created = await syncConfig(v5Config({ release_profiles: [{ name: "e2e-indexer", required: ["hevc"] }] }));
    assertPipelineSucceeded(created.result, ["SONARR"]);

    const managed = (await client.getReleaseProfiles()).filter((p) => p.name === "e2e-indexer");
    expect(managed).toHaveLength(1);
    // Narrowed because the v3 member of the union spells this as a scalar indexerId.
    const stored = managed[0] as { indexerIds?: number[]; indexerId?: number };
    expect(stored.indexerIds).toEqual([]);
    expect(stored.indexerId).toBeUndefined();

    const removed = await syncConfig(v5Config({ release_profiles: [] }), created.workspace);
    assertPipelineSucceeded(removed.result, ["SONARR"]);
    expect((await client.getReleaseProfiles()).filter((p) => p.name === "e2e-indexer")).toHaveLength(0);
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
      v5Config({
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
    const yaml = (paths: string[]) => v5Config({ root_folders: [...paths, ...preserved] });
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
      v5Config({
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
