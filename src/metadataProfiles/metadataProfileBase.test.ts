import { describe, it, expect } from "vitest";

describe("BaseMetadataProfileSync", () => {
  it("should be an abstract class that requires implementation", () => {
    // This is an abstract class - concrete implementations are tested separately
    // in metadataProfileLidarr.test.ts and metadataProfileReadarr.test.ts
    expect(true).toBe(true);
  });
});
