import { describe, expect, test } from "vitest";
import { QualityDefinitionShared } from "../qualityDefinitions/qualityDefinition.types";
import { QualityProfileShared } from "./qualityProfile.types";
import { ServerCache } from "../cache";
import { QualityProfileLidarrSync } from "./qualityProfileLidarr";
import { CFProcessing } from "../customFormats/customFormat.types";
import { MergedConfigInstance } from "../types/config.types";

describe("QualityProfileLidarrSync", async () => {
  test("calculateQualityProfilesDiff - Lidarr create omits language and minUpgradeFormatScore", async () => {
    const cfMap: CFProcessing = { carrIdMapping: new Map(), cfNameToCarrConfig: new Map() };
    const resources: QualityDefinitionShared[] = [{ id: 1, title: "FLAC", quality: { id: 1, name: "FLAC" } }];
    const config: MergedConfigInstance = {
      custom_formats: [],
      quality_profiles: [
        {
          name: "Music",
          min_format_score: 0,
          qualities: [{ name: "FLAC" }],
          quality_sort: "top",
          language: "English",
          upgrade: { allowed: true, until_quality: "FLAC", until_score: 100, min_format_score: 5 },
          score_set: "default",
        },
      ],
      customFormatDefinitions: [],
      media_management: {},
      media_naming: {},
    };

    const diff = await new QualityProfileLidarrSync().calculateQualityProfilesDiff(
      cfMap,
      config,
      new ServerCache({ qualityDefinitions: resources }),
    );
    expect(diff.create).toHaveLength(1);
    expect(diff.create[0]).not.toHaveProperty("language");
    expect(diff.create[0]).not.toHaveProperty("minUpgradeFormatScore");
  });

  test("calculateQualityProfilesDiff - Lidarr does not dirty-diff language or minUpgradeFormatScore", async () => {
    const cfMap: CFProcessing = { carrIdMapping: new Map(), cfNameToCarrConfig: new Map() };
    const resources: QualityDefinitionShared[] = [{ id: 1, title: "FLAC", quality: { id: 1, name: "FLAC" } }];
    const serverProfile: QualityProfileShared = {
      name: "Music",
      upgradeAllowed: true,
      cutoff: 1,
      cutoffFormatScore: 100,
      minFormatScore: 0,
      items: [{ allowed: true, items: [], quality: { id: 1, name: "FLAC" } }],
      formatItems: [],
    };
    const config: MergedConfigInstance = {
      custom_formats: [],
      quality_profiles: [
        {
          name: "Music",
          min_format_score: 0,
          qualities: [{ name: "FLAC" }],
          quality_sort: "top",
          language: "English",
          upgrade: { allowed: true, until_quality: "FLAC", until_score: 100, min_format_score: 5 },
          score_set: "default",
        },
      ],
      customFormatDefinitions: [],
      media_management: {},
      media_naming: {},
    };

    const diff = await new QualityProfileLidarrSync().calculateQualityProfilesDiff(
      cfMap,
      config,
      new ServerCache({
        qualityDefinitions: resources,
        qualityProfiles: [serverProfile],
        languages: [{ id: 1, name: "English" }],
      }),
    );
    expect(diff.changedQPs).toHaveLength(0);
    expect(diff.noChanges).toEqual(["Music"]);
  });
});
