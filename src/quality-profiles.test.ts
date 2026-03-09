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
  mapQualityProfiles,
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

  test("calculateQualityProfilesDiff - should create profile with upgrade.allowed: false using until_quality as cutoff", async ({}) => {
    const cfMap: CFProcessing = { carrIdMapping: new Map(), cfNameToCarrConfig: new Map() };

    // Mirrors the real-world config: groups + upgrade.allowed: false + until_quality pointing to a group
    const fromConfig: ConfigQualityProfileItem[] = [
      { name: "WEB 720p", qualities: ["WEBDL-720p", "WEBRip-720p"] },
      { name: "Bluray-1080p" },
      { name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] },
    ];

    const resources: MergedQualityDefinitionResource[] = [
      { id: 1, title: "WEBDL-720p", weight: 2, quality: { id: 1, name: "WEBDL-720p" } },
      { id: 2, title: "WEBRip-720p", weight: 2, quality: { id: 2, name: "WEBRip-720p" } },
      { id: 3, title: "Bluray-1080p", weight: 2, quality: { id: 3, name: "Bluray-1080p" } },
      { id: 4, title: "WEBDL-1080p", weight: 2, quality: { id: 4, name: "WEBDL-1080p" } },
      { id: 5, title: "WEBRip-1080p", weight: 2, quality: { id: 5, name: "WEBRip-1080p" } },
    ];

    const profile: ConfigQualityProfile = {
      name: "Test - No Upgrade",
      min_format_score: 5,
      qualities: fromConfig,
      quality_sort: "top",
      // until_quality is a group: cutoff should map to the group's generated ID
      upgrade: { allowed: false, until_quality: "WEB 720p", until_score: 0, min_format_score: 1 },
      score_set: "default",
    };

    const config: MergedConfigInstance = {
      custom_formats: [],
      quality_profiles: [profile],
      customFormatDefinitions: [],
      media_management: {},
      media_naming: {},
    };

    const serverCache = new ServerCache(resources, [], [], []);

    const diff = await calculateQualityProfilesDiff("RADARR", cfMap, config, serverCache);
    expect(diff.changedQPs.length).toBe(0);
    expect(diff.create.length).toBe(1);
    expect(diff.noChanges.length).toBe(0);

    const createdProfile = diff.create[0];
    expect(createdProfile).toBeDefined();
    expect(createdProfile?.upgradeAllowed).toBe(false);
    expect(createdProfile?.cutoffFormatScore).toBe(1);
    // cutoff should point to the "WEB 720p" group (1000 + index 0 in allowedQualities)
    // The group ID for WEB 720p (first in the config) should be 1000
    expect(createdProfile?.cutoff).toBe(1000);
  });

  test("calculateQualityProfilesDiff - should create profile with upgrade: {allowed: false} and no until_quality", async ({}) => {
    const cfMap: CFProcessing = { carrIdMapping: new Map(), cfNameToCarrConfig: new Map() };

    // Mirrors the exact failing config from the issue: upgrade block with only allowed: false
    const fromConfig: ConfigQualityProfileItem[] = [
      { name: "Remux-2160p" },
      { name: "WEB 2160p", qualities: ["WEBDL-2160p", "WEBRip-2160p"] },
      { name: "Remux-1080p" },
      { name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] },
    ];

    const resources: MergedQualityDefinitionResource[] = [
      { id: 10, title: "Remux-2160p", weight: 2, quality: { id: 10, name: "Remux-2160p" } },
      { id: 11, title: "WEBDL-2160p", weight: 2, quality: { id: 11, name: "WEBDL-2160p" } },
      { id: 12, title: "WEBRip-2160p", weight: 2, quality: { id: 12, name: "WEBRip-2160p" } },
      { id: 13, title: "Remux-1080p", weight: 2, quality: { id: 13, name: "Remux-1080p" } },
      { id: 14, title: "WEBDL-1080p", weight: 2, quality: { id: 14, name: "WEBDL-1080p" } },
      { id: 15, title: "WEBRip-1080p", weight: 2, quality: { id: 15, name: "WEBRip-1080p" } },
    ];

    const profile: ConfigQualityProfile = {
      name: "ExampleInConfigProfile",
      min_format_score: 0,
      qualities: fromConfig,
      quality_sort: "top",
      // No until_quality / until_score - should fall back to highest-priority quality
      upgrade: { allowed: false },
      score_set: "default",
    };

    const config: MergedConfigInstance = {
      custom_formats: [],
      quality_profiles: [profile],
      customFormatDefinitions: [],
      media_management: {},
      media_naming: {},
    };

    const serverCache = new ServerCache(resources, [], [], []);

    const diff = await calculateQualityProfilesDiff("RADARR", cfMap, config, serverCache);
    expect(diff.create.length).toBe(1);

    const createdProfile = diff.create[0];
    expect(createdProfile?.upgradeAllowed).toBe(false);
    expect(createdProfile?.cutoffFormatScore).toBe(1);
    // cutoff must not be 0/undefined — should fall back to Remux-2160p (first quality = id 10)
    expect(createdProfile?.cutoff).toBeDefined();
    expect(createdProfile?.cutoff).not.toBe(0);
    expect(createdProfile?.cutoff).toBe(10); // Remux-2160p = highest priority quality
  });

  test("calculateQualityProfilesDiff - should update profile when changing upgrade.allowed from true to false (single quality)", async ({}) => {
    const cfMap: CFProcessing = { carrIdMapping: new Map(), cfNameToCarrConfig: new Map() };

    const fromConfig: ConfigQualityProfileItem[] = [{ name: "HDTV-1080p" }];

    const resources: MergedQualityDefinitionResource[] = [
      { id: 10, title: "HDTV-1080p", weight: 2, quality: { id: 10, name: "HDTV-1080p" } },
    ];

    const profile: ConfigQualityProfile = {
      name: "Test Update - Disable Upgrade",
      min_format_score: 0,
      qualities: fromConfig,
      quality_sort: "top",
      upgrade: { allowed: false, until_quality: "HDTV-1080p", until_score: 0, min_format_score: 1 },
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
    serverProfile.name = "Test Update - Disable Upgrade";
    serverProfile.formatItems = [];
    serverProfile.upgradeAllowed = true;
    serverProfile.cutoff = 99; // Old cutoff value that won't match
    serverProfile.cutoffFormatScore = 1000;
    serverProfile.minUpgradeFormatScore = 1;
    serverProfile.items = [{ allowed: true, items: [], quality: { id: 10, name: "HDTV-1080p" } }];

    const serverCache = new ServerCache(resources, [serverProfile], [], []);

    const diff = await calculateQualityProfilesDiff("RADARR", cfMap, config, serverCache);
    expect(diff.changedQPs.length).toBe(1);
    expect(diff.create.length).toBe(0);
    expect(diff.noChanges.length).toBe(0);

    const updatedProfile = diff.changedQPs[0];
    expect(updatedProfile).toBeDefined();
    // cutoff must point to the until_quality (HDTV-1080p = id 10)
    expect(updatedProfile?.cutoff).toBe(10);
    expect(updatedProfile?.upgradeAllowed).toBe(false);
    expect(updatedProfile?.cutoffFormatScore).toBe(1);
  });

  test("calculateQualityProfilesDiff - should update profile when changing upgrade.allowed from true to false (quality group)", async ({}) => {
    const cfMap: CFProcessing = { carrIdMapping: new Map(), cfNameToCarrConfig: new Map() };

    // Mirrors the real-world Radarr ExampleInConfigProfile case: group qualities + upgrade disabled
    const fromConfig: ConfigQualityProfileItem[] = [
      { name: "Remux-2160p" },
      { name: "WEB 2160p", qualities: ["WEBDL-2160p", "WEBRip-2160p"] },
      { name: "Remux-1080p" },
      { name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] },
    ];

    const resources: MergedQualityDefinitionResource[] = [
      { id: 10, title: "Remux-2160p", weight: 2, quality: { id: 10, name: "Remux-2160p" } },
      { id: 11, title: "WEBDL-2160p", weight: 2, quality: { id: 11, name: "WEBDL-2160p" } },
      { id: 12, title: "WEBRip-2160p", weight: 2, quality: { id: 12, name: "WEBRip-2160p" } },
      { id: 13, title: "Remux-1080p", weight: 2, quality: { id: 13, name: "Remux-1080p" } },
      { id: 14, title: "WEBDL-1080p", weight: 2, quality: { id: 14, name: "WEBDL-1080p" } },
      { id: 15, title: "WEBRip-1080p", weight: 2, quality: { id: 15, name: "WEBRip-1080p" } },
    ];

    const profile: ConfigQualityProfile = {
      name: "Test Update - Disable Upgrade Group",
      min_format_score: 0,
      qualities: fromConfig,
      quality_sort: "top",
      // until_quality points to the WEB 2160p group
      upgrade: { allowed: false, until_quality: "WEB 2160p", until_score: 0, min_format_score: 1 },
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
    serverProfile.name = "Test Update - Disable Upgrade Group";
    serverProfile.formatItems = [];
    serverProfile.upgradeAllowed = true;
    serverProfile.cutoff = 15; // Old cutoff pointing to WEBRip-1080p
    serverProfile.cutoffFormatScore = 1000;
    serverProfile.minUpgradeFormatScore = 1;
    serverProfile.items = [
      { allowed: true, items: [], quality: { id: 10, name: "Remux-2160p" } },
      {
        allowed: true,
        id: 1001,
        name: "WEB 2160p",
        items: [
          { allowed: true, items: [], quality: { id: 12, name: "WEBRip-2160p" } },
          { allowed: true, items: [], quality: { id: 11, name: "WEBDL-2160p" } },
        ],
      },
      { allowed: true, items: [], quality: { id: 13, name: "Remux-1080p" } },
      {
        allowed: true,
        id: 1003,
        name: "WEB 1080p",
        items: [
          { allowed: true, items: [], quality: { id: 15, name: "WEBRip-1080p" } },
          { allowed: true, items: [], quality: { id: 14, name: "WEBDL-1080p" } },
        ],
      },
    ];

    const serverCache = new ServerCache(resources, [serverProfile], [], []);

    const diff = await calculateQualityProfilesDiff("RADARR", cfMap, config, serverCache);
    expect(diff.changedQPs.length).toBe(1);
    expect(diff.create.length).toBe(0);
    expect(diff.noChanges.length).toBe(0);

    const updatedProfile = diff.changedQPs[0];
    expect(updatedProfile).toBeDefined();
    // cutoff must point to the until_quality group "WEB 2160p" = id 1001
    expect(updatedProfile?.cutoff).toBe(1001);
    expect(updatedProfile?.upgradeAllowed).toBe(false);
    expect(updatedProfile?.cutoffFormatScore).toBe(1);
  });

  test("calculateQualityProfilesDiff - should update profile when changing upgrade.allowed from true to false with no until_quality", async ({}) => {
    const cfMap: CFProcessing = { carrIdMapping: new Map(), cfNameToCarrConfig: new Map() };

    const fromConfig: ConfigQualityProfileItem[] = [{ name: "Remux-2160p" }, { name: "Remux-1080p" }];

    const resources: MergedQualityDefinitionResource[] = [
      { id: 10, title: "Remux-2160p", weight: 2, quality: { id: 10, name: "Remux-2160p" } },
      { id: 13, title: "Remux-1080p", weight: 2, quality: { id: 13, name: "Remux-1080p" } },
    ];

    const profile: ConfigQualityProfile = {
      name: "Test Update - Disable Upgrade No Until",
      min_format_score: 0,
      qualities: fromConfig,
      quality_sort: "top",
      // No until_quality — should fall back to highest-priority allowed quality (Remux-2160p = id 10)
      upgrade: { allowed: false },
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
    serverProfile.name = "Test Update - Disable Upgrade No Until";
    serverProfile.formatItems = [];
    serverProfile.upgradeAllowed = true;
    serverProfile.cutoff = 13; // Old cutoff pointing to Remux-1080p
    serverProfile.cutoffFormatScore = 500;
    serverProfile.minUpgradeFormatScore = 1;
    serverProfile.items = [
      { allowed: true, items: [], quality: { id: 10, name: "Remux-2160p" } },
      { allowed: true, items: [], quality: { id: 13, name: "Remux-1080p" } },
    ];

    const serverCache = new ServerCache(resources, [serverProfile], [], []);

    const diff = await calculateQualityProfilesDiff("RADARR", cfMap, config, serverCache);
    expect(diff.changedQPs.length).toBe(1);
    expect(diff.create.length).toBe(0);

    const updatedProfile = diff.changedQPs[0];
    expect(updatedProfile).toBeDefined();
    // cutoff falls back to Remux-2160p (highest-priority allowed quality = id 10)
    expect(updatedProfile?.cutoff).toBe(10);
    expect(updatedProfile?.upgradeAllowed).toBe(false);
    expect(updatedProfile?.cutoffFormatScore).toBe(1);
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

  describe("mapQualityProfiles - use_default_score flag", () => {
    test("should use default score when use_default_score is true", async () => {
      // Setup CF with default score of 25
      const carrIdMapping = new Map([
        [
          "test-cf-id",
          {
            carrConfig: {
              configarr_id: "test-cf-id",
              name: "Test CF",
              configarr_scores: { default: 25 },
            },
            requestConfig: {},
          },
        ],
      ]);

      const cfMap: CFProcessing = {
        carrIdMapping,
        cfNameToCarrConfig: new Map(),
      };

      const config: MergedConfigInstance = {
        custom_formats: [
          {
            trash_ids: ["test-cf-id"],
            assign_scores_to: [{ name: "profile", use_default_score: true }],
          },
        ],
        quality_profiles: [
          {
            name: "profile",
            min_format_score: 0,
            qualities: [],
            quality_sort: "top",
            upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
            score_set: "default",
          },
        ],
        customFormatDefinitions: [],
        media_management: {},
        media_naming: {},
      };

      const result = mapQualityProfiles(cfMap, config);
      const profileScore = result.get("profile");
      const cfScore = profileScore?.get("Test CF");

      expect(cfScore?.score).toBe(25); // Should use default score
    });

    test("should use explicit score when use_default_score is false or not set", async () => {
      const carrIdMapping = new Map([
        [
          "test-cf-id",
          {
            carrConfig: {
              configarr_id: "test-cf-id",
              name: "Test CF",
              configarr_scores: { default: 25 },
            },
            requestConfig: {},
          },
        ],
      ]);

      const cfMap: CFProcessing = {
        carrIdMapping,
        cfNameToCarrConfig: new Map(),
      };

      const config: MergedConfigInstance = {
        custom_formats: [
          {
            trash_ids: ["test-cf-id"],
            assign_scores_to: [{ name: "profile", score: 100 }],
          },
        ],
        quality_profiles: [
          {
            name: "profile",
            min_format_score: 0,
            qualities: [],
            quality_sort: "top",
            upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
            score_set: "default",
          },
        ],
        customFormatDefinitions: [],
        media_management: {},
        media_naming: {},
      };

      const result = mapQualityProfiles(cfMap, config);
      const profileScore = result.get("profile");
      const cfScore = profileScore?.get("Test CF");

      expect(cfScore?.score).toBe(100); // Should use explicit score
    });

    test("should prefer use_default_score over explicit score when both are set", async () => {
      // When both use_default_score: true and score are set, use_default_score takes precedence
      const carrIdMapping = new Map([
        [
          "test-cf-id",
          {
            carrConfig: {
              configarr_id: "test-cf-id",
              name: "Test CF",
              configarr_scores: { default: 25 },
            },
            requestConfig: {},
          },
        ],
      ]);

      const cfMap: CFProcessing = {
        carrIdMapping,
        cfNameToCarrConfig: new Map(),
      };

      const config: MergedConfigInstance = {
        custom_formats: [
          {
            trash_ids: ["test-cf-id"],
            assign_scores_to: [{ name: "profile", score: 100, use_default_score: true }],
          },
        ],
        quality_profiles: [
          {
            name: "profile",
            min_format_score: 0,
            qualities: [],
            quality_sort: "top",
            upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
            score_set: "default",
          },
        ],
        customFormatDefinitions: [],
        media_management: {},
        media_naming: {},
      };

      const result = mapQualityProfiles(cfMap, config);
      const profileScore = result.get("profile");
      const cfScore = profileScore?.get("Test CF");

      expect(cfScore?.score).toBe(25); // Should use default score, ignoring explicit 100
    });

    test("should use default when no score and no use_default_score", async () => {
      const carrIdMapping = new Map([
        [
          "test-cf-id",
          {
            carrConfig: {
              configarr_id: "test-cf-id",
              name: "Test CF",
              configarr_scores: { default: 25 },
            },
            requestConfig: {},
          },
        ],
      ]);

      const cfMap: CFProcessing = {
        carrIdMapping,
        cfNameToCarrConfig: new Map(),
      };

      const config: MergedConfigInstance = {
        custom_formats: [
          {
            trash_ids: ["test-cf-id"],
            assign_scores_to: [{ name: "profile" }], // No score, no flag
          },
        ],
        quality_profiles: [
          {
            name: "profile",
            min_format_score: 0,
            qualities: [],
            quality_sort: "top",
            upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
            score_set: "default",
          },
        ],
        customFormatDefinitions: [],
        media_management: {},
        media_naming: {},
      };

      const result = mapQualityProfiles(cfMap, config);
      const profileScore = result.get("profile");
      const cfScore = profileScore?.get("Test CF");

      expect(cfScore?.score).toBe(25); // Should fall back to default
    });

    test("should use score_set when configured and no explicit score", async () => {
      const carrIdMapping = new Map([
        [
          "test-cf-id",
          {
            carrConfig: {
              configarr_id: "test-cf-id",
              name: "Test CF",
              configarr_scores: { default: 25, "anime-sonarr": 50 },
            },
            requestConfig: {},
          },
        ],
      ]);

      const cfMap: CFProcessing = {
        carrIdMapping,
        cfNameToCarrConfig: new Map(),
      };

      const config: MergedConfigInstance = {
        custom_formats: [
          {
            trash_ids: ["test-cf-id"],
            assign_scores_to: [{ name: "profile" }], // No score
          },
        ],
        quality_profiles: [
          {
            name: "profile",
            min_format_score: 0,
            qualities: [],
            quality_sort: "top",
            upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
            score_set: "anime-sonarr", // Use anime-sonarr score set
          },
        ],
        customFormatDefinitions: [],
        media_management: {},
        media_naming: {},
      };

      const result = mapQualityProfiles(cfMap, config);
      const profileScore = result.get("profile");
      const cfScore = profileScore?.get("Test CF");

      expect(cfScore?.score).toBe(50); // Should use score_set (anime-sonarr) score
    });

    test("use_default_score should ignore score_set", async () => {
      const carrIdMapping = new Map([
        [
          "test-cf-id",
          {
            carrConfig: {
              configarr_id: "test-cf-id",
              name: "Test CF",
              configarr_scores: { default: 25, "anime-sonarr": 50 },
            },
            requestConfig: {},
          },
        ],
      ]);

      const cfMap: CFProcessing = {
        carrIdMapping,
        cfNameToCarrConfig: new Map(),
      };

      const config: MergedConfigInstance = {
        custom_formats: [
          {
            trash_ids: ["test-cf-id"],
            assign_scores_to: [{ name: "profile", use_default_score: true }],
          },
        ],
        quality_profiles: [
          {
            name: "profile",
            min_format_score: 0,
            qualities: [],
            quality_sort: "top",
            upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
            score_set: "anime-sonarr",
          },
        ],
        customFormatDefinitions: [],
        media_management: {},
        media_naming: {},
      };

      const result = mapQualityProfiles(cfMap, config);
      const profileScore = result.get("profile");
      const cfScore = profileScore?.get("Test CF");

      expect(cfScore?.score).toBe(25); // Should use default, ignoring score_set
    });
  });
});
