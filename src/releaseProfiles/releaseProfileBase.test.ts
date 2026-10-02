import { describe, expect, test, vi, beforeEach } from "vitest";
import { ServerCache } from "../cache";
import { ConfigValidationError } from "../validation";
import { BaseReleaseProfileSync, normalizeTerms, profileKey } from "./releaseProfileBase";
import { ReleaseProfileShared } from "./releaseProfile.types";

vi.mock("../env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../env")>();
  return {
    ...actual,
    getEnvs: vi.fn(() => ({ DRY_RUN: false, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" })),
  };
});

import { getEnvs } from "../env";

const api = {
  getReleaseProfiles: vi.fn(),
  createReleaseProfile: vi.fn(),
  updateReleaseProfile: vi.fn(),
  deleteReleaseProfile: vi.fn(),
  getTags: vi.fn(),
  createTag: vi.fn(),
  deleteTag: vi.fn(),
  getIndexers: vi.fn(),
};

const namedSync = () => new BaseReleaseProfileSync<ReleaseProfileShared>(api, true);

const cache = (tags: { id: number; label: string }[] = [], indexers?: { id: number; name: string }[]) =>
  new ServerCache({ tags, indexers });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getEnvs).mockReturnValue({ DRY_RUN: false, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" } as never);
  api.createReleaseProfile.mockResolvedValue({});
  api.updateReleaseProfile.mockResolvedValue({});
  api.deleteReleaseProfile.mockResolvedValue(undefined);
  api.deleteTag.mockResolvedValue(undefined);
  api.createTag.mockImplementation(async (tag: { label: string }) => ({ id: 50, label: tag.label }));
  api.getIndexers.mockResolvedValue([{ id: 7, name: "MyIndexer" }]);
});

describe("normalizeTerms", () => {
  test("splits comma-separated server strings", () => {
    expect(normalizeTerms("hevc, x265")).toEqual(["hevc", "x265"]);
  });

  test("keeps arrays", () => {
    expect(normalizeTerms(["hevc", "x265"])).toEqual(["hevc", "x265"]);
  });
});

