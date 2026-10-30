import { describe, expect, test, vi } from "vitest";
import { logger } from "./logger";
import { normalizeTemplateCustomFormats } from "./templateCustomFormats";

vi.mock("./logger", () => ({ logger: { warn: vi.fn() } }));

describe("template custom-format normalization", () => {
  test.each(["Local Template", "Recyclarr Template", "Template from URL"] as const)(
    "preserves assignment precedence and identifies warnings for %s",
    (source) => {
      vi.mocked(logger.warn).mockClear();
      const current = [{ name: "Current", score: 1 }];
      const legacy = [{ name: "Legacy", score: 2 }];
      const input = [
        { trash_ids: ["a"], assign_scores_to: current, quality_profiles: legacy },
        { trash_ids: ["b"], quality_profiles: legacy },
        { trash_ids: ["c"] },
      ];
      const result = normalizeTemplateCustomFormats(input, source, "fixture");
      expect(result?.map((entry) => entry.assign_scores_to)).toEqual([current, legacy, []]);
      expect(input[2]).toEqual({ trash_ids: ["c"] });
      expect(logger.warn).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(`${source} "fixture" does not provide correct profile`));
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(`(${source} 'fixture')`));
    },
  );
  test("leaves absent custom formats absent", () => {
    expect(normalizeTemplateCustomFormats(undefined, "Local Template", "fixture")).toBeUndefined();
  });
});
