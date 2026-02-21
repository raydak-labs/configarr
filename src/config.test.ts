import { beforeEach, describe, expect, test, vi } from "vitest";
import yaml from "yaml";
import { getSecrets, mergeConfigsAndTemplates, readConfigRaw, resetSecretsCache, transformConfig } from "./config";
import * as env from "./env";
import * as localImporter from "./local-importer";
import * as reclarrImporter from "./recyclarr-importer";
import * as trashGuide from "./trash-guide";
import { MappedTemplates } from "./types/common.types";
import {
  ConfigQualityProfile,
  ConfigQualityProfileItem,
  InputConfigArrInstance,
  InputConfigCustomFormat,
  InputConfigSchema,
} from "./types/config.types";
import { TrashQP } from "./types/trashguide.types";
import { cloneWithJSON } from "./util";

// Mock ky for URL template tests
const mockKyGet = vi.hoisted(() => vi.fn());
vi.mock("ky", () => {
  const mockKy = vi.fn() as any;
  mockKy.get = mockKyGet;
  return {
    default: mockKy,
  };
});

// Mock fast-glob for secrets tests
const mockFastGlobSync = vi.hoisted(() => vi.fn());
vi.mock("fast-glob", () => {
  return {
    default: {
      sync: mockFastGlobSync,
    },
  };
});

// Mock fs for secrets tests - must be hoisted before imports
const mockExistsSync = vi.hoisted(() => vi.fn());
const mockReadFileSync = vi.hoisted(() => vi.fn());
vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
  };
});

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
    vi.spyOn(trashGuide, "loadTrashCustomFormatGroups").mockReturnValue(Promise.resolve(new Map()));

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

    expect(result.config.custom_formats.length).toBe(2); // was 3, now 2 after deduplication
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
    vi.spyOn(trashGuide, "loadTrashCustomFormatGroups").mockReturnValue(Promise.resolve(new Map()));

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
    vi.spyOn(trashGuide, "loadTrashCustomFormatGroups").mockReturnValue(Promise.resolve(new Map()));

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
    vi.spyOn(trashGuide, "loadTrashCustomFormatGroups").mockReturnValue(Promise.resolve(new Map()));

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

  test("should integrate URL templates with config merging", async () => {
    const fromConfig: ConfigQualityProfileItem[] = [{ name: "HDTV-1080p", enabled: false }];

    const profile: ConfigQualityProfile = {
      name: "url-profile",
      min_format_score: 2,
      qualities: fromConfig,
      quality_sort: "sort",
      upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
      score_set: "default",
    };

    const urlTemplate: MappedTemplates = {
      custom_formats: [{ trash_ids: ["cf-url"], assign_scores_to: [{ name: "url-profile" }] }],
      quality_profiles: [profile],
    };

    mockKyGet.mockResolvedValue({
      text: async () => yaml.stringify(urlTemplate),
    });

    vi.spyOn(reclarrImporter, "loadRecyclarrTemplates").mockReturnValue(new Map());
    vi.spyOn(localImporter, "loadLocalRecyclarrTemplate").mockReturnValue(new Map());
    vi.spyOn(trashGuide, "loadQPFromTrash").mockReturnValue(Promise.resolve(new Map()));
    vi.spyOn(trashGuide, "loadTrashCustomFormatGroups").mockReturnValue(Promise.resolve(new Map()));

    const inputConfig: InputConfigArrInstance = {
      include: [{ template: "https://example.com/template.yml" }],
      custom_formats: [],
      quality_profiles: [],
      api_key: "test",
      base_url: "http://sonarr:8989",
    };

    const result = await mergeConfigsAndTemplates({}, inputConfig, "SONARR");

    expect(mockKyGet).toHaveBeenCalledWith("https://example.com/template.yml", { timeout: 30000 });
    expect(result.config.custom_formats.length).toBe(1);
    expect(result.config.custom_formats[0]!.trash_ids).toEqual(["cf-url"]);
    expect(result.config.quality_profiles.length).toBe(1);
    expect(result.config.quality_profiles[0]!.name).toBe("url-profile");
  });

  test("should integrate TRASH URL templates with config merging", async () => {
    const trashTemplate: TrashQP = {
      trash_id: "test-trash-id",
      name: "TRASH Profile",
      trash_score_set: "default",
      upgradeAllowed: true,
      cutoff: "HDTV-1080p",
      minFormatScore: 0,
      cutoffFormatScore: 1000,
      items: [{ name: "HDTV-1080p", allowed: true }],
      formatItems: {},
    };

    mockKyGet.mockResolvedValue({
      text: async () => JSON.stringify(trashTemplate),
    });

    vi.spyOn(reclarrImporter, "loadRecyclarrTemplates").mockReturnValue(new Map());
    vi.spyOn(localImporter, "loadLocalRecyclarrTemplate").mockReturnValue(new Map());
    vi.spyOn(trashGuide, "loadQPFromTrash").mockReturnValue(Promise.resolve(new Map()));
    vi.spyOn(trashGuide, "loadTrashCustomFormatGroups").mockReturnValue(Promise.resolve(new Map()));

    const inputConfig: InputConfigArrInstance = {
      include: [{ template: "https://example.com/trash-template.json", source: "TRASH" }],
      custom_formats: [],
      quality_profiles: [],
      api_key: "test",
      base_url: "http://sonarr:8989",
    };

    const result = await mergeConfigsAndTemplates({}, inputConfig, "SONARR");

    expect(mockKyGet).toHaveBeenCalledWith("https://example.com/trash-template.json", { timeout: 30000 });
    expect(result.config.quality_profiles.length).toBe(1);
    expect(result.config.quality_profiles[0]!.name).toBe("TRASH Profile");
  });
});

