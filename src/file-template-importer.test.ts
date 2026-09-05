import { default as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import * as env from "./env";
import { isFilePath, loadTemplateFromFile, resolveConfigRelativePath } from "./file-template-importer";
import { MappedTemplates } from "./types/common.types";
import { TrashQP } from "./types/trashguide.types";

vi.mock("./logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("file-template-importer", () => {
  let tmpDir: string;
  let configDir: string;

  beforeEach(() => {
    vi.restoreAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "configarr-file-template-"));
    configDir = path.join(tmpDir, "config");
    fs.mkdirSync(configDir);

    vi.spyOn(env, "getHelpers").mockReturnValue({
      configLocation: path.join(configDir, "config.yml"),
      secretLocation: path.join(configDir, "secrets.yml"),
      repoPath: path.join(tmpDir, "repos"),
      enableMerge: false,
    });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const writeTemplate = (relativePath: string, content: string) => {
    const target = path.join(configDir, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, "utf8");
    return target;
  };

  describe("isFilePath", () => {
    test("should detect paths with separators", () => {
      expect(isFilePath("./profiles/uhd.yml")).toBe(true);
      expect(isFilePath("../shared/uhd.yaml")).toBe(true);
      expect(isFilePath("/data/profiles/uhd.yml")).toBe(true);
      expect(isFilePath("profiles/uhd")).toBe(true);
      expect(isFilePath("C:\\profiles\\uhd.yml")).toBe(true);
    });

    test("should detect bare filenames by extension", () => {
      expect(isFilePath("uhd.yml")).toBe(true);
      expect(isFilePath("uhd.yaml")).toBe(true);
      expect(isFilePath("uhd.json")).toBe(true);
      expect(isFilePath("uhd.YML")).toBe(true);
    });

    test("should reject template names and trash ids", () => {
      // These are the shapes every existing config uses - none may become a file path.
      expect(isFilePath("sonarr-cf")).toBe(false);
      expect(isFilePath("radarr-quality-definition-movie")).toBe(false);
      expect(isFilePath("d1498e7d189fbe6c7110ceaabb7473e6")).toBe(false);
      expect(isFilePath("")).toBe(false);
    });

    test("should reject URLs, which have their own include path", () => {
      expect(isFilePath("https://example.com/template.yml")).toBe(false);
      expect(isFilePath("http://example.com/a/b.json")).toBe(false);
    });
  });

  describe("resolveConfigRelativePath", () => {
    test("should resolve relative paths against the config directory, not cwd", () => {
      expect(resolveConfigRelativePath("./profiles/uhd.yml")).toBe(path.join(configDir, "profiles/uhd.yml"));
      expect(resolveConfigRelativePath("profiles/uhd.yml")).toBe(path.join(configDir, "profiles/uhd.yml"));
      // The whole point: independent of where the process was started.
      expect(resolveConfigRelativePath("./profiles/uhd.yml")).not.toBe(path.resolve(process.cwd(), "./profiles/uhd.yml"));
    });

    test("should pass absolute paths through untouched", () => {
      expect(resolveConfigRelativePath("/data/profiles/uhd.yml")).toBe("/data/profiles/uhd.yml");
    });
  });

  describe("loadTemplateFromFile", () => {
    test("should load a recyclarr format YAML template", () => {
      writeTemplate(
        "profiles/uhd.yml",
        `custom_formats:
  - trash_ids:
      - cf1
    assign_scores_to:
      - name: UHD
        score: 5000
`,
      );

      const result = loadTemplateFromFile("./profiles/uhd.yml");

      expect(result?.kind).toBe("RECYCLARR");
      expect((result?.template as MappedTemplates).custom_formats).toEqual([
        { trash_ids: ["cf1"], assign_scores_to: [{ name: "UHD", score: 5000 }] },
      ]);
    });

    test("should load an absolute path", () => {
      const absolute = writeTemplate("abs.yml", "custom_formats:\n  - trash_ids: [cf1]\n");

      const result = loadTemplateFromFile(absolute);

      expect(result?.kind).toBe("RECYCLARR");
    });

    test("should map deprecated quality_profiles to assign_scores_to", () => {
      writeTemplate(
        "deprecated.yml",
        `custom_formats:
  - trash_ids: [cf1]
    quality_profiles:
      - name: Old
        score: 10
`,
      );

      const result = loadTemplateFromFile("./deprecated.yml");

      expect((result?.template as MappedTemplates).custom_formats?.[0]!.assign_scores_to).toEqual([{ name: "Old", score: 10 }]);
    });

    test("should keep a nameless assign_scores_to entry intact for profile binding", () => {
      writeTemplate(
        "nameless.yml",
        `custom_formats:
  - trash_ids: [cf1]
    assign_scores_to:
      - score: 5000
`,
      );

      const result = loadTemplateFromFile("./nameless.yml");

      expect((result?.template as MappedTemplates).custom_formats?.[0]!.assign_scores_to).toEqual([{ score: 5000 }]);
    });

    test("should auto-detect a TRaSH JSON template via trash_id without source", () => {
      writeTemplate("trash.json", JSON.stringify({ trash_id: "abc", name: "TrashProfile" }));

      const result = loadTemplateFromFile("./trash.json");

      expect(result?.kind).toBe("TRASH");
      expect((result?.template as TrashQP).name).toBe("TrashProfile");
    });

    test("should honour an explicit source: TRASH", () => {
      writeTemplate("explicit.yml", "trash_id: abc\nname: TrashProfile\n");

      expect(loadTemplateFromFile("./explicit.yml", "TRASH")?.kind).toBe("TRASH");
    });

    test("should return null for a missing file", () => {
      expect(loadTemplateFromFile("./does-not-exist.yml")).toBeNull();
    });

    test("should return null for an empty file", () => {
      writeTemplate("empty.yml", "");

      expect(loadTemplateFromFile("./empty.yml")).toBeNull();
    });

    test("should return null for a top-level array", () => {
      writeTemplate("array.yml", "- a\n- b\n");

      expect(loadTemplateFromFile("./array.yml")).toBeNull();
    });

    test("should return null for malformed YAML", () => {
      writeTemplate("broken.yml", "custom_formats: [\n  unclosed");

      expect(loadTemplateFromFile("./broken.yml")).toBeNull();
    });

    test("should return null when no recognized template key is present", () => {
      writeTemplate("unrelated.yml", "some_other_key: true\n");

      expect(loadTemplateFromFile("./unrelated.yml")).toBeNull();
    });
  });
});
