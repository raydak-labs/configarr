import { beforeEach, describe, expect, test, vi } from "vitest";
import yaml from "yaml";
import { mergeConfigsAndTemplates, transformConfig } from "./config";
import * as localImporter from "./local-importer";
import * as reclarrImporter from "./recyclarr-importer";
import * as trashGuide from "./trash-guide";
import { MappedTemplates } from "./types/common.types";
import { ConfigQualityProfile, ConfigQualityProfileItem, InputConfigArrInstance, InputConfigSchema } from "./types/config.types";
import { TrashQP } from "./types/trashguide.types";
import { cloneWithJSON } from "./util";

describe("transformConfig", async () => {
  const config: InputConfigSchema = yaml.parse(`
sonarr:
  instance1:
    base_url: http://sonarr:8989
    api_key: test

    quality_profiles:
      - name: Remux-2160p - Anime
        quality_sort: top
        score_set: anime-sonarr
        upgrade:
          allowed: true
          until_quality: SINGLE_STAGE
          until_score: 5000000
        qualities:
          - name: SINGLE_STAGE
            enabled: true
            qualities:
              - Bluray-2160p
              - SDTV
          - name: Unknown
            enabled: false
    custom_formats:
      - trash_ids:
          - custom-german-dl
          - custom-german-dl-2
        assign_scores_to:
          - name: Remux-2160p - Anime
radarr: {}
`);

  test("should transform without error", async () => {
    const transformed = transformConfig(config);
    expect(transformed).not.toBeNull();
  });

  test("should transform without error - quality_profiles instead of assign_scores_to", async () => {
    const cloned = cloneWithJSON(config);
    const instance = cloned.sonarr!["instance1"]!;
    const cF = instance.custom_formats![0];

    instance.custom_formats![0] = { ...cF, quality_profiles: cF?.assign_scores_to, assign_scores_to: undefined };

    const transformed = transformConfig(config);
    expect(transformed).not.toBeNull();
  });
});

