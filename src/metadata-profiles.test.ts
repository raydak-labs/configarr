import { describe, expect, test, vi } from "vitest";
import * as uclient from "./clients/unified-client";
import * as log from "./logger";
import { MergedMetadataProfileResource } from "./__generated__/mergedTypes";
import { ArrType } from "./types/common.types";
import { InputConfigMetadataProfile, MergedConfigInstance } from "./types/config.types";
import {
  calculateMetadataProfilesDiff,
  deleteMetadataProfile,
  getUnmanagedMetadataProfiles,
  isMetadataProfileEqual,
  normalizeMetadataProfileForComparison,
} from "./metadata-profiles";

describe("metadata-profiles - comparison helpers", () => {
  test("normalizeMetadataProfileForComparison (Lidarr) normalizes album types and statuses", () => {
    const serverProfile: MergedMetadataProfileResource = {
      id: 1,
      name: "Default",
      primaryAlbumTypes: [
        { id: 1, albumType: { id: 1, name: "EP" }, allowed: true },
        { id: 2, albumType: { id: 2, name: "Single" }, allowed: false },
      ],
      secondaryAlbumTypes: [
        { id: 1, albumType: { id: 0, name: "Studio" }, allowed: true },
      ],
      releaseStatuses: [{ id: 1, releaseStatus: { id: 0, name: "Official" }, allowed: true }],
    };

    const normalized = normalizeMetadataProfileForComparison(serverProfile, "LIDARR");

    expect(normalized.name).toBe("Default");
    expect(normalized.primaryAlbumTypes).toHaveLength(2);
    expect(normalized.secondaryAlbumTypes).toHaveLength(1);
    expect(normalized.releaseStatuses).toHaveLength(1);
  });

  test("isMetadataProfileEqual (Lidarr) detects equality ignoring ids", () => {
    const a: MergedMetadataProfileResource = {
      id: 1,
      name: "Default",
      primaryAlbumTypes: [{ id: 1, albumType: { id: 0, name: "Album" }, allowed: true }],
    };

    const b: MergedMetadataProfileResource = {
      id: 999,
      name: "Default",
      primaryAlbumTypes: [{ id: 2, albumType: { id: 0, name: "Album" }, allowed: true }],
    };

    expect(isMetadataProfileEqual("LIDARR", a, b)).toBe(true);
  });

  test("isMetadataProfileEqual (Readarr) compares scalar fields and ignored languages", () => {
    const a: MergedMetadataProfileResource = {
      id: 1,
      name: "Books",
      minPopularity: 10,
      skipMissingDate: true,
      skipMissingIsbn: false,
      skipPartsAndSets: false,
      skipSeriesSecondary: false,
      allowedLanguages: "en",
      minPages: 100,
      ignored: ["Magazine", "Comic"],
    };

    const b: MergedMetadataProfileResource = {
      id: 2,
      name: "Books",
      minPopularity: 10,
      skipMissingDate: true,
      skipMissingIsbn: false,
      skipPartsAndSets: false,
      skipSeriesSecondary: false,
      allowedLanguages: "en",
      minPages: 100,
      ignored: ["Comic", "Magazine"], // different order
    };

    expect(isMetadataProfileEqual("READARR", a, b)).toBe(true);
  });

  test("isMetadataProfileEqual (Readarr) detects differences in boolean fields", () => {
    const a: MergedMetadataProfileResource = {
      id: 1,
      name: "Books",
      skipMissingDate: true,
      skipMissingIsbn: false,
    };

    const b: MergedMetadataProfileResource = {
      id: 2,
      name: "Books",
      skipMissingDate: false, // different
      skipMissingIsbn: false,
    };

    expect(isMetadataProfileEqual("READARR", a, b)).toBe(false);
  });

  test("normalizeMetadataProfileForComparison (Readarr) converts undefined booleans to false", () => {
    const serverProfile: MergedMetadataProfileResource = {
      id: 1,
      name: "Books",
      skipMissingDate: undefined,
      skipMissingIsbn: undefined,
      minPopularity: 10,
    };

    const normalized = normalizeMetadataProfileForComparison(serverProfile, "READARR");

    expect(normalized.skipMissingDate).toBe(false);
    expect(normalized.skipMissingIsbn).toBe(false);
    expect(normalized.minPopularity).toBe(10);
  });
});

