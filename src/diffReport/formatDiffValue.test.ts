import { describe, expect, test } from "vitest";
import { formatDiffValue } from "./formatDiffValue";

describe("formatDiffValue", () => {
  test("renders scalars directly", () => {
    expect(formatDiffValue(5)).toBe("5");
    expect(formatDiffValue("English")).toBe("English");
    expect(formatDiffValue(true)).toBe("true");
  });

  test("renders null and undefined as literal words", () => {
    expect(formatDiffValue(null)).toBe("null");
    expect(formatDiffValue(undefined)).toBe("undefined");
  });

  test("renders a small array inline with quoted string elements", () => {
    expect(formatDiffValue(["a", "b", "c"])).toBe('["a", "b", "c"]');
  });

  test("truncates arrays with more than 5 entries", () => {
    expect(formatDiffValue(["a", "b", "c", "d", "e", "f", "g", "h"])).toBe('["a", "b", "c", "d", "e", (+3 more)]');
  });

  test("renders a small object inline", () => {
    expect(formatDiffValue({ a: 1, b: 2 })).toBe("{a: 1, b: 2}");
  });

  test("truncates objects with more than 5 top-level keys", () => {
    const value = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7 };
    expect(formatDiffValue(value)).toBe("{a: 1, b: 2, c: 3, d: 4, e: 5, (+2 more)}");
  });
});
