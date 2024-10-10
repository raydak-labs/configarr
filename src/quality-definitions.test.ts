import { describe, expect, test } from "vitest";
import { MergedQualityDefinitionResource } from "./__generated__/mergedTypes";
import { calculateQualityDefinitionDiff } from "./quality-definitions";
import { TrashQualityDefintion } from "./types";

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

describe("QualityDefinitions", async () => {
  const server: MergedQualityDefinitionResource[] = [
    {
      quality: {
        id: 0,
        name: "Unknown",
        source: "unknown",
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
        source: "television",
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
