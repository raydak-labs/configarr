import { describe, expect, test } from "vitest";
import { loadQPFromTrash, transformTrashQDs } from "./trash-guide";
import { TrashQualityDefintion } from "./types/trashguide.types";

describe("TrashGuide", async () => {
  test("loadQPFromTrash - normal", async ({}) => {
    const results = await loadQPFromTrash("RADARR");

    console.log(results.keys());
  });

  test("transformTrashQDs - diff preferred size with ratio", async ({}) => {
    const trashQualityDef = {
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

    const clone: TrashQualityDefintion = JSON.parse(JSON.stringify(trashQualityDef));

    const result = transformTrashQDs(clone, 0.5);

    expect(result[0]!.preferred).toBe(95);

    const resultLow = transformTrashQDs(clone, 0.0);
    expect(resultLow[0]!.preferred).toBe(2);

    const resultHigh = transformTrashQDs(clone, 1.0);
    expect(resultHigh[0]!.preferred).toBe(100);
  });

  test("transformTrashQDs - diff preferred size with ratio, ignore if out of range", async ({}) => {
    const trashQualityDef = {
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

    const clone: TrashQualityDefintion = JSON.parse(JSON.stringify(trashQualityDef));

    const resultLow = transformTrashQDs(clone, -0.5);
    expect(resultLow[0]!.preferred).toBe(95);

    const resultHigh = transformTrashQDs(clone, 1.5);
    expect(resultHigh[0]!.preferred).toBe(95);
  });
});
