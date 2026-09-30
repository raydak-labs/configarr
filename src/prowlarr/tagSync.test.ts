import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerCache } from "../cache";
import type { TagsClient } from "../clients/capabilities";
import type { InputConfigProwlarrInstance } from "../types/config.types";
import { deleteUnmanagedTags, syncTags } from "./tagSync";

const { getEnvsMock } = vi.hoisted(() => ({
  getEnvsMock: vi.fn(() => ({ DRY_RUN: false, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" })),
}));
vi.mock("../env", () => ({ getEnvs: getEnvsMock }));
vi.mock("../logger", () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const mockClient = {
  getTags: vi.fn(async () => []),
  createTag: vi.fn(async (t: { label: string }) => ({ id: Math.floor(Math.random() * 1000) + 10, label: t.label })),
  deleteTag: vi.fn(async () => undefined),
};
const client = () => mockClient as unknown as TagsClient;

const makeCache = (tags: { id: number; label: string }[]) => ({ tags: [...tags] }) as unknown as ServerCache;
const base: InputConfigProwlarrInstance = { base_url: "http://p", api_key: "k" };

// Shape produced by src/ky-client.ts: the status lives on the HTTPError in `cause`, not on the thrown error.
const inUse = () => Object.assign(new Error("Tag is in use"), { cause: { response: { status: 409 } } });

describe("syncTags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEnvsMock.mockReturnValue({ DRY_RUN: false, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" });
  });
  afterEach(() => vi.clearAllMocks());

  it("creates missing tags", async () => {
    const cache = makeCache([{ id: 1, label: "existing" }]);
    const res = await syncTags(client(), { ...base, tags: ["existing", "new-one"] }, cache);
    expect(mockClient.createTag).toHaveBeenCalledTimes(1);
    expect(mockClient.createTag).toHaveBeenCalledWith({ label: "new-one" });
    expect(res.added).toBe(1);
    expect(res.diffEntries).toEqual([{ resourceType: "Tag", name: "new-one", action: "create" }]);
    expect(cache.tags.some((t) => t.label === "new-one")).toBe(true);
  });

  it("deletes unmanaged tags but keeps referenced/ignored ones", async () => {
    const cache = makeCache([
      { id: 1, label: "keep-listed" },
      { id: 2, label: "keep-referenced" },
      { id: 3, label: "keep-ignored" },
      { id: 4, label: "orphan" },
    ]);

    const res = await deleteUnmanagedTags(
      client(),
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
    expect(cache.tags).toHaveLength(3);
  });

  it("does not delete tags during create", async () => {
    const cache = makeCache([{ id: 4, label: "orphan" }]);
    const res = await syncTags(client(), { ...base, tags: [], delete_unmanaged_tags: { enabled: true } }, cache);
    expect(mockClient.deleteTag).not.toHaveBeenCalled();
    expect(res.removed).toBe(0);
  });

  it("fails the run when a tag cannot be created", async () => {
    mockClient.createTag.mockRejectedValueOnce(new Error("400 Bad Request"));
    const cache = makeCache([]);

    await expect(syncTags(client(), { ...base, tags: ["broken"] }, cache)).rejects.toThrow(
      "Failed to create tag 'broken': 400 Bad Request",
    );
    expect(cache.tags).toHaveLength(0);
  });

  it("fails the run when an unmanaged tag cannot be deleted", async () => {
    mockClient.deleteTag.mockRejectedValueOnce(new Error("409 Conflict"));

    await expect(
      deleteUnmanagedTags(
        client(),
        { ...base, tags: [], delete_unmanaged_tags: { enabled: true } },
        makeCache([{ id: 4, label: "orphan" }]),
      ),
    ).rejects.toThrow("Failed to delete tag 'orphan': 409 Conflict");
  });

  it("fails the run when the server reports a tag is still in use", async () => {
    mockClient.deleteTag.mockRejectedValueOnce(inUse());

    await expect(
      deleteUnmanagedTags(
        client(),
        { ...base, tags: [], delete_unmanaged_tags: { enabled: true } },
        makeCache([{ id: 4, label: "orphan" }]),
      ),
    ).rejects.toThrow("Failed to delete tag 'orphan'");
    expect(mockClient.deleteTag).toHaveBeenCalledExactlyOnceWith("4");
  });

  it("keeps a tag referenced by a raw numeric config entry", async () => {
    const instance: InputConfigProwlarrInstance = {
      ...base,
      delete_unmanaged_tags: { enabled: true },
      download_clients: { data: [{ name: "qbit", type: "qbittorrent", tags: [4] }] },
    };

    await deleteUnmanagedTags(
      client(),
      instance,
      makeCache([
        { id: 4, label: "by-id" },
        { id: 9, label: "orphan" },
      ]),
    );

    expect(mockClient.deleteTag).toHaveBeenCalledExactlyOnceWith("9");
  });

  it("reports the tag it would create during a dry run without touching the server", async () => {
    getEnvsMock.mockReturnValue({ DRY_RUN: true, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" });
    const cache = makeCache([{ id: 1, label: "existing" }]);

    const res = await syncTags(client(), { ...base, tags: ["existing", "new-one", "new-one"] }, cache);

    expect(mockClient.createTag).not.toHaveBeenCalled();
    expect(res.diffEntries).toEqual([{ resourceType: "Tag", name: "new-one", action: "create" }]);
    expect(res.added).toBe(1);
  });

  it("no-ops when nothing is configured", async () => {
    const res = await syncTags(client(), base, makeCache([{ id: 1, label: "x" }]));
    expect(res).toEqual({ added: 0, removed: 0, diffEntries: [] });
    expect(mockClient.createTag).not.toHaveBeenCalled();
  });

  it("no-ops the delete pass when delete_unmanaged_tags is disabled", async () => {
    const res = await deleteUnmanagedTags(client(), { ...base, tags: [] }, makeCache([{ id: 4, label: "orphan" }]));
    expect(res).toEqual({ added: 0, removed: 0, diffEntries: [] });
    expect(mockClient.deleteTag).not.toHaveBeenCalled();
  });
});
