/**
 * Covers the media pipeline orchestration: write order of the feature syncs, dry-run propagation of
 * the write flag and the error handling of each write boundary.
 *
 * The download-client sync, the download-client config sync and the remote-path sync reject on any
 * failure, so those boundaries are covered by mediaPipeline.errors.test.ts. Here they only pin the
 * log line and the ConfigValidationError case. The TRaSH quality-definition loader is the one boundary
 * that still swallows a non-validation failure, and that is deliberate.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServerCache } from "../cache";
import type { ConfigQualityProfile, MergedConfigInstance } from "../types/config.types";
import type { QualityProfileDiffResult } from "../qualityProfiles/qualityProfileBase";
import { ConfigValidationError } from "../validation";
import { completeMediaSync, runMediaSyncToQualityProfiles, type MediaFeatureSyncs } from "./mediaPipeline";

vi.mock("../logger", () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("../env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../env")>();
  return {
    ...actual,
    getEnvs: vi.fn(() => ({
      DRY_RUN: false,
      DEBUG_CREATE_FILES: false,
      LOAD_LOCAL_SAMPLES: false,
      LOG_LEVEL: "silent",
      CONFIGARR_VERSION: "test",
    })),
  };
});
vi.mock("../config", () => ({ mergeConfigsAndTemplates: vi.fn(async () => ({ config: {} })) }));
vi.mock("../customFormats/customFormats", () => ({
  calculateCFsToManage: vi.fn(() => new Set<string>()),
  deleteCustomFormat: vi.fn(async () => undefined),
  loadCustomFormatDefinitions: vi.fn(async () => ({ carrIdMapping: new Map(), cfNameToCarrConfig: new Map() })),
  loadServerCustomFormats: vi.fn(async () => []),
  manageCf: vi.fn(async () => ({ createCFs: [], updatedCFs: [], validCFs: [], errorCFs: [], diffEntries: [] })),
}));
vi.mock("../tags/tags", () => ({
  loadServerTags: vi.fn(async () => []),
  syncInstanceTags: vi.fn(async () => ({ added: 0, removed: 0, diffEntries: [] })),
  ensureTags: vi.fn(async () => ({ ids: [], created: [], missing: [] })),
  deleteUnmanagedInstanceTags: vi.fn(async () => ({ added: 0, removed: 0, diffEntries: [] })),
}));
vi.mock("../telemetry", () => ({ Telemetry: { isEnabled: () => false }, getTelemetryInstance: vi.fn() }));
vi.mock("../uiConfigs/uiConfigSyncer", () => ({
  syncUiConfig: vi.fn(async () => ({ diffEntries: [] })),
  uiConfigDiffToDiffEntries: vi.fn(() => []),
}));
vi.mock("../downloadClientConfig/downloadClientConfigSyncer", () => ({
  syncDownloadClientConfig: vi.fn(async () => ({ diffEntries: [] })),
  downloadClientConfigDiffToDiffEntries: vi.fn(() => []),
}));
vi.mock("../remotePaths/remotePathSyncer", () => ({ syncRemotePaths: vi.fn(async () => ({ diffEntries: [] })) }));

import { mergeConfigsAndTemplates } from "../config";
import { getEnvs } from "../env";
import { logger } from "../logger";
import { syncDownloadClientConfig } from "../downloadClientConfig/downloadClientConfigSyncer";
import { syncRemotePaths } from "../remotePaths/remotePathSyncer";
import { syncUiConfig } from "../uiConfigs/uiConfigSyncer";

type Order = string[];

const setDryRun = (dryRun: boolean) =>
  vi.mocked(getEnvs).mockReturnValue({
    DRY_RUN: dryRun,
    DEBUG_CREATE_FILES: false,
    LOAD_LOCAL_SAMPLES: false,
    LOG_LEVEL: "silent",
    CONFIGARR_VERSION: "test",
  } as never);

const client = () => ({
  getSystemStatus: vi.fn(async () => ({ version: "1.2.3" })),
  getLanguages: vi.fn(async () => []),
  createTag: vi.fn(async (tag: { label: string }) => ({ id: 1, label: tag.label })),
});

const config = (extra: Partial<MergedConfigInstance> = {}) =>
  ({
    custom_formats: [],
    quality_profiles: [],
    customFormatDefinitions: [],
    media_management: {},
    media_naming: {},
    media_naming_api: { renameEpisodes: true },
    quality_definition: {},
    ...extra,
  }) as unknown as MergedConfigInstance;

const configQp = (name: string): ConfigQualityProfile => ({
  name,
  upgrade: { allowed: false },
  min_format_score: 0,
  quality_sort: "top",
  qualities: [],
});

const emptyQpDiff = (): QualityProfileDiffResult => ({ create: [], changedQPs: [], noChanges: [], changes: new Map() });

const qdSync = (order: Order) => ({
  loadFromServer: vi.fn(async () => []),
  persist: vi.fn(async () => {
    order.push("qd");
    return { changeMap: new Map(), restData: [] };
  }),
});

const mmSync = (order: Order) => ({
  persistNaming: vi.fn(async () => {
    order.push("naming");
    return null;
  }),
  persistMediamanagement: vi.fn(async () => {
    order.push("mediaManagement");
    return null;
  }),
});

const qpSync = (order: Order, diff: QualityProfileDiffResult = emptyQpDiff()) => ({
  loadFromServer: vi.fn(async () => []),
  calculateQualityProfilesDiff: vi.fn(async () => diff),
  persist: vi.fn(async () => {
    order.push("qp");
  }),
  deleteOnServer: vi.fn(async (profile: { name?: string }) => {
    order.push(`qpDelete:${profile.name}`);
  }),
});

const syncs = (order: Order) =>
  ({
    qd: qdSync(order),
    mm: mmSync(order),
    qp: qpSync(order),
    delay: { calculateDiff: vi.fn(async () => null) },
    releaseProfiles: { sync: vi.fn(async () => ({ diffEntries: [] })) },
    root: { syncRootFolders: vi.fn(async () => ({ added: 0, removed: 0, updated: 0, diffEntries: [] })) },
    downloadClients: { syncDownloadClients: vi.fn(async () => ({ added: 0, updated: 0, removed: 0, failed: 0, diffEntries: [] })) },
  }) as unknown as MediaFeatureSyncs;

beforeEach(() => {
  vi.clearAllMocks();
  setDryRun(false);
  vi.mocked(mergeConfigsAndTemplates).mockResolvedValue({ config: config() } as never);
});

describe("runMediaSyncToQualityProfiles", () => {
  const run = (order: Order, syncObjects: MediaFeatureSyncs, trash?: unknown) =>
    runMediaSyncToQualityProfiles({
      arrType: "SONARR",
      instanceName: "test",
      globalConfig: {} as never,
      instanceConfig: {} as never,
      client: client() as never,
      syncs: syncObjects,
      trash: trash as never,
    });

  it("runs the feature writes in order: quality definitions, naming, media management, ui config, quality profiles", async () => {
    const order: Order = [];
    vi.mocked(syncUiConfig).mockImplementation(async () => {
      order.push("uiConfig");
      return { diffEntries: [] } as never;
    });

    await run(order, syncs(order));

    expect(order).toEqual(["qd", "naming", "mediaManagement", "uiConfig", "qp"]);
  });

  it("passes write=false to every write boundary on a dry run", async () => {
    setDryRun(true);
    const order: Order = [];
    const syncObjects = syncs(order);

    await runMediaSyncToQualityProfiles({
      arrType: "SONARR",
      instanceName: "test",
      globalConfig: {} as never,
      instanceConfig: {} as never,
      client: client() as never,
      syncs: syncObjects,
    });

    expect(syncObjects.qd.persist).toHaveBeenCalledWith([], [], false);
    expect(syncObjects.mm.persistNaming).toHaveBeenCalledWith(config().media_naming_api, false);
    expect(syncObjects.mm.persistMediamanagement).toHaveBeenCalledWith(config().media_management, false);
    expect(syncObjects.qp.persist).toHaveBeenCalledWith(expect.anything(), false);
  });

  it("writes quality profiles and refreshes the cache after creates", async () => {
    const order: Order = [];
    const diff: QualityProfileDiffResult = { create: [{ id: 1, name: "New" }], changedQPs: [], noChanges: [], changes: new Map() };
    const syncObjects = syncs(order);
    syncObjects.qp = qpSync(order, diff) as unknown as MediaFeatureSyncs["qp"];

    await run(order, syncObjects);

    expect(syncObjects.qp.persist).toHaveBeenCalledWith(diff, true);
    // loaded once for the diff and once more so downstream resolution sees the new profiles
    expect(syncObjects.qp.loadFromServer).toHaveBeenCalledTimes(2);
  });

  it("does not refresh the quality profile cache when there is nothing to write", async () => {
    const order: Order = [];
    const syncObjects = syncs(order);

    await run(order, syncObjects);

    expect(syncObjects.qp.persist).toHaveBeenCalledWith(expect.anything(), true);
    expect(syncObjects.qp.loadFromServer).toHaveBeenCalledTimes(1);
  });

  it("deletes unmanaged quality profiles after persisting and honors the ignore list", async () => {
    const order: Order = [];
    const syncObjects = syncs(order);
    syncObjects.qp = qpSync(order) as unknown as MediaFeatureSyncs["qp"];
    vi.mocked(syncObjects.qp.loadFromServer).mockResolvedValue([
      { id: 5, name: "Unmanaged" },
      { id: 6, name: "Ignored" },
      { id: 7, name: "Managed" },
    ] as never);
    vi.mocked(mergeConfigsAndTemplates).mockResolvedValue({
      config: config({
        quality_profiles: [configQp("Managed")],
        delete_unmanaged_quality_profiles: { enabled: true, ignore: ["Ignored"] },
      }),
    } as never);

    await run(order, syncObjects);

    expect(syncObjects.qp.deleteOnServer).toHaveBeenCalledTimes(1);
    expect(syncObjects.qp.deleteOnServer).toHaveBeenCalledWith({ id: 5, name: "Unmanaged" });
    expect(order.indexOf("qpDelete:Unmanaged")).toBeGreaterThan(order.indexOf("qp"));
  });

  it("reports unmanaged deletions but deletes nothing on a dry run", async () => {
    setDryRun(true);
    const order: Order = [];
    const syncObjects = syncs(order);
    syncObjects.qp = qpSync(order) as unknown as MediaFeatureSyncs["qp"];
    vi.mocked(syncObjects.qp.loadFromServer).mockResolvedValue([{ id: 5, name: "Unmanaged" }] as never);
    vi.mocked(mergeConfigsAndTemplates).mockResolvedValue({
      config: config({ quality_profiles: [configQp("Managed")], delete_unmanaged_quality_profiles: { enabled: true } }),
    } as never);

    await run(order, syncObjects);

    expect(syncObjects.qp.deleteOnServer).not.toHaveBeenCalled();
  });

  it("rethrows ConfigValidationError from the TRaSH quality definition loader", async () => {
    const order: Order = [];
    vi.mocked(mergeConfigsAndTemplates).mockResolvedValue({
      config: config({ quality_definition: { type: "sonarr-4-custom-formats" } }),
    } as never);

    await expect(
      run(order, syncs(order), {
        loadCFs: vi.fn(),
        checkConflicts: vi.fn(),
        loadQdType: vi.fn(async () => {
          throw new ConfigValidationError("bad qd type");
        }),
      }),
    ).rejects.toThrow(ConfigValidationError);
  });

  it("logs and swallows non-validation failures of the TRaSH quality definition loader", async () => {
    const order: Order = [];
    vi.mocked(mergeConfigsAndTemplates).mockResolvedValue({
      config: config({ quality_definition: { type: "sonarr-4-custom-formats" } }),
    } as never);

    await expect(
      run(order, syncs(order), {
        loadCFs: vi.fn(),
        checkConflicts: vi.fn(),
        loadQdType: vi.fn(async () => {
          throw new Error("trash guide unreachable");
        }),
      }),
    ).resolves.toBeDefined();

    expect(logger.error).toHaveBeenCalledWith("trash guide unreachable");
    expect(order).toContain("qp");
  });
});

describe("completeMediaSync", () => {
  const complete = (syncObjects: MediaFeatureSyncs, instanceConfig: Partial<MergedConfigInstance> = {}, ctxClient = client()) =>
    completeMediaSync({
      arrType: "SONARR",
      instanceName: "test",
      client: ctxClient as never,
      config: config(instanceConfig),
      serverCache: new ServerCache({ tags: [] }),
      collector: { add: vi.fn(), getEntries: vi.fn(() => []) } as never,
      syncs: syncObjects,
    } as never);

  const withDownloadClients = () => ({
    data: [{ name: "qbit", type: "QBittorrent" }],
  });

  it("runs the remaining features in order: root folders, delay profiles, release profiles, download clients, config, remote paths", async () => {
    const order: Order = [];
    const syncObjects = syncs(order);
    syncObjects.root = {
      syncRootFolders: vi.fn(async () => {
        order.push("root");
        return { added: 0, removed: 0, updated: 0, diffEntries: [] };
      }),
    } as unknown as MediaFeatureSyncs["root"];
    syncObjects.delay = {
      calculateDiff: vi.fn(async () => {
        order.push("delay");
        return null;
      }),
    } as unknown as MediaFeatureSyncs["delay"];
    syncObjects.releaseProfiles = {
      sync: vi.fn(async () => {
        order.push("releaseProfiles");
        return { diffEntries: [] };
      }),
    } as unknown as MediaFeatureSyncs["releaseProfiles"];
    syncObjects.downloadClients = {
      syncDownloadClients: vi.fn(async () => {
        order.push("downloadClients");
        return { added: 0, updated: 0, removed: 0, failed: 0, diffEntries: [] };
      }),
    } as unknown as MediaFeatureSyncs["downloadClients"];
    vi.mocked(syncDownloadClientConfig).mockImplementation(async () => {
      order.push("downloadClientConfig");
      return { diffEntries: [] } as never;
    });
    vi.mocked(syncRemotePaths).mockImplementation(async () => {
      order.push("remotePaths");
      return { diffEntries: [] } as never;
    });

    await complete(syncObjects, {
      root_folders: ["/data"],
      delay_profiles: { default: { enableUsenet: true, enableTorrent: false } },
      release_profiles: [],
      download_clients: {
        ...withDownloadClients(),
        config: { enable_completed_download_handling: true },
        remote_paths: [{ host: "seed", remote_path: "/downloads", local_path: "/data" }],
      },
    });

    expect(order).toEqual(["root", "delay", "releaseProfiles", "downloadClients", "downloadClientConfig", "remotePaths"]);
  });

  it("skips root folder syncing when root_folders is not configured", async () => {
    const order: Order = [];
    const syncObjects = syncs(order);

    await complete(syncObjects);

    expect(syncObjects.root.syncRootFolders).not.toHaveBeenCalled();
  });

  it("logs and rethrows a ConfigValidationError from the download client sync", async () => {
    const order: Order = [];
    const syncObjects = syncs(order);
    syncObjects.downloadClients = {
      syncDownloadClients: vi.fn(async () => {
        throw new ConfigValidationError("unknown implementation");
      }),
    } as unknown as MediaFeatureSyncs["downloadClients"];

    await expect(complete(syncObjects, { download_clients: withDownloadClients() })).rejects.toThrow(ConfigValidationError);
    expect(logger.error).toHaveBeenCalledWith("Failed to sync download clients: unknown implementation");
  });

  it("logs and rethrows a ConfigValidationError from the download client config sync", async () => {
    const order: Order = [];
    const syncObjects = syncs(order);
    vi.mocked(syncDownloadClientConfig).mockRejectedValue(new ConfigValidationError("unknown service"));

    await expect(complete(syncObjects, { download_clients: { config: { enable_completed_download_handling: true } } })).rejects.toThrow(
      ConfigValidationError,
    );
    expect(logger.error).toHaveBeenCalledWith("Failed to sync download client config: unknown service");
  });

  it("logs and rethrows a ConfigValidationError from the remote path sync", async () => {
    const order: Order = [];
    const syncObjects = syncs(order);
    vi.mocked(syncRemotePaths).mockRejectedValue(new ConfigValidationError("invalid remote path"));

    await expect(
      complete(syncObjects, { download_clients: { remote_paths: [{ host: "seed", remote_path: "/downloads", local_path: "/data" }] } }),
    ).rejects.toThrow(ConfigValidationError);
    expect(logger.error).toHaveBeenCalledWith("Failed to sync remote path mappings: invalid remote path");
  });

  it("does not sync remote paths when none are configured and none should be deleted", async () => {
    const order: Order = [];
    const syncObjects = syncs(order);

    await complete(syncObjects, { download_clients: { data: [] } });

    expect(syncRemotePaths).not.toHaveBeenCalled();
  });

  it("collects the diff entries of every feature into the report", async () => {
    const order: Order = [];
    const syncObjects = syncs(order);
    syncObjects.root = {
      syncRootFolders: vi.fn(async () => ({
        added: 1,
        removed: 0,
        updated: 0,
        diffEntries: [{ resourceType: "RootFolder", name: "/data", action: "create" as const }],
      })),
    } as unknown as MediaFeatureSyncs["root"];
    syncObjects.downloadClients = {
      syncDownloadClients: vi.fn(async () => ({
        added: 1,
        updated: 0,
        removed: 0,
        failed: 0,
        diffEntries: [{ resourceType: "DownloadClient", name: "qbit", action: "create" as const }],
      })),
    } as unknown as MediaFeatureSyncs["downloadClients"];

    const collector = { add: vi.fn(), getEntries: vi.fn(() => []) };
    await completeMediaSync({
      arrType: "SONARR",
      instanceName: "test",
      client: client() as never,
      config: config({ root_folders: ["/data"], download_clients: withDownloadClients() }),
      serverCache: new ServerCache({ tags: [] }),
      collector: collector as never,
      syncs: syncObjects,
    } as never);

    expect(collector.add).toHaveBeenCalledWith([{ resourceType: "RootFolder", name: "/data", action: "create" }]);
    expect(collector.add).toHaveBeenCalledWith([{ resourceType: "DownloadClient", name: "qbit", action: "create" }]);
  });
});
