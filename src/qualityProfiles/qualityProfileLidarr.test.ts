import { describe, expect, test } from "vitest";
import type { QualityProfileResource } from "../__generated__/lidarr/data-contracts";
import { ServerCache } from "../cache";
import type { QualityProfilesClient } from "../clients/capabilities";
import type { QualityDefinitionShared } from "../qualityDefinitions/qualityDefinition.types";
import type { QualityProfileShared } from "./qualityProfile.types";
import { QualityProfileLidarrSync } from "./qualityProfileLidarr";

/** calculateQualityProfilesDiff never touches the API; the client is only required by the type. */
const qpClient = {} as QualityProfilesClient<QualityProfileResource>;

import type { CFProcessing } from "../customFormats/customFormat.types";
import type { MergedConfigInstance } from "../types/config.types";

describe("QualityProfileLidarrSync", () => {
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

    const diff = await new QualityProfileLidarrSync(qpClient).calculateQualityProfilesDiff(
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

    const diff = await new QualityProfileLidarrSync(qpClient).calculateQualityProfilesDiff(
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
