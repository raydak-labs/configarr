import { expect, test } from "@playwright/test";
import {
  CustomFormatResource,
  PrivacyLevel,
  QualityDefinitionResource,
  QualitySource,
} from "../src/__generated__/MySuperbApi";
import {
  calculateQualityDefinitionDiff,
  loadQualityDefinitionFromSonarr,
} from "../src/qualityDefinition";
import { TrashCF, TrashCFSpF, TrashQualityDefintion } from "../src/types";
import { carrCfToValidCf, compareObjectsCarr, toCarrCF } from "../src/util";

test.describe("SizeSpecification", async () => {
  const serverResponse: CustomFormatResource = {
    id: 103,
    name: "Size: Block More 40GB",
    includeCustomFormatWhenRenaming: false,
    specifications: [
      {
        name: "Size",
        implementation: "SizeSpecification",
        implementationName: "Size",
        infoLink: "https://wiki.servarr.com/sonarr/settings#custom-formats-2",
        negate: false,
        required: false,
        fields: [
          {
            order: 0,
            name: "min",
            label: "Minimum Size",
            unit: "GB",
            helpText: "Release must be greater than this size",
            value: 1,
            type: "number",
            advanced: false,
            privacy: PrivacyLevel.Normal,
            isFloat: true,
          },
          {
            order: 1,
            name: "max",
            label: "Maximum Size",
            unit: "GB",
            helpText: "Release must be less than or equal to this size",
            value: 9,
            type: "number",
            advanced: false,
            privacy: PrivacyLevel.Normal,
            isFloat: true,
          },
        ],
      },
    ],
  };

  const custom: TrashCF = {
    trash_id: "custom-size-more-40gb",
    trash_scores: {
      default: -10000,
    },
    trash_description: "Size: Block sizes over 40GB",
    name: "Size: Block More 40GB",
    includeCustomFormatWhenRenaming: false,
    specifications: [
      {
        name: "Size",
        implementation: "SizeSpecification",
        negate: false,
        required: false,
        fields: {
          min: 1,
          max: 9,
        },
      },
    ],
  };

  test("equal", async () => {
    const copied: typeof custom = JSON.parse(JSON.stringify(custom));

    const result = compareObjectsCarr(
      serverResponse,
      carrCfToValidCf(toCarrCF(copied))
    );
    await expect(result.equal).toBe(true);
  });

  test("mismatch negate", async () => {
    const copied = JSON.parse(JSON.stringify(custom));
    copied.specifications![0].negate = true;

    const result = compareObjectsCarr(
      serverResponse,
      carrCfToValidCf(toCarrCF(copied))
    );
    await expect(result.equal).toBe(false);
  });

  test("mismatch required", async () => {
    const copied: typeof custom = JSON.parse(JSON.stringify(custom));
    copied.specifications![0].required = true;

    const result = compareObjectsCarr(
      serverResponse,
      carrCfToValidCf(toCarrCF(copied))
    );
    await expect(result.equal).toBe(false);
  });

  test("max differ", async () => {
    const copied: typeof custom = JSON.parse(JSON.stringify(custom));
    (copied.specifications![0].fields as TrashCFSpF).max = 100;

    const result = compareObjectsCarr(
      serverResponse,
      carrCfToValidCf(toCarrCF(copied))
    );
    await expect(result.equal).toBe(false);
  });
});

test.describe("QualityDefinitions", async () => {
  const server: QualityDefinitionResource[] = [
    {
      quality: {
        id: 0,
        name: "Unknown",
        source: QualitySource.Unknown,
        resolution: 0,
      },
      title: "Unknown",
      weight: 1,
      minSize: 1,
      maxSize: 199.9,
      preferredSize: 194.9,
      id: 1,
    },
    {
      quality: {
        id: 1,
        name: "SDTV",
        source: QualitySource.Television,
        resolution: 480,
      },
      title: "SDTV",
      weight: 2,
      minSize: 2,
      maxSize: 100,
      preferredSize: 95,
      id: 2,
    },
  ];

  const client = {
    trash_id: "aed34b9f60ee115dfa7918b742336277",
    type: "movie",
    qualities: [
      {
        quality: "SDTV",
        min: 2,
        preferred: 95,
        max: 100,
      },
    ],
  };
  test("test import", async ({}) => {
    const result = await loadQualityDefinitionFromSonarr();

    console.log(result);
  });

  test("calculateQualityDefinitionDiff - no diff", async ({}) => {
    const result = await calculateQualityDefinitionDiff(server, client);

    expect(result.changeMap.size).toBe(0);
    expect(result.create).toHaveLength(0);
  });

  test("calculateQualityDefinitionDiff - diff min size", async ({}) => {
    const clone: TrashQualityDefintion = JSON.parse(JSON.stringify(client));
    clone.qualities[0].min = 3;

    const result = await calculateQualityDefinitionDiff(server, clone);

    expect(result.changeMap.size).toBe(1);
    expect(result.create).toHaveLength(0);
  });

  test("calculateQualityDefinitionDiff - diff max size", async ({}) => {
    const clone: TrashQualityDefintion = JSON.parse(JSON.stringify(client));
    clone.qualities[0].max = 3;

    const result = await calculateQualityDefinitionDiff(server, clone);

    expect(result.changeMap.size).toBe(1);
    expect(result.create).toHaveLength(0);
  });

  test("calculateQualityDefinitionDiff - diff preferred size", async ({}) => {
    const clone: TrashQualityDefintion = JSON.parse(JSON.stringify(client));
    clone.qualities[0].preferred = 3;

    const result = await calculateQualityDefinitionDiff(server, clone);

    expect(result.changeMap.size).toBe(1);
    expect(result.create).toHaveLength(0);
  });

  test("calculateQualityDefinitionDiff - create new element", async ({}) => {
    const clone: TrashQualityDefintion = JSON.parse(JSON.stringify(client));
    clone.qualities[0].quality = "New";

    const result = await calculateQualityDefinitionDiff(server, clone);

    expect(result.changeMap.size).toBe(0);
    expect(result.create).toHaveLength(1);
  });
});
