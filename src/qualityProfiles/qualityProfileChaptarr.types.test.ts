import { describe, expect, it } from "vitest";
import { normalizeQualityProfile } from "./qualityProfileChaptarr.types";

describe("normalizeQualityProfile", () => {
  it("turns a null quality on a group item into an absent one, recursively", () => {
    const profile = normalizeQualityProfile({
      id: 1,
      name: "E-Book",
      items: [
        {
          name: "Ebooks",
          allowed: true,
          quality: null,
          items: [{ allowed: true, quality: { id: 1, name: "EPUB" }, items: null }],
        },
      ],
    });

    const [group] = profile.items ?? [];
    expect(group).not.toHaveProperty("quality");
    expect(group?.items).toEqual([{ allowed: true, quality: { id: 1, name: "EPUB" }, items: null }]);
  });

  it("keeps a profile without items untouched", () => {
    expect(normalizeQualityProfile({ id: 2, name: "Empty" })).toEqual({ id: 2, name: "Empty" });
  });
});