describe("ReleaseProfiles", () => {
  test("creates a missing named profile", async () => {
    api.getReleaseProfiles.mockResolvedValue([]);

    const result = await namedSync().sync([{ name: "HEVC", required: ["hevc"] }], cache());

    expect(api.createReleaseProfile).toHaveBeenCalledWith({
      name: "HEVC",
      enabled: true,
      required: ["hevc"],
      ignored: [],
      indexerId: 0,
      tags: [],
    });
    expect(result.added).toBe(1);
    expect(result.diffEntries).toEqual([{ resourceType: "ReleaseProfile", name: "HEVC", action: "create" }]);
  });

  test("updates a named profile in place", async () => {
    api.getReleaseProfiles.mockResolvedValue([
      { id: 3, name: "HEVC", enabled: true, required: ["hevc"], ignored: [], indexerId: 0, tags: [] },
    ]);

    const result = await namedSync().sync([{ name: "HEVC", required: ["hevc", "x265"] }], cache());

    expect(api.updateReleaseProfile).toHaveBeenCalledWith("3", {
      id: 3,
      name: "HEVC",
      enabled: true,
      required: ["hevc", "x265"],
      ignored: [],
      indexerId: 0,
      tags: [],
    });
    expect(result.updated).toBe(1);
    expect(result.diffEntries[0]).toMatchObject({ action: "update", name: "HEVC" });
  });

  test("deletes unmatched server profiles", async () => {
    api.getReleaseProfiles.mockResolvedValue([
      { id: 1, name: "keep", enabled: true, required: ["hevc"], ignored: [], indexerId: 0, tags: [] },
      { id: 2, name: "gone", enabled: true, required: ["xvid"], ignored: [], indexerId: 0, tags: [] },
    ]);

    const result = await namedSync().sync([{ name: "keep", required: ["hevc"] }], cache());

    expect(api.deleteReleaseProfile).toHaveBeenCalledWith("2");
    expect(result.removed).toBe(1);
  });

  test("empty list deletes all server profiles", async () => {
    api.getReleaseProfiles.mockResolvedValue([{ id: 9, name: "old", enabled: true, required: ["a"], ignored: [], indexerId: 0, tags: [] }]);

    const result = await namedSync().sync([], cache());

    expect(api.deleteReleaseProfile).toHaveBeenCalledWith("9");
    expect(result.removed).toBe(1);
  });

  test("content-key matching without a name", async () => {
    api.getReleaseProfiles.mockResolvedValue([{ id: 4, enabled: true, required: ["hevc"], ignored: [], indexerId: 0, tags: [] }]);

    const result = await namedSync().sync([{ required: ["hevc"] }], cache());

    expect(api.createReleaseProfile).not.toHaveBeenCalled();
    expect(api.updateReleaseProfile).not.toHaveBeenCalled();
    expect(result.added).toBe(0);
    expect(result.updated).toBe(0);
  });

  test("throws on duplicate names", async () => {
    api.getReleaseProfiles.mockResolvedValue([]);

    await expect(namedSync().sync([{ name: "HEVC" }, { name: "HEVC" }], cache())).rejects.toBeInstanceOf(ConfigValidationError);
  });

  test("creates missing tags then uses their ids", async () => {
    api.getReleaseProfiles.mockResolvedValue([]);

    const serverCache = cache([{ id: 1, label: "existing" }]);
    await namedSync().sync([{ name: "HEVC", required: ["hevc"], tags: ["existing", "new-tag"] }], serverCache);

    expect(api.createTag).toHaveBeenCalledWith({ label: "new-tag" });
    expect(api.createReleaseProfile).toHaveBeenCalledWith(expect.objectContaining({ tags: [1, 50] }));
  });

  test("matches tag labels case-insensitively", async () => {
    api.getReleaseProfiles.mockResolvedValue([]);

    const serverCache = cache([{ id: 1, label: "Existing" }]);
    await namedSync().sync([{ name: "HEVC", required: ["hevc"], tags: ["eXISTING"] }], serverCache);

    expect(api.createTag).not.toHaveBeenCalled();
    expect(api.createReleaseProfile).toHaveBeenCalledWith(expect.objectContaining({ tags: [1] }));
  });

  test("creates a new tag with the label exactly as configured", async () => {
    api.getReleaseProfiles.mockResolvedValue([]);

    const serverCache = cache();
    await namedSync().sync([{ name: "HEVC", required: ["hevc"], tags: ["MyTag"] }], serverCache);

    // Casing must survive: the label the user wrote is the label the server gets.
    expect(api.createTag).toHaveBeenCalledWith({ label: "MyTag" });
    expect(api.createReleaseProfile).toHaveBeenCalledWith(expect.objectContaining({ tags: [expect.any(Number)] }));
  });

  test("resolves indexer name from a single cached load", async () => {
    api.getReleaseProfiles.mockResolvedValue([]);
    const serverCache = cache();

    await namedSync().sync(
      [
        { name: "one", required: ["a"], indexer: "MyIndexer" },
        { name: "two", required: ["b"], indexer: "MyIndexer" },
      ],
      serverCache,
    );

    expect(api.getIndexers).toHaveBeenCalledTimes(1);
    expect(api.createReleaseProfile).toHaveBeenCalledWith(expect.objectContaining({ name: "one", indexerId: 7 }));
    expect(api.createReleaseProfile).toHaveBeenCalledWith(expect.objectContaining({ name: "two", indexerId: 7 }));
  });

  test("does not load indexers when none are referenced", async () => {
    api.getReleaseProfiles.mockResolvedValue([]);

    await namedSync().sync([{ name: "HEVC", required: ["hevc"] }], cache());

    expect(api.getIndexers).not.toHaveBeenCalled();
  });

  test("throws on unknown indexer name", async () => {
    api.getReleaseProfiles.mockResolvedValue([]);

    await expect(namedSync().sync([{ name: "HEVC", indexer: "Missing" }], cache())).rejects.toBeInstanceOf(ConfigValidationError);
  });

  test("invalid config does not create tags", async () => {
    api.getReleaseProfiles.mockResolvedValue([]);

    await expect(
      namedSync().sync(
        [
          { name: "HEVC", tags: ["new-tag"] },
          { name: "HEVC", tags: ["new-tag"] },
        ],
        cache(),
      ),
    ).rejects.toBeInstanceOf(ConfigValidationError);
    expect(api.createTag).not.toHaveBeenCalled();
  });

  test("validates duplicate profiles before creating any tag", async () => {
    api.getReleaseProfiles.mockResolvedValue([]);

    const sync = namedSync();
    await expect(
      sync.sync(
        [
          { name: "HEVC", required: ["hevc"], tags: ["dup-a"] },
          { name: "HEVC", required: ["hevc"], tags: ["dup-b"] },
        ],
        cache(),
      ),
    ).rejects.toBeInstanceOf(ConfigValidationError);

    expect(api.createTag).not.toHaveBeenCalled();
    expect(api.createReleaseProfile).not.toHaveBeenCalled();
  });

  test("validates unknown indexer names before creating any tag", async () => {
    api.getReleaseProfiles.mockResolvedValue([]);

    await expect(namedSync().sync([{ name: "HEVC", indexer: "Missing", tags: ["new-tag"] }], cache())).rejects.toBeInstanceOf(
      ConfigValidationError,
    );

    expect(api.createTag).not.toHaveBeenCalled();
  });

  test("dry run skips writes", async () => {
    vi.mocked(getEnvs).mockReturnValue({ DRY_RUN: true, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" } as never);
    api.getReleaseProfiles.mockResolvedValue([{ id: 2, name: "gone", enabled: true, required: [], ignored: [], indexerId: 0, tags: [] }]);

    const result = await namedSync().sync([{ name: "HEVC", required: ["hevc"], tags: ["new"] }], cache());

    expect(api.createTag).not.toHaveBeenCalled();
    expect(api.createReleaseProfile).not.toHaveBeenCalled();
    expect(api.deleteReleaseProfile).not.toHaveBeenCalled();
    expect(result.added).toBe(1);
    expect(result.removed).toBe(1);
  });

  test("dry run reports tag updates without creating tags", async () => {
    vi.mocked(getEnvs).mockReturnValue({ DRY_RUN: true, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" } as never);
    api.getReleaseProfiles.mockResolvedValue([
      { id: 3, name: "HEVC", enabled: true, required: ["hevc"], ignored: [], indexerId: 0, tags: [] },
    ]);

    const result = await namedSync().sync([{ name: "HEVC", required: ["hevc"], tags: ["new"] }], cache());

    expect(api.createTag).not.toHaveBeenCalled();
    expect(api.updateReleaseProfile).not.toHaveBeenCalled();
    expect(result.updated).toBe(1);
    expect(result.diffEntries[0]).toMatchObject({ action: "update", name: "HEVC" });
  });

  test("dry run uses stable tag placeholders across nameless profiles", async () => {
    vi.mocked(getEnvs).mockReturnValue({ DRY_RUN: true, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" } as never);
    api.getReleaseProfiles.mockResolvedValue([]);

    const result = await namedSync().sync(
      [
        { required: ["hevc"], tags: ["new-a"] },
        { required: ["x265"], tags: ["new-b"] },
      ],
      cache(),
    );

    expect(result.added).toBe(2);
  });

  test("nameless config matches a named server profile with the same content", async () => {
    api.getReleaseProfiles.mockResolvedValue([
      { id: 3, name: "HEVC", enabled: true, required: ["hevc"], ignored: [], indexerId: 0, tags: [] },
    ]);

    const result = await namedSync().sync([{ required: ["hevc"] }], cache());

    expect(api.createReleaseProfile).not.toHaveBeenCalled();
    expect(api.deleteReleaseProfile).not.toHaveBeenCalled();
    expect(api.updateReleaseProfile).not.toHaveBeenCalled();
    expect(result.added).toBe(0);
    expect(result.removed).toBe(0);
    expect(result.updated).toBe(0);
  });

  test("throws on duplicate nameless content", async () => {
    api.getReleaseProfiles.mockResolvedValue([]);

    await expect(namedSync().sync([{ required: ["hevc"] }, { required: ["hevc"] }], cache())).rejects.toBeInstanceOf(ConfigValidationError);
  });

  test("without names a content change is delete and create", async () => {
    const sync = new BaseReleaseProfileSync<ReleaseProfileShared>(api, false);
    api.getReleaseProfiles.mockResolvedValue([{ id: 4, enabled: true, required: ["hevc"], ignored: [], indexerId: 0, tags: [] }]);

    const result = await sync.sync([{ required: ["hevc", "x265"] }], cache());

    expect(api.deleteReleaseProfile).toHaveBeenCalledWith("4");
    expect(api.createReleaseProfile).toHaveBeenCalled();
    expect(api.updateReleaseProfile).not.toHaveBeenCalled();
    expect(result.removed).toBe(1);
    expect(result.added).toBe(1);
  });

  test("trims array terms", () => {
    expect(normalizeTerms([" hevc ", "x265"])).toEqual(["hevc", "x265"]);
  });

  test("profileKey prefers name when supported", () => {
    expect(profileKey({ name: "HEVC", required: ["x"] }, true)).toBe("name:HEVC");
    expect(profileKey({ name: "HEVC", required: ["x"] }, false)).toContain("content:");
  });
});
