import { describe, expect, test, vi } from "vitest";
import { QualityDefinitionShared } from "./qualityDefinition.types";
import {
  interpolateSize,
  qualityDefinitionsToDiffEntries,
  QualityDefinitionPreferredSync,
  QualityDefinitionSync,
} from "./qualityDefinition";
import { TrashQualityDefinition, TrashQualityDefinitionQuality } from "../types/trashguide.types";
import * as env from "../env";
import { ConfigValidationError } from "../validation";
import type { QualityDefinitionsClient } from "../clients/capabilities";

const createApi = () => ({
  getQualityDefinitions: vi.fn(),
  updateQualityDefinitions: vi.fn(),
});

const createSync = () => {
  const api = createApi();
  return {
    api,
    sync: new QualityDefinitionSync<QualityDefinitionShared>(api as unknown as QualityDefinitionsClient<QualityDefinitionShared>),
  };
};

describe("QualityDefinitions", async () => {
  const server: QualityDefinitionShared[] = [
    {
      quality: {
        id: 0,
        name: "Unknown",
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

  const api = {
    getQualityDefinitions: vi.fn(),
    updateQualityDefinitions: vi.fn(),
  } satisfies QualityDefinitionsClient<QualityDefinitionShared>;

  const preferredSync = new QualityDefinitionPreferredSync(api);
  const plainSync = new QualityDefinitionSync(api);

  test("QualityDefinitionPreferredSync.calculateDiff - expect restData to always contain all server QDs", async ({}) => {
    const result = preferredSync.calculateDiff(server, client.qualities);

    expect(result.restData.length).toBe(2);
  });

  test("QualityDefinitionPreferredSync.calculateDiff - no diff", async ({}) => {
    const result = preferredSync.calculateDiff(server, client.qualities);

    expect(result.changeMap.size).toBe(0);
  });

  test("QualityDefinitionPreferredSync.calculateDiff - diff min size", async ({}) => {
    const clone: TrashQualityDefinition = JSON.parse(JSON.stringify(client));
    clone.qualities[0]!.min = 3;

    const result = preferredSync.calculateDiff(server, clone.qualities);

    expect(result.changeMap.size).toBe(1);
  });

  test("QualityDefinitionPreferredSync.calculateDiff - diff max size", async ({}) => {
    const clone: TrashQualityDefinition = JSON.parse(JSON.stringify(client));
    clone.qualities[0]!.max = 3;

    const result = preferredSync.calculateDiff(server, clone.qualities);

    expect(result.changeMap.size).toBe(1);
  });

  test("QualityDefinitionPreferredSync.calculateDiff - diff preferred size", async ({}) => {
    const clone: TrashQualityDefinition = JSON.parse(JSON.stringify(client));
    clone.qualities[0]!.preferred = 3;

    const result = preferredSync.calculateDiff(server, clone.qualities);

    expect(result.changeMap.size).toBe(1);
  });

  test("QualityDefinitionPreferredSync.calculateDiff - ignore not available qualities on server", async ({}) => {
    const clone: TrashQualityDefinition = JSON.parse(JSON.stringify(client));
    clone.qualities[0]!.quality = "New";

    const result = preferredSync.calculateDiff(server, clone.qualities);

    expect(result.changeMap.size).toBe(0);
    expect(result.restData.length).toBe(2);
  });

  test("QualityDefinitionPreferredSync.calculateDiff - throws for unknown qualities when enforcement is on", () => {
    const spy = vi.spyOn(env, "getEnvs").mockReturnValue({ CONFIGARR_ENFORCE_CONFIG_VALIDATION: true } as ReturnType<typeof env.getEnvs>);
    const clone: TrashQualityDefinition = JSON.parse(JSON.stringify(client));
    clone.qualities[0]!.quality = "New";

    try {
      expect(() => preferredSync.calculateDiff(server, clone.qualities)).toThrow(ConfigValidationError);
    } finally {
      spy.mockRestore();
    }
  });

  test("QualityDefinitionPreferredSync.calculateDiff - min size diff produces a structured FieldChange", async ({}) => {
    const clone: TrashQualityDefinition = JSON.parse(JSON.stringify(client));
    clone.qualities[0]!.min = 3;

    const result = preferredSync.calculateDiff(server, clone.qualities);

    expect(result.changeMap.get("SDTV")).toEqual([{ field: "minSize", from: 2, to: 3 }]);
  });

  test("qualityDefinitionsToDiffEntries - converts a changeMap into DiffEntry[]", () => {
    const changeMap = new Map([["SDTV", [{ field: "minSize", from: 2, to: 3 }]]]);

    const entries = qualityDefinitionsToDiffEntries(changeMap);

    expect(entries).toEqual([
      { resourceType: "QualityDefinition", name: "SDTV", action: "update", fieldChanges: [{ field: "minSize", from: 2, to: 3 }] },
    ]);
  });

  test("QualityDefinitionSync.calculateDiff - skip preferredSize (used by Readarr)", async ({}) => {
    const clone: TrashQualityDefinition = JSON.parse(JSON.stringify(client));
    clone.qualities[0]!.preferred = 3;

    const result = plainSync.calculateDiff(server, clone.qualities);

    expect(result.changeMap.size).toBe(0);
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

  describe("QualityDefinitionSync.persist", () => {
    test("writes the computed restData and returns the server response", async () => {
      const { api, sync } = createSync();
      const updatedFromServer: QualityDefinitionShared[] = [{ ...server[1]!, minSize: 3 }];
      api.updateQualityDefinitions.mockResolvedValue(updatedFromServer);

      const qualities: TrashQualityDefinitionQuality[] = [{ quality: "SDTV", min: 3, preferred: 95, max: 100 }];

      const result = await sync.persist(server, qualities, true);

      expect(api.updateQualityDefinitions).toHaveBeenCalledTimes(1);
      expect(api.updateQualityDefinitions).toHaveBeenCalledWith([{ ...server[1]!, minSize: 3 }, { ...server[0]! }]);
      expect(result.changeMap.size).toBe(1);
      expect(result.restData).toBe(updatedFromServer);
    });

    test("does not write anything when write is false but still reports the changeMap", async () => {
      const { api, sync } = createSync();

      const result = await sync.persist(server, [{ quality: "SDTV", min: 3, preferred: 95, max: 100 }], false);

      expect(api.updateQualityDefinitions).not.toHaveBeenCalled();
      expect(result.changeMap.get("SDTV")).toEqual([{ field: "minSize", from: 2, to: 3 }]);
      expect(result.restData).toHaveLength(2);
    });

    test("does not write when there are no changes", async () => {
      const { api, sync } = createSync();

      const result = await sync.persist(server, [{ quality: "SDTV", min: 2, preferred: 95, max: 100 }], true);

      expect(api.updateQualityDefinitions).not.toHaveBeenCalled();
      expect(result.changeMap.size).toBe(0);
      expect(result.restData.map((q) => q.quality?.name)).toEqual(["SDTV", "Unknown"]);
    });

    test("propagates write failures", async () => {
      const { api, sync } = createSync();
      api.updateQualityDefinitions.mockRejectedValue(new Error("500 from server"));

      await expect(sync.persist(server, [{ quality: "SDTV", min: 3, preferred: 95, max: 100 }], true)).rejects.toThrow("500 from server");
    });

    test("loads the server qualities through the api", async () => {
      const { api, sync } = createSync();
      api.getQualityDefinitions.mockResolvedValue(server);

      await expect(sync.loadFromServer()).resolves.toBe(server);
    });
  });

  test("interpolateSize - should fail", async ({}) => {
    expect(() => interpolateSize(0, 100, 50, -0.5)).toThrowError();
    expect(() => interpolateSize(0, 100, 50, 1.1)).toThrowError();
  });
});