describe("metadata-profiles - diff calculation", () => {
  const baseConfig: Omit<MergedConfigInstance, "quality_profiles" | "custom_formats" | "customFormatDefinitions"> = {
    media_management: {},
    media_naming: {},
    delay_profiles: { default: undefined, additional: [] },
    metadata_profiles: [],
  } as any;

  test("calculateMetadataProfilesDiff - create new profile when not present on server", async () => {
    const profileCfg: InputConfigMetadataProfile = {
      name: "New Metadata Profile",
      minPopularity: 5,
    };

    const config: MergedConfigInstance = {
      ...baseConfig,
      custom_formats: [],
      quality_profiles: [],
      customFormatDefinitions: [],
      metadata_profiles: [profileCfg],
    };

    const server: MergedMetadataProfileResource[] = [];

    const { create, update, noChanges } = await calculateMetadataProfilesDiff("READARR", config, server);

    expect(create).toHaveLength(1);
    expect(update).toHaveLength(0);
    expect(noChanges).toHaveLength(0);
    expect(create[0].name).toBe("New Metadata Profile");
  });

  test("calculateMetadataProfilesDiff - update profile when changed on server", async () => {
    const profileCfg: InputConfigMetadataProfile = {
      name: "Books",
      minPopularity: 20,
    };

    const config: MergedConfigInstance = {
      ...baseConfig,
      custom_formats: [],
      quality_profiles: [],
      customFormatDefinitions: [],
      metadata_profiles: [profileCfg],
    };

    const server: MergedMetadataProfileResource[] = [
      {
        id: 10,
        name: "Books",
        minPopularity: 5,
      },
    ];

    const { create, update, noChanges } = await calculateMetadataProfilesDiff("READARR", config, server);

    expect(create).toHaveLength(0);
    expect(update).toHaveLength(1);
    expect(noChanges).toHaveLength(0);
    expect(update[0].id).toBe(10);
    expect(update[0].minPopularity).toBe(20);
  });

  test("calculateMetadataProfilesDiff - no changes when config matches server", async () => {
    const profileCfg: InputConfigMetadataProfile = {
      name: "Books",
      minPopularity: 10,
    };

    const config: MergedConfigInstance = {
      ...baseConfig,
      custom_formats: [],
      quality_profiles: [],
      customFormatDefinitions: [],
      metadata_profiles: [profileCfg],
    };

    const server: MergedMetadataProfileResource[] = [
      {
        id: 10,
        name: "Books",
        minPopularity: 10,
      },
    ];

    const { create, update, noChanges } = await calculateMetadataProfilesDiff("READARR", config, server);

    expect(create).toHaveLength(0);
    expect(update).toHaveLength(0);
    expect(noChanges).toEqual(["Books"]);
  });

  test("calculateMetadataProfilesDiff - handles snake_case field names (Readarr)", async () => {
    const profileCfg: InputConfigMetadataProfile = {
      name: "Books",
      min_popularity: 15, // snake_case
      skip_missing_date: true, // snake_case
      must_not_contain: ["Comic"], // snake_case
    };

    const config: MergedConfigInstance = {
      ...baseConfig,
      custom_formats: [],
      quality_profiles: [],
      customFormatDefinitions: [],
      metadata_profiles: [profileCfg],
    };

    const server: MergedMetadataProfileResource[] = [
      {
        id: 10,
        name: "Books",
        minPopularity: 10, // camelCase
        skipMissingDate: false, // different value
        ignored: [], // camelCase
      },
    ];

    const { create, update, noChanges } = await calculateMetadataProfilesDiff("READARR", config, server);

    expect(create).toHaveLength(0);
    expect(update).toHaveLength(1);
    expect(noChanges).toHaveLength(0);
    expect(update[0].minPopularity).toBe(15);
    expect(update[0].skipMissingDate).toBe(true);
    expect(update[0].ignored).toEqual(["Comic"]);
  });

  test("getUnmanagedMetadataProfiles returns profiles not present in config", () => {
    const configProfiles: InputConfigMetadataProfile[] = [{ name: "Keep" }];

    const server: MergedMetadataProfileResource[] = [
      { id: 1, name: "Keep" },
      { id: 2, name: "DeleteMe" },
    ];

    const unmanaged = getUnmanagedMetadataProfiles(server, configProfiles);

    expect(unmanaged).toHaveLength(1);
    expect(unmanaged[0].name).toBe("DeleteMe");
  });
});

describe("metadata-profiles - delete helper", () => {
  test("deleteMetadataProfile calls UnifiedClient.deleteMetadataProfile with id", async () => {
    const deleteFn = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(uclient, "getUnifiedClient").mockReturnValue({
      deleteMetadataProfile: deleteFn,
    } as any);

    const logSpy = vi.spyOn(log.logger, "info").mockImplementation(() => {});

    const profile: MergedMetadataProfileResource = {
      id: 1001,
      name: "ToDelete",
    };

    await deleteMetadataProfile(profile);

    expect(deleteFn).toHaveBeenCalledTimes(1);
    expect(deleteFn).toHaveBeenCalledWith("1001");

    logSpy.mockRestore();
  });

  test("deleteMetadataProfile throws if id is missing", async () => {
    vi.spyOn(uclient, "getUnifiedClient").mockReturnValue({
      deleteMetadataProfile: vi.fn(),
    } as any);

    const profile: MergedMetadataProfileResource = {
      name: "Broken",
    };

    await expect(deleteMetadataProfile(profile)).rejects.toThrow(
      "Cannot delete metadata profile 'Broken' without an ID.",
    );
  });
});