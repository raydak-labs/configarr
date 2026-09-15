import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEnvs } from "../env";
import type { AppProfileResource } from "./types";
import { syncSyncProfiles } from "./syncProfileSync";

vi.mock("../env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../env")>();
  return { ...actual, getEnvs: vi.fn(() => ({ DRY_RUN: false, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" })) };
});
vi.mock("../logger", () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const mockClient = {
  getAppProfiles: vi.fn(async (): Promise<AppProfileResource[]> => []),
  createAppProfile: vi.fn(async (p: AppProfileResource) => ({ ...p, id: 7 })),
  updateAppProfile: vi.fn(async (_id: string, p: AppProfileResource) => p),
  deleteAppProfile: vi.fn(async () => undefined),
};
vi.mock("../clients/unified-client", () => ({
  getSpecificClient: vi.fn(() => mockClient),
  getUnifiedClient: vi.fn(() => ({ api: mockClient })),
}));

const standard: AppProfileResource = {
  id: 1,
  name: "Standard",
  enableRss: true,
  enableAutomaticSearch: true,
  enableInteractiveSearch: true,
  minimumSeeders: 1,
};

const dryRun = () => vi.mocked(getEnvs).mockReturnValue({ DRY_RUN: true, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" } as any);

describe("syncSyncProfiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // mockReturnValue survives clearAllMocks, so the dry-run tests would leak into the rest.
    vi.mocked(getEnvs).mockReturnValue({ DRY_RUN: false, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" } as any);
    mockClient.getAppProfiles.mockResolvedValue([standard]);
  });
  afterEach(() => vi.clearAllMocks());

  it("skips entirely when nothing is configured", async () => {
    const res = await syncSyncProfiles(undefined);

    expect(mockClient.getAppProfiles).not.toHaveBeenCalled();
    expect(res.diffEntries).toEqual([]);
    expect(res.profiles).toBeUndefined();
  });

  it("creates a missing profile using Prowlarr's defaults for unset props", async () => {
    const res = await syncSyncProfiles({ data: [{ name: "Seeded", minimum_seeders: 5 }] });

    expect(mockClient.createAppProfile).toHaveBeenCalledWith({
      name: "Seeded",
      enableRss: true,
      enableAutomaticSearch: true,
      enableInteractiveSearch: true,
      minimumSeeders: 5,
    });
    expect(res.added).toBe(1);
    expect(res.diffEntries).toEqual([{ resourceType: "SyncProfile", name: "Seeded", action: "create" }]);
  });

  it("returns created profiles so indexers can reference them", async () => {
    const res = await syncSyncProfiles({ data: [{ name: "Seeded" }] });

    expect(res.profiles).toEqual([
      standard,
      { name: "Seeded", enableRss: true, enableAutomaticSearch: true, enableInteractiveSearch: true, minimumSeeders: 1, id: 7 },
    ]);
  });

  it("updates only the props the config sets and leaves the rest alone", async () => {
    const res = await syncSyncProfiles({ data: [{ name: "Standard", enable_interactive_search: false }] });

    expect(mockClient.updateAppProfile).toHaveBeenCalledWith("1", { ...standard, enableInteractiveSearch: false });
    expect(res.updated).toBe(1);
    expect(res.diffEntries).toEqual([
      {
        resourceType: "SyncProfile",
        name: "Standard",
        action: "update",
        fieldChanges: [{ field: "enableInteractiveSearch", from: true, to: false }],
      },
    ]);
  });

  it("reports no change when the server already matches", async () => {
    const res = await syncSyncProfiles({ data: [{ name: "Standard", minimum_seeders: 1 }] });

    expect(mockClient.updateAppProfile).not.toHaveBeenCalled();
    expect(res.diffEntries).toEqual([]);
  });

  it("matches names case-insensitively rather than creating a duplicate", async () => {
    await syncSyncProfiles({ data: [{ name: "standard", minimum_seeders: 3 }] });

    expect(mockClient.createAppProfile).not.toHaveBeenCalled();
    expect(mockClient.updateAppProfile).toHaveBeenCalledWith("1", { ...standard, minimumSeeders: 3 });
  });

  it("skips duplicate config names", async () => {
    const res = await syncSyncProfiles({ data: [{ name: "Dup" }, { name: "dup" }] });

    expect(mockClient.createAppProfile).not.toHaveBeenCalled();
    expect(res.added).toBe(0);
  });

  it("deletes unmanaged profiles but keeps listed and ignored ones", async () => {
    mockClient.getAppProfiles.mockResolvedValue([
      standard,
      { ...standard, id: 2, name: "Ignored" },
      { ...standard, id: 3, name: "Orphan" },
    ]);

    const res = await syncSyncProfiles({ data: [{ name: "Standard" }], delete_unmanaged: { enabled: true, ignore: ["Ignored"] } });

    expect(mockClient.deleteAppProfile).toHaveBeenCalledTimes(1);
    expect(mockClient.deleteAppProfile).toHaveBeenCalledWith("3");
    expect(res.removed).toBe(1);
    expect(res.profiles?.map((p) => p.name)).toEqual(["Standard", "Ignored"]);
  });

  it("leaves unmanaged profiles alone when delete_unmanaged is off", async () => {
    mockClient.getAppProfiles.mockResolvedValue([standard, { ...standard, id: 3, name: "Orphan" }]);

    const res = await syncSyncProfiles({ data: [{ name: "Standard" }] });

    expect(mockClient.deleteAppProfile).not.toHaveBeenCalled();
    expect(res.removed).toBe(0);
  });

  it("writes nothing in a dry run but still reports the changes", async () => {
    dryRun();
    mockClient.getAppProfiles.mockResolvedValue([standard, { ...standard, id: 3, name: "Orphan" }]);

    const res = await syncSyncProfiles({
      data: [{ name: "Standard", minimum_seeders: 9 }, { name: "New" }],
      delete_unmanaged: { enabled: true },
    });

    expect(mockClient.createAppProfile).not.toHaveBeenCalled();
    expect(mockClient.updateAppProfile).not.toHaveBeenCalled();
    expect(mockClient.deleteAppProfile).not.toHaveBeenCalled();
    expect(res).toMatchObject({ added: 1, updated: 1, removed: 1 });
    expect(res.diffEntries.map((e) => e.action)).toEqual(["update", "create", "delete"]);
  });

  it("leaves a profile it would delete out of the returned list in a dry run", async () => {
    dryRun();
    mockClient.getAppProfiles.mockResolvedValue([{ ...standard, id: 3, name: "Orphan" }, standard]);

    const res = await syncSyncProfiles({ data: [{ name: "Standard" }], delete_unmanaged: { enabled: true } });

    // Orphan is first in server order, so an indexer with no sync_profile would otherwise
    // default to a profile the real run deletes before indexers sync.
    expect(mockClient.deleteAppProfile).not.toHaveBeenCalled();
    expect(res.profiles?.map((p) => p.name)).toEqual(["Standard"]);
  });

  it("returns a dry-run created profile without an id", async () => {
    dryRun();

    const res = await syncSyncProfiles({ data: [{ name: "New" }] });

    expect(res.profiles?.find((p) => p.name === "New")?.id).toBeUndefined();
  });

  it("throws when a create fails", async () => {
    mockClient.createAppProfile.mockRejectedValueOnce(new Error("boom"));

    await expect(syncSyncProfiles({ data: [{ name: "New" }] })).rejects.toThrow("Failed to create sync profile 'New': boom");
  });

  it("throws when a delete fails", async () => {
    mockClient.getAppProfiles.mockResolvedValue([{ ...standard, id: 3, name: "InUse" }]);
    mockClient.deleteAppProfile.mockRejectedValueOnce(new Error("still in use"));

    await expect(syncSyncProfiles({ data: [], delete_unmanaged: { enabled: true } })).rejects.toThrow(
      "Failed to delete sync profile 'InUse': still in use",
    );
  });
});
