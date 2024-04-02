import { describe, expect, test } from "vitest";
import { CustomFormatResource, PrivacyLevel, QualityDefinitionResource, QualitySource } from "./__generated__/generated-sonarr-api";
import { calculateQualityDefinitionDiff } from "./quality-definitions";
import { TrashCF, TrashCFSpF, TrashQualityDefintion } from "./types";
import { compareObjectsCarr, mapImportCfToRequestCf, toCarrCF } from "./util";

const exampleCFImplementations = {
  name: "TestSpec",
  includeCustomFormatWhenRenaming: false,
  specifications: [
    {
      name: "ReleaseTitleSpec",
      implementation: "ReleaseTitleSpecification",
      negate: false,
      required: false,
      fields: {
        value: "expres",
      },
    },
    {
      name: "LanguageUnknown",
      implementation: "LanguageSpecification",
      negate: false,
      required: false,
      fields: {
        value: 0,
      },
    },
    {
      name: "LanguageOrgi",
      implementation: "LanguageSpecification",
      negate: false,
      required: false,
      fields: {
        value: -2,
      },
    },
    {
      name: "IndexerFlag",
      implementation: "IndexerFlagSpecification",
      negate: false,
      required: false,
      fields: {
        value: 1,
      },
    },
    {
      name: "SourceSpec",
      implementation: "SourceSpecification",
      negate: false,
      required: false,
      fields: {
        value: 6,
      },
    },
    {
      name: "Resolution",
      implementation: "ResolutionSpecification",
      negate: false,
      required: false,
      fields: {
        value: 540,
      },
    },
    {
      name: "ReleaseGroup",
      implementation: "ReleaseGroupSpecification",
      negate: false,
      required: false,
      fields: {
        value: "regex",
      },
    },
  ],
};

describe("SizeSpecification", async () => {
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

    const result = compareObjectsCarr(serverResponse, mapImportCfToRequestCf(toCarrCF(copied)));
    expect(result.equal).toBe(true);
  });

  test("mismatch negate", async () => {
    const copied = JSON.parse(JSON.stringify(custom));
    copied.specifications![0].negate = true;

    const result = compareObjectsCarr(serverResponse, mapImportCfToRequestCf(toCarrCF(copied)));
    expect(result.equal).toBe(false);
  });

  test("mismatch required", async () => {
    const copied: typeof custom = JSON.parse(JSON.stringify(custom));
    copied.specifications![0].required = true;

    const result = compareObjectsCarr(serverResponse, mapImportCfToRequestCf(toCarrCF(copied)));
    expect(result.equal).toBe(false);
  });

  test("max differ", async () => {
    const copied: typeof custom = JSON.parse(JSON.stringify(custom));
    (copied.specifications![0].fields as TrashCFSpF).max = 100;

    const result = compareObjectsCarr(serverResponse, mapImportCfToRequestCf(toCarrCF(copied)));
    expect(result.equal).toBe(false);
  });
});

describe("QualityDefinitions", async () => {
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

  test("calculateQualityDefinitionDiff - no diff", async ({}) => {
    const result = calculateQualityDefinitionDiff(server, client);

    expect(result.changeMap.size).toBe(0);
    expect(result.create).toHaveLength(0);
  });

  test("calculateQualityDefinitionDiff - diff min size", async ({}) => {
    const clone: TrashQualityDefintion = JSON.parse(JSON.stringify(client));
    clone.qualities[0].min = 3;

    const result = calculateQualityDefinitionDiff(server, clone);

    expect(result.changeMap.size).toBe(1);
    expect(result.create).toHaveLength(0);
  });

  test("calculateQualityDefinitionDiff - diff max size", async ({}) => {
    const clone: TrashQualityDefintion = JSON.parse(JSON.stringify(client));
    clone.qualities[0].max = 3;

    const result = calculateQualityDefinitionDiff(server, clone);

    expect(result.changeMap.size).toBe(1);
    expect(result.create).toHaveLength(0);
  });

  test("calculateQualityDefinitionDiff - diff preferred size", async ({}) => {
    const clone: TrashQualityDefintion = JSON.parse(JSON.stringify(client));
    clone.qualities[0].preferred = 3;

    const result = calculateQualityDefinitionDiff(server, clone);

    expect(result.changeMap.size).toBe(1);
    expect(result.create).toHaveLength(0);
  });

  test("calculateQualityDefinitionDiff - create new element", async ({}) => {
    const clone: TrashQualityDefintion = JSON.parse(JSON.stringify(client));
    clone.qualities[0].quality = "New";

    const result = calculateQualityDefinitionDiff(server, clone);

    expect(result.changeMap.size).toBe(0);
    expect(result.create).toHaveLength(1);
  });
});
