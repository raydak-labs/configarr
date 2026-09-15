import { afterEach, beforeEach, describe, expect, it, test, vi } from "vitest";
import type { ServerCache } from "../cache";
import { IndexerSync } from "./indexerSync";
import type { IndexerResource } from "./types";

vi.mock("../env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../env")>();
  return { ...actual, getEnvs: vi.fn(() => ({ DRY_RUN: false, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" })) };
});
vi.mock("../logger", () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const schema: IndexerResource[] = [
  {
    definitionName: "1337x",
    implementation: "Cardigann",
    implementationName: "Cardigann",
    configContract: "CardigannSettings",
    protocol: "torrent" as IndexerResource["protocol"],
    privacy: "public" as IndexerResource["privacy"],
    fields: [
      { name: "definitionFile", value: "1337x" },
      { name: "baseUrl", value: "https://1337x.to/" },
    ],
    tags: [],
  },
];

const mockClient = {
  getIndexerSchema: vi.fn(async () => schema),
  getIndexers: vi.fn(async (): Promise<IndexerResource[]> => []),
  createIndexer: vi.fn(async (i: IndexerResource) => ({ ...i, id: 1 })),
  updateIndexer: vi.fn(async (_id: string, i: IndexerResource) => i),
  deleteIndexer: vi.fn(async () => undefined),
  getAppProfiles: vi.fn(async () => [{ id: 1, name: "Standard" }]),
  createTag: vi.fn(async (t: { label: string }) => ({ id: 7, label: t.label })),
};
vi.mock("../clients/unified-client", () => ({
  getSpecificClient: vi.fn(() => mockClient),
  getUnifiedClient: vi.fn(() => ({ api: mockClient })),
}));

const cache = () => ({ tags: [] as any[] }) as unknown as ServerCache;
const sync = () => new IndexerSync();

describe("IndexerSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.getIndexers.mockResolvedValue([]);
    mockClient.getAppProfiles.mockResolvedValue([{ id: 1, name: "Standard" }]);
  });
  afterEach(() => vi.clearAllMocks());

  test("validate resolves the schema by definitionName or display name", () => {
    const withNames: IndexerResource[] = [{ ...schema[0]!, definitionName: "thepiratebay", name: "The Pirate Bay" }];
    expect(sync().validate({ name: "TPB", definition: "thepiratebay" }, withNames).valid).toBe(true);
    expect(sync().validate({ name: "TPB", definition: "The Pirate Bay" }, withNames).valid).toBe(true);
    expect(sync().validate({ name: "x", definition: "does-not-exist" }, withNames).valid).toBe(false);
  });

  test("matches server indexers by name", async () => {
    const server: IndexerResource[] = [{ id: 4, name: "1337x", implementation: "Cardigann", fields: [], tags: [], enable: true }];
    const diff = await sync().calculateDiff([{ name: "1337x", definition: "1337x" }], server, [], { appProfiles: [] });
    expect(diff.unchanged.map((u) => u.server.name)).toEqual(["1337x"]);
  });

  it("creates an indexer with resolved defaults", async () => {
    const out = await sync().sync([{ name: "1337x", definition: "1337x", app_profile: "Standard", priority: 10 }], undefined, cache());
    expect(out.added).toBe(1);
    const payload = mockClient.createIndexer.mock.calls[0]![0];
    expect(payload.name).toBe("1337x");
    expect(payload.implementation).toBe("Cardigann");
    expect(payload.definitionName).toBe("1337x");
    expect(payload.enable).toBe(true);
    expect(payload.priority).toBe(10);
    expect(payload.appProfileId).toBe(1);
  });

  it("fails when the configured sync profile does not exist", async () => {
    await expect(sync().sync([{ name: "1337x", definition: "1337x", sync_profile: "Nope" }], undefined, cache())).rejects.toThrow(
      "Sync profile 'Nope' not found for Indexer '1337x'. Available: Standard",
    );
    expect(mockClient.createIndexer).not.toHaveBeenCalled();
  });

  it("fails when the sync profiles cannot be loaded", async () => {
    mockClient.getAppProfiles.mockRejectedValueOnce(new Error("connection refused"));

    await expect(sync().sync([{ name: "1337x", definition: "1337x" }], undefined, cache())).rejects.toThrow("connection refused");
    expect(mockClient.createIndexer).not.toHaveBeenCalled();
  });

  it("fails instead of guessing an id when the server has no sync profiles", async () => {
    mockClient.getAppProfiles.mockResolvedValue([]);

    await expect(sync().sync([{ name: "1337x", definition: "1337x" }], undefined, cache())).rejects.toThrow(
      "No sync profile available on Prowlarr for Indexer '1337x'",
    );
    expect(mockClient.createIndexer).not.toHaveBeenCalled();
  });

  it("keeps the existing app profile on update when none is configured", async () => {
    mockClient.getIndexers.mockResolvedValue([
      { id: 3, name: "1337x", implementation: "Cardigann", appProfileId: 2, fields: [], tags: [], enable: true, priority: 25 },
    ]);

    await sync().sync([{ name: "1337x", definition: "1337x", priority: 40 }], undefined, cache());

    const [, payload] = mockClient.updateIndexer.mock.calls[0]!;
    expect(payload.appProfileId).toBe(2);
    expect(payload.priority).toBe(40);
  });

  it("deletes unmanaged indexers when enabled", async () => {
    mockClient.getIndexers.mockResolvedValue([{ id: 9, name: "Stale", implementation: "Cardigann", fields: [], tags: [] }]);
    const out = await sync().sync([], { enabled: true }, cache());
    expect(mockClient.deleteIndexer).toHaveBeenCalledWith("9");
    expect(out.removed).toBe(1);
  });

  it("accepts the released app_profile key as well as sync_profile", async () => {
    await sync().sync([{ name: "1337x", definition: "1337x", app_profile: "standard" }], undefined, cache());

    const [payload] = mockClient.createIndexer.mock.calls[0]!;
    expect(payload.appProfileId).toBe(1);
  });

  describe("profiles synced in the same run", () => {
    it("resolves against them instead of fetching", async () => {
      const passed = new IndexerSync([{ id: 4, name: "Seeded" }]);

      await passed.sync([{ name: "1337x", definition: "1337x", sync_profile: "Seeded" }], undefined, cache());

      expect(mockClient.getAppProfiles).not.toHaveBeenCalled();
      const [payload] = mockClient.createIndexer.mock.calls[0]!;
      expect(payload.appProfileId).toBe(4);
    });

    it("does not compare appProfileId for a profile that does not exist yet", async () => {
      mockClient.getIndexers.mockResolvedValue([
        { id: 3, name: "1337x", implementation: "Cardigann", appProfileId: 2, fields: [], tags: [], enable: true, priority: 25 },
      ]);
      const passed = new IndexerSync([{ id: 2, name: "Standard" }, { name: "Pending" }]);

      const out = await passed.sync([{ name: "1337x", definition: "1337x", sync_profile: "Pending" }], undefined, cache());

      expect(out.diffEntries).toEqual([]);
      expect(mockClient.updateIndexer).not.toHaveBeenCalled();
    });

    it("still rejects a name that is in neither the config nor the server", async () => {
      const passed = new IndexerSync([{ id: 4, name: "Seeded" }]);

      await expect(passed.sync([{ name: "1337x", definition: "1337x", sync_profile: "Nope" }], undefined, cache())).rejects.toThrow(
        "Sync profile 'Nope' not found for Indexer '1337x'. Available: Seeded",
      );
    });
  });
});
