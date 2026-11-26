import { describe, expect, test } from "vitest";
import type { QualityProfileResource } from "../__generated__/readarr/data-contracts";
import { ServerCache } from "../cache";
import type { QualityProfilesClient } from "../clients/capabilities";
import type { CFProcessing } from "../customFormats/customFormat.types";
import type { QualityDefinitionShared } from "../qualityDefinitions/qualityDefinition.types";
import type { MergedConfigInstance } from "../types/config.types";
import type { QualityProfileShared } from "./qualityProfile.types";
import { QualityProfileReadarrSync } from "./qualityProfileReadarr";

/** calculateQualityProfilesDiff never touches the API; the client is only required by the type. */
const qpClient = {} as QualityProfilesClient<QualityProfileResource>;

const ebook = ["EPUB", "MOBI", "AZW3", "PDF", "E-Book"];
const audiobook = ["M4B", "MP3", "FLAC", "AAC"];
const definitions: QualityDefinitionShared[] = [...ebook, ...audiobook].map((name, index) => ({
  id: index + 1,
  title: name,
  quality: { id: index + 1, name },
}));

const serverProfile: QualityProfileShared = {
  name: "E-Book",
  upgradeAllowed: true,
  cutoff: 1,
  cutoffFormatScore: 0,
  minFormatScore: 0,
  // The API array is reverse display order.
  items: [...ebook].reverse().map((name) => ({
    allowed: true,
    items: [],
    quality: { id: definitions.find((definition) => definition.quality?.name === name)?.quality?.id, name },
  })),
  formatItems: [],
};

const config: MergedConfigInstance = {
  custom_formats: [],
  quality_profiles: [
    {
      name: "E-Book",
      min_format_score: 0,
      qualities: ebook.map((name) => ({ name })),
      quality_sort: "top",
      upgrade: { allowed: true, until_quality: "EPUB", until_score: 0 },
    },
  ],
  customFormatDefinitions: [],
  media_management: {},
  media_naming: {},
};

const cfMap: CFProcessing = { carrIdMapping: new Map(), cfNameToCarrConfig: new Map() };

describe("QualityProfileReadarrSync", () => {
  test("vanilla Readarr keeps the whole quality universe", async () => {
    const diff = await new QualityProfileReadarrSync(qpClient).calculateQualityProfilesDiff(
      cfMap,
      config,
      new ServerCache({ qualityDefinitions: definitions, qualityProfiles: [serverProfile] }),
    );

    expect(diff.changedQPs).toHaveLength(1);
  });

  test("scores a custom format missing from the server on an unmanaged profile (dry run)", async () => {
    const pendingCfMap = {
      carrIdMapping: new Map([["new-trash", { carrConfig: { configarr_id: "new-trash", name: "new-cf" }, requestConfig: {} }]]),
      cfNameToCarrConfig: new Map(),
    } satisfies CFProcessing;
    const unmanagedConfig = {
      ...config,
      quality_profiles: [],
      custom_formats: [{ trash_ids: ["new-trash"], assign_scores_to: [{ name: "E-Book", score: 50 }] }],
    } as unknown as MergedConfigInstance;

    const diff = await new QualityProfileReadarrSync(qpClient).calculateQualityProfilesDiff(
      pendingCfMap,
      unmanagedConfig,
      new ServerCache({ qualityDefinitions: definitions, qualityProfiles: [serverProfile], customFormats: [] }),
    );

    expect(diff.changedQPs).toHaveLength(1);
    expect(diff.changes.get("E-Book")).toEqual([{ field: "customFormats.new-cf", from: undefined, to: 50 }]);
  });
});
