import { beforeEach, describe, expect, test, vi } from "vitest";
import yaml from "yaml";
import { mergeConfigsAndTemplates, transformConfig } from "./config";
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
});
