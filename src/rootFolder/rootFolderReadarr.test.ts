import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mocked } from "vitest";
import { MonitorTypes, NewItemMonitorTypes } from "../__generated__/readarr/data-contracts";
import { ReadarrRootFolderApi, ReadarrRootFolderSync } from "./rootFolderReadarr";
import { ServerCache } from "../cache";
import { getEnvs } from "../env";
import { InputConfigRootFolderReadarr } from "../types/config.types";

vi.mock("../env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../env")>();
  return {
    ...actual,
    getEnvs: vi.fn(() => ({ DRY_RUN: false, LOG_LEVEL: "fatal", CONFIGARR_VERSION: "test" })),
  };
});

describe("ReadarrRootFolderSync", () => {
  const mockApi: Mocked<ReadarrRootFolderApi> = {
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

  let serverCache: ServerCache;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEnvs).mockReturnValue({ DRY_RUN: false, LOG_LEVEL: "fatal", CONFIGARR_VERSION: "test" } as never);
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

  describe("resolveRootFolderConfig", () => {
    it("should resolve Readarr config with required fields", async () => {
      serverCache.tags = [
        { id: 100, label: "tag1" },
        { id: 200, label: "tag2" },
      ];

      const sync = new ReadarrRootFolderSync(mockApi);
      const config: InputConfigRootFolderReadarr = {
        path: "/books",
        name: "My Books",
        metadata_profile: "Standard",
        quality_profile: "eBook",
      };

      const result = await sync.resolveRootFolderConfig(config, serverCache);

      expect(result).toEqual({
        path: "/books",
        name: "My Books",
        defaultMetadataProfileId: 10,
        defaultQualityProfileId: 1,
        defaultTags: [],
      });
    });

    it("fetches quality and metadata profiles once across resolves", async () => {
      const sync = new ReadarrRootFolderSync(mockApi);
      const config: InputConfigRootFolderReadarr = {
        path: "/books",
        name: "My Books",
        metadata_profile: "Standard",
        quality_profile: "eBook",
      };

      await sync.resolveRootFolderConfig(config, serverCache);
      await sync.resolveRootFolderConfig({ ...config, path: "/books2", name: "Other" }, serverCache);

      expect(mockApi.getQualityProfiles).toHaveBeenCalledTimes(1);
      expect(mockApi.getMetadataProfiles).toHaveBeenCalledTimes(1);
    });

    it("uses cached quality profiles instead of fetching", async () => {
      serverCache.qualityProfiles = [
        { id: 1, name: "eBook" },
        { id: 2, name: "Audiobook" },
      ];

      const sync = new ReadarrRootFolderSync(mockApi);
      const result = await sync.resolveRootFolderConfig(
        {
          path: "/books",
          name: "My Books",
          metadata_profile: "Standard",
          quality_profile: "eBook",
        },
        serverCache,
      );

      expect(mockApi.getQualityProfiles).not.toHaveBeenCalled();
      expect(mockApi.getMetadataProfiles).toHaveBeenCalledTimes(1);
      expect(result.defaultQualityProfileId).toBe(1);
    });

    it("should resolve Readarr config with optional monitor fields", async () => {
      serverCache.tags = [];

      const sync = new ReadarrRootFolderSync(mockApi);
      const config: InputConfigRootFolderReadarr = {
        path: "/books",
        name: "My Books",
        metadata_profile: "Standard",
        quality_profile: "eBook",
        monitor: "all",
        monitor_new_items: "new",
      };

      const result = await sync.resolveRootFolderConfig(config, serverCache);

      expect(result).toEqual({
        path: "/books",
        name: "My Books",
        defaultMetadataProfileId: 10,
        defaultQualityProfileId: 1,
        defaultMonitorOption: "all",
        defaultNewItemMonitorOption: "new",
        defaultTags: [],
      });
    });

    it("should resolve Readarr config with existing tags", async () => {
      serverCache.tags = [
        { id: 100, label: "tag1" },
        { id: 200, label: "tag2" },
      ];

      const sync = new ReadarrRootFolderSync(mockApi);
      const config: InputConfigRootFolderReadarr = {
        path: "/books",
        name: "My Books",
        metadata_profile: "Standard",
        quality_profile: "eBook",
        tags: ["tag1", "tag2"],
      };

      const result = await sync.resolveRootFolderConfig(config, serverCache);

      expect(result).toEqual({
        path: "/books",
        name: "My Books",
        defaultMetadataProfileId: 10,
        defaultQualityProfileId: 1,
        defaultTags: [100, 200],
      });
    });

    it("should resolve Readarr config with Calibre integration", async () => {
      serverCache.tags = [];

      const sync = new ReadarrRootFolderSync(mockApi);
      const config: InputConfigRootFolderReadarr = {
        path: "/books",
        name: "Calibre Library",
        metadata_profile: "Standard",
        quality_profile: "eBook",
        is_calibre_library: true,
        calibre_host: "localhost",
        calibre_port: 8080,
      };

      const result = await sync.resolveRootFolderConfig(config, serverCache);

      expect(result).toEqual({
        path: "/books",
        name: "Calibre Library",
        defaultMetadataProfileId: 10,
        defaultQualityProfileId: 1,
        defaultTags: [],
        isCalibreLibrary: true,
        host: "localhost",
        port: 8080,
      });
    });

    it("should throw error for missing metadata profile", async () => {
      serverCache.tags = [];

      const sync = new ReadarrRootFolderSync(mockApi);
      const config: InputConfigRootFolderReadarr = {
        path: "/books",
        name: "My Books",
        metadata_profile: "NonExistent",
        quality_profile: "eBook",
      };

      await expect(sync.resolveRootFolderConfig(config, serverCache)).rejects.toThrow(
        "Metadata profile 'NonExistent' not found on Readarr server",
      );
    });

    it("should throw error for missing quality profile", async () => {
      serverCache.tags = [];

      const sync = new ReadarrRootFolderSync(mockApi);
      const config: InputConfigRootFolderReadarr = {
        path: "/books",
        name: "My Books",
        metadata_profile: "Standard",
        quality_profile: "NonExistent",
      };

      await expect(sync.resolveRootFolderConfig(config, serverCache)).rejects.toThrow(
        "Quality profile 'NonExistent' not found on Readarr server",
      );
    });

    it("should create missing tags", async () => {
      serverCache.tags = [{ id: 100, label: "existing" }];
      mockApi.createTag.mockResolvedValue({ id: 300, label: "nonexistent" });

      const sync = new ReadarrRootFolderSync(mockApi);
      const config: InputConfigRootFolderReadarr = {
        path: "/books",
        name: "My Books",
        metadata_profile: "Standard",
        quality_profile: "eBook",
        tags: ["existing", "nonexistent"],
      };

      const result = await sync.resolveRootFolderConfig(config, serverCache);

      expect(mockApi.createTag).toHaveBeenCalledWith({ label: "nonexistent" });
      expect(result).toEqual({
        path: "/books",
        name: "My Books",
        defaultMetadataProfileId: 10,
        defaultQualityProfileId: 1,
        defaultTags: [100, 300],
      });
      expect(serverCache.tags).toEqual([
        { id: 100, label: "existing" },
        { id: 300, label: "nonexistent" },
      ]);
    });

    it("should match existing tags case-insensitively", async () => {
      serverCache.tags = [{ id: 100, label: "Existing" }];

      const sync = new ReadarrRootFolderSync(mockApi);
      const result = await sync.resolveRootFolderConfig(
        {
          path: "/books",
          name: "My Books",
          metadata_profile: "Standard",
          quality_profile: "eBook",
          tags: ["eXISTING"],
        },
        serverCache,
      );

      expect(mockApi.createTag).not.toHaveBeenCalled();
      expect(result.defaultTags).toEqual([100]);
    });

    it("should not create tags on a dry run and resolve placeholder ids", async () => {
      vi.mocked(getEnvs).mockReturnValue({ DRY_RUN: true, LOG_LEVEL: "fatal", CONFIGARR_VERSION: "test" } as never);
      serverCache.tags = [{ id: 100, label: "existing" }];

      const sync = new ReadarrRootFolderSync(mockApi);
      const result = await sync.resolveRootFolderConfig(
        {
          path: "/books",
          name: "My Books",
          metadata_profile: "Standard",
          quality_profile: "eBook",
          tags: ["existing", "new-tag"],
        },
        serverCache,
      );

      expect(mockApi.createTag).not.toHaveBeenCalled();
      expect(result.defaultTags).toEqual([100, -1]);
      // The synthetic id must never reach the server cache.
      expect(serverCache.tags).toEqual([{ id: 100, label: "existing" }]);
    });

    it("should keep a placeholder id stable across resolves on a dry run", async () => {
      vi.mocked(getEnvs).mockReturnValue({ DRY_RUN: true, LOG_LEVEL: "fatal", CONFIGARR_VERSION: "test" } as never);
      serverCache.tags = [{ id: 100, label: "other" }];

      const sync = new ReadarrRootFolderSync(mockApi);
      const config: InputConfigRootFolderReadarr = {
        path: "/books",
        name: "My Books",
        metadata_profile: "Standard",
        quality_profile: "eBook",
        tags: ["new-tag"],
      };

      const first = await sync.resolveRootFolderConfig(config, serverCache);
      const second = await sync.resolveRootFolderConfig({ ...config, path: "/books2" }, serverCache);

      expect(mockApi.createTag).not.toHaveBeenCalled();
      expect(first.defaultTags).toEqual([-1]);
      expect(second.defaultTags).toEqual([-1]);
    });
  });

  describe("calculateDiff", () => {
    it("should handle object root folders", async () => {
      mockApi.getRootfolders.mockResolvedValue([{ path: "/existing" }]);

      const sync = new ReadarrRootFolderSync(mockApi);
      const result = await sync.calculateDiff(
        [
          { path: "/existing", name: "existing", metadata_profile: "Standard", quality_profile: "eBook" },
          { path: "/new", name: "new", metadata_profile: "Standard", quality_profile: "eBook" },
        ],
        serverCache,
      );

      expect(result?.missingOnServer).toEqual([{ path: "/new", name: "new", metadata_profile: "Standard", quality_profile: "eBook" }]);
      expect(result?.notAvailableAnymore).toEqual([]);
      expect(result?.changed).toHaveLength(1);
      expect(result?.changed[0]?.config).toEqual({
        path: "/existing",
        name: "existing",
        metadata_profile: "Standard",
        quality_profile: "eBook",
      });
      expect(result?.changed[0]?.server).toEqual({ path: "/existing" });
      expect(result?.changed[0]?.fieldChanges.length).toBeGreaterThan(0);
    });

    it("should handle server returning objects", async () => {
      mockApi.getRootfolders.mockResolvedValue([
        { path: "/server-folder", id: 1, name: "Server Folder" },
        { path: "/old-server", id: 2, name: "Old Server" },
      ]);

      const sync = new ReadarrRootFolderSync(mockApi);
      const result = await sync.calculateDiff(
        [
          { path: "/server-folder", name: "Config Folder", metadata_profile: "Standard", quality_profile: "eBook" },
          { path: "/new-config", name: "New Config", metadata_profile: "Standard", quality_profile: "eBook" },
        ],
        serverCache,
      );

      expect(result?.missingOnServer).toEqual([
        { path: "/new-config", name: "New Config", metadata_profile: "Standard", quality_profile: "eBook" },
      ]);
      expect(result?.notAvailableAnymore).toEqual([{ path: "/old-server", id: 2, name: "Old Server" }]);
      expect(result?.changed).toHaveLength(1);
      expect(result?.changed[0]?.config).toEqual({
        path: "/server-folder",
        name: "Config Folder",
        metadata_profile: "Standard",
        quality_profile: "eBook",
      });
      expect(result?.changed[0]?.server).toEqual({ path: "/server-folder", id: 1, name: "Server Folder" });
      expect(result?.changed[0]?.fieldChanges.length).toBeGreaterThan(0);
    });

    it("does not treat omitted calibre/monitor fields as changes against server defaults", async () => {
      mockApi.getRootfolders.mockResolvedValue([
        {
          path: "/books",
          id: 1,
          name: "App",
          defaultMetadataProfileId: 10,
          defaultQualityProfileId: 1,
          defaultMonitorOption: MonitorTypes.All,
          defaultNewItemMonitorOption: NewItemMonitorTypes.All,
          defaultTags: [],
          isCalibreLibrary: false,
          port: 0,
          useSsl: false,
        },
      ]);

      const sync = new ReadarrRootFolderSync(mockApi);
      const result = await sync.calculateDiff(
        [{ path: "/books", name: "App", metadata_profile: "Standard", quality_profile: "eBook" }],
        serverCache,
      );

      expect(result).toBeNull();
    });

    it("does not create tags while calculating a dry-run diff", async () => {
      vi.mocked(getEnvs).mockReturnValue({ DRY_RUN: true, LOG_LEVEL: "fatal", CONFIGARR_VERSION: "test" } as never);
      mockApi.getRootfolders.mockResolvedValue([
        { path: "/books", id: 1, name: "My Books", defaultMetadataProfileId: 10, defaultQualityProfileId: 1, defaultTags: [100] },
      ]);

      const sync = new ReadarrRootFolderSync(mockApi);
      await sync.calculateDiff(
        [{ path: "/books", name: "My Books", metadata_profile: "Standard", quality_profile: "eBook", tags: ["new-tag"] }],
        serverCache,
      );

      expect(mockApi.createTag).not.toHaveBeenCalled();
      expect(serverCache.tags).toEqual([]);
    });
  });
});