const dummyProfile = {
  name: "profile",
  min_format_score: 0,
  qualities: [],
  quality_sort: "sort",
  upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
  score_set: "default" as keyof import("./types/trashguide.types").TrashScores,
};

describe("custom_formats ordering", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("should order: includes -> customFormatGroups (from include) -> customFormatGroups (from instance) -> direct custom_formats", async () => {
    // Mock template with custom_formats and custom_format_groups
    const templateCF = { trash_ids: ["cf-template"] };
    const groupCF = { name: "cf-group", trash_id: "cf-group", required: true };
    const groupCF2 = { name: "cf-group2", trash_id: "cf-group2", required: true };
    const directCF = { trash_ids: ["cf-direct"] };

    const templateWithGroup = {
      custom_formats: [templateCF],
      custom_format_groups: [{ trash_guide: [{ id: "group1" }], assign_scores_to: [{ name: "profile" }] }],
    };

    const recyclarrTemplates: Map<string, MappedTemplates> = new Map([["template1", templateWithGroup]]);
    vi.spyOn(reclarrImporter, "loadRecyclarrTemplates").mockReturnValue(recyclarrTemplates);
    vi.spyOn(localImporter, "loadLocalRecyclarrTemplate").mockReturnValue(new Map());
    vi.spyOn(trashGuide, "loadQPFromTrash").mockReturnValue(Promise.resolve(new Map()));
    vi.spyOn(trashGuide, "loadTrashCustomFormatGroups").mockReturnValue(
      Promise.resolve(
        new Map([
          ["group1", { name: "group1", trash_id: "group1", custom_formats: [groupCF] }],
          ["group2", { name: "group2", trash_id: "group2", custom_formats: [groupCF2] }],
        ]),
      ),
    );

    const inputConfig: InputConfigArrInstance = {
      include: [{ template: "template1", source: "RECYCLARR" }],
      custom_format_groups: [{ trash_guide: [{ id: "group2" }], assign_scores_to: [{ name: "profile" }] }],
      custom_formats: [directCF],
      quality_profiles: [dummyProfile],
      api_key: "test",
      base_url: "http://sonarr:8989",
    };

    const result = await mergeConfigsAndTemplates({}, inputConfig, "SONARR");
    const ids = result.config.custom_formats.map((cf) => cf.trash_ids?.[0]).filter(Boolean);
    expect(ids).toEqual(["cf-group", "cf-template", "cf-group2", "cf-direct"]); // updated order: group first
  });

  test("should handle empty customFormatGroups gracefully", async () => {
    const templateCF = { trash_ids: ["cf-template"] };
    const directCF = { trash_ids: ["cf-direct"] };
    const templateWithNoGroup = { custom_formats: [templateCF] };
    const recyclarrTemplates: Map<string, MappedTemplates> = new Map([["template1", templateWithNoGroup]]);
    vi.spyOn(reclarrImporter, "loadRecyclarrTemplates").mockReturnValue(recyclarrTemplates);
    vi.spyOn(localImporter, "loadLocalRecyclarrTemplate").mockReturnValue(new Map());
    vi.spyOn(trashGuide, "loadQPFromTrash").mockReturnValue(Promise.resolve(new Map()));
    vi.spyOn(trashGuide, "loadTrashCustomFormatGroups").mockReturnValue(Promise.resolve(new Map()));
    const inputConfig: InputConfigArrInstance = {
      include: [{ template: "template1", source: "RECYCLARR" }],
      custom_format_groups: [],
      custom_formats: [directCF],
      quality_profiles: [dummyProfile],
      api_key: "test",
      base_url: "http://sonarr:8989",
    };
    const result = await mergeConfigsAndTemplates({}, inputConfig, "SONARR");
    const ids = result.config.custom_formats.map((cf) => cf.trash_ids?.[0]).filter(Boolean);
    expect(ids).toEqual(["cf-template", "cf-direct"]);
  });

  test("should handle only customFormatGroups", async () => {
    const groupCF = { name: "cf-group", trash_id: "cf-group", required: true };
    vi.spyOn(reclarrImporter, "loadRecyclarrTemplates").mockReturnValue(new Map());
    vi.spyOn(localImporter, "loadLocalRecyclarrTemplate").mockReturnValue(new Map());
    vi.spyOn(trashGuide, "loadQPFromTrash").mockReturnValue(Promise.resolve(new Map()));
    vi.spyOn(trashGuide, "loadTrashCustomFormatGroups").mockReturnValue(
      Promise.resolve(new Map([["group1", { name: "group1", trash_id: "group1", custom_formats: [groupCF] }]])),
    );
    const inputConfig: InputConfigArrInstance = {
      include: [],
      custom_format_groups: [{ trash_guide: [{ id: "group1" }], assign_scores_to: [{ name: "profile" }] }],
      custom_formats: [],
      quality_profiles: [dummyProfile],
      api_key: "test",
      base_url: "http://sonarr:8989",
    };
    const result = await mergeConfigsAndTemplates({}, inputConfig, "SONARR");
    const ids = result.config.custom_formats.map((cf) => cf.trash_ids?.[0]).filter(Boolean);
    expect(ids).toEqual(["cf-group"]);
  });

  test("should overwrite custom format scores in correct order (in template overwrite, group)", async () => {
    const testCF1ProfileAssignment: NonNullable<InputConfigCustomFormat["assign_scores_to"]>[number] = {
      name: "profile",
      score: 1,
    };
    const testCF1: InputConfigCustomFormat = { trash_ids: ["test-cf"], assign_scores_to: [testCF1ProfileAssignment] };

    const template1: MappedTemplates = {
      custom_format_groups: [{ trash_guide: [{ id: "group1" }], assign_scores_to: [{ name: "profile" }] }],
    };
    const groupCF1 = { name: "test-cf", trash_id: "test-cf", required: true };
    vi.spyOn(trashGuide, "loadTrashCustomFormatGroups").mockReturnValue(
      Promise.resolve(new Map([["group1", { name: "group1", trash_id: "group1", custom_formats: [groupCF1] }]])),
    );

    const recyclarrTemplates: Map<string, MappedTemplates> = new Map([["template1", template1]]);
    vi.spyOn(reclarrImporter, "loadRecyclarrTemplates").mockReturnValue(recyclarrTemplates);
    vi.spyOn(localImporter, "loadLocalRecyclarrTemplate").mockReturnValue(new Map());
    vi.spyOn(trashGuide, "loadQPFromTrash").mockReturnValue(Promise.resolve(new Map()));

    let inputConfig: InputConfigArrInstance = {
      include: [{ template: "template1", source: "RECYCLARR" }],
      custom_format_groups: [],
      custom_formats: [],
      quality_profiles: [dummyProfile],
      api_key: "test",
      base_url: "http://sonarr:8989",
    };

    let result = await mergeConfigsAndTemplates({}, inputConfig, "SONARR");
    let cf = result.config.custom_formats.find((cf) => cf.trash_ids?.includes("test-cf"));
    expect(cf?.assign_scores_to?.[0]?.score).toBe(undefined); // should be 0 from template1

    template1.custom_formats = [testCF1];
    result = await mergeConfigsAndTemplates({}, inputConfig, "SONARR");
    cf = result.config.custom_formats.find((cf) => cf.trash_ids?.includes("test-cf"));
    expect(cf?.assign_scores_to?.[0]?.score).toBe(1); // should be 0 from template1
  });

  test("should overwrite custom format scores in correct order (in template overwrite)", async () => {
    const testCF1ProfileAssignment: NonNullable<InputConfigCustomFormat["assign_scores_to"]>[number] = {
      name: "profile",
      score: undefined,
    };
    const testCF1: InputConfigCustomFormat = { trash_ids: ["test-cf"], assign_scores_to: [testCF1ProfileAssignment] };

    const template1: MappedTemplates = {
      custom_formats: [testCF1],
      custom_format_groups: [{ trash_guide: [{ id: "group1" }], assign_scores_to: [{ name: "profile" }] }],
    };
    const groupCF1 = { name: "test-cf", trash_id: "test-cf", required: true };
    vi.spyOn(trashGuide, "loadTrashCustomFormatGroups").mockReturnValue(
      Promise.resolve(new Map([["group1", { name: "group1", trash_id: "group1", custom_formats: [groupCF1] }]])),
    );

    const recyclarrTemplates: Map<string, MappedTemplates> = new Map([["template1", template1]]);
    vi.spyOn(reclarrImporter, "loadRecyclarrTemplates").mockReturnValue(recyclarrTemplates);
    vi.spyOn(localImporter, "loadLocalRecyclarrTemplate").mockReturnValue(new Map());
    vi.spyOn(trashGuide, "loadQPFromTrash").mockReturnValue(Promise.resolve(new Map()));

    let inputConfig: InputConfigArrInstance = {
      include: [{ template: "template1", source: "RECYCLARR" }],
      custom_format_groups: [],
      custom_formats: [],
      quality_profiles: [dummyProfile],
      api_key: "test",
      base_url: "http://sonarr:8989",
    };

    let result = await mergeConfigsAndTemplates({}, inputConfig, "SONARR");
    let cf = result.config.custom_formats.find((cf) => cf.trash_ids?.includes("test-cf"));
    expect(cf?.assign_scores_to?.[0]?.score).toBe(undefined); // should be 0 from template1

    testCF1ProfileAssignment.score = 1; // overwrite score to 1
    result = await mergeConfigsAndTemplates({}, inputConfig, "SONARR");
    cf = result.config.custom_formats.find((cf) => cf.trash_ids?.includes("test-cf"));
    expect(cf?.assign_scores_to?.[0]?.score).toBe(1); // should be 0 from template1
  });

  test("should overwrite custom format scores in correct order (in template -> template overwrite) [not supported yet]", async () => {
    const testCF1ProfileAssignment: NonNullable<InputConfigCustomFormat["assign_scores_to"]>[number] = {
      name: "profile",
      score: 2,
    };
    const testCF2ProfileAssignment: NonNullable<InputConfigCustomFormat["assign_scores_to"]>[number] = {
      name: "profile",
      score: 1,
    };
    const testCF1: InputConfigCustomFormat = { trash_ids: ["test-cf"], assign_scores_to: [testCF1ProfileAssignment] };
    const testCF2: InputConfigCustomFormat = { trash_ids: ["test-cf"], assign_scores_to: [testCF2ProfileAssignment] };

    const template1: MappedTemplates = { include: [{ template: "template2", source: "RECYCLARR" }] };
    const template2: MappedTemplates = { custom_formats: [testCF2] };
    const groupCF1 = { name: "test-cf", trash_id: "test-cf", required: true };

    vi.spyOn(trashGuide, "loadTrashCustomFormatGroups").mockReturnValue(
      Promise.resolve(new Map([["group1", { name: "group1", trash_id: "group1", custom_formats: [groupCF1] }]])),
    );

    const recyclarrTemplates: Map<string, MappedTemplates> = new Map([
      ["template1", template1],
      ["template2", template2],
    ]);
    vi.spyOn(reclarrImporter, "loadRecyclarrTemplates").mockReturnValue(recyclarrTemplates);
    vi.spyOn(localImporter, "loadLocalRecyclarrTemplate").mockReturnValue(new Map());
    vi.spyOn(trashGuide, "loadQPFromTrash").mockReturnValue(Promise.resolve(new Map()));

    let inputConfig: InputConfigArrInstance = {
      include: [{ template: "template1", source: "RECYCLARR" }],
      custom_format_groups: [],
      custom_formats: [],
      quality_profiles: [dummyProfile],
      api_key: "test",
      base_url: "http://sonarr:8989",
    };

    let result = await mergeConfigsAndTemplates({}, inputConfig, "SONARR");
    let cf = result.config.custom_formats.find((cf) => cf.trash_ids?.includes("test-cf"));
    expect(cf?.assign_scores_to?.[0]?.score).toBe(undefined); // should be 1 if recursive implemented someday

    template1.custom_formats = [testCF1];
    result = await mergeConfigsAndTemplates({}, inputConfig, "SONARR");
    cf = result.config.custom_formats.find((cf) => cf.trash_ids?.includes("test-cf"));
    expect(cf?.assign_scores_to?.[0]?.score).toBe(2);
  });

  test("should overwrite custom format scores in correct order (instance over template)", async () => {
    const testCF1ProfileAssignment: NonNullable<InputConfigCustomFormat["assign_scores_to"]>[number] = {
      name: "profile",
      score: 1,
    };
    const testCF2ProfileAssignment: NonNullable<InputConfigCustomFormat["assign_scores_to"]>[number] = {
      name: "profile",
      score: 2,
    };
    const testCF1: InputConfigCustomFormat = { trash_ids: ["test-cf"], assign_scores_to: [testCF1ProfileAssignment] };
    const testCF2: InputConfigCustomFormat = { trash_ids: ["test-cf"], assign_scores_to: [testCF2ProfileAssignment] };

    const template1: MappedTemplates = {
      custom_formats: [testCF1],
      custom_format_groups: [{ trash_guide: [{ id: "group1" }], assign_scores_to: [{ name: "profile" }] }],
    };

    const groupCF1 = { name: "test-cf", trash_id: "test-cf", required: true };

    vi.spyOn(trashGuide, "loadTrashCustomFormatGroups").mockReturnValue(
      Promise.resolve(new Map([["group1", { name: "group1", trash_id: "group1", custom_formats: [groupCF1] }]])),
    );

    const recyclarrTemplates: Map<string, MappedTemplates> = new Map([["template1", template1]]);
    vi.spyOn(reclarrImporter, "loadRecyclarrTemplates").mockReturnValue(recyclarrTemplates);
    vi.spyOn(localImporter, "loadLocalRecyclarrTemplate").mockReturnValue(new Map());
    vi.spyOn(trashGuide, "loadQPFromTrash").mockReturnValue(Promise.resolve(new Map()));

    let inputConfig: InputConfigArrInstance = {
      include: [{ template: "template1", source: "RECYCLARR" }],
      custom_format_groups: [],
      custom_formats: [],
      quality_profiles: [dummyProfile],
      api_key: "test",
      base_url: "http://sonarr:8989",
    };

    let result = await mergeConfigsAndTemplates({}, inputConfig, "SONARR");
    let cf = result.config.custom_formats.find((cf) => cf.trash_ids?.includes("test-cf"));
    expect(cf?.assign_scores_to?.[0]?.score).toBe(1);

    // Group does not overwrite scores
    inputConfig.custom_format_groups = [{ trash_guide: [{ id: "group1" }], assign_scores_to: [{ name: "profile" }] }];
    result = await mergeConfigsAndTemplates({}, inputConfig, "SONARR");
    cf = result.config.custom_formats.find((cf) => cf.trash_ids?.includes("test-cf"));
    expect(cf?.assign_scores_to?.[0]?.score).toBe(1);

    inputConfig.custom_formats = [testCF2]; // overwrite with instance config
    result = await mergeConfigsAndTemplates({}, inputConfig, "SONARR");
    cf = result.config.custom_formats.find((cf) => cf.trash_ids?.includes("test-cf"));
    expect(cf?.assign_scores_to?.[0]?.score).toBe(2);
  });

  describe("CONFIGARR_ENABLE_MERGE (YAML merge keys)", () => {
    const configLocation = "/config/config.yml";

    beforeEach(() => {
      mockExistsSync.mockReturnValue(true);
    });

    test("should merge YAML anchor when enableMerge is true", () => {
      const yamlWithMerge = `
base: &qb_base
  type: qbittorrent
  fields:
    host: qbittorrent
    port: 8080
sonarr:
  instance1:
    base_url: http://sonarr:8989
    api_key: test
    download_clients:
      data:
        - <<: *qb_base
          name: "MyQbit"
          fields:
            tv_category: series
      update_password: false
`;

      vi.spyOn(env, "getHelpers").mockReturnValue({
        configLocation,
        secretLocation: "/config/secrets.yml",
        repoPath: "/repos",
        enableMerge: true,
      });
      mockReadFileSync.mockImplementation((path: string) => {
        if (path === configLocation) return yamlWithMerge.trim();
        return "";
      });

      const raw = readConfigRaw() as Record<string, unknown>;
      const dc = (raw.sonarr as Record<string, unknown>)?.instance1 as Record<string, unknown>;
      const data = (dc?.download_clients as Record<string, unknown>)?.data as Record<string, unknown>[];
      expect(data).toHaveLength(1);
      // Merge is shallow: base contributed type; override replaced fields entirely
      expect(data[0]).toMatchObject({
        name: "MyQbit",
        type: "qbittorrent",
        fields: { tv_category: "series" },
      });
    });

    test("should not merge when enableMerge is false (<< remains literal or alias only)", () => {
      const yamlWithMerge = `
base: &qb_base
  type: qbittorrent
sonarr:
  instance1:
    base_url: http://sonarr:8989
    api_key: test
    download_clients:
      data:
        - <<: *qb_base
          name: "MyQbit"
`;

      vi.spyOn(env, "getHelpers").mockReturnValue({
        configLocation,
        secretLocation: "/config/secrets.yml",
        repoPath: "/repos",
        enableMerge: false,
      });
      mockReadFileSync.mockImplementation((path: string) => {
        if (path === configLocation) return yamlWithMerge.trim();
        return "";
      });

      const raw = readConfigRaw() as Record<string, unknown>;
      const dc = (raw.sonarr as Record<string, unknown>)?.instance1 as Record<string, unknown>;
      const data = (dc?.download_clients as Record<string, unknown>)?.data as Record<string, unknown>[];
      expect(data).toHaveLength(1);
      const entry = data[0] as Record<string, unknown>;
      expect(entry.name).toBe("MyQbit");
      // With merge disabled, type from *qb_base is not merged into this object
      expect(entry.type).toBeUndefined();
    });
  });
});

