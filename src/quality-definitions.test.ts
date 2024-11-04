import { describe, expect, test } from "vitest";
import { MergedQualityDefinitionResource } from "./__generated__/mergedTypes";
import { calculateQualityDefinitionDiff, interpolateSize } from "./quality-definitions";
import { TrashQualityDefintion } from "./types/trashguide.types";

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
    clone.qualities[0]!.min = 3;

    const result = calculateQualityDefinitionDiff(server, clone);

    expect(result.changeMap.size).toBe(1);
    expect(result.create).toHaveLength(0);
  });

  test("calculateQualityDefinitionDiff - diff max size", async ({}) => {
    const clone: TrashQualityDefintion = JSON.parse(JSON.stringify(client));
    clone.qualities[0]!.max = 3;

    const result = calculateQualityDefinitionDiff(server, clone);

    expect(result.changeMap.size).toBe(1);
    expect(result.create).toHaveLength(0);
  });

  test("calculateQualityDefinitionDiff - diff preferred size", async ({}) => {
    const clone: TrashQualityDefintion = JSON.parse(JSON.stringify(client));
    clone.qualities[0]!.preferred = 3;

    const result = calculateQualityDefinitionDiff(server, clone);

    expect(result.changeMap.size).toBe(1);
    expect(result.create).toHaveLength(0);
  });

  test("calculateQualityDefinitionDiff - create new element", async ({}) => {
    const clone: TrashQualityDefintion = JSON.parse(JSON.stringify(client));
    clone.qualities[0]!.quality = "New";

    const result = calculateQualityDefinitionDiff(server, clone);

    expect(result.changeMap.size).toBe(0);
    expect(result.create).toHaveLength(1);
  });

  test("calculateQualityDefinitionDiff - diff preferred size with ratio", async ({}) => {
    const clone: TrashQualityDefintion = JSON.parse(JSON.stringify(client));

    const result = calculateQualityDefinitionDiff(server, clone, 0.5);
    expect(result.changeMap.size).toBe(0);
    expect(result.create).toHaveLength(0);

    const resultLow = calculateQualityDefinitionDiff(server, clone, 0.0);
    console.log(resultLow);
    expect(resultLow.changeMap.size).toBe(1);
    expect(resultLow.create).toHaveLength(0);

    const resultHigh = calculateQualityDefinitionDiff(server, clone, 1.0);
    console.log(resultHigh);
    expect(resultHigh.changeMap.size).toBe(1);
    expect(resultHigh.create).toHaveLength(0);
  });

  test("calculateQualityDefinitionDiff - diff preferred size with ratio, ignore if out of range", async ({}) => {
    const clone: TrashQualityDefintion = JSON.parse(JSON.stringify(client));

    const result = calculateQualityDefinitionDiff(server, clone, -0.5);
    expect(result.changeMap.size).toBe(0);
    expect(result.create).toHaveLength(0);

    const resultLow = calculateQualityDefinitionDiff(server, clone, 1.5);
    expect(resultLow.changeMap.size).toBe(0);
    expect(resultLow.create).toHaveLength(0);
  });

  test("interpolateSize - expected values", async ({}) => {
    expect(interpolateSize(0, 100, 50, 0.5)).toBe(50);
    expect(interpolateSize(0, 100, 50, 0.0)).toBe(0);
    expect(interpolateSize(0, 100, 50, 1.0)).toBe(100);
    expect(interpolateSize(0, 100, 50, 0.25)).toBe(25);

    expect(interpolateSize(2, 100, 95, 0.5)).toBe(95);
    expect(interpolateSize(2, 100, 95, 0.0)).toBe(2);
    expect(interpolateSize(2, 100, 95, 1.0)).toBe(100);
  });

  test("interpolateSize - should fail", async ({}) => {
    expect(() => interpolateSize(0, 100, 50, -0.5)).toThrowError();
    expect(() => interpolateSize(0, 100, 50, 1.1)).toThrowError();
  });
});
