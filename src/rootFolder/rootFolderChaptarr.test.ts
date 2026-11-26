import type { Mocked } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ServerCache } from "../cache";
import { getEnvs } from "../env";
import { logger } from "../logger";
import type { InputConfigRootFolderChaptarr } from "../types/config.types";
import { type ChaptarrRootFolderApi, ChaptarrRootFolderSync, validateChaptarrRootFolderFields } from "./rootFolderChaptarr";

vi.mock("../env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../env")>();
  return {
    ...actual,
    getEnvs: vi.fn(() => ({ DRY_RUN: false, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" })),
  };
});

const setDryRun = (dryRun: boolean) =>
  vi.mocked(getEnvs).mockReturnValue({ DRY_RUN: dryRun, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" } as never);

describe("ChaptarrRootFolderSync", () => {
  const mockApi: Mocked<ChaptarrRootFolderApi> = {
    getRootfolders: vi.fn(),
    addRootFolder: vi.fn(),
    updateRootFolder: vi.fn(),
    deleteRootFolder: vi.fn(),
    getMetadataProfiles: vi.fn(),
    getQualityProfiles: vi.fn(),
    getTags: vi.fn(),
    createTag: vi.fn(),
    deleteTag: vi.fn(),
  };

  const config: InputConfigRootFolderChaptarr = {
    path: "/books",
    name: "Books",
    metadata_profile: "Standard",
    quality_profile: "eBook",
  };

  let serverCache: ServerCache;

  beforeEach(() => {
    vi.clearAllMocks();
    setDryRun(false);
    serverCache = new ServerCache();
    serverCache.tags = [];
    mockApi.getQualityProfiles.mockResolvedValue([
      { id: 1, name: "eBook" },
      { id: 2, name: "Audiobook" },
    ]);
    mockApi.getMetadataProfiles.mockResolvedValue([
      { id: 10, name: "Standard" },
      { id: 20, name: "None" },
    ]);
  });

  it("adds folderType and the ebook profile pair for media_type ebook", async () => {
    const result = await new ChaptarrRootFolderSync(mockApi, "ebook").resolveRootFolderConfig(config, serverCache);
    expect(result).toMatchObject({
      folderType: 2,
      ebookQualityProfileId: 1,
      ebookMetadataProfileId: 10,
    });
    expect(result.audiobookQualityProfileId).toBeUndefined();
  });

  it("defaults an omitted media_type to ebook", async () => {
    const result = await new ChaptarrRootFolderSync(mockApi).resolveRootFolderConfig(config, serverCache);
    expect(result).toMatchObject({
      folderType: 2,
      ebookQualityProfileId: 1,
      ebookMetadataProfileId: 10,
    });
  });

  it("adds folderType and the audiobook profile pair for media_type audiobook", async () => {
    const result = await new ChaptarrRootFolderSync(mockApi, "audiobook").resolveRootFolderConfig(
      { ...config, quality_profile: "Audiobook" },
      serverCache,
    );
    expect(result).toMatchObject({
      folderType: 1,
      audiobookQualityProfileId: 2,
      audiobookMetadataProfileId: 10,
    });
    expect(result.ebookQualityProfileId).toBeUndefined();
  });

  it("resolves both profile pairs for a mixed folder", async () => {
    const result = await new ChaptarrRootFolderSync(mockApi, "mixed").resolveRootFolderConfig(
      {
        ...config,
        ebook_quality_profile: "eBook",
        audiobook_quality_profile: "Audiobook",
        audiobook_metadata_profile: "None",
      },
      serverCache,
    );
    expect(result).toMatchObject({
      folderType: 0,
      ebookQualityProfileId: 1,
      ebookMetadataProfileId: 10,
      audiobookQualityProfileId: 2,
      audiobookMetadataProfileId: 20,
    });
  });

  it("reports no change when a typed folder round-trips", async () => {
    mockApi.getRootfolders.mockResolvedValue([
      {
        path: "/books",
        id: 1,
        name: "Books",
        defaultTags: [],
        folderType: 2,
        ebookQualityProfileId: 1,
        ebookMetadataProfileId: 10,
      },
    ]);
    expect(await new ChaptarrRootFolderSync(mockApi, "ebook").calculateDiff([config], serverCache)).toBeNull();
  });

  it("detects ebook profile changes when media_type is omitted", async () => {
    mockApi.getRootfolders.mockResolvedValue([
      {
        path: "/books",
        id: 1,
        name: "Books",
        defaultTags: [],
        folderType: 2,
        ebookQualityProfileId: 2,
        ebookMetadataProfileId: 10,
      },
    ]);
    expect(await new ChaptarrRootFolderSync(mockApi).calculateDiff([config], serverCache)).not.toBeNull();
  });
});

describe("validateChaptarrRootFolderFields", () => {
  afterEach(() => vi.restoreAllMocks());

  const typed = {
    path: "/books",
    name: "Books",
    metadata_profile: "Standard",
    quality_profile: "E-Book",
    audiobook_quality_profile: "Audio",
  };
  const plain = { path: "/books", name: "Books", metadata_profile: "Standard", quality_profile: "E-Book" };

  it("accepts typed profile keys on a mixed Chaptarr instance", () => {
    expect(() => validateChaptarrRootFolderFields([typed], "CHAPTARR", "mixed")).not.toThrow();
  });

  it("rejects typed profile keys on a single-media Chaptarr instance", () => {
    expect(() => validateChaptarrRootFolderFields([typed], "CHAPTARR", "audiobook")).toThrow(/only to media_type: mixed/);
    expect(() => validateChaptarrRootFolderFields([typed], "CHAPTARR", undefined)).toThrow(/only to media_type: mixed/);
  });

  it("rejects typed profile keys on other apps", () => {
    expect(() => validateChaptarrRootFolderFields([typed], "READARR", undefined)).toThrow(/only by Chaptarr, not READARR/);
  });

  it("warns once and ignores root folder keys Chaptarr has no field for", () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const withMonitor = { ...plain, monitor: "all" as const, monitor_new_items: "all" as const };
    expect(() => validateChaptarrRootFolderFields([withMonitor, withMonitor], "CHAPTARR", "mixed")).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("monitor, monitor_new_items"));

    warn.mockClear();
    expect(() => validateChaptarrRootFolderFields([withMonitor], "READARR", undefined)).not.toThrow();
    expect(warn).not.toHaveBeenCalled();
  });

  it("still rejects typed profile keys next to ignored monitor keys", () => {
    vi.spyOn(logger, "warn").mockImplementation(() => {});
    expect(() => validateChaptarrRootFolderFields([{ ...typed, monitor: "all" as const }], "CHAPTARR", "ebook")).toThrow(
      /only to media_type: mixed/,
    );
  });

  it("ignores folders without typed keys and string folders", () => {
    expect(() => validateChaptarrRootFolderFields([plain, "/other"], "READARR", undefined)).not.toThrow();
    expect(() => validateChaptarrRootFolderFields(undefined, "SONARR", undefined)).not.toThrow();
  });
});