describe("mergeConfigsAndTemplates", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
  });

  test("should merge valid configurations and templates", async () => {
    const fromConfig: ConfigQualityProfileItem[] = [{ name: "HDTV-1080p", enabled: false }];

    const profile: ConfigQualityProfile = {
      name: "profile1",
      min_format_score: 2,
      qualities: fromConfig,
      quality_sort: "sort",
      upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
      score_set: "default",
    };

    const profile2 = cloneWithJSON(profile);
    profile2.name = "profile2";

    const profile4 = cloneWithJSON(profile);
    profile4.name = "profile4";

    const trashProfile: TrashQP = {
      trash_id: "profile3",
      name: "profile3",
      trash_score_set: "default",
      upgradeAllowed: true,
      cutoff: "Merged QPs",
      minFormatScore: 0,
      cutoffFormatScore: 25000,
      language: "Any",
      items: [
        { name: "Unknown", allowed: false },
        { name: "WORKPRINT", allowed: false },
        { name: "CAM", allowed: false },
        { name: "TELESYNC", allowed: false },
        { name: "TELECINE", allowed: false },
        { name: "REGIONAL", allowed: false },
        { name: "DVDSCR", allowed: false },
        { name: "SDTV", allowed: false },
        { name: "DVD", allowed: false },
        { name: "DVD-R", allowed: false },
        {
          name: "WEB 480p",
          allowed: false,
          items: ["WEBDL-480p", "WEBRip-480p"],
        },
        { name: "Bluray-480p", allowed: false },
        { name: "Bluray-576p", allowed: false },
        { name: "HDTV-720p", allowed: false },
        { name: "HDTV-1080p", allowed: false },
        { name: "Remux-1080p", allowed: false },
        { name: "HDTV-2160p", allowed: false },
        {
          name: "WEB 2160p",
          allowed: false,
          items: ["WEBDL-2160p", "WEBRip-2160p"],
        },
        { name: "Bluray-2160p", allowed: false },
        { name: "Remux-2160p", allowed: false },
        { name: "BR-DISK", allowed: false },
        { name: "Raw-HD", allowed: false },
        {
          name: "Merged QPs",
          allowed: true,
          items: ["WEBRip-720p", "WEBDL-720p", "Bluray-720p", "WEBDL-1080p", "WEBRip-1080p", "Bluray-1080p"],
        },
      ],
      formatItems: {
        Test: "cf1",
      },
    };

    // Mock template data
    const recyclarrTemplates: Map<string, MappedTemplates> = new Map<string, MappedTemplates>([
      ["template1", { custom_formats: [{ trash_ids: ["cf1"] }], quality_profiles: [profile] }],
    ]);
    const localTemplates: Map<string, MappedTemplates> = new Map<string, MappedTemplates>([
      ["template2", { custom_formats: [{ trash_ids: ["cf2"] }], quality_profiles: [profile2] }],
    ]);
    const trashTemplates: Map<string, TrashQP> = new Map<string, TrashQP>([["template3", trashProfile]]);

    vi.spyOn(reclarrImporter, "loadRecyclarrTemplates").mockReturnValue(recyclarrTemplates);
    vi.spyOn(localImporter, "loadLocalRecyclarrTemplate").mockReturnValue(localTemplates);
    vi.spyOn(trashGuide, "loadQPFromTrash").mockReturnValue(Promise.resolve(trashTemplates));

    const inputConfig: InputConfigArrInstance = {
      include: [
        { template: "template1", source: "RECYCLARR" },
        { template: "template3", source: "TRASH" },
      ],
      custom_formats: [{ trash_ids: ["cf4"] }],
      quality_profiles: [profile4],
      api_key: "test",
      base_url: "http://sonarr:8989",
    };

    const result = await mergeConfigsAndTemplates({}, inputConfig, "SONARR");

    expect(result.config.custom_formats.length).toBe(3);
    expect(result.config.quality_profiles.length).toBe(3);
  });

  test("should handle missing templates gracefully", async () => {
    const fromConfig: ConfigQualityProfileItem[] = [{ name: "HDTV-1080p", enabled: false }];

    const profile: ConfigQualityProfile = {
      name: "profile1",
      min_format_score: 2,
      qualities: fromConfig,
      quality_sort: "sort",
      upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
      score_set: "default",
    };

    // Mock template data
    const recyclarrTemplates: Map<string, MappedTemplates> = new Map<string, MappedTemplates>([
      ["template1", { custom_formats: [{ trash_ids: ["cf1"] }], quality_profiles: [profile] }],
    ]);
    const localTemplates: Map<string, MappedTemplates> = new Map<string, MappedTemplates>();
    const trashTemplates: Map<string, TrashQP> = new Map<string, TrashQP>();

    vi.spyOn(reclarrImporter, "loadRecyclarrTemplates").mockReturnValue(recyclarrTemplates);
    vi.spyOn(localImporter, "loadLocalRecyclarrTemplate").mockReturnValue(localTemplates);
    vi.spyOn(trashGuide, "loadQPFromTrash").mockReturnValue(Promise.resolve(trashTemplates));

    const inputConfig: InputConfigArrInstance = {
      include: [
        { template: "unknown", source: "RECYCLARR" },
        { template: "unknown-2", source: "TRASH" },
      ],
      custom_formats: [],
      quality_profiles: [],
      api_key: "test",
      base_url: "http://sonarr:8989",
    };

    const result = await mergeConfigsAndTemplates({}, inputConfig, "SONARR");

    expect(result.config.custom_formats.length).toBe(0);
    expect(result.config.quality_profiles.length).toBe(0);
  });

  test("should prioritize config values over template values", async () => {
    const fromConfig: ConfigQualityProfileItem[] = [{ name: "HDTV-1080p", enabled: false }];

    const profile: ConfigQualityProfile = {
      name: "profile1",
      min_format_score: 2,
      qualities: fromConfig,
      quality_sort: "sort",
      upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
      score_set: "default",
    };

    const profile4 = cloneWithJSON(profile);
    profile4.name = "profile1";
    profile4.min_format_score = 5;

    // Mock template data
    const recyclarrTemplates: Map<string, MappedTemplates> = new Map<string, MappedTemplates>([
      ["template1", { custom_formats: [{ trash_ids: ["cf1"] }], quality_profiles: [profile] }],
    ]);

    vi.spyOn(reclarrImporter, "loadRecyclarrTemplates").mockReturnValue(recyclarrTemplates);
    vi.spyOn(localImporter, "loadLocalRecyclarrTemplate").mockReturnValue(new Map());
    vi.spyOn(trashGuide, "loadQPFromTrash").mockReturnValue(Promise.resolve(new Map()));

    const inputConfig: InputConfigArrInstance = {
      include: [{ template: "template1", source: "RECYCLARR" }],
      custom_formats: [{ trash_ids: ["cf4"] }],
      quality_profiles: [profile4],
      api_key: "test",
      base_url: "http://sonarr:8989",
    };

    const result = await mergeConfigsAndTemplates({}, inputConfig, "SONARR");

    expect(result.config.custom_formats.length).toBe(2);
    expect(result.config.quality_profiles.length).toBe(1);
    expect(result.config.quality_profiles[0]!.min_format_score).toBe(5);
  });

  test("should handle recursive includes gracefully (not supported)", async () => {
    const fromConfig: ConfigQualityProfileItem[] = [{ name: "HDTV-1080p", enabled: false }];

    const profile: ConfigQualityProfile = {
      name: "profile1",
      min_format_score: 2,
      qualities: fromConfig,
      quality_sort: "sort",
      upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
      score_set: "default",
    };

    const profile4 = cloneWithJSON(profile);
    profile4.name = "profile1";
    profile4.min_format_score = 5;

    // Mock template data
    const recyclarrTemplates: Map<string, MappedTemplates> = new Map<string, MappedTemplates>([
      [
        "template1",
        {
          include: [{ template: "template2", source: "RECYCLARR" }],
        },
      ],
      ["template2", { custom_formats: [{ trash_ids: ["cf1"] }], quality_profiles: [profile] }],
    ]);

    vi.spyOn(reclarrImporter, "loadRecyclarrTemplates").mockReturnValue(recyclarrTemplates);
    vi.spyOn(localImporter, "loadLocalRecyclarrTemplate").mockReturnValue(new Map());
    vi.spyOn(trashGuide, "loadQPFromTrash").mockReturnValue(Promise.resolve(new Map()));

    const inputConfig: InputConfigArrInstance = {
      include: [{ template: "template1", source: "RECYCLARR" }],
      custom_formats: [],
      quality_profiles: [],
      api_key: "test",
      base_url: "http://sonarr:8989",
    };

    const result = await mergeConfigsAndTemplates({}, inputConfig, "SONARR");

    expect(result.config.custom_formats.length).toBe(0);
    expect(result.config.quality_profiles.length).toBe(0);
  });

  test("should throw error for invalid input configuration", async () => {
    await expect(mergeConfigsAndTemplates({}, null as any, "SONARR")).rejects.toThrow();
  });
});
