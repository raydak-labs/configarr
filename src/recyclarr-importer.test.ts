import { describe, expect, test } from "vitest";
import { DEFAULT_RECYCLARR_REVISION, resolveRecyclarrRevision } from "./recyclarr-importer";

describe("resolveRecyclarrRevision", () => {
  test("pins official repo to last includes-compatible revision when unset", () => {
    // Regression for https://github.com/raydak-labs/configarr/issues/504
    expect(resolveRecyclarrRevision(undefined, undefined)).toBe(DEFAULT_RECYCLARR_REVISION);
    expect(resolveRecyclarrRevision(undefined, "https://github.com/recyclarr/config-templates")).toBe(DEFAULT_RECYCLARR_REVISION);
  });

  test("keeps explicit recyclarrRevision override", () => {
    expect(resolveRecyclarrRevision("master", undefined)).toBe("master");
    expect(resolveRecyclarrRevision("abc123", "https://github.com/recyclarr/config-templates")).toBe("abc123");
  });

  test("uses master for custom forks when revision unset", () => {
    expect(resolveRecyclarrRevision(undefined, "https://github.com/example/fork-recyclarr-configs")).toBe("master");
  });
});
