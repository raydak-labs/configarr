import { KyInstance } from "ky";
import { beforeEach, describe, expect, test, vi } from "vitest";
import yaml from "yaml";
import { MappedTemplates } from "./types/common.types";
import { TrashQualityDefinition, TrashQP } from "./types/trashguide.types";
import { isUrl, loadTemplateFromUrl } from "./url-template-importer";

// Mock ky for URL template tests
const mockKyGet = vi.hoisted(() => vi.fn());
vi.mock("ky", () => {
  const mockKy = vi.fn() as unknown as KyInstance;
  mockKy.get = mockKyGet;
  return {
    default: mockKy,
  };
});

// Mock logger
vi.mock("./logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("url-template-importer", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockKyGet.mockReset();
  });

  describe("isUrl", () => {
    test("should detect HTTP URLs", () => {
      expect(isUrl("http://example.com/template.yml")).toBe(true);
    });

    test("should detect HTTPS URLs", () => {
      expect(isUrl("https://example.com/template.yml")).toBe(true);
    });

    test("should reject non-URL strings", () => {
      expect(isUrl("template-name")).toBe(false);
      expect(isUrl("local-template")).toBe(false);
      expect(isUrl("")).toBe(false);
    });

    test("should reject invalid URLs", () => {
      expect(isUrl("not a url")).toBe(false);
      expect(isUrl("ftp://example.com")).toBe(false);
    });
  });

  describe("loadTemplateFromUrl", () => {
    describe("Recyclarr format (YAML)", () => {
      test("should load template from URL", async () => {
        const template: MappedTemplates = {
          custom_formats: [{ trash_ids: ["cf-url"], assign_scores_to: [{ name: "profile" }] }],
          quality_profiles: [],
        };

        mockKyGet.mockResolvedValue({
          text: async () => yaml.stringify(template),
        });

        const result = await loadTemplateFromUrl("https://example.com/template.yml");

        expect(mockKyGet).toHaveBeenCalledWith("https://example.com/template.yml", { timeout: 30000 });
        expect(result).not.toBeNull();
        expect((result as MappedTemplates).custom_formats).toHaveLength(1);
        expect((result as MappedTemplates).custom_formats![0]!.trash_ids).toEqual(["cf-url"]);
      });

      test("should handle URL template loading failure gracefully", async () => {
        mockKyGet.mockRejectedValue(new Error("Network error"));

        const result = await loadTemplateFromUrl("https://example.com/nonexistent.yml");

        expect(mockKyGet).toHaveBeenCalled();
        expect(result).toBeNull();
      });

      test("should handle empty URL template content gracefully", async () => {
        mockKyGet.mockResolvedValue({
          text: async () => "",
        });

        const result = await loadTemplateFromUrl("https://example.com/empty.yml");

        expect(mockKyGet).toHaveBeenCalled();
        expect(result).toBeNull();
      });

      test("should transform custom formats with quality_profiles to assign_scores_to", async () => {
        const template: MappedTemplates = {
          custom_formats: [
            {
              trash_ids: ["cf1"],
              quality_profiles: [{ name: "profile1", score: 10 }],
            },
          ],
          quality_profiles: [],
        };

        mockKyGet.mockResolvedValue({
          text: async () => yaml.stringify(template),
        });

        const result = await loadTemplateFromUrl("https://example.com/template.yml");

        expect(result).not.toBeNull();
        const cf = (result as MappedTemplates).custom_formats?.[0];
        expect(cf).toBeDefined();
        expect(cf!.assign_scores_to).toEqual([{ name: "profile1", score: 10 }]);
        // quality_profiles is still present but assign_scores_to takes precedence
        expect(cf!.quality_profiles).toBeDefined();
      });

      test("should handle template without source parameter (defaults to Recyclarr)", async () => {
        const template: MappedTemplates = {
          custom_formats: [],
          quality_profiles: [],
        };

        mockKyGet.mockResolvedValue({
          text: async () => yaml.stringify(template),
        });

        const result = await loadTemplateFromUrl("https://example.com/template.yml");

        expect(result).not.toBeNull();
        expect(mockKyGet).toHaveBeenCalled();
      });
    });

    describe("TRASH format (JSON)", () => {
      test("should load TRASH template from URL", async () => {
        const trashTemplate: TrashQP = {
          trash_id: "test-trash-id",
          name: "TRASH Profile",
          trash_quality_definition: { series: "bef99584217af744e404ed44a33af589" },
          trash_score_set: "default",
          upgradeAllowed: true,
          cutoff: "HDTV-1080p",
          minFormatScore: 0,
          cutoffFormatScore: 1000,
          items: [{ name: "HDTV-1080p", allowed: true }],
          formatItems: {},
        };

        mockKyGet.mockResolvedValue({
          text: async () => JSON.stringify(trashTemplate),
        });

        const result = await loadTemplateFromUrl("https://example.com/trash-template.json", "TRASH");

        expect(mockKyGet).toHaveBeenCalledWith("https://example.com/trash-template.json", { timeout: 30000 });
        expect(result).not.toBeNull();
        expect((result as TrashQP).trash_id).toBe("test-trash-id");
        expect((result as TrashQP).name).toBe("TRASH Profile");
        expect((result as TrashQP).trash_quality_definition).toEqual({ series: "bef99584217af744e404ed44a33af589" });
      });

      test("should load TRASH quality definitions from URL", async () => {
        const qualityDefinition: TrashQualityDefinition = {
          trash_id: "quality-definition-id",
          type: "series",
          qualities: [{ quality: "HDTV-1080p", min: 10, preferred: 50, max: 90 }],
        };

        mockKyGet.mockResolvedValue({
          text: async () => JSON.stringify(qualityDefinition),
        });

        const result = await loadTemplateFromUrl("https://example.com/quality-size.json", "TRASH");

        expect(result).toEqual(qualityDefinition);
      });

      test("should handle TRASH URL template loading failure gracefully", async () => {
        mockKyGet.mockRejectedValue(new Error("Network error"));

        const result = await loadTemplateFromUrl("https://example.com/nonexistent-trash.json", "TRASH");

        expect(mockKyGet).toHaveBeenCalled();
        expect(result).toBeNull();
      });

      test("should reject TRASH template without trash_id", async () => {
        const invalidTemplate = {
          name: "Invalid Profile",
          // missing trash_id
        };

        mockKyGet.mockResolvedValue({
          text: async () => JSON.stringify(invalidTemplate),
        });

        const result = await loadTemplateFromUrl("https://example.com/invalid-trash.json", "TRASH");

        expect(mockKyGet).toHaveBeenCalled();
        expect(result).toBeNull();
      });

      test("should reject TRASH template with an invalid quality-definition reference", async () => {
        const invalidTemplate = {
          trash_id: "test-trash-id",
          name: "TRASH Profile",
          upgradeAllowed: true,
          cutoff: "HDTV-1080p",
          minFormatScore: 0,
          cutoffFormatScore: 1000,
          items: [{ name: "HDTV-1080p", allowed: true }],
          formatItems: {},
          trash_quality_definition: null,
        };

        mockKyGet.mockResolvedValue({
          text: async () => JSON.stringify(invalidTemplate),
        });

        const result = await loadTemplateFromUrl("https://example.com/invalid-trash-reference.json", "TRASH");

        expect(mockKyGet).toHaveBeenCalled();
        expect(result).toBeNull();
      });

      test("should handle empty TRASH template content gracefully", async () => {
        mockKyGet.mockResolvedValue({
          text: async () => "",
        });

        const result = await loadTemplateFromUrl("https://example.com/empty-trash.json", "TRASH");

        expect(mockKyGet).toHaveBeenCalled();
        expect(result).toBeNull();
      });

      test("should handle invalid JSON gracefully", async () => {
        mockKyGet.mockResolvedValue({
          text: async () => "invalid json {",
        });

        const result = await loadTemplateFromUrl("https://example.com/invalid.json", "TRASH");

        expect(mockKyGet).toHaveBeenCalled();
        expect(result).toBeNull();
      });
    });
  });
});
