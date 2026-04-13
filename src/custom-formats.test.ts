import fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as unifiedClient from "./clients/unified-client";
import * as config from "./config";
import * as env from "./env";
import { calculateCFsToManage, loadCustomFormatDefinitions, loadLocalCfs, manageCf, mergeCfSources } from "./custom-formats";
import { loadTrashCFs } from "./trash-guide";
import { CFIDToConfigGroup, CFProcessing, ConfigarrCF } from "./types/common.types";
import { ConfigCustomFormatList } from "./types/config.types";
import { MergedCustomFormatResource } from "./types/merged.types";
import { TrashCF } from "./types/trashguide.types";
import * as util from "./util";
import { logger } from "./logger";

describe("CustomFormats", () => {
  let customCF: TrashCF;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mock("node:fs");

    customCF = {
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
          required: true,
          fields: {
            min: 1,
            max: 9,
          },
        },
      ],
    };
  });

  describe("loadLocalCfs", () => {
    it("should return null when no local path is configured", async () => {
      vi.spyOn(config, "getConfig").mockReturnValue({ localCustomFormatsPath: undefined });

      const result = await loadLocalCfs();
      expect(result.size).toBe(0);
    });

    it("should return null when configured path doesn't exist", async () => {
      vi.spyOn(config, "getConfig").mockReturnValue({ localCustomFormatsPath: "/fake/path" });
      vi.spyOn(fs, "existsSync").mockReturnValue(false);

      const result = await loadLocalCfs();
      expect(result.size).toBe(0);
    });

    it("should load and process JSON files from configured path", async () => {
      vi.spyOn(config, "getConfig").mockReturnValue({ localCustomFormatsPath: "/valid/path" });
      vi.spyOn(fs, "existsSync").mockReturnValue(true);

      vi.spyOn(fs, "readdirSync").mockReturnValue(["test.json"] as any);
      //vi.spyOn(fs, "readFileSync").mockImplementationOnce(() => "{}");

      vi.spyOn(util, "loadJsonFile").mockReturnValueOnce(customCF);

      const result = await loadLocalCfs();
      expect(result).not.toBeNull();
      expect(result.size).toBe(1);
      expect(result.get(customCF.trash_id)).not.toBeNull();
    });
  });

  describe("mergeCfSources", () => {
    it("should merge multiple CF sources correctly", () => {
      const source1: CFIDToConfigGroup = new Map([["id1", { carrConfig: { configarr_id: "id1", name: "CF1" }, requestConfig: {} }]]);

      const source2: CFIDToConfigGroup = new Map([["id2", { carrConfig: { configarr_id: "id2", name: "CF2" }, requestConfig: {} }]]);

      const result = mergeCfSources(new Set(["id1", "id2"]), [source1, source2, null]);

      expect(result.carrIdMapping.size).toBe(2);
      expect(result.cfNameToCarrConfig.size).toBe(2);
      expect(result.carrIdMapping.has("id1")).toBeTruthy();
      expect(result.carrIdMapping.has("id2")).toBeTruthy();
    });

    it("should keep one cfNameToCarrConfig winner when two trash_ids share the same CF name", () => {
      const mk = (id: string, name: string, specCount: number) => {
        const specifications = Array.from({ length: specCount }, (_, i) => ({
          name: `S${i}`,
          implementation: "ReleaseGroupSpecification" as const,
          negate: false,
          required: false,
          fields: { value: `^(${i})$` },
        }));
        const carrConfig = { configarr_id: id, name, specifications } as unknown as ConfigarrCF;
        return { carrConfig, requestConfig: util.mapImportCfToRequestCf(carrConfig) };
      };

      const first = mk("id-a", "Dup", 3);
      const second = mk("id-b", "Dup", 1);
      const source: CFIDToConfigGroup = new Map([
        ["id-a", { carrConfig: first.carrConfig, requestConfig: first.requestConfig }],
        ["id-b", { carrConfig: second.carrConfig, requestConfig: second.requestConfig }],
      ]);

      const result = mergeCfSources(new Set(["id-a", "id-b"]), [source, null]);

      expect(result.carrIdMapping.size).toBe(2);
      expect(result.cfNameToCarrConfig.size).toBe(1);
      expect(result.cfNameToCarrConfig.get("Dup")?.configarr_id).toBe("id-b");
      expect(result.cfNameToCarrConfig.get("Dup")?.specifications?.length).toBe(1);
      const winnerCarr = result.cfNameToCarrConfig.get("Dup")!;
      const idB = result.carrIdMapping.get("id-b")!;
      expect(util.compareCustomFormats(util.mapImportCfToRequestCf(winnerCarr), idB.requestConfig).equal).toBe(true);
    });

    it("should warn when two trash_ids share a name but have different specifications", () => {
      const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
      const mk = (id: string, name: string, specCount: number) => {
        const specifications = Array.from({ length: specCount }, (_, i) => ({
          name: `S${i}`,
          implementation: "ReleaseGroupSpecification" as const,
          negate: false,
          required: false,
          fields: { value: `^(${i})$` },
        }));
        const carrConfig = { configarr_id: id, name, specifications } as unknown as ConfigarrCF;
        return { carrConfig, requestConfig: util.mapImportCfToRequestCf(carrConfig) };
      };

      const first = mk("id-a", "Dup", 2);
      const second = mk("id-b", "Dup", 1);
      const source: CFIDToConfigGroup = new Map([
        ["id-a", { carrConfig: first.carrConfig, requestConfig: first.requestConfig }],
        ["id-b", { carrConfig: second.carrConfig, requestConfig: second.requestConfig }],
      ]);

      mergeCfSources(new Set(["id-a", "id-b"]), [source, null]);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/trash_id 'id-b' wins over 'id-a'.*Sync uses 'id-b'/));
      warnSpy.mockRestore();
    });
  });

  describe("calculateCFsToManage", () => {
    it("should collect all trash IDs from custom format list", () => {
      const yaml: ConfigCustomFormatList = {
        custom_formats: [
          { trash_ids: ["t1", "t2"], assign_scores_to: [{ name: "default", score: 100 }] },
          { trash_ids: ["t3"], assign_scores_to: [{ name: "default", score: 100 }] },
          { trash_ids: ["t2"], assign_scores_to: [{ name: "default", score: 100 }] }, // Duplicate to test Set behavior
        ],
      };

      const result = calculateCFsToManage(yaml);

      expect(result.size).toBe(3);
      expect(result.has("t1")).toBeTruthy();
      expect(result.has("t2")).toBeTruthy();
      expect(result.has("t3")).toBeTruthy();
    });
  });

  describe("loadCustomFormatDefinitions", () => {
    it("should load and merge (trash CFDs", async () => {
      const mockTrashCFs: CFIDToConfigGroup = new Map([
        ["trash1", { carrConfig: { configarr_id: "trash1", name: "trash1" }, requestConfig: {} }],
      ]);

      vi.mock("./trash-guide");
      vi.mocked(loadTrashCFs).mockResolvedValue(mockTrashCFs);
      vi.spyOn(config, "getConfig").mockReturnValue({ localCustomFormatsPath: undefined });

      const result = await loadCustomFormatDefinitions(new Set(["trash1"]), "RADARR", []);

      expect(result.carrIdMapping.size).toBe(1);
      expect(result.carrIdMapping.has("trash1")).toBeTruthy();
    });

    it("should load and merge (additional CFDs)", async () => {
      const mockTrashCFs: CFIDToConfigGroup = new Map([
        ["trash1", { carrConfig: { configarr_id: "trash1", name: "trash1" }, requestConfig: {} }],
      ]);

      vi.mock("./trash-guide");
      vi.mocked(loadTrashCFs).mockResolvedValue(mockTrashCFs);
      vi.spyOn(config, "getConfig").mockReturnValue({ localCustomFormatsPath: undefined });

      const result = await loadCustomFormatDefinitions(new Set(["trash1", customCF.trash_id]), "RADARR", [customCF]);

      expect(result.carrIdMapping.size).toBe(2);
      expect(result.carrIdMapping.has("trash1")).toBeTruthy();
    });

    it("should ignore not managed CFs", async () => {
      const mockTrashCFs: CFIDToConfigGroup = new Map([
        ["trash1", { carrConfig: { configarr_id: "trash1", name: "trash1" }, requestConfig: {} }],
      ]);

      vi.mock("./trash-guide");
      vi.mocked(loadTrashCFs).mockResolvedValue(mockTrashCFs);
      vi.spyOn(config, "getConfig").mockReturnValue({ localCustomFormatsPath: undefined });

      const result = await loadCustomFormatDefinitions(new Set(["trash1"]), "RADARR", [customCF]);

      expect(result.carrIdMapping.size).toBe(1);
      expect(result.carrIdMapping.has("trash1")).toBeTruthy();
    });
  });

  describe("manageCf", () => {
    it("should update each CF name at most once when server already matches desired state", async () => {
      vi.spyOn(env, "getEnvs").mockReturnValue({
        DRY_RUN: false,
      } as ReturnType<typeof env.getEnvs>);

      const specifications = [
        {
          name: "S0",
          implementation: "ReleaseGroupSpecification" as const,
          negate: false,
          required: false,
          fields: { value: "^(0)$" },
        },
      ];
      const carrConfigB = { configarr_id: "id-b", name: "Dup", specifications } as unknown as ConfigarrCF;
      const requestConfigB = util.mapImportCfToRequestCf(carrConfigB);
      const carrConfigA = {
        configarr_id: "id-a",
        name: "Dup",
        specifications: [...specifications, { ...specifications[0], name: "S1" }],
      } as unknown as ConfigarrCF;
      const requestConfigA = util.mapImportCfToRequestCf(carrConfigA);

      const cfProcessing: CFProcessing = {
        carrIdMapping: new Map([
          ["id-a", { carrConfig: carrConfigA, requestConfig: requestConfigA }],
          ["id-b", { carrConfig: carrConfigB, requestConfig: requestConfigB }],
        ]),
        cfNameToCarrConfig: new Map([[carrConfigB.name!, carrConfigB]]),
      };

      const serverCf: MergedCustomFormatResource = { id: 1, name: "Dup", ...requestConfigB };
      const serverCfs = new Map<string, MergedCustomFormatResource>([["Dup", serverCf]]);

      const updateCustomFormat = vi.fn();
      vi.spyOn(unifiedClient, "getUnifiedClient").mockReturnValue({
        updateCustomFormat,
        createCustomFormat: vi.fn(),
      } as unknown as ReturnType<typeof unifiedClient.getUnifiedClient>);

      const out = await manageCf(cfProcessing, serverCfs);

      expect(updateCustomFormat).not.toHaveBeenCalled();
      expect(out.errorCFs.length).toBe(0);
    });

    it("should apply a single update per CF name using cfNameToCarrConfig winner when server matches a non-winner trash_id body", async () => {
      vi.spyOn(env, "getEnvs").mockReturnValue({ DRY_RUN: false } as ReturnType<typeof env.getEnvs>);

      const specifications = [
        {
          name: "S0",
          implementation: "ReleaseGroupSpecification" as const,
          negate: false,
          required: false,
          fields: { value: "^(0)$" },
        },
      ];
      const carrConfigB = { configarr_id: "id-b", name: "Dup", specifications } as unknown as ConfigarrCF;
      const requestConfigB = util.mapImportCfToRequestCf(carrConfigB);
      const carrConfigA = {
        configarr_id: "id-a",
        name: "Dup",
        specifications: [...specifications, { ...specifications[0], name: "S1" }],
      } as unknown as ConfigarrCF;
      const requestConfigA = util.mapImportCfToRequestCf(carrConfigA);

      const cfProcessing: CFProcessing = {
        carrIdMapping: new Map([
          ["id-a", { carrConfig: carrConfigA, requestConfig: requestConfigA }],
          ["id-b", { carrConfig: carrConfigB, requestConfig: requestConfigB }],
        ]),
        cfNameToCarrConfig: new Map([[carrConfigB.name!, carrConfigB]]),
      };

      const serverCfStale: MergedCustomFormatResource = { id: 1, name: "Dup", ...requestConfigA };
      const serverCfs = new Map<string, MergedCustomFormatResource>([["Dup", serverCfStale]]);

      const updateCustomFormat = vi.fn().mockResolvedValue({ id: 1, name: "Dup", ...requestConfigB });
      vi.spyOn(unifiedClient, "getUnifiedClient").mockReturnValue({
        updateCustomFormat,
        createCustomFormat: vi.fn(),
      } as unknown as ReturnType<typeof unifiedClient.getUnifiedClient>);

      await manageCf(cfProcessing, serverCfs);

      expect(updateCustomFormat).toHaveBeenCalledTimes(1);
      const updatePayload = updateCustomFormat.mock.calls[0]?.[1];
      expect(updatePayload).toBeDefined();
      expect(updatePayload).toMatchObject({ ...requestConfigB });
    });
  });
});
