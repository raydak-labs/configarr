import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerCache } from "../cache";
import type { TagsClient } from "../clients/capabilities";
import type { Tag } from "./tag.types";
import { deleteUnmanagedInstanceTags, syncInstanceTags } from "./tagSync";

const { getEnvsMock, loggerMock } = vi.hoisted(() => ({
  getEnvsMock: vi.fn(() => ({ DRY_RUN: false, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" })),
  loggerMock: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("../env", () => ({ getEnvs: getEnvsMock }));
vi.mock("../logger", () => ({ logger: loggerMock }));

let nextTagId = 500;
const mockClient = {
  getTags: vi.fn(async () => [] as Tag[]),
  createTag: vi.fn(async (tag: Tag) => ({ id: nextTagId++, label: tag.label })),
  deleteTag: vi.fn(async () => undefined),
};
const client = () => mockClient as unknown as TagsClient;
const makeCache = (tags: Tag[]) => ({ tags: [...tags] }) as unknown as ServerCache;
const setDryRun = (dryRun: boolean) => getEnvsMock.mockReturnValue({ DRY_RUN: dryRun, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" });

// Shape produced by src/ky-client.ts: the status lives on the HTTPError in `cause`.
const inUse = () => Object.assign(new Error("Tag is in use"), { cause: { response: { status: 409 } } });

beforeEach(() => {
  vi.clearAllMocks();
  setDryRun(false);
  nextTagId = 500;
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

describe("deleteUnmanagedInstanceTags", () => {
  it("keeps configured, ignored and referenced labels and prunes the rest", async () => {
    const cache = makeCache([
      { id: 1, label: "listed" },
      { id: 2, label: "referenced" },
      { id: 3, label: "ignored" },
      { id: 4, label: "orphan" },
    ]);

    const result = await deleteUnmanagedInstanceTags(client(), cache, {
      deleteConfig: { enabled: true, ignore: ["ignored"] },
      referencedTagLists: [["listed"], ["referenced"], undefined],
      onInUse: "skip",
    });

    expect(mockClient.deleteTag).toHaveBeenCalledExactlyOnceWith("4");
    expect(result.removed).toBe(1);
    expect(result.diffEntries).toEqual([{ resourceType: "Tag", name: "orphan", action: "delete" }]);
    expect(cache.tags).toHaveLength(3);
  });

  it("keeps a tag referenced by a raw numeric config entry", async () => {
    const result = await deleteUnmanagedInstanceTags(
      client(),
      makeCache([
        { id: 4, label: "by-id" },
        { id: 9, label: "orphan" },
      ]),
      {
        deleteConfig: { enabled: true },
        referencedTagLists: [[4]],
        onInUse: "skip",
      },
    );

    expect(mockClient.deleteTag).toHaveBeenCalledExactlyOnceWith("9");
    expect(result.removed).toBe(1);
  });

  it("skips a tag that is still in use when onInUse is skip", async () => {
    mockClient.deleteTag.mockRejectedValueOnce(inUse());
    const cache = makeCache([
      { id: 4, label: "in-use" },
      { id: 5, label: "orphan" },
    ]);

    const result = await deleteUnmanagedInstanceTags(client(), cache, {
      deleteConfig: { enabled: true },
      referencedTagLists: [],
      onInUse: "skip",
    });

    expect(result.removed).toBe(1);
    expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining("still in use"));
  });

  it("fails the run when onInUse is throw", async () => {
    mockClient.deleteTag.mockRejectedValueOnce(inUse());

    await expect(
      deleteUnmanagedInstanceTags(client(), makeCache([{ id: 4, label: "in-use" }]), {
        deleteConfig: { enabled: true },
        referencedTagLists: [],
        onInUse: "throw",
      }),
    ).rejects.toThrow("Failed to delete tag 'in-use'");
  });

  it("fails the run on any other delete failure, even with onInUse skip", async () => {
    mockClient.deleteTag.mockRejectedValueOnce(new Error("500 Server Error"));

    await expect(
      deleteUnmanagedInstanceTags(client(), makeCache([{ id: 4, label: "orphan" }]), {
        deleteConfig: { enabled: true },
        referencedTagLists: [],
        onInUse: "skip",
      }),
    ).rejects.toThrow("Failed to delete tag 'orphan': 500 Server Error");
  });

  it("no-ops when delete_unmanaged_tags is absent or disabled", async () => {
    for (const deleteConfig of [undefined, { enabled: false }]) {
      const result = await deleteUnmanagedInstanceTags(client(), makeCache([{ id: 4, label: "orphan" }]), {
        deleteConfig,
        referencedTagLists: [],
        onInUse: "skip",
      });

      expect(result).toEqual({ added: 0, removed: 0, diffEntries: [] });
    }
    expect(mockClient.deleteTag).not.toHaveBeenCalled();
  });
});
