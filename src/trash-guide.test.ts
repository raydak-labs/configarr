import { describe, expect, test } from "vitest";
import { loadQPFromTrash, transformTrashCFGroups, transformTrashQDs } from "./trash-guide";
import { InputConfigCustomFormatGroup } from "./types/config.types";
import { TrashCFGroupMapping, TrashQualityDefinition } from "./types/trashguide.types";

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

    const clone: TrashQualityDefinition = JSON.parse(JSON.stringify(trashQualityDef));

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

    const clone: TrashQualityDefinition = JSON.parse(JSON.stringify(trashQualityDef));

    const resultLow = transformTrashQDs(clone, -0.5);
    expect(resultLow[0]!.preferred).toBe(95);

    const resultHigh = transformTrashQDs(clone, 1.5);
    expect(resultHigh[0]!.preferred).toBe(95);
  });

  test("transformTrashCFGroups - only include required cfs", async ({}) => {
    const mapping: TrashCFGroupMapping = new Map();
    mapping.set("id1", {
      name: "name1",
      trash_id: "id1",
      custom_formats: [
        { name: "cf1", trash_id: "cf1", required: true },
        { name: "cf2", trash_id: "cf2", required: false },
      ],
    });

    const groups: InputConfigCustomFormatGroup[] = [
      {
        trash_guide: [{ id: "id1" }],
        assign_scores_to: [{ name: "qp1" }],
      },
    ];

    const result = transformTrashCFGroups(mapping, groups);
    expect(result).toHaveLength(1);
    expect(result[0]!.trash_ids!).toHaveLength(1);
    expect(result[0]!.trash_ids![0]).toBe("cf1");
    expect(result[0]!.assign_scores_to[0]?.name).toBe("qp1");
  });

  test("transformTrashCFGroups - include all if attribute set", async ({}) => {
    const mapping: TrashCFGroupMapping = new Map();
    mapping.set("id1", {
      name: "name1",
      trash_id: "id1",
      custom_formats: [
        { name: "cf1", trash_id: "cf1", required: true },
        { name: "cf2", trash_id: "cf2", required: false },
      ],
    });

    const groups: InputConfigCustomFormatGroup[] = [
      {
        trash_guide: [{ id: "id1", include_unrequired: true }],
        assign_scores_to: [{ name: "qp1" }],
      },
    ];

    const result = transformTrashCFGroups(mapping, groups);

    expect(result).toHaveLength(1);
    expect(result[0]!.trash_ids!).toHaveLength(2);
    expect(result[0]!.assign_scores_to!).toHaveLength(1);
    expect(result[0]!.assign_scores_to[0]?.name).toBe("qp1");
  });

  test("transformTrashCFGroups - ignore if mapping missing", async ({}) => {
    const mapping: TrashCFGroupMapping = new Map();
    mapping.set("id2", {
      name: "name1",
      trash_id: "id1",
      custom_formats: [
        { name: "cf1", trash_id: "cf1", required: true },
        { name: "cf2", trash_id: "cf2", required: false },
      ],
    });

    const groups: InputConfigCustomFormatGroup[] = [
      {
        trash_guide: [{ id: "id1", include_unrequired: true }],
        assign_scores_to: [{ name: "qp1" }],
      },
    ];

    const result = transformTrashCFGroups(mapping, groups);

    expect(result).toHaveLength(0);
  });
});
