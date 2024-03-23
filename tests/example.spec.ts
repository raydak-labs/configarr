import { expect, test } from "@playwright/test";
import {
  CustomFormatResource,
  PrivacyLevel,
} from "../src/__generated__/MySuperbApi";
import { TrashCF, TrashCFSpF } from "../src/types";
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
