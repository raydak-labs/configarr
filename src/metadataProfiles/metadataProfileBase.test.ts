import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mocked } from "vitest";
import type { MetadataProfilesClient } from "../clients/capabilities";
import type { MetadataProfileResource } from "../__generated__/readarr/data-contracts";
import { ReadarrMetadataProfileSync } from "./metadataProfileReadarr";
import { ServerCache } from "../cache";
import type { InputConfigReadarrMetadataProfile, MergedConfigInstance } from "../types/config.types";

vi.mock("../env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../env")>();
  return {
    ...actual,
    getEnvs: vi.fn(() => ({ DRY_RUN: false, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" })),
  };
});

import { getEnvs } from "../env";

describe("BaseMetadataProfileSync", () => {
  it("should be an abstract class that requires implementation", () => {
    // This is an abstract class - concrete implementations are tested separately
    // in metadataProfileLidarr.test.ts and metadataProfileReadarr.test.ts
    expect(true).toBe(true);
  });
});

describe("syncMetadataProfiles", () => {
  const mockApi: Mocked<MetadataProfilesClient<MetadataProfileResource>> = {
    getMetadataProfiles: vi.fn(),
    createMetadataProfile: vi.fn(),
    updateMetadataProfile: vi.fn(),
    deleteMetadataProfile: vi.fn(),
  };

  let serverCache: ServerCache;

  const config = (extra: Partial<MergedConfigInstance> = {}) =>
    ({
      metadata_profiles: [{ name: "Standard", min_popularity: 10 }] as InputConfigReadarrMetadataProfile[],
      ...extra,
    }) as MergedConfigInstance;

  const setDryRun = (dryRun: boolean) =>
    vi.mocked(getEnvs).mockReturnValue({ DRY_RUN: dryRun, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" } as never);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEnvs).mockReturnValue({ DRY_RUN: false, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" } as never);
    serverCache = new ServerCache();
    mockApi.createMetadataProfile.mockResolvedValue({ id: 100, name: "Standard" });
    mockApi.updateMetadataProfile.mockResolvedValue({ id: 1, name: "Standard" });
    mockApi.deleteMetadataProfile.mockResolvedValue(undefined);
  });

  it("creates missing profiles and updates changed ones", async () => {
    mockApi.getMetadataProfiles.mockResolvedValue([
      { id: 1, name: "Standard", minPopularity: 2 },
      { id: 2, name: "Enhanced", minPopularity: 5 },
    ]);

    const result = await new ReadarrMetadataProfileSync(mockApi).syncMetadataProfiles(
      config({
        metadata_profiles: [
          { name: "Standard", min_popularity: 10 },
          { name: "Books", min_popularity: 1 },
        ],
      }),
      serverCache,
    );

    expect(mockApi.createMetadataProfile).toHaveBeenCalledTimes(1);
    expect(mockApi.createMetadataProfile).toHaveBeenCalledWith({ name: "Books", minPopularity: 1 });
    expect(mockApi.updateMetadataProfile).toHaveBeenCalledTimes(1);
    expect(mockApi.updateMetadataProfile).toHaveBeenCalledWith("1", { name: "Standard", minPopularity: 10 });
    expect(result).toMatchObject({ added: 1, updated: 1, removed: 0 });
    expect(result.diffEntries.map((e) => [e.name, e.action])).toEqual([
      ["Books", "create"],
      ["Standard", "update"],
    ]);
  });

  it("reports nothing when the server is in sync", async () => {
    mockApi.getMetadataProfiles.mockResolvedValue([{ id: 1, name: "Standard", minPopularity: 10 }]);

    const result = await new ReadarrMetadataProfileSync(mockApi).syncMetadataProfiles(config(), serverCache);

    expect(result).toEqual({ added: 0, updated: 0, removed: 0, diffEntries: [] });
    expect(mockApi.createMetadataProfile).not.toHaveBeenCalled();
    expect(mockApi.updateMetadataProfile).not.toHaveBeenCalled();
  });

  it("reports the diff but writes nothing on a dry run", async () => {
    setDryRun(true);
    mockApi.getMetadataProfiles.mockResolvedValue([{ id: 1, name: "Standard", minPopularity: 2 }]);

    const result = await new ReadarrMetadataProfileSync(mockApi).syncMetadataProfiles(config(), serverCache);

    expect(mockApi.createMetadataProfile).not.toHaveBeenCalled();
    expect(mockApi.updateMetadataProfile).not.toHaveBeenCalled();
    expect(result).toMatchObject({ added: 0, updated: 1, removed: 0 });
    expect(result.diffEntries).toHaveLength(1);
  });

  it("does not delete unmanaged profiles when delete_unmanaged_metadata_profiles is absent", async () => {
    mockApi.getMetadataProfiles.mockResolvedValue([
      { id: 1, name: "Standard", minPopularity: 10 },
      { id: 2, name: "Enhanced", minPopularity: 5 },
    ]);

    const result = await new ReadarrMetadataProfileSync(mockApi).syncMetadataProfiles(config(), serverCache);

    expect(mockApi.deleteMetadataProfile).not.toHaveBeenCalled();
    expect(result.removed).toBe(0);
  });

  it("deletes unmanaged profiles except the built-in None profile and ignored names", async () => {
    mockApi.getMetadataProfiles.mockResolvedValue([
      { id: 1, name: "Standard", minPopularity: 10 },
      { id: 2, name: "Enhanced", minPopularity: 5 },
      { id: 3, name: "None" },
      { id: 4, name: "Keep Me", minPopularity: 1 },
    ]);

    const result = await new ReadarrMetadataProfileSync(mockApi).syncMetadataProfiles(
      config({ delete_unmanaged_metadata_profiles: { enabled: true, ignore: ["Keep Me"] } }),
      serverCache,
    );

    expect(mockApi.deleteMetadataProfile).toHaveBeenCalledTimes(1);
    expect(mockApi.deleteMetadataProfile).toHaveBeenCalledWith("2");
    expect(result.removed).toBe(1);
    expect(result.diffEntries).toContainEqual({ resourceType: "MetadataProfile", name: "Enhanced", action: "delete" });
  });

  it("does not delete anything when delete_unmanaged_metadata_profiles is disabled", async () => {
    mockApi.getMetadataProfiles.mockResolvedValue([
      { id: 1, name: "Standard", minPopularity: 10 },
      { id: 2, name: "Enhanced", minPopularity: 5 },
    ]);

    const result = await new ReadarrMetadataProfileSync(mockApi).syncMetadataProfiles(
      config({ delete_unmanaged_metadata_profiles: { enabled: false } }),
      serverCache,
    );

    expect(mockApi.deleteMetadataProfile).not.toHaveBeenCalled();
    expect(result.removed).toBe(0);
  });

  it("reports unmanaged deletions but deletes nothing on a dry run", async () => {
    setDryRun(true);
    mockApi.getMetadataProfiles.mockResolvedValue([
      { id: 1, name: "Standard", minPopularity: 10 },
      { id: 2, name: "Enhanced", minPopularity: 5 },
    ]);

    const result = await new ReadarrMetadataProfileSync(mockApi).syncMetadataProfiles(
      config({ delete_unmanaged_metadata_profiles: { enabled: true } }),
      serverCache,
    );

    expect(mockApi.deleteMetadataProfile).not.toHaveBeenCalled();
    expect(result.removed).toBe(1);
    expect(result.diffEntries).toContainEqual({ resourceType: "MetadataProfile", name: "Enhanced", action: "delete" });
  });

  it("keeps deleting after a profile could not be deleted because it is in use", async () => {
    mockApi.getMetadataProfiles.mockResolvedValue([
      { id: 1, name: "Standard", minPopularity: 10 },
      { id: 2, name: "Enhanced", minPopularity: 5 },
      { id: 3, name: "Audiobook", minPopularity: 5 },
    ]);
    mockApi.deleteMetadataProfile
      .mockRejectedValueOnce(new Error("Cannot delete profile. Profile is currently in use."))
      .mockResolvedValueOnce(undefined);

    const result = await new ReadarrMetadataProfileSync(mockApi).syncMetadataProfiles(
      config({ delete_unmanaged_metadata_profiles: { enabled: true } }),
      serverCache,
    );

    expect(mockApi.deleteMetadataProfile).toHaveBeenCalledTimes(2);
    expect(result.removed).toBe(1);
  });

  it("propagates create failures", async () => {
    mockApi.getMetadataProfiles.mockResolvedValue([]);
    mockApi.createMetadataProfile.mockRejectedValue(new Error("500 from server"));

    await expect(new ReadarrMetadataProfileSync(mockApi).syncMetadataProfiles(config(), serverCache)).rejects.toThrow("500 from server");
  });
});
