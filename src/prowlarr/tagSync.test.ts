import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerCache } from "../cache";
import type { InputConfigProwlarrInstance } from "../types/config.types";
import { syncTags } from "./tagSync";

vi.mock("../env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../env")>();
  return { ...actual, getEnvs: vi.fn(() => ({ DRY_RUN: false, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" })) };
});
vi.mock("../logger", () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const mockClient = {
  createTag: vi.fn(async (t: { label: string }) => ({ id: Math.floor(Math.random() * 1000) + 10, label: t.label })),
  deleteTag: vi.fn(async () => undefined),
};
vi.mock("../clients/unified-client", () => ({
  getSpecificClient: vi.fn(() => mockClient),
  getUnifiedClient: vi.fn(() => ({ api: mockClient })),
}));

const makeCache = (tags: { id: number; label: string }[]) => ({ tags: [...tags] }) as unknown as ServerCache;
const base: InputConfigProwlarrInstance = { base_url: "http://p", api_key: "k" };

describe("syncTags", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.clearAllMocks());

  it("creates missing tags", async () => {
    const cache = makeCache([{ id: 1, label: "existing" }]);
    const res = await syncTags({ ...base, tags: ["existing", "new-one"] }, cache);
    expect(mockClient.createTag).toHaveBeenCalledTimes(1);
    expect(mockClient.createTag).toHaveBeenCalledWith({ label: "new-one" });
    expect(res.added).toBe(1);
    expect(cache.tags.some((t) => t.label === "new-one")).toBe(true);
  });

  it("deletes unmanaged tags but keeps referenced/ignored ones", async () => {
    const cache = makeCache([
      { id: 1, label: "keep-listed" },
      { id: 2, label: "keep-referenced" },
      { id: 3, label: "keep-ignored" },
      { id: 4, label: "orphan" },
    ]);

    const res = await syncTags(
      {
        ...base,
        tags: ["keep-listed"],
        delete_unmanaged_tags: { enabled: true, ignore: ["keep-ignored"] },
        applications: { data: [{ name: "Sonarr", type: "Sonarr", tags: ["keep-referenced"] }] },
      },
      cache,
    );

    expect(mockClient.deleteTag).toHaveBeenCalledTimes(1);
    expect(mockClient.deleteTag).toHaveBeenCalledWith("4");
    expect(res.removed).toBe(1);
  });

  it("no-ops when nothing is configured", async () => {
    const res = await syncTags(base, makeCache([{ id: 1, label: "x" }]));
    expect(res).toEqual({ added: 0, removed: 0, diffEntries: [] });
    expect(mockClient.createTag).not.toHaveBeenCalled();
  });
});
