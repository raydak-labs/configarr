import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ServerCache } from "../cache";
import * as log from "../logger";
import { QualityDefinitionShared } from "../qualityDefinitions/qualityDefinition.types";
import { QualityItem, QualityProfileShared } from "./qualityProfile.types";
import {
  checkForConflictingCFs,
  filterInvalidQualityProfiles,
  isOrderOfConfigQualitiesEqual,
  isOrderOfQualitiesEqual,
  mapQualities,
  mapQualityProfiles,
  qualityProfilesToDiffEntries,
} from "./qualityProfileBase";
import { QualityProfileRadarrSync } from "./qualityProfileRadarr";
import type { QualityProfileResource } from "../__generated__/radarr/data-contracts";
import type { QualityProfilesClient } from "../clients/capabilities";

/** calculateQualityProfilesDiff never touches the API; the client is only required by the type. */
const qpClient = {} as QualityProfilesClient<QualityProfileResource>;
import { CFProcessing } from "../customFormats/customFormat.types";
import { ConfigQualityProfile, ConfigQualityProfileItem, MergedConfigInstance } from "../types/config.types";
import { ConfigValidationError } from "../validation";
import * as env from "../env";
import type { FieldChange } from "../diffReport/diffReport.types";

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

  test("mapQualities classifies unknown configured qualities as configuration errors", async () => {
    const profile: ConfigQualityProfile = {
      name: "HD",
      min_format_score: 0,
      qualities: [{ name: "Unknown Quality" }],
      quality_sort: "top",
      upgrade: { allowed: false },
      score_set: "default",
    };

    expect(() => mapQualities([], profile)).toThrow(ConfigValidationError);
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

  describe("mapQualities - group identity", () => {
    const resources: QualityDefinitionShared[] = [
      { id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } },
      { id: 2, title: "WEBDL-1080p", weight: 2, quality: { id: 2, name: "WEBDL-1080p" } },
      { id: 3, title: "WEBDL-720p", weight: 2, quality: { id: 3, name: "WEBDL-720p" } },
    ];

    const profileWith = (qualities: ConfigQualityProfileItem[]): ConfigQualityProfile => ({
      name: "Standard",
      min_format_score: 0,
      qualities,
      quality_sort: "top",
      upgrade: { allowed: false, until_quality: "HD Group", until_score: 0 },
      score_set: "default",
    });

    test("reuses the existing server id by name instead of the config index", async ({}) => {
      const profile = profileWith([
        { name: "WEB 720p", qualities: ["WEBDL-720p"] },
        { name: "HD Group", qualities: ["HDTV-1080p", "WEBDL-1080p"] },
      ]);

      // server has the groups in the opposite order and with ids that do not match 1000 + index
      const existing: QualityItem[] = [
        { id: 1005, name: "HD Group", allowed: true, items: [] },
        { id: 1002, name: "WEB 720p", allowed: true, items: [] },
      ];

      const result = mapQualities(resources, profile, existing);
      // mapQualities reverses the configured order (quality_sort: top)
      const idsByName = new Map(result.map((item) => [item.name, item.id]));

      expect(idsByName.get("WEB 720p")).toBe(1002);
      expect(idsByName.get("HD Group")).toBe(1005);
    });

    test("allocates a fresh id without colliding with a reused one", async ({}) => {
      const profile = profileWith([
        { name: "New Group", qualities: ["HDTV-1080p"] },
        { name: "HD Group", qualities: ["WEBDL-1080p"] },
      ]);

      const existing: QualityItem[] = [{ id: 1000, name: "HD Group", allowed: true, items: [] }];

      const result = mapQualities(resources, profile, existing);
      const idsByName = new Map(result.map((item) => [item.name, item.id]));

      // "New Group" sits at index 0, but 1000 is already taken by the reused id, so it shifts to 1001
      expect(idsByName.get("New Group")).toBe(1001);
      expect(idsByName.get("HD Group")).toBe(1000);
    });

    test("honours an explicit id from the config", async ({}) => {
      const profile = profileWith([{ name: "HD Group", id: 2001, qualities: ["HDTV-1080p"] }]);

      const existing: QualityItem[] = [{ id: 1005, name: "HD Group", allowed: true, items: [] }];

      const result = mapQualities(resources, profile, existing);

      expect(result.find((item) => item.name === "HD Group")?.id).toBe(2001);
    });

    test("rejects an id on a plain quality", async ({}) => {
      const profile = profileWith([{ name: "HDTV-1080p", id: 1001 }]);

      expect(() => mapQualities(resources, profile)).toThrow(ConfigValidationError);
      expect(() => mapQualities(resources, profile)).toThrow(/only supported for quality groups/);
    });

    test("rejects duplicate group ids", async ({}) => {
      const profile = profileWith([
        { name: "HD Group", id: 1001, qualities: ["HDTV-1080p"] },
        { name: "WEB Group", id: 1001, qualities: ["WEBDL-720p"] },
      ]);

      expect(() => mapQualities(resources, profile)).toThrow(/quality group id 1001 is used by both/);
    });

    test("lets an explicit id win over a server id reused by an earlier group", async ({}) => {
      const profile = profileWith([
        { name: "A", qualities: ["HDTV-1080p"] },
        { name: "B", id: 1000, qualities: ["WEBDL-1080p"] },
      ]);

      // The server currently uses 1000 for "A", so a one-pass resolution would reserve it there
      // and then reject B's explicit id.
      const existing: QualityItem[] = [
        { id: 1000, name: "A", allowed: true, items: [] },
        { id: 1001, name: "B", allowed: true, items: [] },
      ];

      const result = mapQualities(resources, profile, existing);
      const idsByName = new Map(result.map((item) => [item.name, item.id]));

      expect(idsByName.get("B")).toBe(1000);
      expect(idsByName.get("A")).toBe(1001);
      const groupIds = result.filter((item) => item.name != null).map((item) => item.id);
      expect(new Set(groupIds)).toEqual(new Set([1000, 1001]));
    });

    test("rejects a group id below the *arr group range at runtime", async ({}) => {
      const profile = profileWith([{ name: "HD Group", id: 5, qualities: ["HDTV-1080p"] }]);

      expect(() => mapQualities(resources, profile)).toThrow(/id must be an integer >= 1000/);
    });

    test("rejects a non-integer group id at runtime", async ({}) => {
      const profile = profileWith([{ name: "HD Group", id: 1000.5, qualities: ["HDTV-1080p"] }]);

      expect(() => mapQualities(resources, profile)).toThrow(/id must be an integer >= 1000/);
    });

    test("rejects a non-numeric group id from lenient validation at runtime", async ({}) => {
      // Lenient validation returns the raw config, so a string can reach the mapper even though the
      // schema types it as a number.
      const profile = profileWith([{ name: "HD Group", id: "1000" as unknown as number, qualities: ["HDTV-1080p"] }]);

      expect(() => mapQualities(resources, profile)).toThrow(/id must be an integer >= 1000/);
    });

    test("rejects a group name defined twice", async ({}) => {
      const profile = profileWith([
        { name: "HD Group", id: 1001, qualities: ["HDTV-1080p"] },
        { name: "HD Group", id: 1002, qualities: ["WEBDL-1080p"] },
      ]);

      expect(() => mapQualities(resources, profile)).toThrow(/quality group 'HD Group' is defined more than once/);
    });
  });

  describe("mapQualities - undeclared qualities", () => {
    const resources: QualityDefinitionShared[] = [
      { id: 9, title: "Unknown", weight: 1, quality: { id: 9, name: "Unknown" } },
      { id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } },
      { id: 8, title: "OGG", weight: 1, quality: { id: 8, name: "OGG" } },
      { id: 2, title: "WEBDL-1080p", weight: 2, quality: { id: 2, name: "WEBDL-1080p" } },
      { id: 4, title: "MP3-320", weight: 1, quality: { id: 4, name: "MP3-320" } },
      { id: 5, title: "MP3-256", weight: 1, quality: { id: 5, name: "MP3-256" } },
      { id: 3, title: "WAV", weight: 1, quality: { id: 3, name: "WAV" } },
    ];

    const profile: ConfigQualityProfile = {
      name: "Standard",
      min_format_score: 0,
      qualities: [
        { name: "HD", qualities: ["HDTV-1080p", "WEBDL-1080p"] },
        { name: "Low", qualities: ["MP3-320", "MP3-256"] },
      ],
      quality_sort: "top",
      upgrade: { allowed: false, until_quality: "Low", until_score: 0 },
      score_set: "default",
    };

    const serverItems: QualityItem[] = [
      { allowed: false, items: [], quality: { id: 9, name: "Unknown" } },
      {
        allowed: true,
        id: 1002,
        name: "Low",
        items: [
          { allowed: true, items: [], quality: { id: 5, name: "MP3-256" } },
          { allowed: true, items: [], quality: { id: 4, name: "MP3-320" } },
        ],
      },
      { allowed: false, items: [], quality: { id: 8, name: "OGG" } },
      {
        allowed: true,
        id: 1005,
        name: "HD",
        items: [
          { allowed: true, items: [], quality: { id: 2, name: "WEBDL-1080p" } },
          { allowed: true, items: [], quality: { id: 1, name: "HDTV-1080p" } },
        ],
      },
      { allowed: false, items: [], quality: { id: 3, name: "WAV" } },
    ];

    const namesOf = (items: QualityItem[]) => items.map((item) => item.name ?? item.quality?.name);

    test("keeps undeclared qualities at their server position", () => {
      const result = mapQualities(resources, profile, serverItems);

      expect(namesOf(result)).toEqual(["Unknown", "Low", "OGG", "HD", "WAV"]);
      expect(result[1]!.id).toBe(1002);
      expect(result[3]!.id).toBe(1005);
    });

    test("still places new qualities at the top when the server does not have them", () => {
      const withoutOgg = serverItems.filter((item) => item.quality?.name !== "OGG");

      const result = mapQualities(resources, profile, withoutOgg);

      expect(namesOf(result)).toEqual(["Unknown", "OGG", "Low", "HD", "WAV"]);
    });

    test("orders undeclared qualities by their server position, not by the definitions order", () => {
      const definitions: QualityDefinitionShared[] = [
        { id: 1, title: "A", weight: 1, quality: { id: 1, name: "A" } },
        { id: 2, title: "B", weight: 1, quality: { id: 2, name: "B" } },
        { id: 3, title: "D", weight: 1, quality: { id: 3, name: "D" } },
      ];
      const onlyD: ConfigQualityProfile = {
        name: "Standard",
        min_format_score: 0,
        qualities: [{ name: "D" }],
        quality_sort: "top",
        upgrade: { allowed: false, until_quality: "D", until_score: 0 },
        score_set: "default",
      };
      const server: QualityItem[] = [
        { allowed: true, items: [], quality: { id: 3, name: "D" } },
        { allowed: false, items: [], quality: { id: 2, name: "B" } },
        { allowed: false, items: [], quality: { id: 1, name: "A" } },
      ];

      expect(namesOf(mapQualities(definitions, onlyD, server))).toEqual(["D", "B", "A"]);
    });
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

    test("should diff when a group id differs", async ({}) => {
      const group = (id: number): QualityItem => ({
        allowed: true,
        id,
        name: "Merged QPs",
        items: [{ quality: { id: 14, name: "WEBRip-720p", resolution: 720 }, allowed: true, items: [] }],
      });

      expect(isOrderOfQualitiesEqual([group(1000)], [group(1005)])).toBe(false);
      expect(isOrderOfQualitiesEqual([group(1000)], [group(1000)])).toBe(true);
    });

    test("should diff when nested items are missing on one side", async ({}) => {
      const arr1: QualityItem[] = [
        {
          allowed: true,
          id: 1000,
          name: "Merged QPs",
          items: [{ quality: { id: 14, name: "WEBRip-720p", resolution: 720 }, allowed: true, items: [] }],
        },
      ];
      const arr2: QualityItem[] = [{ allowed: true, id: 1000, name: "Merged QPs", items: [] }];

      expect(isOrderOfQualitiesEqual(arr1, arr2)).toBe(false);
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

  describe("mapQualityProfiles - unknown custom format ids", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    const config: MergedConfigInstance = {
      custom_formats: [{ trash_ids: ["nope"], assign_scores_to: [{ name: "HD" }] }],
      quality_profiles: [
        {
          name: "HD",
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
    const cfMap: CFProcessing = { carrIdMapping: new Map(), cfNameToCarrConfig: new Map() };

    test("skips unknown ids when enforcement is off", () => {
      expect(mapQualityProfiles(cfMap, config).size).toBe(0);
    });

    test("throws when enforcement is on", () => {
      vi.spyOn(env, "getEnvs").mockReturnValue({ CONFIGARR_ENFORCE_CONFIG_VALIDATION: true } as ReturnType<typeof env.getEnvs>);
      expect(() => mapQualityProfiles(cfMap, config)).toThrow(ConfigValidationError);
      expect(() => mapQualityProfiles(cfMap, config)).toThrow("Unknown ID for CF. nope");
    });
  });

  describe("filterInvalidQualityProfiles", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    test("drops profiles missing name, qualities, or upgrade", () => {
      expect(
        filterInvalidQualityProfiles([
          {
            min_format_score: 0,
            qualities: [{ name: "HDTV-1080p" }],
            quality_sort: "top",
            upgrade: { allowed: false },
            score_set: "default",
          } as ConfigQualityProfile,
          {
            name: "NoQualities",
            min_format_score: 0,
            quality_sort: "top",
            upgrade: { allowed: false },
            score_set: "default",
          } as ConfigQualityProfile,
          {
            name: "NoUpgrade",
            min_format_score: 0,
            qualities: [{ name: "HDTV-1080p" }],
            quality_sort: "top",
            score_set: "default",
          } as ConfigQualityProfile,
        ]),
      ).toEqual([]);
    });

    test("throws when enforcement is on", () => {
      vi.spyOn(env, "getEnvs").mockReturnValue({ CONFIGARR_ENFORCE_CONFIG_VALIDATION: true } as ReturnType<typeof env.getEnvs>);
      expect(() =>
        filterInvalidQualityProfiles([
          {
            name: "NoQualities",
            min_format_score: 0,
            quality_sort: "top",
            upgrade: { allowed: false },
            score_set: "default",
          } as ConfigQualityProfile,
        ]),
      ).toThrow(ConfigValidationError);
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

  test("creates independent format items for each new profile without changing cached formats", async () => {
    const formats = [
      { id: 1, name: "Scored", specifications: [{ name: "rule" }] },
      { id: 2, name: "Unscored" },
      { id: 3, name: "Scored" },
    ];
    const cache = new ServerCache({
      customFormats: formats,
      qualityDefinitions: [{ id: 1, title: "HD", weight: 1, quality: { id: 1, name: "HD" } }],
    });
    const cfMap: CFProcessing = {
      carrIdMapping: new Map([["scored", { carrConfig: { configarr_id: "scored", name: "Scored" }, requestConfig: {} }]]),
      cfNameToCarrConfig: new Map(),
    };
    const config: MergedConfigInstance = {
      custom_formats: [{ trash_ids: ["scored"], assign_scores_to: [{ name: "First", score: 42 }] }],
      quality_profiles: ["First", "Second"].map((name) => ({
        name,
        min_format_score: 0,
        qualities: [{ name: "HD" }],
        quality_sort: "top" as const,
        upgrade: { allowed: true, until_quality: "HD", until_score: 100 },
        score_set: "default",
      })),
      customFormatDefinitions: [],
      media_management: {},
      media_naming: {},
    };
    const before = structuredClone(formats);
    const { create } = await new QualityProfileRadarrSync(qpClient).calculateQualityProfilesDiff(cfMap, config, cache);

    expect(create[0]?.formatItems).toEqual([
      { name: "Scored", format: 3, score: 42 },
      { name: "Unscored", format: 2, score: 0 },
    ]);
    expect(create[1]?.formatItems).toEqual([
      { name: "Scored", format: 3, score: 0 },
      { name: "Unscored", format: 2, score: 0 },
    ]);
    expect(create[0]?.formatItems).not.toBe(create[1]?.formatItems);
    expect(cache.customFormats).toEqual(before);
  });

  test("calculateQualityProfilesDiff - create throws when until_quality is missing on the server", async () => {
    const cfMap: CFProcessing = { carrIdMapping: new Map(), cfNameToCarrConfig: new Map() };
    const resources: QualityDefinitionShared[] = [{ id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } }];
    const config: MergedConfigInstance = {
      custom_formats: [],
      quality_profiles: [
        {
          name: "New Profile",
          min_format_score: 0,
          qualities: [{ name: "HDTV-1080p" }],
          quality_sort: "top",
          upgrade: { allowed: true, until_quality: "DoesNotExist", until_score: 1000 },
          score_set: "default",
        },
      ],
      customFormatDefinitions: [],
      media_management: {},
      media_naming: {},
    };

    await expect(
      new QualityProfileRadarrSync(qpClient).calculateQualityProfilesDiff(
        cfMap,
        config,
        new ServerCache({ qualityDefinitions: resources }),
      ),
    ).rejects.toThrow(ConfigValidationError);
    await expect(
      new QualityProfileRadarrSync(qpClient).calculateQualityProfilesDiff(
        cfMap,
        config,
        new ServerCache({ qualityDefinitions: resources }),
      ),
    ).rejects.toThrow("QualityProfile 'New Profile': configured upgrade.until_quality 'DoesNotExist' was not found on the server");
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

  describe("calculateQualityProfilesDiff - group ids", () => {
    const quality = (name: string, id: number): QualityItem => ({ quality: { id, name }, allowed: true, items: [] });

    const serverProfile = (items: QualityItem[], cutoff: number): QualityProfileShared => ({
      id: 3,
      name: "Standard",
      upgradeAllowed: false,
      cutoff,
      cutoffFormatScore: 0,
      minFormatScore: 0,
      minUpgradeFormatScore: 1,
      formatItems: [],
      items,
    });

    const cacheWith = (profile: QualityProfileShared) =>
      new ServerCache({
        customFormats: [],
        qualityDefinitions: [
          { id: 1, title: "HDTV-1080p", weight: 1, quality: { id: 1, name: "HDTV-1080p" } },
          { id: 2, title: "WEBDL-1080p", weight: 1, quality: { id: 2, name: "WEBDL-1080p" } },
        ],
        qualityProfiles: [profile],
      });

    const config: MergedConfigInstance = {
      custom_formats: [],
      quality_profiles: [
        {
          name: "Standard",
          min_format_score: 0,
          // reversed by mapQualities, so this maps to the server order [WEBDL-1080p, HDTV-1080p]
          qualities: [{ name: "HD Group", qualities: ["HDTV-1080p", "WEBDL-1080p"] }],
          quality_sort: "top",
          upgrade: { allowed: false, until_quality: "HD Group", until_score: 0 },
          score_set: "default",
        },
      ],
      customFormatDefinitions: [],
      media_management: {},
      media_naming: {},
    };

    const cfMap: CFProcessing = { carrIdMapping: new Map(), cfNameToCarrConfig: new Map() };
    const sync = new QualityProfileRadarrSync(qpClient);

    test("does not renumber a group whose server id is not 1000", async () => {
      const cache = cacheWith(
        serverProfile([{ id: 1005, name: "HD Group", allowed: true, items: [quality("WEBDL-1080p", 2), quality("HDTV-1080p", 1)] }], 1005),
      );

      const result = await sync.calculateQualityProfilesDiff(cfMap, config, cache);

      expect(result.changedQPs).toEqual([]);
      expect(result.noChanges).toEqual(["Standard"]);
    });

    test("keeps stable group ids across a reorder and is idempotent on the next run", async () => {
      // server order is [HD Group, WEB Group]; the config lists the opposite display order
      const before = serverProfile(
        [
          { id: 1002, name: "HD Group", allowed: true, items: [quality("WEBDL-1080p", 2)] },
          { id: 1005, name: "WEB Group", allowed: true, items: [quality("HDTV-1080p", 1)] },
        ],
        1002,
      );
      const reordered: MergedConfigInstance = {
        ...config,
        quality_profiles: [
          {
            ...config.quality_profiles[0]!,
            qualities: [
              { name: "HD Group", qualities: ["WEBDL-1080p"] },
              { name: "WEB Group", qualities: ["HDTV-1080p"] },
            ],
          },
        ],
      };

      const first = await sync.calculateQualityProfilesDiff(cfMap, reordered, cacheWith(before));

      expect(first.changedQPs).toHaveLength(1);
      // mapQualities reverses the configured order, and ids follow the names, not the config index
      expect(first.changedQPs[0]!.items!.map((item) => item.id)).toEqual([1005, 1002]);
      expect(first.changedQPs[0]!.cutoff).toBe(1002);

      const second = await sync.calculateQualityProfilesDiff(cfMap, reordered, cacheWith(first.changedQPs[0]!));

      expect(second.changedQPs).toEqual([]);
      expect(second.noChanges).toEqual(["Standard"]);
    });

    test("preserves the server cutoff when until_quality is omitted and upgrades are disabled", async () => {
      // WEB is the server cutoff; omitting until_quality must not move it to the first config entry.
      const before = {
        ...serverProfile(
          [
            { id: 1001, name: "WEB Group", allowed: true, items: [quality("WEBDL-1080p", 2)] },
            { id: 1000, name: "HD Group", allowed: true, items: [quality("HDTV-1080p", 1)] },
          ],
          1001,
        ),
        cutoffFormatScore: 4,
      };
      const noUntil: MergedConfigInstance = {
        ...config,
        quality_profiles: [
          {
            ...config.quality_profiles[0]!,
            qualities: [
              { name: "HD Group", qualities: ["HDTV-1080p"] },
              { name: "WEB Group", qualities: ["WEBDL-1080p"] },
            ],
            upgrade: { allowed: false },
          },
        ],
      };

      const result = await sync.calculateQualityProfilesDiff(cfMap, noUntil, cacheWith(before));

      expect(result.changedQPs).toEqual([]);
      expect(result.noChanges).toEqual(["Standard"]);
    });

    test("moves a preserved cutoff onto the remapped group id", async () => {
      // Server: A=1000, B=1001, cutoff points at A. Config pins B to 1000, so A is renumbered.
      const before = {
        ...serverProfile(
          [
            { id: 1001, name: "B", allowed: true, items: [quality("WEBDL-1080p", 2)] },
            { id: 1000, name: "A", allowed: true, items: [quality("HDTV-1080p", 1)] },
          ],
          1000,
        ),
        cutoffFormatScore: 4,
      };
      const remapped: MergedConfigInstance = {
        ...config,
        quality_profiles: [
          {
            ...config.quality_profiles[0]!,
            qualities: [
              { name: "A", qualities: ["HDTV-1080p"] },
              { name: "B", id: 1000, qualities: ["WEBDL-1080p"] },
            ],
            upgrade: { allowed: false },
          },
        ],
      };

      const result = await sync.calculateQualityProfilesDiff(cfMap, remapped, cacheWith(before));

      expect(result.changedQPs).toHaveLength(1);
      const updated = result.changedQPs[0]!;
      const idsByName = new Map(updated.items!.map((item) => [item.name, item.id]));

      expect(idsByName.get("B")).toBe(1000);
      expect(idsByName.get("A")).toBe(1001);
      // The cutoff still points at A, not at the group that took over id 1000.
      expect(updated.cutoff).toBe(1001);
      expect(updated.cutoffFormatScore).toBe(4);
    });
  });

  describe("calculateQualityProfilesDiff - undeclared qualities", () => {
    const plain = (name: string, id: number, allowed = false): QualityItem => ({ allowed, items: [], quality: { id, name } });

    const definitions: QualityDefinitionShared[] = [
      { id: 9, title: "Unknown", weight: 1, quality: { id: 9, name: "Unknown" } },
      { id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } },
      { id: 8, title: "OGG", weight: 1, quality: { id: 8, name: "OGG" } },
      { id: 2, title: "WEBDL-1080p", weight: 2, quality: { id: 2, name: "WEBDL-1080p" } },
      { id: 4, title: "MP3-320", weight: 1, quality: { id: 4, name: "MP3-320" } },
      { id: 5, title: "MP3-256", weight: 1, quality: { id: 5, name: "MP3-256" } },
      { id: 3, title: "WAV", weight: 1, quality: { id: 3, name: "WAV" } },
    ];

    const server: QualityProfileShared = {
      id: 7,
      name: "Standard",
      upgradeAllowed: false,
      cutoff: 1002,
      cutoffFormatScore: 0,
      minFormatScore: 0,
      minUpgradeFormatScore: 1,
      formatItems: [],
      items: [
        plain("Unknown", 9),
        { allowed: true, id: 1002, name: "Low", items: [plain("MP3-256", 5, true), plain("MP3-320", 4, true)] },
        plain("OGG", 8),
        { allowed: true, id: 1005, name: "HD", items: [plain("WEBDL-1080p", 2, true), plain("HDTV-1080p", 1, true)] },
        plain("WAV", 3),
      ],
    };

    const config = (until_score: number): MergedConfigInstance => ({
      custom_formats: [],
      quality_profiles: [
        {
          name: "Standard",
          min_format_score: 0,
          qualities: [
            { name: "HD", qualities: ["HDTV-1080p", "WEBDL-1080p"] },
            { name: "Low", qualities: ["MP3-320", "MP3-256"] },
          ],
          quality_sort: "top",
          upgrade: { allowed: false, until_quality: "Low", until_score },
          score_set: "default",
        },
      ],
      customFormatDefinitions: [],
      media_management: {},
      media_naming: {},
    });

    const cfMap: CFProcessing = { carrIdMapping: new Map(), cfNameToCarrConfig: new Map() };
    const sync = new QualityProfileRadarrSync(qpClient);

    test("is idempotent when the server has qualities the config does not declare", async () => {
      const cache = new ServerCache({ customFormats: [], qualityDefinitions: definitions, qualityProfiles: [server] });

      const result = await sync.calculateQualityProfilesDiff(cfMap, config(0), cache);

      expect(result.changedQPs).toEqual([]);
      expect(result.noChanges).toEqual(["Standard"]);
    });

    test("preserves an enabled undeclared server cutoff when the item order is unchanged", async () => {
      // The config declares only HDTV, so mapped items mark WEBDL as disabled. The order still
      // matches the server, so `updatedServerObject` keeps the server items and WEBDL stays
      // enabled there. The cutoff must stay on WEBDL instead of falling back to HDTV.
      const resources: QualityDefinitionShared[] = [
        { id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } },
        { id: 2, title: "WEBDL-1080p", weight: 2, quality: { id: 2, name: "WEBDL-1080p" } },
      ];
      const serverProfile: QualityProfileShared = {
        id: 7,
        name: "Standard",
        upgradeAllowed: false,
        cutoff: 2,
        cutoffFormatScore: 3,
        minFormatScore: 0,
        minUpgradeFormatScore: 1,
        formatItems: [],
        items: [plain("WEBDL-1080p", 2, true), plain("HDTV-1080p", 1, true)],
      };
      const onlyHdtv: MergedConfigInstance = {
        ...config(0),
        quality_profiles: [
          {
            ...config(0).quality_profiles[0]!,
            qualities: [{ name: "HDTV-1080p" }],
            upgrade: { allowed: false },
          },
        ],
      };

      const result = await sync.calculateQualityProfilesDiff(
        cfMap,
        onlyHdtv,
        new ServerCache({ customFormats: [], qualityDefinitions: resources, qualityProfiles: [serverProfile] }),
      );

      expect(result.changedQPs).toEqual([]);
      expect(result.noChanges).toEqual(["Standard"]);
    });

    test("uses until_score as cutoffFormatScore on create when upgrades are disabled", async () => {
      const cache = new ServerCache({ customFormats: [], qualityDefinitions: definitions });

      const result = await sync.calculateQualityProfilesDiff(cfMap, config(7), cache);

      expect(result.create).toHaveLength(1);
      expect(result.create[0]!.cutoffFormatScore).toBe(7);
    });
  });

  describe("BaseQualityProfileSync.persist", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    const createApi = () => ({
      getQualityProfiles: vi.fn(),
      createQualityProfile: vi.fn(),
      updateQualityProfile: vi.fn(),
      deleteQualityProfile: vi.fn(),
    });

    const diff = () => ({
      create: [
        { id: 1, name: "Created-1" },
        { id: 2, name: "Created-2" },
      ] as QualityProfileShared[],
      changedQPs: [{ id: 10, name: "Changed-1" }] as QualityProfileShared[],
      noChanges: ["Unchanged-1"],
      changes: new Map<string, FieldChange[]>(),
    });

    test("does not touch the server when write is false", async () => {
      const api = createApi();
      vi.spyOn(log.logger, "info").mockImplementation(() => {});

      await new QualityProfileRadarrSync(api as any).persist(diff(), false);

      expect(api.createQualityProfile).not.toHaveBeenCalled();
      expect(api.updateQualityProfile).not.toHaveBeenCalled();
    });

    test("creates every profile in the create list and updates every changed profile by id", async () => {
      const api = createApi();
      api.createQualityProfile.mockImplementation(async (profile: QualityProfileShared) => ({ ...profile, id: 99 }));
      api.updateQualityProfile.mockImplementation(async (_id: string, profile: QualityProfileShared) => ({ ...profile, id: 99 }));
      const infoSpy = vi.spyOn(log.logger, "info").mockImplementation(() => {});
      const result = diff();

      await new QualityProfileRadarrSync(api as any).persist(result, true);

      expect(api.createQualityProfile).toHaveBeenCalledTimes(2);
      expect(api.createQualityProfile).toHaveBeenNthCalledWith(1, result.create[0]);
      expect(api.createQualityProfile).toHaveBeenNthCalledWith(2, result.create[1]);
      expect(api.updateQualityProfile).toHaveBeenCalledTimes(1);
      expect(api.updateQualityProfile).toHaveBeenCalledWith("10", result.changedQPs[0]);
      expect(infoSpy).toHaveBeenCalledWith("Created QualityProfile: Created-1");
      expect(infoSpy).toHaveBeenCalledWith("Updated QualityProfile: Changed-1");
      // unchanged profiles are never sent to the server
      expect(api.updateQualityProfile).not.toHaveBeenCalledWith("Unchanged-1", expect.anything());
    });

    test("logs and rethrows create failures without continuing to the updates", async () => {
      const api = createApi();
      api.createQualityProfile.mockRejectedValue(new Error("500 from server"));
      const errorSpy = vi.spyOn(log.logger, "error").mockImplementation(() => {});

      await expect(new QualityProfileRadarrSync(api as any).persist(diff(), true)).rejects.toThrow("500 from server");

      expect(errorSpy).toHaveBeenCalledWith("Failed creating QualityProfile (Created-1)");
      expect(api.updateQualityProfile).not.toHaveBeenCalled();
    });

    test("logs and rethrows update failures", async () => {
      const api = createApi();
      api.createQualityProfile.mockImplementation(async (profile: QualityProfileShared) => profile);
      api.updateQualityProfile.mockRejectedValue(new Error("500 from server"));
      const errorSpy = vi.spyOn(log.logger, "error").mockImplementation(() => {});

      await expect(new QualityProfileRadarrSync(api as any).persist(diff(), true)).rejects.toThrow("500 from server");

      expect(errorSpy).toHaveBeenCalledWith("Failed updating QualityProfile (Changed-1)");
    });
  });
});
