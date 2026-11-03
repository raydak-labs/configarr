import { describe, expect, test } from "vitest";
import { renderTags } from "./renderTags";

describe("renderTags", () => {
  test("returns ids unchanged when placeholderLabels is undefined", () => {
    expect(renderTags([1, 2, 3])).toEqual([1, 2, 3]);
    expect(renderTags([])).toEqual([]);
  });

  test("returns resolved ids first and pending labels after", () => {
    const placeholderLabels = new Map<number, string>([
      [-1, "new-tag-a"],
      [-2, "new-tag-b"],
    ]);

    expect(renderTags([1, -1, 2, -2], placeholderLabels)).toEqual([1, 2, "new-tag-a", "new-tag-b"]);
  });

  test("handles all resolved ids with placeholderLabels map provided", () => {
    const placeholderLabels = new Map<number, string>([[-1, "unused"]]);
    expect(renderTags([10, 20], placeholderLabels)).toEqual([10, 20]);
  });

  test("handles all placeholder ids", () => {
    const placeholderLabels = new Map<number, string>([
      [-1, "alpha"],
      [-2, "beta"],
    ]);
    expect(renderTags([-2, -1], placeholderLabels)).toEqual(["beta", "alpha"]);
  });

  test("handles empty ids array", () => {
    const placeholderLabels = new Map<number, string>([[-1, "alpha"]]);
    expect(renderTags([], placeholderLabels)).toEqual([]);
  });
});
