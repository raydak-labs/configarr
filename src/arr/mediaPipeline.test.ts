import { beforeEach, describe, expect, test, vi } from "vitest";
import { ServerCache } from "../cache";
import { DiffCollector } from "../diffReport/diffCollector";
import type { DiffEntry } from "../diffReport/diffReport.types";
import { logger } from "../logger";
import type { MergedConfigInstance } from "../types/config.types";
import type { MediaFeatureSyncs, MediaSyncContext } from "./mediaPipeline";
import { completeMediaSync, runMediaSyncToQualityProfiles } from "./mediaPipeline";

const envs = { DRY_RUN: false, DEBUG_CREATE_FILES: false, LOAD_LOCAL_SAMPLES: false };
// `mergedConfig` and `serverTags` are reassigned per test; the mocked modules below close over them lazily.
const mergedConfig = { tags: [] as string[] } as unknown as MergedConfigInstance;
const serverTags: { id?: number; label?: string | null }[] = [];
let nextTagId = 100;

vi.mock("../env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../env")>();
  return { ...actual, getEnvs: () => ({ ...actual.getEnvs(), ...envs }) };
});
vi.mock("../logger", () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("../telemetry", () => ({
  Telemetry: { isEnabled: () => false },
  getTelemetryInstance: () => ({ trackInstanceConfig: vi.fn() }),
}));
vi.mock("../config", () => ({ mergeConfigsAndTemplates: async () => ({ config: mergedConfig }) }));
vi.mock("../customFormats/customFormats", () => ({
  calculateCFsToManage: () => new Set<string>(),
  deleteCustomFormat: vi.fn(),
  loadCustomFormatDefinitions: async () => ({ carrIdMapping: new Map(), cfNameToCarrConfig: new Map() }),
  loadServerCustomFormats: async () => [],
  manageCf: async () => ({ diffEntries: [], createCFs: [], updatedCFs: [] }),
}));
vi.mock("../uiConfigs/uiConfigSyncer", () => ({
  syncUiConfig: async () => ({ updated: false, arrType: "SONARR", fieldChanges: [] }),
  uiConfigDiffToDiffEntries: () => [],
}));

/** Minimal stand-in for a media client: the tag capability plus the two reads the pipeline makes. */
const makeClient = () => ({
  getSystemStatus: vi.fn(async () => ({ version: "4.0.0" })),
  getLanguages: vi.fn(async () => [{ id: 1, name: "English" }]),
  getTags: vi.fn(async () => serverTags.map((tag) => ({ ...tag }))),
  createTag: vi.fn(async (tag: { label?: string | null }) => {
    const created = { id: nextTagId++, label: tag.label };
    serverTags.push(created);
    return created;
  }),
  deleteTag: vi.fn(async (id: string) => {
    const index = serverTags.findIndex((tag) => String(tag.id) === id);
    if (index >= 0) serverTags.splice(index, 1);
  }),
});

const emptySyncResult = { added: 0, removed: 0, updated: 0, diffEntries: [] };

const makeSyncs = (): MediaFeatureSyncs =>
  ({
    qd: { loadFromServer: vi.fn(async () => []) },
    mm: { persistNaming: vi.fn(async () => undefined), persistMediamanagement: vi.fn(async () => undefined) },
    qp: {
      loadFromServer: vi.fn(async () => []),
      calculateQualityProfilesDiff: vi.fn(async () => ({ changedQPs: [], create: [], noChanges: [], changes: [] })),
      persist: vi.fn(async () => undefined),
    },
    delay: { calculateDiff: vi.fn(async () => null) },
    releaseProfiles: { sync: vi.fn(async () => ({ added: 0, removed: 0, diffEntries: [] })) },
    root: { syncRootFolders: vi.fn(async () => emptySyncResult) },
    downloadClients: {
      syncDownloadClients: vi.fn(async () => ({ added: 0, updated: 0, removed: 0, failed: 0, diffEntries: [] })),
    },
  }) as unknown as MediaFeatureSyncs;

const config = (extra: Partial<MergedConfigInstance> = {}): MergedConfigInstance =>
  ({
    custom_formats: [],
    quality_profiles: [],
    ...extra,
  }) as unknown as MergedConfigInstance;

const runQualityProfilesPhase = async (client: ReturnType<typeof makeClient>) =>
  runMediaSyncToQualityProfiles({
    arrType: "SONARR",
    instanceName: "main",
    globalConfig: {} as never,
    instanceConfig: { base_url: "http://sonarr:8989", api_key: "test" },
    client: client as never,
    syncs: makeSyncs(),
  });

beforeEach(() => {
  vi.clearAllMocks();
  serverTags.length = 0;
  nextTagId = 100;
  envs.DRY_RUN = false;
  (mergedConfig as { tags?: string[] }).tags = [];
});

describe("media pipeline instance tags", () => {
  test("creates missing labels from the instance `tags:` block and records one diff entry each", async () => {
    serverTags.push({ id: 1, label: "existing" });
    (mergedConfig as { tags?: string[] }).tags = ["existing", "brand-new", "also-new"];
    const client = makeClient();

    const report = await completeMediaSync(await runQualityProfilesPhase(client));

    expect(client.createTag.mock.calls.map(([tag]) => tag)).toEqual([{ label: "brand-new" }, { label: "also-new" }]);
    expect(report.entries.filter((entry) => entry.resourceType === "Tag")).toEqual<DiffEntry[]>([
      { resourceType: "Tag", name: "brand-new", action: "create" },
      { resourceType: "Tag", name: "also-new", action: "create" },
    ]);
  });

  test("creates nothing in a dry run but still reports what it would create", async () => {
    envs.DRY_RUN = true;
    (mergedConfig as { tags?: string[] }).tags = ["dry-only"];
    const client = makeClient();

    const report = await completeMediaSync(await runQualityProfilesPhase(client));

    expect(client.createTag).not.toHaveBeenCalled();
    expect(report.entries).toContainEqual({ resourceType: "Tag", name: "dry-only", action: "create" });
  });
});

describe("completeMediaSync unmanaged tag cleanup", () => {
  const buildContext = (instanceConfig: MergedConfigInstance, syncs: MediaFeatureSyncs) => {
    const serverCache = new ServerCache();
    serverCache.tags = serverTags.map((tag) => ({ ...tag }));
    return {
      arrType: "SONARR",
      instanceName: "main",
      client: makeClient(),
      config: instanceConfig,
      serverCache,
      collector: new DiffCollector(),
      syncs,
    } as unknown as MediaSyncContext<"SONARR">;
  };

  test("runs last and keeps every tag a managed feature references", async () => {
    serverTags.push(
      { id: 1, label: "listed" },
      { id: 2, label: "ignored" },
      { id: 3, label: "from-download-client" },
      { id: 4, label: "from-root-folder" },
      { id: 5, label: "from-delay-default" },
      { id: 6, label: "from-delay-extra" },
      { id: 7, label: "from-release-profile" },
      { id: 8, label: "orphan" },
    );

    const order: string[] = [];
    const syncs = makeSyncs();
    syncs.root.syncRootFolders = vi.fn(async () => {
      order.push("root");
      return emptySyncResult;
    }) as never;
    syncs.releaseProfiles.sync = vi.fn(async () => {
      order.push("releaseProfiles");
      return { added: 0, removed: 0, diffEntries: [] };
    }) as never;
    syncs.downloadClients.syncDownloadClients = vi.fn(async () => {
      order.push("downloadClients");
      return { added: 0, updated: 0, removed: 0, failed: 0, diffEntries: [] };
    }) as never;

    const instanceConfig = config({
      tags: ["listed"],
      delete_unmanaged_tags: { enabled: true, ignore: ["ignored"] },
      download_clients: { data: [{ name: "dl", type: "QBittorrent", tags: ["from-download-client"] }] },
      root_folders: [
        { path: "/data", name: "data", metadata_profile: "m", quality_profile: "q", tags: ["from-root-folder"] },
        "/plain/string/form",
      ],
      delay_profiles: {
        default: { enableUsenet: true, tags: ["from-delay-default"] },
        additional: [{ enableUsenet: true, tags: ["from-delay-extra"] }],
      },
      release_profiles: [{ name: "rp", tags: ["from-release-profile"] }],
    });

    const ctx = buildContext(instanceConfig, syncs);
    (ctx.client.deleteTag as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (id: string) => {
      order.push("deleteTag");
      const index = serverTags.findIndex((tag) => String(tag.id) === id);
      if (index >= 0) serverTags.splice(index, 1);
    });

    const report = await completeMediaSync(ctx);

    expect(order).toEqual(["root", "releaseProfiles", "downloadClients", "deleteTag"]);
    expect(ctx.client.deleteTag).toHaveBeenCalledTimes(1);
    expect(report.entries.filter((entry) => entry.resourceType === "Tag")).toEqual<DiffEntry[]>([
      { resourceType: "Tag", name: "orphan", action: "delete" },
    ]);
  });

  test("skips cleanup when the download-client sync reports failures", async () => {
    serverTags.push({ id: 1, label: "orphan" });
    const syncs = makeSyncs();
    syncs.downloadClients.syncDownloadClients = vi.fn(async () => ({
      added: 0,
      updated: 0,
      removed: 0,
      failed: 1,
      diffEntries: [],
    })) as never;

    const ctx = buildContext(
      config({ delete_unmanaged_tags: { enabled: true }, download_clients: { data: [{ name: "dl", type: "QBittorrent" }] } }),
      syncs,
    );

    const report = await completeMediaSync(ctx);

    expect(ctx.client.deleteTag).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("download client sync reported failures"));
    expect(report.entries.filter((entry) => entry.resourceType === "Tag")).toEqual([]);
  });

  test("skips cleanup when the download-client sync throws", async () => {
    serverTags.push({ id: 1, label: "orphan" });
    const syncs = makeSyncs();
    syncs.downloadClients.syncDownloadClients = vi.fn(async () => {
      throw new Error("boom");
    }) as never;

    const ctx = buildContext(
      config({ delete_unmanaged_tags: { enabled: true }, download_clients: { data: [{ name: "dl", type: "QBittorrent" }] } }),
      syncs,
    );

    await completeMediaSync(ctx);

    expect(ctx.client.deleteTag).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("download client sync reported failures"));
  });

  test("reports the tag deletions that succeeded before a later one failed", async () => {
    serverTags.push({ id: 1, label: "orphan-a" }, { id: 2, label: "orphan-b" });
    const ctx = buildContext(
      config({
        delete_unmanaged_tags: { enabled: true },
        root_folders: [{ path: "/data", name: "data", metadata_profile: "m", quality_profile: "q" }],
      }),
      makeSyncs(),
    );
    // First delete succeeds, second fails.
    (ctx.client.deleteTag as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined).mockRejectedValue(new Error("500 boom"));

    const report = await completeMediaSync(ctx);

    // The first deletion really happened, so it must appear in the report.
    expect(report.entries).toContainEqual({ resourceType: "Tag", name: "orphan-a", action: "delete" });
    expect(report.entries).not.toContainEqual({ resourceType: "Tag", name: "orphan-b", action: "delete" });
  });

  test("keeps the instance report when a tag delete fails for a non-409 reason", async () => {
    serverTags.push({ id: 1, label: "orphan" });
    const syncs = makeSyncs();
    syncs.root.syncRootFolders = vi.fn(async () => {
      return { added: 1, removed: 0, updated: 0, diffEntries: [{ resourceType: "RootFolder", name: "/data", action: "create" as const }] };
    }) as never;

    const ctx = buildContext(
      config({
        delete_unmanaged_tags: { enabled: true },
        root_folders: [{ path: "/data", name: "data", metadata_profile: "m", quality_profile: "q" }],
      }),
      syncs,
    );
    (ctx.client.deleteTag as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("500 boom"));

    // Every other feature has already been applied at this point, so the diff the user needs
    // to see them must survive a prune failure.
    const report = await completeMediaSync(ctx);

    expect(report.entries).toContainEqual(expect.objectContaining({ resourceType: "RootFolder" }));
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Failed to delete unmanaged tags"));
  });

  test("does nothing when delete_unmanaged_tags is not enabled", async () => {
    serverTags.push({ id: 1, label: "orphan" });
    const ctx = buildContext(config({ tags: ["orphan"] }), makeSyncs());

    await completeMediaSync(ctx);

    expect(ctx.client.deleteTag).not.toHaveBeenCalled();
  });
});
