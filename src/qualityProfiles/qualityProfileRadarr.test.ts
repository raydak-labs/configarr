import path from "path";
import { describe, expect, test, vi } from "vitest";
import * as log from "../logger";
import { CFProcessing, CustomFormatRequest } from "../customFormats/customFormat.types";
import { QualityDefinitionShared } from "../qualityDefinitions/qualityDefinition.types";
import { QualityProfileShared } from "./qualityProfile.types";
import { ServerCache } from "../cache";
import { QualityProfileRadarrSync } from "./qualityProfileRadarr";
import { ConfigQualityProfile, ConfigQualityProfileItem, MergedConfigInstance } from "../types/config.types";
import { cloneWithJSON, loadJsonFile } from "../util";

describe("QualityProfileRadarrSync", async () => {
  const sampleQualityProfile = loadJsonFile<QualityProfileShared>(
    path.resolve(__dirname, `../../tests/samples/single_quality_profile.json`),
  );

  const sampleCustomFormat = loadJsonFile<CustomFormatRequest>(path.resolve(__dirname, `../../tests/samples/single_custom_format.json`));

  test("calculateQualityProfilesDiff - should diff if minUpgradeFormatScore / minFormatScore is different", async ({}) => {
    const cfMap: CFProcessing = { carrIdMapping: new Map(), cfNameToCarrConfig: new Map() };

    const fromConfig: ConfigQualityProfileItem[] = [{ name: "HDTV-1080p", enabled: false }];

    const resources: QualityDefinitionShared[] = [{ id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } }];

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

    const serverQP: QualityProfileShared[] = [serverProfile];
    const serverQD: QualityDefinitionShared[] = resources;
    const serverCF: CustomFormatRequest[] = [cloneWithJSON(sampleCustomFormat)];

    const serverCache = new ServerCache({ qualityDefinitions: serverQD, qualityProfiles: serverQP, customFormats: serverCF });

    let diff = await new QualityProfileRadarrSync().calculateQualityProfilesDiff(cfMap, config, serverCache);
    expect(diff.changedQPs.length).toBe(1);
    expect(diff.create.length).toBe(0);
    expect(diff.noChanges.length).toBe(0);

    serverProfile.minFormatScore = 0;
    diff = await new QualityProfileRadarrSync().calculateQualityProfilesDiff(cfMap, config, serverCache);
    expect(diff.changedQPs.length).toBe(1);
    expect(diff.create.length).toBe(0);
    expect(diff.noChanges.length).toBe(0);

    serverProfile.minUpgradeFormatScore = 0;
    diff = await new QualityProfileRadarrSync().calculateQualityProfilesDiff(cfMap, config, serverCache);
    expect(diff.changedQPs.length).toBe(1);
    expect(diff.create.length).toBe(0);
    expect(diff.noChanges.length).toBe(0);

    profile.min_format_score = 0;
    serverProfile.minFormatScore = 1;
    diff = await new QualityProfileRadarrSync().calculateQualityProfilesDiff(cfMap, config, serverCache);
    expect(diff.changedQPs.length).toBe(1);
    expect(diff.create.length).toBe(0);
    expect(diff.noChanges.length).toBe(0);
  });

  test("calculateQualityProfilesDiff - should not diff if minFormatScore is equal", async ({}) => {
    const cfMap: CFProcessing = { carrIdMapping: new Map(), cfNameToCarrConfig: new Map() };

    const fromConfig: ConfigQualityProfileItem[] = [{ name: "HDTV-1080p", enabled: false }];

    const resources: QualityDefinitionShared[] = [{ id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } }];

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

    const serverQP: QualityProfileShared[] = [serverProfile];
    const serverQD: QualityDefinitionShared[] = resources;
    const serverCF: CustomFormatRequest[] = [cloneWithJSON(sampleCustomFormat)];

    const serverCache = new ServerCache({ qualityDefinitions: serverQD, qualityProfiles: serverQP, customFormats: serverCF });

    const diff = await new QualityProfileRadarrSync().calculateQualityProfilesDiff(cfMap, config, serverCache);
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

    const resources: QualityDefinitionShared[] = [{ id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } }];

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

    const serverQP: QualityProfileShared[] = [serverProfile];
    const serverQD: QualityDefinitionShared[] = resources;
    const serverCF: CustomFormatRequest[] = [cloneWithJSON(sampleCustomFormat)];

    const serverCache = new ServerCache({
      qualityDefinitions: serverQD,
      qualityProfiles: serverQP,
      customFormats: serverCF,
      languages: [{ id: 0, name: "Any" }],
    });

    const diff = await new QualityProfileRadarrSync().calculateQualityProfilesDiff(cfMap, config, serverCache);
    expect(diff.changedQPs.length).toBe(1);
    expect(diff.create.length).toBe(0);
    expect(diff.noChanges.length).toBe(0);
  });

  test("calculateQualityProfilesDiff - should default to Any language when not configured and server differs (radarr)", async ({}) => {
    const cfMap: CFProcessing = { carrIdMapping: new Map(), cfNameToCarrConfig: new Map() };

    const fromConfig: ConfigQualityProfileItem[] = [{ name: "HDTV-1080p", enabled: false }];

    const resources: QualityDefinitionShared[] = [{ id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } }];

    const profile: ConfigQualityProfile = {
      name: "hi",
      min_format_score: 2,
      qualities: fromConfig,
      quality_sort: "top",
      upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
      score_set: "default",
      // language intentionally omitted
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

    const serverQP: QualityProfileShared[] = [serverProfile];
    const serverQD: QualityDefinitionShared[] = resources;
    const serverCF: CustomFormatRequest[] = [cloneWithJSON(sampleCustomFormat)];

    const serverCache = new ServerCache({
      qualityDefinitions: serverQD,
      qualityProfiles: serverQP,
      customFormats: serverCF,
      languages: [{ id: 0, name: "Any" }],
    });

    const diff = await new QualityProfileRadarrSync().calculateQualityProfilesDiff(cfMap, config, serverCache);
    expect(diff.changedQPs.length).toBe(1);
    expect((diff.changedQPs[0] as QualityProfileShared).language).toEqual({ id: 0, name: "Any" });
  });

  test("calculateQualityProfilesDiff - should warn when default Any language is missing from server (radarr)", async ({}) => {
    const cfMap: CFProcessing = { carrIdMapping: new Map(), cfNameToCarrConfig: new Map() };

    const fromConfig: ConfigQualityProfileItem[] = [{ name: "HDTV-1080p", enabled: false }];

    const resources: QualityDefinitionShared[] = [{ id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } }];

    const profile: ConfigQualityProfile = {
      name: "hi",
      min_format_score: 2,
      qualities: fromConfig,
      quality_sort: "top",
      upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
      score_set: "default",
      // language intentionally omitted
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

    const serverQP: QualityProfileShared[] = [serverProfile];
    const serverQD: QualityDefinitionShared[] = resources;
    const serverCF: CustomFormatRequest[] = [cloneWithJSON(sampleCustomFormat)];

    // No "Any" language present on the server
    const serverCache = new ServerCache({
      qualityDefinitions: serverQD,
      qualityProfiles: serverQP,
      customFormats: serverCF,
      languages: [{ id: 1, name: "English" }],
    });

    const logSpy = vi.spyOn(log.logger, "warn").mockImplementation(() => {});

    const diff = await new QualityProfileRadarrSync().calculateQualityProfilesDiff(cfMap, config, serverCache);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Any"));
    expect(diff.changedQPs.length).toBe(0);
    expect(diff.noChanges.length).toBe(1);
  });

  test("calculateQualityProfilesDiff - should not diff for language (radarr)", async ({}) => {
    const cfMap: CFProcessing = { carrIdMapping: new Map(), cfNameToCarrConfig: new Map() };

    const fromConfig: ConfigQualityProfileItem[] = [{ name: "HDTV-1080p", enabled: false }];

    const resources: QualityDefinitionShared[] = [{ id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } }];

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

    const serverQP: QualityProfileShared[] = [serverProfile];
    const serverQD: QualityDefinitionShared[] = resources;
    const serverCF: CustomFormatRequest[] = [cloneWithJSON(sampleCustomFormat)];

    const serverCache = new ServerCache({
      qualityDefinitions: serverQD,
      qualityProfiles: serverQP,
      customFormats: serverCF,
      languages: [{ id: 0, name: "Any" }],
    });

    const diff = await new QualityProfileRadarrSync().calculateQualityProfilesDiff(cfMap, config, serverCache);
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

    const resources: QualityDefinitionShared[] = [
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

    const serverCache = new ServerCache({ qualityDefinitions: resources });

    const diff = await new QualityProfileRadarrSync().calculateQualityProfilesDiff(cfMap, config, serverCache);
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

    const resources: QualityDefinitionShared[] = [
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

    const serverCache = new ServerCache({ qualityDefinitions: resources });

    const diff = await new QualityProfileRadarrSync().calculateQualityProfilesDiff(cfMap, config, serverCache);
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

    const resources: QualityDefinitionShared[] = [{ id: 10, title: "HDTV-1080p", weight: 2, quality: { id: 10, name: "HDTV-1080p" } }];

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

    const serverCache = new ServerCache({ qualityDefinitions: resources, qualityProfiles: [serverProfile] });

    const diff = await new QualityProfileRadarrSync().calculateQualityProfilesDiff(cfMap, config, serverCache);
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

    const resources: QualityDefinitionShared[] = [
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

    const serverCache = new ServerCache({ qualityDefinitions: resources, qualityProfiles: [serverProfile] });

    const diff = await new QualityProfileRadarrSync().calculateQualityProfilesDiff(cfMap, config, serverCache);
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

    const resources: QualityDefinitionShared[] = [
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

    const serverCache = new ServerCache({ qualityDefinitions: resources, qualityProfiles: [serverProfile] });

    const diff = await new QualityProfileRadarrSync().calculateQualityProfilesDiff(cfMap, config, serverCache);
    expect(diff.changedQPs.length).toBe(1);
    expect(diff.create.length).toBe(0);

    const updatedProfile = diff.changedQPs[0];
    expect(updatedProfile).toBeDefined();
    // cutoff falls back to Remux-2160p (highest-priority allowed quality = id 10)
    expect(updatedProfile?.cutoff).toBe(10);
    expect(updatedProfile?.upgradeAllowed).toBe(false);
    expect(updatedProfile?.cutoffFormatScore).toBe(1);
  });

  test("calculateQualityProfilesDiff - exposes minFormatScore diff as a structured FieldChange", async ({}) => {
    const cfMap: CFProcessing = { carrIdMapping: new Map(), cfNameToCarrConfig: new Map() };

    const fromConfig: ConfigQualityProfileItem[] = [{ name: "HDTV-1080p", enabled: false }];

    const resources: QualityDefinitionShared[] = [{ id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } }];

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

    const serverQP: QualityProfileShared[] = [serverProfile];
    const serverQD: QualityDefinitionShared[] = resources;
    const serverCF: CustomFormatRequest[] = [cloneWithJSON(sampleCustomFormat)];

    const serverCache = new ServerCache({ qualityDefinitions: serverQD, qualityProfiles: serverQP, customFormats: serverCF });

    const diff = await new QualityProfileRadarrSync().calculateQualityProfilesDiff(cfMap, config, serverCache);

    const fieldChanges = diff.changes.get("hi");
    expect(fieldChanges).toContainEqual({ field: "minFormatScore", from: 3, to: 2 });
  });
});
