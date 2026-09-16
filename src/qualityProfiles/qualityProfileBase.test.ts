import { beforeEach, describe, expect, test, vi } from "vitest";
import * as log from "../logger";
import { QualityDefinitionShared } from "../qualityDefinitions/qualityDefinition.types";
import { QualityItem, QualityProfileShared } from "./qualityProfile.types";
import {
  checkForConflictingCFs,
  isOrderOfConfigQualitiesEqual,
  isOrderOfQualitiesEqual,
  mapQualities,
  mapQualityProfiles,
  qualityProfilesToDiffEntries,
} from "./qualityProfileBase";
import { CFProcessing } from "../customFormats/customFormat.types";
import { ConfigQualityProfile, ConfigQualityProfileItem, MergedConfigInstance } from "../types/config.types";

describe("qualityProfileBase", async () => {
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

    const resources: QualityDefinitionShared[] = [
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

    const resources: QualityDefinitionShared[] = [
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

    const resources: QualityDefinitionShared[] = [
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

    const resources: QualityDefinitionShared[] = [
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

    const resources: QualityDefinitionShared[] = [
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

    const resources: QualityDefinitionShared[] = [
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

  describe("isOrderOfQualitiesEqual", async () => {
    test("should diff for grouped incorrect order", async ({}) => {
      const arr1: QualityItem[] = [
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
              },
              allowed: true,
              items: [],
            },
            {
              quality: {
                id: 5,
                name: "WEBDL-720p",
                resolution: 720,
              },
              allowed: true,
              items: [],
            },
            {
              quality: {
                id: 6,
                name: "Bluray-720p",
                resolution: 720,
              },
              allowed: true,
              items: [],
            },
            {
              quality: {
                id: 3,
                name: "WEBDL-1080p",
                resolution: 1080,
              },
              allowed: true,
              items: [],
            },
            {
              quality: {
                id: 15,
                name: "WEBRip-1080p",
                resolution: 1080,
              },
              allowed: true,
              items: [],
            },
            {
              quality: {
                id: 7,
                name: "Bluray-1080p",
                resolution: 1080,
              },
              allowed: true,
              items: [],
            },
          ],
        },
      ];

      const arr2: QualityItem[] = [
        {
          name: "Merged QPs",
          items: [
            {
              quality: {
                id: 7,
                name: "Bluray-1080p",
                resolution: 1080,
              },
              items: [],
              allowed: true,
            },
            {
              quality: {
                id: 15,
                name: "WEBRip-1080p",
                resolution: 1080,
              },
              items: [],
              allowed: true,
            },
            {
              quality: {
                id: 3,
                name: "WEBDL-1080p",
                resolution: 1080,
              },
              items: [],
              allowed: true,
            },
            {
              quality: {
                id: 6,
                name: "Bluray-720p",
                resolution: 720,
              },
              items: [],
              allowed: true,
            },
            {
              quality: {
                id: 5,
                name: "WEBDL-720p",
                resolution: 720,
              },
              items: [],
              allowed: true,
            },
            {
              quality: {
                id: 14,
                name: "WEBRip-720p",
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
      const arr1: QualityItem[] = [
        {
          allowed: true,
          quality: {
            id: 14,
            name: "WEBRip-720p",
            resolution: 720,
          },
        },
        {
          allowed: true,
          quality: {
            id: 15,
            name: "WEBRip-1080p",
            resolution: 1080,
          },
        },
      ];

      const arr2: QualityItem[] = [
        {
          allowed: true,
          quality: {
            id: 15,
            name: "WEBRip-1080p",
            resolution: 1080,
          },
        },
        {
          allowed: true,
          quality: {
            id: 14,
            name: "WEBRip-720p",
            resolution: 720,
          },
        },
      ];

      expect(isOrderOfQualitiesEqual(arr1, arr2)).toBe(false);
    });

    test("should be equal 1", async ({}) => {
      const arr1: QualityItem[] = [
        {
          allowed: true,
          quality: {
            id: 14,
            name: "WEBRip-720p",
            resolution: 720,
          },
        },
      ];

      const arr2: QualityItem[] = [
        {
          allowed: true,
          quality: {
            id: 14,
            name: "WEBRip-720p",
            resolution: 720,
          },
        },
      ];

      expect(isOrderOfQualitiesEqual(arr1, arr2)).toBe(true);
    });

    test("should be equal 2", async ({}) => {
      const arr1: QualityItem[] = [
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
              },
              allowed: true,
              items: [],
            },
          ],
        },
      ];

      const arr2: QualityItem[] = [
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

  describe("checkForConflictingCFs", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    test("should warn when same quality profile contains 2 conflicting ids from one group", () => {
      const carrIdMapping = new Map([
        [
          "cf1-id",
          {
            carrConfig: {
              configarr_id: "cf1-id",
              name: "SDR",
            },
            requestConfig: {},
          },
        ],
        [
          "cf2-id",
          {
            carrConfig: {
              configarr_id: "cf2-id",
              name: "SDR (no WEBDL)",
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
        quality_profiles: [
          {
            name: "profile1",
            min_format_score: 0,
            qualities: [],
            quality_sort: "top",
            upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
            score_set: "default",
          },
        ],
        custom_formats: [
          {
            trash_ids: ["cf1-id", "cf2-id"],
            assign_scores_to: [{ name: "profile1" }],
          },
        ],
        customFormatDefinitions: [],
        media_management: {},
        media_naming: {},
      };

      const conflicts = [
        {
          trash_id: "sdr-conflict",
          name: "SDR Conflict",
          custom_formats: [
            { trash_id: "cf1-id", name: "SDR" },
            { trash_id: "cf2-id", name: "SDR (no WEBDL)" },
          ],
        },
      ];

      const logSpy = vi.spyOn(log.logger, "warn").mockImplementation(() => {});

      checkForConflictingCFs(cfMap, config, conflicts);

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("QualityProfile \'profile1\'"));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Conflicting CustomFormats detected [SDR, SDR (no WEBDL)]"));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("conflict group \'SDR Conflict\'"));
    });

    test("should not warn when conflicting ids are split across different quality profiles", () => {
      const carrIdMapping = new Map([
        [
          "cf1-id",
          {
            carrConfig: {
              configarr_id: "cf1-id",
              name: "SDR",
            },
            requestConfig: {},
          },
        ],
        [
          "cf2-id",
          {
            carrConfig: {
              configarr_id: "cf2-id",
              name: "SDR (no WEBDL)",
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
        quality_profiles: [
          {
            name: "profile1",
            min_format_score: 0,
            qualities: [],
            quality_sort: "top",
            upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
            score_set: "default",
          },
          {
            name: "profile2",
            min_format_score: 0,
            qualities: [],
            quality_sort: "top",
            upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
            score_set: "default",
          },
        ],
        custom_formats: [
          {
            trash_ids: ["cf1-id"],
            assign_scores_to: [{ name: "profile1" }],
          },
          {
            trash_ids: ["cf2-id"],
            assign_scores_to: [{ name: "profile2" }],
          },
        ],
        customFormatDefinitions: [],
        media_management: {},
        media_naming: {},
      };

      const conflicts = [
        {
          trash_id: "sdr-conflict",
          name: "SDR Conflict",
          custom_formats: [
            { trash_id: "cf1-id", name: "SDR" },
            { trash_id: "cf2-id", name: "SDR (no WEBDL)" },
          ],
        },
      ];

      const logSpy = vi.spyOn(log.logger, "warn").mockImplementation(() => {});

      checkForConflictingCFs(cfMap, config, conflicts);

      expect(logSpy).not.toHaveBeenCalled();
    });

    test("should not warn when only one id from group is selected", () => {
      const carrIdMapping = new Map([
        [
          "cf1-id",
          {
            carrConfig: {
              configarr_id: "cf1-id",
              name: "SDR",
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
        quality_profiles: [
          {
            name: "profile1",
            min_format_score: 0,
            qualities: [],
            quality_sort: "top",
            upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
            score_set: "default",
          },
        ],
        custom_formats: [
          {
            trash_ids: ["cf1-id"],
            assign_scores_to: [{ name: "profile1" }],
          },
        ],
        customFormatDefinitions: [],
        media_management: {},
        media_naming: {},
      };

      const conflicts = [
        {
          trash_id: "sdr-conflict",
          name: "SDR Conflict",
          custom_formats: [
            { trash_id: "cf1-id", name: "SDR" },
            { trash_id: "cf2-id", name: "SDR (no WEBDL)" },
          ],
        },
      ];

      const logSpy = vi.spyOn(log.logger, "warn").mockImplementation(() => {});

      checkForConflictingCFs(cfMap, config, conflicts);

      expect(logSpy).not.toHaveBeenCalled();
    });

    test("warning uses fallback name/id if lookup data incomplete", () => {
      const carrIdMapping = new Map(); // Empty - no name lookup
      const cfMap: CFProcessing = {
        carrIdMapping,
        cfNameToCarrConfig: new Map(),
      };

      const config: MergedConfigInstance = {
        quality_profiles: [
          {
            name: "profile1",
            min_format_score: 0,
            qualities: [],
            quality_sort: "top",
            upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
            score_set: "default",
          },
        ],
        custom_formats: [
          {
            trash_ids: ["cf1-id", "cf2-id"],
            assign_scores_to: [{ name: "profile1" }],
          },
        ],
        customFormatDefinitions: [],
        media_management: {},
        media_naming: {},
      };

      const conflicts = [
        {
          trash_id: "sdr-conflict",
          name: "SDR Conflict",
          custom_formats: [
            { trash_id: "cf1-id", name: "SDR Override" },
            { trash_id: "cf2-id", name: "SDR (no WEBDL)" },
          ],
        },
      ];

      const logSpy = vi.spyOn(log.logger, "warn").mockImplementation(() => {});

      checkForConflictingCFs(cfMap, config, conflicts);

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("[SDR Override, SDR (no WEBDL)]"));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("(ids: [cf1-id, cf2-id])"));
    });

    test("should return early if conflicts list is empty", () => {
      const carrIdMapping = new Map();
      const cfMap: CFProcessing = {
        carrIdMapping,
        cfNameToCarrConfig: new Map(),
      };

      const config: MergedConfigInstance = {
        quality_profiles: [
          {
            name: "profile1",
            min_format_score: 0,
            qualities: [],
            quality_sort: "top",
            upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
            score_set: "default",
          },
        ],
        custom_formats: [
          {
            trash_ids: ["cf1-id", "cf2-id"],
            assign_scores_to: [{ name: "profile1" }],
          },
        ],
        customFormatDefinitions: [],
        media_management: {},
        media_naming: {},
      };

      const logSpy = vi.spyOn(log.logger, "warn").mockImplementation(() => {});

      checkForConflictingCFs(cfMap, config, []);
      checkForConflictingCFs(cfMap, config, undefined as any);

      expect(logSpy).not.toHaveBeenCalled();
    });
  });

  test("qualityProfilesToDiffEntries - builds create and update entries with field changes", () => {
    const create = [{ name: "NewProfile" } as QualityProfileShared];
    const changedQPs = [{ name: "ExistingProfile" } as QualityProfileShared];
    const changes = new Map([["ExistingProfile", [{ field: "minFormatScore", from: 0, to: 10 }]]]);

    const entries = qualityProfilesToDiffEntries(create, changedQPs, changes);

    expect(entries).toEqual([
      { resourceType: "QualityProfile", name: "NewProfile", action: "create" },
      {
        resourceType: "QualityProfile",
        name: "ExistingProfile",
        action: "update",
        fieldChanges: [{ field: "minFormatScore", from: 0, to: 10 }],
      },
    ]);
  });
});
