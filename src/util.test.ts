import path from "path";
import { describe, expect, test } from "vitest";
import { CustomFormatResource as CustomFormatResourceRadarr, PrivacyLevel } from "./__generated__/generated-radarr-api";
import { CustomFormatResource } from "./__generated__/generated-sonarr-api";
import { TrashCF, TrashCFSpF } from "./types";
import { cloneWithJSON, compareObjectsCarr, loadJsonFile, mapImportCfToRequestCf, toCarrCF } from "./util";

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

describe("compareObjectsCarr - general", async () => {
  const filePath = path.resolve(__dirname, "../tests/samples/20240930_cf_exceptLanguage.json");
  const serverResponse = loadJsonFile<CustomFormatResourceRadarr>(filePath);

  const custom: TrashCF = {
    trash_id: "test123",
    name: "Language: Not German or English",
    includeCustomFormatWhenRenaming: false,
    specifications: [
      {
        name: "Not German",
        implementation: "LanguageSpecification",
        negate: true,
        required: true,
        fields: {
          value: 4,
        },
      },
    ],
  };

  test("should not diff for fields length bigger on remote", async () => {
    const copied: typeof custom = JSON.parse(JSON.stringify(custom));

    const result = compareObjectsCarr(serverResponse, mapImportCfToRequestCf(toCarrCF(copied)));
    expect(result.equal).toBe(true);
  });

  test("should not diff for fields length equal length", async () => {
    const copied: typeof custom = JSON.parse(JSON.stringify(custom));
    const clonedServer = cloneWithJSON(serverResponse);
    clonedServer.specifications![0].fields = [clonedServer.specifications![0].fields![0]];

    expect(clonedServer.specifications![0].fields.length).toBe(1);

    const result = compareObjectsCarr(clonedServer, mapImportCfToRequestCf(toCarrCF(copied)));
    expect(result.equal).toBe(true);
  });

  test("should diff for fields length if local is higher (should not happen normally)", async () => {
    const copied: typeof custom = JSON.parse(JSON.stringify(custom));
    copied.specifications![0].fields!.exceptLanguage = false;

    const clonedServer = cloneWithJSON(serverResponse);
    clonedServer.specifications![0].fields = [clonedServer.specifications![0].fields![0]];

    expect(clonedServer.specifications![0].fields.length).toBe(1);

    const result = compareObjectsCarr(clonedServer, mapImportCfToRequestCf(toCarrCF(copied)));
    expect(result.equal).toBe(false);
  });
});
