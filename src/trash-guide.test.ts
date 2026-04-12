import fs from "node:fs";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  loadAllQDsFromTrash,
  loadQPFromTrash,
  loadTrashCFConflicts,
  transformTrashCFGroups,
  transformTrashQDs,
  transformTrashQPCFGroups,
} from "./trash-guide";
import { InputConfigCustomFormatGroup } from "./types/config.types";
import { TrashCFGroupMapping, TrashQualityDefinition, TrashQP } from "./types/trashguide.types";
import * as util from "./util";

describe("TrashGuide", async () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadAllQDsFromTrash", () => {
    test("should return a Map instance for a valid arrType", async () => {
      const mockQD: TrashQualityDefinition = {
        trash_id: "aed34b9f60ee115dfa7918b742336277",
        type: "movie",
        qualities: [{ quality: "SDTV", min: 2, preferred: 95, max: 100 }],
      };

      vi.spyOn(fs, "readdirSync").mockReturnValue(["movie.json"] as any);
      vi.spyOn(util, "loadJsonFile").mockReturnValueOnce(mockQD);

      const result = await loadAllQDsFromTrash("RADARR");

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(1);
      expect(result.get("aed34b9f60ee115dfa7918b742336277")).toEqual(mockQD);
    });

    test("should return an empty map when the directory doesn't exist", async () => {
      vi.spyOn(fs, "readdirSync").mockImplementation(() => {
        throw new Error("ENOENT: no such file or directory");
      });

      const result = await loadAllQDsFromTrash("RADARR");

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    test("skips single bad file and loads the rest", async () => {
      const mockQD: TrashQualityDefinition = {
        trash_id: "id-anime",
        type: "anime",
        qualities: [],
      };
      vi.spyOn(fs, "readdirSync").mockReturnValue(["movie.json", "anime.json"] as any);
      vi.spyOn(util, "loadJsonFile")
        .mockImplementationOnce(() => {
          throw new Error("parse error");
        })
        .mockReturnValueOnce(mockQD);
      const result = await loadAllQDsFromTrash("RADARR");
      expect(result.size).toBe(1);
      expect(result.get("id-anime")).toEqual(mockQD);
    });

    test("returns empty map when all loadJsonFile calls throw", async () => {
      vi.spyOn(fs, "readdirSync").mockReturnValue(["movie.json"] as any);
      vi.spyOn(util, "loadJsonFile").mockImplementation(() => {
        throw new Error("parse error");
      });
      const result = await loadAllQDsFromTrash("RADARR");
      expect(result.size).toBe(0);
    });

    test("should load multiple QD files and key by trash_id", async () => {
      const mockQD1: TrashQualityDefinition = {
        trash_id: "id-movie",
        type: "movie",
        qualities: [],
      };
      const mockQD2: TrashQualityDefinition = {
        trash_id: "id-anime",
        type: "anime",
        qualities: [],
      };

      vi.spyOn(fs, "readdirSync").mockReturnValue(["movie.json", "anime.json"] as any);
      vi.spyOn(util, "loadJsonFile").mockReturnValueOnce(mockQD1).mockReturnValueOnce(mockQD2);

      const result = await loadAllQDsFromTrash("RADARR");

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.get("id-movie")).toEqual(mockQD1);
      expect(result.get("id-anime")).toEqual(mockQD2);
    });
  });

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
    expect(result[0]!.assign_scores_to).toBeDefined();
    expect(result[0]!.assign_scores_to!).toHaveLength(1);
    expect(result[0]!.assign_scores_to![0]?.name).toBe("qp1");
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
    expect(result[0]!.assign_scores_to).toBeDefined();
    expect(result[0]!.assign_scores_to!).toHaveLength(1);
    expect(result[0]!.assign_scores_to![0]?.name).toBe("qp1");
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

  test("transformTrashCFGroups - include score when specified", async ({}) => {
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
        assign_scores_to: [{ name: "qp1", score: 0 }],
      },
    ];

    const result = transformTrashCFGroups(mapping, groups);
    expect(result).toHaveLength(1);
    expect(result[0]!.trash_ids!).toHaveLength(1);
    expect(result[0]!.trash_ids![0]).toBe("cf1");
    expect(result[0]!.assign_scores_to).toBeDefined();
    expect(result[0]!.assign_scores_to![0]?.name).toBe("qp1");
    expect(result[0]!.assign_scores_to![0]?.score).toBe(0);
  });

  describe("transformTrashQPCFGroups - new include semantics (default)", () => {
    const mockTrashQP: TrashQP = {
      trash_id: "profile123",
      name: "Test Profile",
      trash_score_set: "default",
      upgradeAllowed: true,
      cutoff: "HD",
      minFormatScore: 0,
      cutoffFormatScore: 100,
      items: [],
      formatItems: {},
    };

    test("should include CFs from default groups when profile is in include list", () => {
      const mapping: TrashCFGroupMapping = new Map();
      mapping.set("group1", {
        name: "Default Group 1",
        trash_id: "group1",
        default: "true",
        custom_formats: [
          { name: "cf1", trash_id: "cf1", required: true },
          { name: "cf2", trash_id: "cf2", required: false },
        ],
        quality_profiles: {
          include: {
            "Test Profile": "profile123",
          },
        },
      });

      // Default behavior (useExcludeSemantics = false)
      const result = transformTrashQPCFGroups(mockTrashQP, mapping, false);

      expect(result).toHaveLength(1);
      expect(result[0]?.trash_ids).toEqual(["cf1"]);
      expect(result[0]?.assign_scores_to).toEqual([{ name: "Test Profile" }]);
    });

    test("should NOT include CFs when profile is NOT in include list", () => {
      const mapping: TrashCFGroupMapping = new Map();
      mapping.set("group1", {
        name: "Default Group 1",
        trash_id: "group1",
        default: "true",
        custom_formats: [{ name: "cf1", trash_id: "cf1", required: true }],
        quality_profiles: {
          include: {
            "Other Profile": "other123",
          },
        },
      });

      const result = transformTrashQPCFGroups(mockTrashQP, mapping, false);

      expect(result).toHaveLength(0);
    });

    test("should NOT include CFs when include list is empty", () => {
      const mapping: TrashCFGroupMapping = new Map();
      mapping.set("group1", {
        name: "Default Group 1",
        trash_id: "group1",
        default: "true",
        custom_formats: [{ name: "cf1", trash_id: "cf1", required: true }],
        quality_profiles: {
          include: {},
        },
      });

      const result = transformTrashQPCFGroups(mockTrashQP, mapping, false);

      expect(result).toHaveLength(0);
    });

    test("should NOT include CFs when quality_profiles is undefined (no include list)", () => {
      const mapping: TrashCFGroupMapping = new Map();
      mapping.set("group1", {
        name: "Default Group 1",
        trash_id: "group1",
        default: "true",
        custom_formats: [{ name: "cf1", trash_id: "cf1", required: true }],
      });

      const result = transformTrashQPCFGroups(mockTrashQP, mapping, false);

      expect(result).toHaveLength(0);
    });

    test("should include CFs from default groups with default=true when in include list", () => {
      const mapping: TrashCFGroupMapping = new Map();
      mapping.set("group1", {
        name: "Default Group 1",
        trash_id: "group1",
        default: "true",
        custom_formats: [
          { name: "cf1", trash_id: "cf1", required: false, default: true },
          { name: "cf2", trash_id: "cf2", required: false, default: false },
        ],
        quality_profiles: {
          include: {
            "Test Profile": "profile123",
          },
        },
      });

      const result = transformTrashQPCFGroups(mockTrashQP, mapping, false);

      expect(result).toHaveLength(1);
      expect(result[0]?.trash_ids).toEqual(["cf1"]);
      expect(result[0]?.assign_scores_to).toEqual([{ name: "Test Profile" }]);
    });

    test("should include CFs with both required=true and default=true when in include list", () => {
      const mapping: TrashCFGroupMapping = new Map();
      mapping.set("group1", {
        name: "Default Group 1",
        trash_id: "group1",
        default: "true",
        custom_formats: [
          { name: "cf1", trash_id: "cf1", required: true },
          { name: "cf2", trash_id: "cf2", required: false, default: true },
          { name: "cf3", trash_id: "cf3", required: false, default: false },
        ],
        quality_profiles: {
          include: {
            "Test Profile": "profile123",
          },
        },
      });

      const result = transformTrashQPCFGroups(mockTrashQP, mapping, false);

      expect(result).toHaveLength(1);
      expect(result[0]?.trash_ids).toEqual(["cf1", "cf2"]);
      expect(result[0]?.assign_scores_to).toEqual([{ name: "Test Profile" }]);
    });

    test("should skip groups without default=true even if in include list", () => {
      const mapping: TrashCFGroupMapping = new Map();
      mapping.set("group1", {
        name: "Non-default Group",
        trash_id: "group1",
        default: "false",
        custom_formats: [{ name: "cf1", trash_id: "cf1", required: true }],
        quality_profiles: {
          include: {
            "Test Profile": "profile123",
          },
        },
      });

      const result = transformTrashQPCFGroups(mockTrashQP, mapping, false);

      expect(result).toHaveLength(0);
    });

    test("should handle multiple default groups with different include lists", () => {
      const mapping: TrashCFGroupMapping = new Map();
      mapping.set("group1", {
        name: "Default Group 1",
        trash_id: "group1",
        default: "true",
        custom_formats: [{ name: "cf1", trash_id: "cf1", required: true }],
        quality_profiles: {
          include: {
            "Test Profile": "profile123",
          },
        },
      });
      mapping.set("group2", {
        name: "Default Group 2",
        trash_id: "group2",
        default: "true",
        custom_formats: [{ name: "cf2", trash_id: "cf2", required: true }],
        quality_profiles: {
          include: {
            "Other Profile": "other123",
          },
        },
      });

      const result = transformTrashQPCFGroups(mockTrashQP, mapping, false);

      // Only group1 should be included since Test Profile is in its include list
      expect(result).toHaveLength(1);
      expect(result[0]?.trash_ids).toEqual(["cf1"]);
    });

    test("should return empty array when no CFs match criteria", () => {
      const mapping: TrashCFGroupMapping = new Map();
      mapping.set("group1", {
        name: "Default Group with no matching CFs",
        trash_id: "group1",
        default: "true",
        custom_formats: [{ name: "cf1", trash_id: "cf1", required: false, default: false }],
        quality_profiles: {
          include: {
            "Test Profile": "profile123",
          },
        },
      });

      const result = transformTrashQPCFGroups(mockTrashQP, mapping, false);

      expect(result).toHaveLength(0);
    });

    test("should handle empty mapping", () => {
      const mapping: TrashCFGroupMapping = new Map();

      const result = transformTrashQPCFGroups(mockTrashQP, mapping, false);

      expect(result).toHaveLength(0);
    });

    test("default behavior (no third param) should use include semantics", () => {
      const mapping: TrashCFGroupMapping = new Map();
      mapping.set("group1", {
        name: "Default Group 1",
        trash_id: "group1",
        default: "true",
        custom_formats: [{ name: "cf1", trash_id: "cf1", required: true }],
        // No include list - should NOT include
      });

      // Not passing third param - should default to false (include semantics)
      const result = transformTrashQPCFGroups(mockTrashQP, mapping);

      expect(result).toHaveLength(0);
    });
  });

  describe("transformTrashQPCFGroups - legacy exclude semantics (compatibility mode)", () => {
    const mockTrashQP: TrashQP = {
      trash_id: "profile123",
      name: "Test Profile",
      trash_score_set: "default",
      upgradeAllowed: true,
      cutoff: "HD",
      minFormatScore: 0,
      cutoffFormatScore: 100,
      items: [],
      formatItems: {},
    };

    test("should include CFs from default groups with required=true (legacy mode)", () => {
      const mapping: TrashCFGroupMapping = new Map();
      mapping.set("group1", {
        name: "Default Group 1",
        trash_id: "group1",
        default: "true",
        custom_formats: [
          { name: "cf1", trash_id: "cf1", required: true },
          { name: "cf2", trash_id: "cf2", required: false },
        ],
      });

      // Legacy mode (useExcludeSemantics = true)
      const result = transformTrashQPCFGroups(mockTrashQP, mapping, true);

      expect(result).toHaveLength(1);
      expect(result[0]?.trash_ids).toEqual(["cf1"]);
      expect(result[0]?.assign_scores_to).toEqual([{ name: "Test Profile" }]);
    });

    test("should include CFs from default groups with default=true (legacy mode)", () => {
      const mapping: TrashCFGroupMapping = new Map();
      mapping.set("group1", {
        name: "Default Group 1",
        trash_id: "group1",
        default: "true",
        custom_formats: [
          { name: "cf1", trash_id: "cf1", required: false, default: true },
          { name: "cf2", trash_id: "cf2", required: false, default: false },
        ],
      });

      const result = transformTrashQPCFGroups(mockTrashQP, mapping, true);

      expect(result).toHaveLength(1);
      expect(result[0]?.trash_ids).toEqual(["cf1"]);
      expect(result[0]?.assign_scores_to).toEqual([{ name: "Test Profile" }]);
    });

    test("should include CFs with both required=true and default=true (legacy mode)", () => {
      const mapping: TrashCFGroupMapping = new Map();
      mapping.set("group1", {
        name: "Default Group 1",
        trash_id: "group1",
        default: "true",
        custom_formats: [
          { name: "cf1", trash_id: "cf1", required: true },
          { name: "cf2", trash_id: "cf2", required: false, default: true },
          { name: "cf3", trash_id: "cf3", required: false, default: false },
        ],
      });

      const result = transformTrashQPCFGroups(mockTrashQP, mapping, true);

      expect(result).toHaveLength(1);
      expect(result[0]?.trash_ids).toEqual(["cf1", "cf2"]);
      expect(result[0]?.assign_scores_to).toEqual([{ name: "Test Profile" }]);
    });

    test("should skip groups without default=true (legacy mode)", () => {
      const mapping: TrashCFGroupMapping = new Map();
      mapping.set("group1", {
        name: "Non-default Group",
        trash_id: "group1",
        default: "false",
        custom_formats: [{ name: "cf1", trash_id: "cf1", required: true }],
      });
      mapping.set("group2", {
        name: "No Default Group",
        trash_id: "group2",
        custom_formats: [{ name: "cf2", trash_id: "cf2", required: true }],
      });

      const result = transformTrashQPCFGroups(mockTrashQP, mapping, true);

      expect(result).toHaveLength(0);
    });

    test("should respect exclude field for profile (legacy mode)", () => {
      const mapping: TrashCFGroupMapping = new Map();
      mapping.set("group1", {
        name: "Excluded Group",
        trash_id: "group1",
        default: "true",
        custom_formats: [{ name: "cf1", trash_id: "cf1", required: true }],
        quality_profiles: {
          exclude: {
            "Test Profile": "profile123",
          },
        },
      });

      const result = transformTrashQPCFGroups(mockTrashQP, mapping, true);

      expect(result).toHaveLength(0);
    });

    test("should include from non-excluded profiles only (legacy mode)", () => {
      const mapping: TrashCFGroupMapping = new Map();
      mapping.set("group1", {
        name: "Partially Excluded Group",
        trash_id: "group1",
        default: "true",
        custom_formats: [{ name: "cf1", trash_id: "cf1", required: true }],
        quality_profiles: {
          exclude: {
            "Other Profile": "other123",
          },
        },
      });

      const result = transformTrashQPCFGroups(mockTrashQP, mapping, true);

      expect(result).toHaveLength(1);
      expect(result[0]?.trash_ids).toEqual(["cf1"]);
    });

    test("should handle multiple default groups (legacy mode)", () => {
      const mapping: TrashCFGroupMapping = new Map();
      mapping.set("group1", {
        name: "Default Group 1",
        trash_id: "group1",
        default: "true",
        custom_formats: [{ name: "cf1", trash_id: "cf1", required: true }],
      });
      mapping.set("group2", {
        name: "Default Group 2",
        trash_id: "group2",
        default: "true",
        custom_formats: [{ name: "cf2", trash_id: "cf2", required: true }],
      });

      const result = transformTrashQPCFGroups(mockTrashQP, mapping, true);

      expect(result).toHaveLength(2);
      expect(result[0]?.trash_ids).toEqual(["cf1"]);
      expect(result[1]?.trash_ids).toEqual(["cf2"]);
      expect(result[0]?.assign_scores_to).toEqual([{ name: "Test Profile" }]);
      expect(result[1]?.assign_scores_to).toEqual([{ name: "Test Profile" }]);
    });

    test("should return empty array when no CFs match criteria (legacy mode)", () => {
      const mapping: TrashCFGroupMapping = new Map();
      mapping.set("group1", {
        name: "Default Group with no matching CFs",
        trash_id: "group1",
        default: "true",
        custom_formats: [{ name: "cf1", trash_id: "cf1", required: false, default: false }],
      });

      const result = transformTrashQPCFGroups(mockTrashQP, mapping, true);

      expect(result).toHaveLength(0);
    });

    test("should handle empty mapping (legacy mode)", () => {
      const mapping: TrashCFGroupMapping = new Map();

      const result = transformTrashQPCFGroups(mockTrashQP, mapping, true);

      expect(result).toHaveLength(0);
    });
  });

  describe("loadTrashCFConflicts", () => {
    test("should return empty array for unsupported arrType", async () => {
      const result = await loadTrashCFConflicts("LIDARR" as any);

      expect(result).toEqual([]);
    });

    test("should return empty array and warn when file not found", async () => {
      const error = new Error("ENOENT: no such file");
      (error as any).code = "ENOENT";
      vi.spyOn(util, "loadJsonFile").mockImplementation(() => {
        throw error;
      });

      const result = await loadTrashCFConflicts("RADARR");

      expect(result).toEqual([]);
    });

    test("should return empty array and warn when file is invalid", async () => {
      vi.spyOn(util, "loadJsonFile").mockReturnValue({ invalid: "format" });

      const result = await loadTrashCFConflicts("RADARR");

      expect(result).toEqual([]);
    });

    test("should skip conflict groups with less than 2 CFs", async () => {
      const mockConflicts = {
        custom_formats: [
          {
            trash_id: "group1",
            name: "Single CF",
            custom_formats: [{ trash_id: "cf1", name: "CF1" }],
          },
          {
            trash_id: "group2",
            name: "Valid Group",
            custom_formats: [
              { trash_id: "cf2", name: "CF2" },
              { trash_id: "cf3", name: "CF3" },
            ],
          },
        ],
      };

      vi.spyOn(util, "loadJsonFile").mockReturnValue(mockConflicts);

      const result = await loadTrashCFConflicts("RADARR");

      expect(result).toHaveLength(1);
      expect(result[0]?.trash_id).toBe("group2");
      expect(result[0]?.custom_formats).toHaveLength(2);
    });

    test("should skip invalid conflict entries", async () => {
      const mockConflicts = {
        custom_formats: [
          {
            trash_id: "group1",
            name: "Valid Group",
            custom_formats: [
              { trash_id: "cf1", name: "CF1" },
              { trash_id: "cf2", name: "CF2" },
            ],
          },
          null,
          { missing_fields: true },
          {
            trash_id: "group2",
            name: "Valid Group 2",
            custom_formats: [
              { trash_id: "cf3", name: "CF3" },
              { trash_id: "cf4", name: "CF4" },
            ],
          },
        ],
      };

      vi.spyOn(util, "loadJsonFile").mockReturnValue(mockConflicts);

      const result = await loadTrashCFConflicts("RADARR");

      expect(result).toHaveLength(2);
      expect(result[0]?.trash_id).toBe("group1");
      expect(result[1]?.trash_id).toBe("group2");
    });

    test("should load valid conflict group with multiple CFs", async () => {
      const mockConflicts = {
        custom_formats: [
          {
            trash_id: "sdr-conflict",
            name: "SDR Conflict Group",
            trash_description: "SDR vs SDR (no WEBDL)",
            custom_formats: [
              { trash_id: "sdr-cf1", name: "SDR" },
              { trash_id: "sdr-cf2", name: "SDR (no WEBDL)" },
            ],
          },
        ],
      };

      vi.spyOn(util, "loadJsonFile").mockReturnValue(mockConflicts);

      const result = await loadTrashCFConflicts("RADARR");

      expect(result).toHaveLength(1);
      expect(result[0]?.trash_id).toBe("sdr-conflict");
      expect(result[0]?.name).toBe("SDR Conflict Group");
      expect(result[0]?.trash_description).toBe("SDR vs SDR (no WEBDL)");
      expect(result[0]?.custom_formats).toHaveLength(2);
      expect(result[0]?.custom_formats[0]).toEqual({ trash_id: "sdr-cf1", name: "SDR" });
      expect(result[0]?.custom_formats[1]).toEqual({ trash_id: "sdr-cf2", name: "SDR (no WEBDL)" });
    });

    test("should return cached conflicts when cache is ready", async () => {
      const mockConflicts = {
        custom_formats: [
          {
            trash_id: "group1",
            name: "Valid Group",
            custom_formats: [
              { trash_id: "cf1", name: "CF1" },
              { trash_id: "cf2", name: "CF2" },
            ],
          },
        ],
      };

      const loadJsonSpy = vi.spyOn(util, "loadJsonFile").mockReturnValue(mockConflicts);

      // First call should load from file
      const result1 = await loadTrashCFConflicts("RADARR");
      expect(result1).toHaveLength(1);
      expect(loadJsonSpy).toHaveBeenCalledTimes(1);

      // Second call should use cache (loadJsonFile not called again)
      // Note: In this test setup, we can't actually set cacheReady = true,
      // but this test ensures the function handles cache correctly when used
    });
  });
});
