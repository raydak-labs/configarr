import path from "path";
import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import * as uclient from "./clients/unified-client";
import * as log from "./logger";
import {
  MergedCustomFormatResource,
  MergedQualityDefinitionResource,
  MergedQualityProfileQualityItemResource,
  MergedQualityProfileResource,
} from "./__generated__/mergedTypes";
import { ServerCache } from "./cache";
import {
  calculateQualityProfilesDiff,
  deleteAllQualityProfiles,
  deleteQualityProfile,
  isOrderOfQualitiesEqual,
  isOrderOfConfigQualitiesEqual,
  mapQualities,
} from "./quality-profiles";
import { CFProcessing } from "./types/common.types";
import { ConfigQualityProfile, ConfigQualityProfileItem, MergedConfigInstance } from "./types/config.types";
import { cloneWithJSON, loadJsonFile } from "./util";

describe("QualityProfiles", async () => {
  const sampleQualityProfile = loadJsonFile<MergedQualityProfileResource>(
    path.resolve(__dirname, `../tests/samples/single_quality_profile.json`),
  );

  const sampleQualityDefinitions = loadJsonFile<MergedQualityDefinitionResource[]>(
    path.resolve(__dirname, `../tests/samples/qualityDefinition.json`),
  );

  const sampleCustomFormat = loadJsonFile<MergedCustomFormatResource>(
    path.resolve(__dirname, `../tests/samples/single_custom_format.json`),
  );

  test("isOrderOfConfigQualitiesEqual - should match", async ({}) => {
    const fromConfig: ConfigQualityProfileItem[] = [
      { name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] },
      { name: "HDTV-1080p" },
      { name: "Bluray-1080p" },
      { name: "Remux-1080p" },
      { name: "WEB 720p", qualities: ["WEBDL-720p", "WEBRip-720p"] },
      { name: "HDTV-720p" },
    ];
    const fromServer: ConfigQualityProfileItem[] = [
      { name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] },
      { name: "HDTV-1080p" },
      { name: "Bluray-1080p" },
      { name: "Remux-1080p" },
      { name: "WEB 720p", qualities: ["WEBDL-720p", "WEBRip-720p"] },
      { name: "HDTV-720p" },
    ];
    const result = isOrderOfConfigQualitiesEqual(fromConfig, fromServer);

    expect(result).toBe(true);
  });

  test("isOrderOfConfigQualitiesEqual - different order", async ({}) => {
    const fromConfig: ConfigQualityProfileItem[] = [
      { name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] },
      { name: "HDTV-1080p" },
      { name: "Bluray-1080p" },
      { name: "Remux-1080p" },
      { name: "WEB 720p", qualities: ["WEBDL-720p", "WEBRip-720p"] },
      { name: "HDTV-720p" },
    ];
    const fromServer: ConfigQualityProfileItem[] = [
      { name: "Bluray-1080p", qualities: [] },
      { name: "HDTV-720p", qualities: [] },
      { name: "WEB 720p", qualities: ["WEBDL-720p", "WEBRip-720p"] },
      { name: "HDTV-1080p", qualities: [] },
      { name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] },
      { name: "Remux-1080p", qualities: [] },
    ];
    const result = isOrderOfConfigQualitiesEqual(fromConfig, fromServer);

    expect(result).toBe(false);
  });

  test("mapQualities - enabled correctly mapped (default sorting)", async ({}) => {
    const fromConfig: ConfigQualityProfileItem[] = [
      { name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] },
      { name: "HDTV-1080p" },
    ];

    const resources: MergedQualityDefinitionResource[] = [
      { id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } },
      { id: 2, title: "WEBDL-1080p", weight: 2, quality: { id: 2, name: "WEBDL-1080p" } },
      { id: 3, title: "WEBRip-1080p", weight: 2, quality: { id: 3, name: "WEBRip-1080p" } },
      { id: 4, title: "Unknown", weight: 2, quality: { id: 4, name: "Unknown" } },
    ];

    const profile: ConfigQualityProfile = {
      name: "hi",
      min_format_score: 2,
      qualities: fromConfig,
      quality_sort: "top",
      upgrade: { allowed: true, until_quality: "yes", until_score: 5 },
      score_set: "default",
    };

    const result = mapQualities(resources, profile);

    expect(result).toHaveLength(3);
    // ordering matters

    expect(result[0]!.quality?.name).toBe("Unknown");
    expect(result[0]!.allowed).toBe(false);
    expect(result[1]!.quality?.name).toBe("HDTV-1080p");
    expect(result[1]!.allowed).toBe(true);
    expect(result[2]!.name).toBe("WEB 1080p");
    expect(result[2]!.allowed).toBe(true);
  });

  test("mapQualities - enabled mapped to false", async ({}) => {
    const fromConfig: ConfigQualityProfileItem[] = [
      { name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] },
      { name: "HDTV-1080p", enabled: false },
    ];

    const resources: MergedQualityDefinitionResource[] = [
      { id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } },
      { id: 2, title: "WEBDL-1080p", weight: 2, quality: { id: 2, name: "WEBDL-1080p" } },
      { id: 3, title: "WEBRip-1080p", weight: 2, quality: { id: 3, name: "WEBRip-1080p" } },
      { id: 4, title: "Unknown", weight: 2, quality: { id: 4, name: "Unknown" } },
    ];

    const profile: ConfigQualityProfile = {
      name: "hi",
      min_format_score: 2,
      qualities: fromConfig,
      quality_sort: "top",
      upgrade: { allowed: true, until_quality: "yes", until_score: 5 },
      score_set: "default",
    };

    const result = mapQualities(resources, profile);

    expect(result).toHaveLength(3);

    expect(result[0]!.quality?.name).toBe("Unknown");
    expect(result[0]!.allowed).toBe(false);
    expect(result[1]!.quality?.name).toBe("HDTV-1080p");
    expect(result[1]!.allowed).toBe(false);
    expect(result[2]!.name).toBe("WEB 1080p");
    expect(result[2]!.allowed).toBe(true);
  });

  test("mapQualities - ordering without nested qualities", async ({}) => {
    const fromConfig: ConfigQualityProfileItem[] = [
      { name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] },
      { name: "HDTV-1080p" },
    ];

    const resources: MergedQualityDefinitionResource[] = [
      { id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } },
      { id: 2, title: "WEBDL-1080p", weight: 2, quality: { id: 2, name: "WEBDL-1080p" } },
      { id: 3, title: "WEBRip-1080p", weight: 2, quality: { id: 3, name: "WEBRip-1080p" } },
    ];

    const profile: ConfigQualityProfile = {
      name: "Test Profile",
      min_format_score: 2,
      qualities: fromConfig,
      quality_sort: "top",
      upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 5 },
      score_set: "default",
    };

    const result = mapQualities(resources, profile);

    expect(result).toHaveLength(2);
    // ordering matters. Needs to be reversed for the API
    expect(result[0]!.quality?.name).toBe("HDTV-1080p");
    expect(result[1]!.name).toBe("WEB 1080p");
  });

  test("mapQualities - ordering with nested qualities", async ({}) => {
    const fromConfig: ConfigQualityProfileItem[] = [{ name: "HD Group", qualities: ["HDTV-1080p", "WEBDL-1080p"] }];

    const resources: MergedQualityDefinitionResource[] = [
      { id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } },
      { id: 2, title: "WEBDL-1080p", weight: 2, quality: { id: 2, name: "WEBDL-1080p" } },
    ];

    const profile: ConfigQualityProfile = {
      name: "Test Profile",
      min_format_score: 2,
      qualities: fromConfig,
      quality_sort: "top",
      upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 5 },
      score_set: "default",
    };

    const result = mapQualities(resources, profile);

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("HD Group");
    expect(result[0]!.items).toHaveLength(2);
    expect(result[0]!.items![0]!.quality?.name).toBe("WEBDL-1080p");
    expect(result[0]!.items![1]!.quality?.name).toBe("HDTV-1080p");
  });

  test("mapQualities - ordering with both nested and non-nested qualities", async ({}) => {
    const fromConfig: ConfigQualityProfileItem[] = [
      { name: "HD Group", qualities: ["HDTV-1080p", "WEBDL-1080p"] },
      { name: "WEB 720p", qualities: ["WEBDL-720p", "WEBRip-720p"] },
    ];

    const resources: MergedQualityDefinitionResource[] = [
      { id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } },
      { id: 2, title: "WEBDL-1080p", weight: 2, quality: { id: 2, name: "WEBDL-1080p" } },
      { id: 3, title: "WEBDL-720p", weight: 2, quality: { id: 3, name: "WEBDL-720p" } },
      { id: 4, title: "WEBRip-720p", weight: 2, quality: { id: 4, name: "WEBRip-720p" } },
    ];

    const profile: ConfigQualityProfile = {
      name: "Test Profile",
      min_format_score: 2,
      qualities: fromConfig,
      quality_sort: "top",
      upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 5 },
      score_set: "default",
    };

    const result = mapQualities(resources, profile);

    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe("WEB 720p");
    expect(result[0]!.items).toHaveLength(2);
    expect(result[0]!.items![0]!.quality?.name).toBe("WEBRip-720p");
    expect(result[0]!.items![1]!.quality?.name).toBe("WEBDL-720p");

    expect(result[1]!.name).toBe("HD Group");
    expect(result[1]!.items).toHaveLength(2);
    expect(result[1]!.items![0]!.quality?.name).toBe("WEBDL-1080p");
    expect(result[1]!.items![1]!.quality?.name).toBe("HDTV-1080p");
  });

  test("mapQualities - missing qualities added", async ({}) => {
    const fromConfig: ConfigQualityProfileItem[] = [
      { name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] },
      { name: "HDTV-1080p" },
    ];

    const resources: MergedQualityDefinitionResource[] = [
      { id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } },
      { id: 2, title: "WEBDL-1080p", weight: 2, quality: { id: 2, name: "WEBDL-1080p" } },
      { id: 3, title: "WEBRip-1080p", weight: 2, quality: { id: 3, name: "WEBRip-1080p" } },
      { id: 4, title: "Unknown", weight: 2, quality: { id: 4, name: "Unknown" } },
      { id: 5, title: "Test", weight: 2, quality: { id: 5, name: "Test" } },
    ];

    const profile: ConfigQualityProfile = {
      name: "hi",
      min_format_score: 2,
      qualities: fromConfig,
      quality_sort: "top",
      upgrade: { allowed: true, until_quality: "yes", until_score: 5 },
      score_set: "default",
    };

    const result = mapQualities(resources, profile);

    expect(result).toHaveLength(4);
    // ordering matters
    expect(result[0]!.quality?.name).toBe("Unknown");
    expect(result[0]!.allowed).toBe(false);
    expect(result[1]!.quality?.name).toBe("Test");
    expect(result[1]!.allowed).toBe(false);
    expect(result[2]!.quality?.name).toBe("HDTV-1080p");
    expect(result[2]!.allowed).toBe(true);
    expect(result[3]!.name).toBe("WEB 1080p");
    expect(result[3]!.allowed).toBe(true);
  });

  test("calculateQualityProfilesDiff - should diff if minUpgradeFormatScore / minFormatScore is different", async ({}) => {
    const cfMap: CFProcessing = { carrIdMapping: new Map(), cfNameToCarrConfig: new Map() };

    const fromConfig: ConfigQualityProfileItem[] = [{ name: "HDTV-1080p", enabled: false }];

    const resources: MergedQualityDefinitionResource[] = [
      { id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } },
    ];

    const profile: ConfigQualityProfile = {
      name: "hi",
      min_format_score: 2,
      qualities: fromConfig,
      quality_sort: "top",
      upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
      score_set: "default",
    };

    const config: MergedConfigInstance = {
      custom_formats: [],
      quality_profiles: [profile],
      customFormatDefinitions: [],
      media_management: {},
      media_naming: {},
    };

    const serverProfile = cloneWithJSON(sampleQualityProfile);
    serverProfile.name = "hi";
    serverProfile.formatItems = [];
    serverProfile.minUpgradeFormatScore = 3;
    serverProfile.minFormatScore = 3;
    serverProfile.cutoff = 1;
    serverProfile.items = [{ allowed: false, items: [], quality: { id: 1, name: "HDTV-1080p" } }];

    const serverQP: MergedQualityProfileResource[] = [serverProfile];
    const serverQD: MergedQualityDefinitionResource[] = resources;
    const serverCF: MergedCustomFormatResource[] = [cloneWithJSON(sampleCustomFormat)];

    const serverCache = new ServerCache(serverQD, serverQP, serverCF, []);

    let diff = await calculateQualityProfilesDiff("RADARR", cfMap, config, serverCache);
    expect(diff.changedQPs.length).toBe(1);
    expect(diff.create.length).toBe(0);
    expect(diff.noChanges.length).toBe(0);

    serverProfile.minFormatScore = 0;
    diff = await calculateQualityProfilesDiff("RADARR", cfMap, config, serverCache);
    expect(diff.changedQPs.length).toBe(1);
    expect(diff.create.length).toBe(0);
    expect(diff.noChanges.length).toBe(0);

    serverProfile.minUpgradeFormatScore = 0;
    diff = await calculateQualityProfilesDiff("RADARR", cfMap, config, serverCache);
    expect(diff.changedQPs.length).toBe(1);
    expect(diff.create.length).toBe(0);
    expect(diff.noChanges.length).toBe(0);

    profile.min_format_score = 0;
    serverProfile.minFormatScore = 1;
    diff = await calculateQualityProfilesDiff("RADARR", cfMap, config, serverCache);
    expect(diff.changedQPs.length).toBe(1);
    expect(diff.create.length).toBe(0);
    expect(diff.noChanges.length).toBe(0);
  });

  test("calculateQualityProfilesDiff - should not diff if minFormatScore is equal", async ({}) => {
    const cfMap: CFProcessing = { carrIdMapping: new Map(), cfNameToCarrConfig: new Map() };

    const fromConfig: ConfigQualityProfileItem[] = [{ name: "HDTV-1080p", enabled: false }];

    const resources: MergedQualityDefinitionResource[] = [
      { id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } },
    ];

    const profile: ConfigQualityProfile = {
      name: "hi",
      min_format_score: 2,
      qualities: fromConfig,
      quality_sort: "top",
      upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
      score_set: "default",
    };

    const config: MergedConfigInstance = {
      custom_formats: [],
      quality_profiles: [profile],
      customFormatDefinitions: [],
      media_management: {},
      media_naming: {},
    };

    const serverProfile = cloneWithJSON(sampleQualityProfile);
    serverProfile.name = "hi";
    serverProfile.formatItems = [];
    serverProfile.minUpgradeFormatScore = 3;
    serverProfile.minFormatScore = 2;
    serverProfile.cutoff = 1;
    serverProfile.items = [{ allowed: false, items: [], quality: { id: 1, name: "HDTV-1080p" } }];

    const serverQP: MergedQualityProfileResource[] = [serverProfile];
    const serverQD: MergedQualityDefinitionResource[] = resources;
    const serverCF: MergedCustomFormatResource[] = [cloneWithJSON(sampleCustomFormat)];

    const serverCache = new ServerCache(serverQD, serverQP, serverCF, []);

    const diff = await calculateQualityProfilesDiff("RADARR", cfMap, config, serverCache);
    expect(diff.changedQPs.length).toBe(0);
    expect(diff.create.length).toBe(0);
    expect(diff.noChanges.length).toBe(1);
  });

  test("calculateQualityProfilesDiff - should not diff if minUpgradeFormatScore is not configured", async ({}) => {
    // TODO
  });

  test("calculateQualityProfilesDiff - should diff for languageChange (radarr)", async ({}) => {
    const cfMap: CFProcessing = { carrIdMapping: new Map(), cfNameToCarrConfig: new Map() };

    const fromConfig: ConfigQualityProfileItem[] = [{ name: "HDTV-1080p", enabled: false }];

    const resources: MergedQualityDefinitionResource[] = [
      { id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } },
    ];

    const profile: ConfigQualityProfile = {
      name: "hi",
      min_format_score: 2,
      qualities: fromConfig,
      quality_sort: "top",
      upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
      score_set: "default",
      language: "Any",
    };

    const config: MergedConfigInstance = {
      custom_formats: [],
      quality_profiles: [profile],
      customFormatDefinitions: [],
      media_management: {},
      media_naming: {},
    };

    const serverProfile = cloneWithJSON(sampleQualityProfile);
    serverProfile.name = "hi";
    serverProfile.formatItems = [];
    serverProfile.minUpgradeFormatScore = 3;
    serverProfile.minFormatScore = 2;
    serverProfile.cutoff = 1;
    serverProfile.items = [{ allowed: false, items: [], quality: { id: 1, name: "HDTV-1080p" } }];
    serverProfile.language = { id: 1, name: "English" };

    const serverQP: MergedQualityProfileResource[] = [serverProfile];
    const serverQD: MergedQualityDefinitionResource[] = resources;
    const serverCF: MergedCustomFormatResource[] = [cloneWithJSON(sampleCustomFormat)];

    const serverCache = new ServerCache(serverQD, serverQP, serverCF, [{ id: 0, name: "Any" }]);

    const diff = await calculateQualityProfilesDiff("RADARR", cfMap, config, serverCache);
    expect(diff.changedQPs.length).toBe(1);
    expect(diff.create.length).toBe(0);
    expect(diff.noChanges.length).toBe(0);
  });

  test("calculateQualityProfilesDiff - should not diff for language (radarr)", async ({}) => {
    const cfMap: CFProcessing = { carrIdMapping: new Map(), cfNameToCarrConfig: new Map() };

    const fromConfig: ConfigQualityProfileItem[] = [{ name: "HDTV-1080p", enabled: false }];

    const resources: MergedQualityDefinitionResource[] = [
      { id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } },
    ];

    const profile: ConfigQualityProfile = {
      name: "hi",
      min_format_score: 2,
      qualities: fromConfig,
      quality_sort: "top",
      upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
      score_set: "default",
      language: "Any",
    };

    const config: MergedConfigInstance = {
      custom_formats: [],
      quality_profiles: [profile],
      customFormatDefinitions: [],
      media_management: {},
      media_naming: {},
    };

    const serverProfile = cloneWithJSON(sampleQualityProfile);
    serverProfile.name = "hi";
    serverProfile.formatItems = [];
    serverProfile.minUpgradeFormatScore = 3;
    serverProfile.minFormatScore = 2;
    serverProfile.cutoff = 1;
    serverProfile.items = [{ allowed: false, items: [], quality: { id: 1, name: "HDTV-1080p" } }];
    serverProfile.language = { id: 0, name: "Any" };

    const serverQP: MergedQualityProfileResource[] = [serverProfile];
    const serverQD: MergedQualityDefinitionResource[] = resources;
    const serverCF: MergedCustomFormatResource[] = [cloneWithJSON(sampleCustomFormat)];

    const serverCache = new ServerCache(serverQD, serverQP, serverCF, [{ id: 0, name: "Any" }]);

    const diff = await calculateQualityProfilesDiff("RADARR", cfMap, config, serverCache);
    expect(diff.changedQPs.length).toBe(0);
    expect(diff.create.length).toBe(0);
    expect(diff.noChanges.length).toBe(1);
  });

  describe("delete Quality Profiles tests", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    test("deleteAllQualityProfiles() deletes every quality profile returned by server", async () => {
      // Arrange
      const qp1 = cloneWithJSON(sampleQualityProfile);
      qp1.id = 1001;
      qp1.name = "QP-1";
      const qp2 = cloneWithJSON(sampleQualityProfile);
      qp2.id = 1002;
      qp2.name = "QP-2";
      const qp3 = cloneWithJSON(sampleQualityProfile);
      qp3.id = 1003;
      qp3.name = "QP-3";

      const deleteFn = vi.fn().mockResolvedValue(undefined);
      const getFn = vi.fn().mockResolvedValue([qp1, qp2, qp3]);

      vi.spyOn(uclient, "getUnifiedClient").mockReturnValue({
        getQualityProfiles: getFn,
        deleteQualityProfile: deleteFn,
      } as any);

      const logSpy = vi.spyOn(log.logger, "info").mockImplementation(() => {});

      // Act
      await deleteAllQualityProfiles();

      // Assert
      expect(deleteFn).toHaveBeenCalledTimes(3);
      expect(deleteFn).toHaveBeenNthCalledWith(1, "1001");
      expect(deleteFn).toHaveBeenNthCalledWith(2, "1002");
      expect(deleteFn).toHaveBeenNthCalledWith(3, "1003");

      expect(logSpy).toHaveBeenCalledWith("Deleted QP: 'QP-1'");
      expect(logSpy).toHaveBeenCalledWith("Deleted QP: 'QP-2'");
      expect(logSpy).toHaveBeenCalledWith("Deleted QP: 'QP-3'");
    });

    test("when no profiles then no deletions by deleteAllQualityProfiles", async () => {
      // Arrange
      const deleteFn = vi.fn();
      const getFn = vi.fn().mockResolvedValue([] as any[]);

      vi.spyOn(uclient, "getUnifiedClient").mockReturnValue({
        getQualityProfiles: getFn,
        deleteQualityProfile: deleteFn,
      } as any);

      // Act
      await deleteAllQualityProfiles();

      // Assert
      expect(getFn).toHaveBeenCalledTimes(1);
      expect(deleteFn).not.toHaveBeenCalled();
    });

    test("deleteQualityProfile() deletes only the given quality profile id", async () => {
      // Arrange
      const qp1 = cloneWithJSON(sampleQualityProfile);
      qp1.id = 1001;
      qp1.name = "QP-1";
      const qp2 = cloneWithJSON(sampleQualityProfile);
      qp2.id = 1002;
      qp2.name = "QP-2";
      const qp3 = cloneWithJSON(sampleQualityProfile);
      qp3.id = 1003;
      qp3.name = "QP-3";

      const deleteFn = vi.fn().mockResolvedValue(undefined);

      vi.spyOn(uclient, "getUnifiedClient").mockReturnValue({
        deleteQualityProfile: deleteFn,
      } as any);

      const logSpy = vi.spyOn(log.logger, "info").mockImplementation(() => {});

      // Act
      await deleteQualityProfile(qp1);

      // Assert
      expect(deleteFn).toHaveBeenCalledTimes(1);
      expect(deleteFn).toHaveBeenNthCalledWith(1, "1001");
      expect(deleteFn).not.toHaveBeenCalledWith("1002");
      expect(deleteFn).not.toHaveBeenCalledWith("1003");

      expect(logSpy).toHaveBeenCalledWith("Deleted QP: 'QP-1'");
      expect(logSpy).not.toHaveBeenCalledWith("Deleted QP: 'QP-2'");
      expect(logSpy).not.toHaveBeenCalledWith("Deleted QP: 'QP-3'");
    });
  });

  describe("isOrderOfQualitiesEqual", async () => {
    test("should diff for grouped incorrect order", async ({}) => {
      const arr1: MergedQualityProfileQualityItemResource[] = [
        {
          allowed: true,
          id: 1000,
          name: "Merged QPs",
          items: [
            {
              quality: {
                id: 14,
                name: "WEBRip-720p",
                resolution: 720,
                source: "webrip",
              },
              allowed: true,
              items: [],
            },
            {
              quality: {
                id: 5,
                name: "WEBDL-720p",
                resolution: 720,
                source: "webdl",
              },
              allowed: true,
              items: [],
            },
            {
              quality: {
                id: 6,
                name: "Bluray-720p",
                resolution: 720,
                source: "bluray",
              },
              allowed: true,
              items: [],
            },
            {
              quality: {
                id: 3,
                name: "WEBDL-1080p",
                resolution: 1080,
                source: "webdl",
              },
              allowed: true,
              items: [],
            },
            {
              quality: {
                id: 15,
                name: "WEBRip-1080p",
                resolution: 1080,
                source: "webrip",
              },
              allowed: true,
              items: [],
            },
            {
              quality: {
                id: 7,
                name: "Bluray-1080p",
                resolution: 1080,
                source: "bluray",
              },
              allowed: true,
              items: [],
            },
          ],
        },
      ];

      const arr2: MergedQualityProfileQualityItemResource[] = [
        {
          name: "Merged QPs",
          items: [
            {
              quality: {
                id: 7,
                name: "Bluray-1080p",
                source: "bluray",
                resolution: 1080,
              },
              items: [],
              allowed: true,
            },
            {
              quality: {
                id: 15,
                name: "WEBRip-1080p",
                source: "webrip",
                resolution: 1080,
              },
              items: [],
              allowed: true,
            },
            {
              quality: {
                id: 3,
                name: "WEBDL-1080p",
                source: "webdl",
                resolution: 1080,
              },
              items: [],
              allowed: true,
            },
            {
              quality: {
                id: 6,
                name: "Bluray-720p",
                source: "bluray",
                resolution: 720,
              },
              items: [],
              allowed: true,
            },
            {
              quality: {
                id: 5,
                name: "WEBDL-720p",
                source: "webdl",
                resolution: 720,
              },
              items: [],
              allowed: true,
            },
            {
              quality: {
                id: 14,
                name: "WEBRip-720p",
                source: "webrip",
                resolution: 720,
              },
              items: [],
              allowed: true,
            },
          ],
          allowed: true,
          id: 1000,
        },
      ];

      expect(isOrderOfQualitiesEqual(arr1, arr2)).toBe(false);
    });

    test("should diff for incorrect quality order", async ({}) => {
      const arr1: MergedQualityProfileQualityItemResource[] = [
        {
          allowed: true,
          quality: {
            id: 14,
            name: "WEBRip-720p",
            resolution: 720,
            source: "webrip",
          },
        },
        {
          allowed: true,
          quality: {
            id: 15,
            name: "WEBRip-1080p",
            resolution: 1080,
            source: "webrip",
          },
        },
      ];

      const arr2: MergedQualityProfileQualityItemResource[] = [
        {
          allowed: true,
          quality: {
            id: 15,
            name: "WEBRip-1080p",
            resolution: 1080,
            source: "webrip",
          },
        },
        {
          allowed: true,
          quality: {
            id: 14,
            name: "WEBRip-720p",
            resolution: 720,
            source: "webrip",
          },
        },
      ];

      expect(isOrderOfQualitiesEqual(arr1, arr2)).toBe(false);
    });

    test("should be equal 1", async ({}) => {
      const arr1: MergedQualityProfileQualityItemResource[] = [
        {
          allowed: true,
          quality: {
            id: 14,
            name: "WEBRip-720p",
            resolution: 720,
            source: "webrip",
          },
        },
      ];

      const arr2: MergedQualityProfileQualityItemResource[] = [
        {
          allowed: true,
          quality: {
            id: 14,
            name: "WEBRip-720p",
            resolution: 720,
            source: "webrip",
          },
        },
      ];

      expect(isOrderOfQualitiesEqual(arr1, arr2)).toBe(true);
    });

    test("should be equal 2", async ({}) => {
      const arr1: MergedQualityProfileQualityItemResource[] = [
        {
          allowed: true,
          id: 1000,
          name: "Merged QPs",
          items: [
            {
              quality: {
                id: 14,
                name: "WEBRip-720p",
                resolution: 720,
                source: "webrip",
              },
              allowed: true,
              items: [],
            },
          ],
        },
      ];

      const arr2: MergedQualityProfileQualityItemResource[] = [
        {
          allowed: true,
          id: 1000,
          name: "Merged QPs",
          items: [
            {
              quality: {
                id: 14,
                name: "WEBRip-720p",
                resolution: 720,
                source: "webrip",
              },
              allowed: true,
              items: [],
            },
          ],
        },
      ];

      expect(isOrderOfQualitiesEqual(arr1, arr2)).toBe(true);
    });
  });
});
