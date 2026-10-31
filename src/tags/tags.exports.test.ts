import { describe, expect, it } from "vitest";
import * as tags from "./tags";

describe("tags export surface", () => {
  // AGENTS.md Pattern B: tags.ts exports exactly six functions; everything else in the module is private.
  it("exports exactly the six canonical functions defined in AGENTS.md", () => {
    expect(Object.keys(tags).sort()).toEqual([
      "buildTagPlaceholders",
      "deleteUnmanagedInstanceTags",
      "ensureTags",
      "loadServerTags",
      "resolveTagNames",
      "syncInstanceTags",
    ]);
  });
});
