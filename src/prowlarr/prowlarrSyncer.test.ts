import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerCache } from "../cache";
import type { InputConfigProwlarrInstance } from "../types/config.types";

vi.mock("../logger", () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const syncTags = vi.fn(async () => ({ added: 0, removed: 0, diffEntries: [{ resourceType: "Tag", name: "t", action: "create" }] }));
const syncProfileSync = vi.fn(async () => ({
  added: 0,
  updated: 0,
  removed: 0,
  diffEntries: [{ resourceType: "SyncProfile", name: "s", action: "create" }],
  profiles: [{ id: 4, name: "Seeded" }],
}));
const proxySync = vi.fn(async () => ({
  added: 0,
  updated: 0,
  removed: 0,
  diffEntries: [{ resourceType: "IndexerProxy", name: "p", action: "create" }],
}));
const indexerSync = vi.fn(async () => ({
  added: 0,
  updated: 0,
  removed: 0,
  diffEntries: [{ resourceType: "Indexer", name: "i", action: "create" }],
}));
const applicationSync = vi.fn(async () => ({
  added: 0,
  updated: 0,
  removed: 0,
  diffEntries: [{ resourceType: "Application", name: "a", action: "create" }],
}));

const indexerSyncCtor = vi.fn();

vi.mock("./tagSync", () => ({ syncTags: (...args: unknown[]) => syncTags(...(args as [])) }));
vi.mock("./syncProfileSync", () => ({ syncSyncProfiles: (...args: unknown[]) => syncProfileSync(...(args as [])) }));
vi.mock("./indexerProxySync", () => ({
  IndexerProxySync: class {
    sync = proxySync;
  },
}));
vi.mock("./indexerSync", () => ({
  IndexerSync: class {
    sync = indexerSync;
    constructor(...args: unknown[]) {
      indexerSyncCtor(...args);
    }
  },
}));
vi.mock("./applicationSync", () => ({
  ApplicationSync: class {
    syncApplications = applicationSync;
  },
}));

const { syncProwlarrProviders } = await import("./prowlarrSyncer");

const cache = () => ({ tags: [] as unknown[] }) as unknown as ServerCache;

const fullInstance: InputConfigProwlarrInstance = {
  base_url: "http://p",
  api_key: "k",
  tags: ["managed"],
  sync_profiles: { data: [{ name: "Seeded" }] },
  indexer_proxies: { data: [{ name: "flare", type: "FlareSolverr" }] },
  indexers: { data: [{ name: "1337x", definition: "1337x" }] },
  applications: { data: [{ name: "Sonarr", type: "Sonarr" }] },
};

describe("syncProwlarrProviders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("runs the sub-syncs in dependency order and concatenates their diff entries", async () => {
    const entries = await syncProwlarrProviders(fullInstance, cache());

    expect(entries.map((e) => e.resourceType)).toEqual(["Tag", "SyncProfile", "IndexerProxy", "Indexer", "Application"]);
  });

  it("hands the synced profiles to the indexer sync so it can resolve one created this run", async () => {
    await syncProwlarrProviders(fullInstance, cache());

    expect(syncProfileSync).toHaveBeenCalledWith({ data: [{ name: "Seeded" }] });
    expect(indexerSyncCtor).toHaveBeenCalledWith([{ id: 4, name: "Seeded" }]);
  });

  it("fails the whole run when sync profile sync fails, without touching indexers", async () => {
    syncProfileSync.mockRejectedValueOnce(new Error("profile boom"));

    await expect(syncProwlarrProviders(fullInstance, cache())).rejects.toThrow("profile boom");
    expect(proxySync).not.toHaveBeenCalled();
    expect(indexerSync).not.toHaveBeenCalled();
  });

  it("passes empty sections straight through, letting each sync no-op", async () => {
    await syncProwlarrProviders({ base_url: "http://p", api_key: "k" }, cache());

    expect(syncTags).toHaveBeenCalledTimes(1);
    expect(syncProfileSync).toHaveBeenCalledWith(undefined);
    expect(proxySync).toHaveBeenCalledWith([], undefined, expect.anything());
    expect(indexerSync).toHaveBeenCalledWith([], undefined, expect.anything());
    expect(applicationSync).toHaveBeenCalledWith(undefined, expect.anything());
  });

  it("fails the whole run when tag sync fails, without touching later sections", async () => {
    syncTags.mockRejectedValueOnce(new Error("tag boom"));

    await expect(syncProwlarrProviders(fullInstance, cache())).rejects.toThrow("tag boom");
    expect(syncProfileSync).not.toHaveBeenCalled();
    expect(proxySync).not.toHaveBeenCalled();
    expect(indexerSync).not.toHaveBeenCalled();
    expect(applicationSync).not.toHaveBeenCalled();
  });

  it("fails the whole run when indexer sync fails, without syncing applications", async () => {
    indexerSync.mockRejectedValueOnce(new Error("indexer boom"));

    await expect(syncProwlarrProviders(fullInstance, cache())).rejects.toThrow("indexer boom");
    expect(applicationSync).not.toHaveBeenCalled();
  });

  it("fails the whole run when application sync fails", async () => {
    applicationSync.mockRejectedValueOnce(new Error("app boom"));

    await expect(syncProwlarrProviders(fullInstance, cache())).rejects.toThrow("app boom");
  });

  it("forwards the applications section, including a bare sync_indexers", async () => {
    await syncProwlarrProviders({ base_url: "http://p", api_key: "k", applications: { sync_indexers: true } }, cache());

    expect(applicationSync).toHaveBeenCalledWith({ sync_indexers: true }, expect.anything());
  });

  it("forwards delete_unmanaged for a section with no data", async () => {
    await syncProwlarrProviders({ base_url: "http://p", api_key: "k", indexers: { delete_unmanaged: { enabled: true } } }, cache());

    expect(indexerSync).toHaveBeenCalledWith([], { enabled: true }, expect.anything());
  });
});
