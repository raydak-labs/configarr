import { default as fs } from "node:fs";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { loadRecyclarrTemplates } from "./recyclarr-importer";

vi.mock("./logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("recyclarr-importer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadRecyclarrTemplates", () => {
    test.each(["SONARR", "RADARR"] as const)("does not throw when a legacy includes directory does not exist (%s)", (arrType) => {
      // Regression test for https://github.com/raydak-labs/configarr/issues/504
      // recyclarr/config-templates removed sonarr/includes and radarr/includes entirely,
      // which previously crashed every run with ENOENT regardless of which templates a
      // user's config actually referenced.
      vi.spyOn(fs, "existsSync").mockImplementation((path) => !String(path).includes("includes"));
      const readdirSpy = vi.spyOn(fs, "readdirSync");

      const map = loadRecyclarrTemplates(arrType);

      expect(map.size).toBe(0);
      expect(readdirSpy).not.toHaveBeenCalled();
    });

    test("still loads templates when the legacy includes directory exists", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readdirSync").mockReturnValue(["example-template.yml"] as any);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        "custom_formats:\n  - trash_ids: [abc]\n    assign_scores_to:\n      - name: Some Profile\n",
      );

      const map = loadRecyclarrTemplates("SONARR");

      expect(map.size).toBeGreaterThan(0);
      expect(map.get("example-template")).toBeDefined();
    });
  });
});
