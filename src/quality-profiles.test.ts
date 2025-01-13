import path from "path";
import { describe, expect, test } from "vitest";
import { MergedCustomFormatResource, MergedQualityDefinitionResource, MergedQualityProfileResource } from "./__generated__/mergedTypes";
import { ServerCache } from "./cache";
import { calculateQualityProfilesDiff, doAllQualitiesExist, isOrderOfQualitiesEqual, mapQualities } from "./quality-profiles";
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

  test("doAllQualitiesExist - all exist", async ({}) => {
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
    const result = doAllQualitiesExist(fromServer, fromConfig);

    expect(result).toBe(true);
  });

  test("doAllQualitiesExist - enabled behaves equals if configured or not", async ({}) => {
    const fromConfig: ConfigQualityProfileItem[] = [{ name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"], enabled: true }];
    const fromServer: ConfigQualityProfileItem[] = [{ name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] }];
    const result = doAllQualitiesExist(fromServer, fromConfig);

    expect(result).toBe(true);
  });

  test("doAllQualitiesExist - enabled false trigger change", async ({}) => {
    const fromConfig: ConfigQualityProfileItem[] = [{ name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"], enabled: false }];
    const fromServer: ConfigQualityProfileItem[] = [{ name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] }];
    const result = doAllQualitiesExist(fromServer, fromConfig);

    expect(result).toBe(false);
  });

  test("doAllQualitiesExist - enabled both false no change", async ({}) => {
    const fromConfig: ConfigQualityProfileItem[] = [{ name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"], enabled: false }];
    const fromServer: ConfigQualityProfileItem[] = [{ name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"], enabled: false }];
    const result = doAllQualitiesExist(fromServer, fromConfig);

    expect(result).toBe(true);
  });

  test("doAllQualitiesExist - missing", async ({}) => {
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
      { name: "WEB 720p", qualities: ["WEBDL-720p", "WEBRip-720p"] },
      { name: "HDTV-1080p", qualities: [] },
      { name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] },
      { name: "Remux-1080p", qualities: [] },
    ];
    const result = doAllQualitiesExist(fromServer, fromConfig);

    expect(result).toBe(false);
  });

  test("isOrderOfQualitiesEqual - should match", async ({}) => {
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
    const result = isOrderOfQualitiesEqual(fromConfig, fromServer);

    expect(result).toBe(true);
  });

  test("isOrderOfQualitiesEqual - different order", async ({}) => {
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
    const result = isOrderOfQualitiesEqual(fromConfig, fromServer);

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
      quality_sort: "sort",
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
      quality_sort: "sort",
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
      quality_sort: "sort",
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
      quality_sort: "sort",
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
      quality_sort: "sort",
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
      quality_sort: "sort",
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
});
