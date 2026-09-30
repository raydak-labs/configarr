import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerCache } from "../cache";
import type { TagsClient } from "../clients/capabilities";
import type { Tag } from "./tag.types";
import {
  buildTagPlaceholders,
  collectTagIds,
  collectTagLabels,
  deleteUnmanagedTags,
  ensureTags,
  resolveTagNames,
  syncInstanceTags,
} from "./tags";

// Hoisted so `vi.resetModules()` + a fresh `import("./tags")` still sees these same spies.
const { getEnvsMock, loggerMock } = vi.hoisted(() => ({
  getEnvsMock: vi.fn(() => ({ DRY_RUN: false, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" })),
  loggerMock: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("../env", () => ({ getEnvs: getEnvsMock }));
vi.mock("../logger", () => ({ logger: loggerMock }));

const setDryRun = (dryRun: boolean) => getEnvsMock.mockReturnValue({ DRY_RUN: dryRun, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" });

let nextTagId = 500;
const mockClient = {
  getTags: vi.fn(async () => [] as Tag[]),
  createTag: vi.fn(async (tag: Tag) => ({ id: nextTagId++, label: tag.label })),
  deleteTag: vi.fn(async () => undefined),
};
const client = () => mockClient as unknown as TagsClient;

const makeCache = (tags: Tag[]) => ({ tags: [...tags] }) as unknown as ServerCache;

// Shape produced by src/ky-client.ts: a plain Error whose `cause` is ky's HTTPError.
// The status lives on `cause.response`, NOT on the thrown error.
const inUse = () => Object.assign(new Error("Tag is in use"), { cause: { response: { status: 409 } } });
const serverError = () => Object.assign(new Error("500 Server Error"), { response: { status: 500 } });

beforeEach(() => {
  vi.clearAllMocks();
  setDryRun(false);
  nextTagId = 500;
});

describe("resolveTagNames", () => {
  it("matches labels case-insensitively", () => {
    const result = resolveTagNames(
      ["Movies", "TV"],
      [
        { id: 1, label: "movies" },
        { id: 2, label: "tv" },
      ],
    );

    expect(result.ids).toEqual([1, 2]);
    expect(result.missing).toEqual([]);
  });

  it("reports labels that exist only under a different case as found, not missing", () => {
    const result = resolveTagNames(["MOVIES"], [{ id: 7, label: "Movies" }]);

    expect(result.ids).toEqual([7]);
    expect(result.missing).toEqual([]);
  });

  it("reports missing labels and drops them from the id list without placeholders", () => {
    const result = resolveTagNames(["known", "Unknown"], [{ id: 3, label: "known" }]);

    expect(result.ids).toEqual([3]);
    expect(result.missing).toEqual(["Unknown"]);
  });

  it("passes numeric entries through as raw server ids", () => {
    const result = resolveTagNames([4, "known"], [{ id: 3, label: "known" }]);

    expect(result.ids).toEqual([4, 3]);
  });

  it("warns once per run per numeric id, not once per resolve call", async () => {
    // The deprecation guard is a module-level Set, so a fresh module instance is needed.
    vi.resetModules();
    const fresh = await import("./tags");

    fresh.resolveTagNames([11, 12], []);
    fresh.resolveTagNames([11, 12], []);
    fresh.resolveTagNames([12], []);

    expect(loggerMock.warn).toHaveBeenCalledTimes(2);
    expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining("Numeric tag id '11' in config is deprecated"));
    expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining("Numeric tag id '12' in config is deprecated"));
  });

  it("synthesizes ids for missing labels from a placeholders map keyed by lowercased label", () => {
    const placeholders = new Map([["unknown", -1]]);

    const result = resolveTagNames(["Known", "Unknown", "Other"], [{ id: 3, label: "known" }], { placeholders });

    expect(result.ids).toEqual([3, -1]);
    expect(result.missing).toEqual(["Unknown", "Other"]);
  });
});

describe("buildTagPlaceholders", () => {
  it("skips labels the server already has so they do not consume a negative id", () => {
    const placeholders = buildTagPlaceholders(["Known", "New"], [{ id: 1, label: "known" }]);

    expect([...placeholders]).toEqual([["new", -1]]);
  });

  it("is stable across calls for the same input", () => {
    const serverTags = [{ id: 1, label: "known" }];
    const tagNames = ["new", "other"];

    expect([...buildTagPlaceholders(tagNames, serverTags)]).toEqual([...buildTagPlaceholders(tagNames, serverTags)]);
  });

  it("keys case-insensitively and dedupes differing cases of the same label", () => {
    const placeholders = buildTagPlaceholders(["New", "NEW", "Other"], []);

    expect([...placeholders]).toEqual([
      ["new", -1],
      ["other", -2],
    ]);
  });
});

describe("collectTagLabels", () => {
  it("lowercases labels, skips numeric entries and tolerates undefined lists", () => {
    const labels = collectTagLabels(["Movies", 4, "TV"], undefined, ["ANIME"]);

    expect([...labels]).toEqual(["movies", "tv", "anime"]);
  });

  it("returns an empty set when nothing is configured", () => {
    expect([...collectTagLabels(undefined, [])]).toEqual([]);
  });
});

describe("collectTagIds", () => {
  it("collects numeric entries, deduplicated, and ignores labels", () => {
    expect(collectTagIds(["a", 3, 7], undefined, [3])).toEqual([3, 7]);
  });

  it("returns an empty list when there are no numeric entries", () => {
    expect(collectTagIds(["a", "b"], undefined)).toEqual([]);
  });
});

describe("ensureTags", () => {
  it("creates only the missing labels and returns ids in input order plus the created labels", async () => {
    const cache = makeCache([{ id: 1, label: "known" }]);

    const result = await ensureTags(client(), cache, ["known", "new-one", "KNOWN"]);

    expect(mockClient.createTag).toHaveBeenCalledExactlyOnceWith({ label: "new-one" });
    expect(result.created).toEqual(["new-one"]);
    // `ids` is re-resolved after the create, so a label this call just created carries its real
    // server id. "KNOWN" resolves to the same tag as "known".
    expect(result.ids).toEqual([1, 500, 1]);
  });

  it("treats a server tag without an id as not present, so it is recreated", async () => {
    const result = await ensureTags(client(), makeCache([{ label: "broken" }]), ["broken"]);

    expect(mockClient.createTag).toHaveBeenCalledExactlyOnceWith({ label: "broken" });
    expect(result.created).toEqual(["broken"]);
  });

  it("reports would-create labels through `missing` during a dry run", async () => {
    setDryRun(true);

    const result = await ensureTags(client(), makeCache([{ id: 1, label: "known" }]), ["known", "new-one"]);

    expect(mockClient.createTag).not.toHaveBeenCalled();
    expect(result.created).toEqual([]);
    expect(result.missing).toEqual(["new-one"]);
  });

  it("resolves a duplicate server label to the first one, as Array.find did", () => {
    const result = resolveTagNames(
      ["dup"],
      [
        { id: 1, label: "dup" },
        { id: 2, label: "DUP" },
      ],
    );

    expect(result.ids).toEqual([1]);
  });

  it("pushes created tags onto the server cache", async () => {
    const cache = makeCache([{ id: 1, label: "known" }]);

    await ensureTags(client(), cache, ["new-one"]);

    expect(cache.tags).toEqual([
      { id: 1, label: "known" },
      { id: 500, label: "new-one" },
    ]);
  });

  // Labels are matched case-insensitively, so config entries that differ only in case
  // must collapse to a single tag. The first occurrence's casing is what gets created.
  it("creates one tag for config entries that differ only in case", async () => {
    const cache = makeCache([]);

    const result = await ensureTags(client(), cache, ["Foo", "foo"]);

    expect(mockClient.createTag).toHaveBeenCalledExactlyOnceWith({ label: "Foo" });
    expect(result.created).toEqual(["Foo"]);
  });

  it("creates nothing during a dry run but returns placeholder ids when a map is passed", async () => {
    setDryRun(true);
    const cache = makeCache([{ id: 1, label: "known" }]);
    const placeholders = buildTagPlaceholders(["known", "new-one"], cache.tags);

    const result = await ensureTags(client(), cache, ["known", "new-one"], { placeholders });

    expect(mockClient.createTag).not.toHaveBeenCalled();
    expect(result.created).toEqual([]);
    expect(result.ids).toEqual([1, -1]);
    expect(cache.tags).toEqual([{ id: 1, label: "known" }]);
  });

  it("omits unresolved ids during a dry run when no placeholders are passed", async () => {
    setDryRun(true);

    const result = await ensureTags(client(), makeCache([]), ["new-one"]);

    expect(result.ids).toEqual([]);
    expect(result.created).toEqual([]);
  });

  it("throws an error naming the label when the server rejects the create", async () => {
    mockClient.createTag.mockRejectedValueOnce(new Error("400 Bad Request"));
    const cache = makeCache([]);

    await expect(ensureTags(client(), cache, ["broken"])).rejects.toThrow("Failed to create tag 'broken': 400 Bad Request");
  });
});

it("keeps tags referenced by a raw numeric config entry", async () => {
  const cache = makeCache([
    { id: 3, label: "by-id" },
    { id: 9, label: "orphan" },
  ]);

  const result = await deleteUnmanagedTags(client(), cache, { keep: [], keepIds: [3], onInUse: "skip" });

  expect(mockClient.deleteTag).toHaveBeenCalledExactlyOnceWith("9");
  expect(result.removed).toBe(1);
});

describe("deleteUnmanagedTags", () => {
  it("keeps listed labels case-insensitively, deletes the rest and drops them from the cache", async () => {
    const cache = makeCache([
      { id: 1, label: "Keep-Listed" },
      { id: 2, label: "keep-referenced" },
      { id: 3, label: "orphan" },
    ]);

    const result = await deleteUnmanagedTags(client(), cache, {
      keep: collectTagLabels(["keep-listed", "KEEP-REFERENCED"]),
      onInUse: "skip",
    });

    expect(mockClient.deleteTag).toHaveBeenCalledExactlyOnceWith("3");
    expect(result.removed).toBe(1);
    expect(result.added).toBe(0);
    expect(result.diffEntries).toEqual([{ resourceType: "Tag", name: "orphan", action: "delete" }]);
    expect(cache.tags).toEqual([
      { id: 1, label: "Keep-Listed" },
      { id: 2, label: "keep-referenced" },
    ]);
  });

  it("records one diff entry per deleted label", async () => {
    const cache = makeCache([
      { id: 1, label: "keep" },
      { id: 2, label: "orphan-a" },
      { id: 3, label: "orphan-b" },
    ]);

    const result = await deleteUnmanagedTags(client(), cache, { keep: collectTagLabels(["keep"]), onInUse: "skip" });

    expect(result.diffEntries).toEqual([
      { resourceType: "Tag", name: "orphan-a", action: "delete" },
      { resourceType: "Tag", name: "orphan-b", action: "delete" },
    ]);
    expect(result.removed).toBe(2);
  });

  it("leaves the server and the cache untouched during a dry run", async () => {
    setDryRun(true);
    const cache = makeCache([
      { id: 1, label: "keep" },
      { id: 2, label: "orphan" },
    ]);

    const result = await deleteUnmanagedTags(client(), cache, { keep: collectTagLabels(["keep"]), onInUse: "skip" });

    expect(mockClient.deleteTag).not.toHaveBeenCalled();
    expect(result.removed).toBe(1);
    expect(result.diffEntries).toEqual([{ resourceType: "Tag", name: "orphan", action: "delete" }]);
    expect(cache.tags).toHaveLength(2);
  });

  it("warns and carries on when onInUse is skip and the server answers 409", async () => {
    mockClient.deleteTag.mockRejectedValueOnce(inUse());
    const cache = makeCache([
      { id: 1, label: "in-use" },
      { id: 2, label: "orphan" },
    ]);

    const result = await deleteUnmanagedTags(client(), cache, { keep: new Set<string>(), onInUse: "skip" });

    expect(mockClient.deleteTag).toHaveBeenCalledTimes(2);
    expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining("Skipping unmanaged tag 'in-use'"));
    expect(result.removed).toBe(1);
    expect(cache.tags).toEqual([{ id: 1, label: "in-use" }]);
  });

  it("throws on a 409 when onInUse is throw", async () => {
    mockClient.deleteTag.mockRejectedValueOnce(inUse());

    await expect(
      deleteUnmanagedTags(client(), makeCache([{ id: 1, label: "in-use" }]), { keep: new Set<string>(), onInUse: "throw" }),
    ).rejects.toThrow("Failed to delete tag 'in-use': Tag is in use");
  });

  it.each(["skip", "throw"] as const)("throws on a non-409 failure under the %s policy", async (onInUse) => {
    mockClient.deleteTag.mockRejectedValueOnce(serverError());

    await expect(
      deleteUnmanagedTags(client(), makeCache([{ id: 1, label: "orphan" }]), { keep: new Set<string>(), onInUse }),
    ).rejects.toThrow("Failed to delete tag 'orphan': 500 Server Error");
  });
});

describe("syncInstanceTags", () => {
  it("creates the configured labels and reports one create entry each", async () => {
    const cache = makeCache([{ id: 1, label: "known" }]);

    const result = await syncInstanceTags(client(), cache, ["known", "fresh"]);

    expect(mockClient.createTag).toHaveBeenCalledExactlyOnceWith({ label: "fresh" });
    expect(result.added).toBe(1);
    expect(result.diffEntries).toEqual([{ resourceType: "Tag", name: "fresh", action: "create" }]);
  });

  it("reports the labels it would create during a dry run without touching the server", async () => {
    setDryRun(true);

    const result = await syncInstanceTags(client(), makeCache([]), ["would-be"]);

    expect(mockClient.createTag).not.toHaveBeenCalled();
    expect(result.diffEntries).toEqual([{ resourceType: "Tag", name: "would-be", action: "create" }]);
  });

  it("reports case-differing labels once, matching what the real run would create", async () => {
    setDryRun(true);

    const result = await syncInstanceTags(client(), makeCache([]), ["Movie", "movie"]);

    expect(result.diffEntries).toEqual([{ resourceType: "Tag", name: "Movie", action: "create" }]);
  });

  it("does nothing when no labels are configured", async () => {
    for (const labels of [undefined, []]) {
      const result = await syncInstanceTags(client(), makeCache([]), labels);
      expect(result).toEqual({ added: 0, removed: 0, diffEntries: [] });
    }
    expect(mockClient.createTag).not.toHaveBeenCalled();
  });
});
