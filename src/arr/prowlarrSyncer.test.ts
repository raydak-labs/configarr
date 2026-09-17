import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InputConfigProwlarrInstance } from "../types/config.types";
import { ProwlarrSyncer } from "./prowlarrSyncer";

const providerEntries = [{ resourceType: "Indexer", name: "i", action: "create" as const }];
const syncProviders = vi.fn(async () => providerEntries);
const deleteUnmanagedTags = vi.fn(async () => ({
  added: 0,
  removed: 1,
  diffEntries: [{ resourceType: "Tag", name: "t", action: "delete" as const }],
}));
const syncDownloadClients = vi.fn(async () => ({ added: 0, updated: 0, removed: 0, failed: 0, diffEntries: [] }));
const loadServerTags = vi.fn(async () => [{ id: 1, label: "keep" }]);

vi.mock("../logger", () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("../clients/client", () => ({ getClient: vi.fn(() => ({ getSystemStatus: vi.fn(async () => ({ version: "1" })) })) }));
vi.mock("../prowlarr/prowlarrSyncer", () => ({ syncProwlarrProviders: (...args: unknown[]) => syncProviders(...(args as [])) }));
vi.mock("../prowlarr/tagSync", () => ({ deleteUnmanagedTags: (...args: unknown[]) => deleteUnmanagedTags(...(args as [])) }));
vi.mock("../tags/tags", () => ({ loadServerTags: (...args: unknown[]) => loadServerTags(...(args as [])) }));
vi.mock("../downloadClients/downloadClientProwlarr", () => ({
  ProwlarrDownloadClientSync: class {
    syncDownloadClients = syncDownloadClients;
  },
}));

const instance = (extra: Partial<InputConfigProwlarrInstance> = {}): InputConfigProwlarrInstance =>
  ({
    base_url: "http://prowlarr",
    api_key: "key",
    delete_unmanaged_tags: { enabled: true },
    download_clients: { data: [{ name: "bh", type: "TorrentBlackhole" }] },
    ...extra,
  }) as InputConfigProwlarrInstance;

describe("ProwlarrSyncer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    syncProviders.mockResolvedValue(providerEntries);
    loadServerTags.mockResolvedValue([{ id: 1, label: "keep" }]);
    syncDownloadClients.mockResolvedValue({ added: 0, updated: 0, removed: 0, failed: 0, diffEntries: [] });
  });

  it("deletes unmanaged tags after download clients and reports both", async () => {
    const report = await new ProwlarrSyncer().run(instance(), "e2e");

    expect(syncDownloadClients).toHaveBeenCalledTimes(1);
    expect(deleteUnmanagedTags).toHaveBeenCalledTimes(1);
    // Reloaded once up front and once before the tag cleanup, so provider-created tags are seen.
    expect(loadServerTags).toHaveBeenCalledTimes(2);
    expect(report.entries.map((e) => e.resourceType)).toEqual(["Indexer", "Tag"]);
  });

  it("skips tag cleanup when a download client change failed", async () => {
    syncDownloadClients.mockResolvedValue({ added: 0, updated: 0, removed: 0, failed: 1, diffEntries: [] });

    const report = await new ProwlarrSyncer().run(instance(), "e2e");

    expect(deleteUnmanagedTags).not.toHaveBeenCalled();
    expect(report.entries.map((e) => e.resourceType)).toEqual(["Indexer"]);
  });

  it("skips tag cleanup when the download client sync throws", async () => {
    syncDownloadClients.mockRejectedValueOnce(new Error("boom"));

    await new ProwlarrSyncer().run(instance(), "e2e");

    expect(deleteUnmanagedTags).not.toHaveBeenCalled();
  });

  it("does not reload tags when delete_unmanaged_tags is off", async () => {
    await new ProwlarrSyncer().run(instance({ delete_unmanaged_tags: undefined }), "e2e");

    expect(deleteUnmanagedTags).not.toHaveBeenCalled();
    expect(loadServerTags).toHaveBeenCalledTimes(1);
  });
});
