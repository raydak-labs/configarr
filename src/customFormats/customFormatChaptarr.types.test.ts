import { describe, expect, it } from "vitest";
import { CustomFormatMediaType } from "../__generated__/chaptarr/data-contracts";
import { customFormatMediaType } from "./customFormatChaptarr.types";

describe("customFormatMediaType", () => {
  it("reads each media side", () => {
    expect(customFormatMediaType({ name: "a", appliesTo: CustomFormatMediaType.Ebook } as never)).toBe(CustomFormatMediaType.Ebook);
    expect(customFormatMediaType({ name: "a", appliesTo: CustomFormatMediaType.Audiobook } as never)).toBe(CustomFormatMediaType.Audiobook);
    expect(customFormatMediaType({ name: "a", appliesTo: CustomFormatMediaType.Both } as never)).toBe(CustomFormatMediaType.Both);
  });

  it("is undefined when the format declares no side or an unknown one", () => {
    expect(customFormatMediaType({ name: "a" })).toBeUndefined();
    expect(customFormatMediaType({ name: "a", appliesTo: "video" } as never)).toBeUndefined();
  });
});