describe("getSecrets", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockFastGlobSync.mockClear();
    mockExistsSync.mockClear();
    mockReadFileSync.mockClear();
    resetSecretsCache();
  });

  test("should load single secret file (backward compatibility)", () => {
    const secretLocation = "/config/secrets.yml";
    const secretContent = "API_KEY: test-key-123\nOTHER_SECRET: test-value";

    vi.spyOn(env, "getHelpers").mockReturnValue({
      configLocation: "/config/config.yml",
      secretLocation,
      repoPath: "/repos",
    });

    mockFastGlobSync.mockReturnValue([secretLocation]);
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(secretContent);

    const secrets = getSecrets();

    expect(secrets).toEqual({
      API_KEY: "test-key-123",
      OTHER_SECRET: "test-value",
    });
    expect(mockReadFileSync).toHaveBeenCalledWith(secretLocation, "utf8");
  });

  test("should throw error when single secret file does not exist", () => {
    const secretLocation = "/config/secrets-nonexistent.yml";

    vi.spyOn(env, "getHelpers").mockReturnValue({
      configLocation: "/config/config.yml",
      secretLocation,
      repoPath: "/repos",
    });

    // fast-glob returns empty for non-existent file
    mockFastGlobSync.mockReturnValue([]);
    // existsSync also returns false
    mockExistsSync.mockReturnValue(false);

    expect(() => getSecrets()).toThrow("Secret file not found.");
  });

  test("should load multiple secret files via glob pattern", () => {
    const secretLocation = "/config/secrets-glob/*.yml";
    const secretFile1 = "/config/secrets-glob/sonarr.yml";
    const secretFile2 = "/config/secrets-glob/radarr.yml";
    const secretContent1 = "SONARR_API_KEY: sonarr-key-123";
    const secretContent2 = "RADARR_API_KEY: radarr-key-456";

    vi.spyOn(env, "getHelpers").mockReturnValue({
      configLocation: "/config/config.yml",
      secretLocation,
      repoPath: "/repos",
    });

    // Mock fast-glob
    mockFastGlobSync.mockReturnValue([secretFile1, secretFile2]);

    mockExistsSync.mockImplementation((path) => {
      return path === secretFile1 || path === secretFile2;
    });

    mockReadFileSync.mockImplementation((path) => {
      if (path === secretFile1) return secretContent1;
      if (path === secretFile2) return secretContent2;
      return "";
    });

    const secrets = getSecrets();

    expect(secrets).toEqual({
      SONARR_API_KEY: "sonarr-key-123",
      RADARR_API_KEY: "radarr-key-456",
    });
    expect(mockFastGlobSync).toHaveBeenCalled();
  });

  test("should merge multiple secret files with later files overriding earlier ones", () => {
    const secretLocation = "/config/secrets-merge/*.yml";
    const secretFile1 = "/config/secrets-merge/common.yml";
    const secretFile2 = "/config/secrets-merge/override.yml";
    const secretContent1 = "API_KEY: original-key\nCOMMON_VALUE: common";
    const secretContent2 = "API_KEY: overridden-key";

    vi.spyOn(env, "getHelpers").mockReturnValue({
      configLocation: "/config/config.yml",
      secretLocation,
      repoPath: "/repos",
    });

    // Mock fast-glob to return files in alphabetical order
    mockFastGlobSync.mockReturnValue([secretFile1, secretFile2]);

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation((path) => {
      if (path === secretFile1) return secretContent1;
      if (path === secretFile2) return secretContent2;
      return "";
    });

    const secrets = getSecrets();

    // Later file should override earlier file's values
    expect(secrets).toEqual({
      API_KEY: "overridden-key",
      COMMON_VALUE: "common",
    });
  });

  test("should handle glob pattern with no matches", () => {
    const secretLocation = "/config/secrets-empty/*.yml";

    vi.spyOn(env, "getHelpers").mockReturnValue({
      configLocation: "/config/config.yml",
      secretLocation,
      repoPath: "/repos",
    });

    // Mock fast-glob to return empty array
    mockFastGlobSync.mockReturnValue([]);

    const secrets = getSecrets();

    // Should return empty object, not throw
    expect(secrets).toEqual({});
  });

  test("should skip invalid YAML files and continue with others", () => {
    const secretLocation = "/config/secrets-invalid/*.yml";
    const secretFile1 = "/config/secrets-invalid/valid.yml";
    const secretFile2 = "/config/secrets-invalid/invalid.yml";
    const secretContent1 = "VALID_KEY: valid-value";
    const secretContent2 = "invalid: yaml: content: [unclosed";

    vi.spyOn(env, "getHelpers").mockReturnValue({
      configLocation: "/config/config.yml",
      secretLocation,
      repoPath: "/repos",
    });

    // Mock fast-glob
    mockFastGlobSync.mockReturnValue([secretFile1, secretFile2]);

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation((path) => {
      if (path === secretFile1) return secretContent1;
      if (path === secretFile2) return secretContent2;
      return "";
    });

    // Mock yaml.parse to throw for invalid file
    const originalParse = yaml.parse;
    const parseSpy = vi.spyOn(yaml, "parse").mockImplementation((content: string) => {
      if (content === secretContent2) {
        throw new Error("Invalid YAML");
      }
      return originalParse(content);
    });

    const secrets = getSecrets();

    // Should only contain valid file's content
    expect(secrets).toEqual({
      VALID_KEY: "valid-value",
    });
  });

  test("should skip empty files and continue with others", () => {
    const secretLocation = "/config/secrets-empty-files/*.yml";
    const secretFile1 = "/config/secrets-empty-files/empty.yml";
    const secretFile2 = "/config/secrets-empty-files/valid.yml";
    const secretContent1 = "   \n  \n  ";
    const secretContent2 = "VALID_KEY: valid-value";

    vi.spyOn(env, "getHelpers").mockReturnValue({
      configLocation: "/config/config.yml",
      secretLocation,
      repoPath: "/repos",
    });

    // Mock fast-glob
    mockFastGlobSync.mockReturnValue([secretFile1, secretFile2]);

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation((path) => {
      if (path === secretFile1) return secretContent1;
      if (path === secretFile2) return secretContent2;
      return "";
    });

    const secrets = getSecrets();

    // Should only contain valid file's content
    expect(secrets).toEqual({
      VALID_KEY: "valid-value",
    });
  });

  test("should cache secrets after first load", () => {
    const secretLocation = "/config/secrets-cache.yml";
    const secretContent = "API_KEY: test-key";

    vi.spyOn(env, "getHelpers").mockReturnValue({
      configLocation: "/config/config.yml",
      secretLocation,
      repoPath: "/repos",
    });

    mockFastGlobSync.mockReturnValue([secretLocation]);
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(secretContent);

    const secrets1 = getSecrets();
    const secrets2 = getSecrets();

    // Should return same object (cached)
    expect(secrets1).toBe(secrets2);
    // Should only read file once (cached on second call)
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
  });

  test("should load multiple secret files via comma-separated list", () => {
    const secretLocation = "/config/secrets1.yml,/config/secrets2.yml";
    const secretFile1 = "/config/secrets1.yml";
    const secretFile2 = "/config/secrets2.yml";
    const secretContent1 = "SONARR_API_KEY: sonarr-key-123";
    const secretContent2 = "RADARR_API_KEY: radarr-key-456";

    vi.spyOn(env, "getHelpers").mockReturnValue({
      configLocation: "/config/config.yml",
      secretLocation,
      repoPath: "/repos",
    });

    mockFastGlobSync.mockImplementation((pattern: string) => {
      if (pattern === "/config/secrets1.yml") return [secretFile1];
      if (pattern === "/config/secrets2.yml") return [secretFile2];
      return [];
    });

    mockExistsSync.mockImplementation((path) => {
      return path === secretFile1 || path === secretFile2;
    });

    mockReadFileSync.mockImplementation((path) => {
      if (path === secretFile1) return secretContent1;
      if (path === secretFile2) return secretContent2;
      return "";
    });

    const secrets = getSecrets();

    expect(secrets).toEqual({
      SONARR_API_KEY: "sonarr-key-123",
      RADARR_API_KEY: "radarr-key-456",
    });
  });

  test("should merge comma-separated files with later files overriding earlier ones", () => {
    const secretLocation = "/config/common.yml,/config/override.yml";
    const secretFile1 = "/config/common.yml";
    const secretFile2 = "/config/override.yml";
    const secretContent1 = "API_KEY: original-key\nCOMMON_VALUE: common";
    const secretContent2 = "API_KEY: overridden-key";

    vi.spyOn(env, "getHelpers").mockReturnValue({
      configLocation: "/config/config.yml",
      secretLocation,
      repoPath: "/repos",
    });

    mockFastGlobSync.mockImplementation((pattern: string) => {
      if (pattern === "/config/common.yml") return [secretFile1];
      if (pattern === "/config/override.yml") return [secretFile2];
      return [];
    });

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation((path) => {
      if (path === secretFile1) return secretContent1;
      if (path === secretFile2) return secretContent2;
      return "";
    });

    const secrets = getSecrets();

    // Later file should override earlier file's values
    expect(secrets).toEqual({
      API_KEY: "overridden-key",
      COMMON_VALUE: "common",
    });
  });

  test("should handle comma-separated list with whitespace", () => {
    const secretLocation = "/config/file1.yml , /config/file2.yml , /config/file3.yml";
    const secretFile1 = "/config/file1.yml";
    const secretFile2 = "/config/file2.yml";
    const secretFile3 = "/config/file3.yml";
    const secretContent1 = "KEY1: value1";
    const secretContent2 = "KEY2: value2";
    const secretContent3 = "KEY3: value3";

    vi.spyOn(env, "getHelpers").mockReturnValue({
      configLocation: "/config/config.yml",
      secretLocation,
      repoPath: "/repos",
    });

    mockFastGlobSync.mockImplementation((pattern: string) => {
      if (pattern === "/config/file1.yml") return [secretFile1];
      if (pattern === "/config/file2.yml") return [secretFile2];
      if (pattern === "/config/file3.yml") return [secretFile3];
      return [];
    });

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation((path) => {
      if (path === secretFile1) return secretContent1;
      if (path === secretFile2) return secretContent2;
      if (path === secretFile3) return secretContent3;
      return "";
    });

    const secrets = getSecrets();

    expect(secrets).toEqual({
      KEY1: "value1",
      KEY2: "value2",
      KEY3: "value3",
    });
  });

  test("should handle empty comma-separated list", () => {
    const secretLocation = ",,,";

    vi.spyOn(env, "getHelpers").mockReturnValue({
      configLocation: "/config/config.yml",
      secretLocation,
      repoPath: "/repos",
    });

    mockFastGlobSync.mockReturnValue([]);

    const secrets = getSecrets();

    // Should return empty object, not throw
    expect(secrets).toEqual({});
  });

  test("should skip invalid files in comma-separated list and continue with others", () => {
    const secretLocation = "/config/valid.yml,/config/invalid.yml,/config/another-valid.yml";
    const secretFile1 = "/config/valid.yml";
    const secretFile2 = "/config/invalid.yml";
    const secretFile3 = "/config/another-valid.yml";
    const secretContent1 = "VALID_KEY1: value1";
    const secretContent2 = "invalid: yaml: [unclosed bracket";
    const secretContent3 = "VALID_KEY2: value2";

    vi.spyOn(env, "getHelpers").mockReturnValue({
      configLocation: "/config/config.yml",
      secretLocation,
      repoPath: "/repos",
    });

    mockFastGlobSync.mockImplementation((pattern: string) => {
      if (pattern === "/config/valid.yml") return [secretFile1];
      if (pattern === "/config/invalid.yml") return [secretFile2];
      if (pattern === "/config/another-valid.yml") return [secretFile3];
      return [];
    });

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation((path) => {
      if (path === secretFile1) return secretContent1;
      if (path === secretFile2) return secretContent2;
      if (path === secretFile3) return secretContent3;
      return "";
    });

    const secrets = getSecrets();

    // Should only contain valid files' content (invalid file will fail to parse)
    expect(secrets).toEqual({
      VALID_KEY1: "value1",
      VALID_KEY2: "value2",
    });
  });
});
