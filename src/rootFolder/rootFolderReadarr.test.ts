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
    getEnvs: vi.fn(() => ({ DRY_RUN: false, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" })),
  };
});

const setDryRun = (dryRun: boolean) =>
  vi.mocked(getEnvs).mockReturnValue({ DRY_RUN: dryRun, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" } as never);

describe("ReadarrRootFolderSync", () => {
  const mockApi: Mocked<ReadarrRootFolderApi> = {
    getRootfolders: vi.fn(),
    addRootFolder: vi.fn(),
    updateRootFolder: vi.fn(),
    deleteRootFolder: vi.fn(),
    getMetadataProfiles: vi.fn(),
    getQualityProfiles: vi.fn(),
    createTag: vi.fn(),
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

    it("does not create tags while resolving, it uses placeholder ids", async () => {
      serverCache.tags = [{ id: 100, label: "existing" }];

      const sync = new ReadarrRootFolderSync(mockApi);
      const config: InputConfigRootFolderReadarr = {
        path: "/books",
        name: "My Books",
        metadata_profile: "Standard",
        quality_profile: "eBook",
        tags: ["existing", "nonexistent"],
      };

      const result = await sync.resolveRootFolderConfig(config, serverCache);

      expect(mockApi.createTag).not.toHaveBeenCalled();
      expect(serverCache.tags).toEqual([{ id: 100, label: "existing" }]);
      expect(result.defaultTags?.[0]).toBe(100);
      // Placeholder ids are negative so they can never match a real server id.
      expect(result.defaultTags?.[1]).toBeLessThan(0);
    });
  });

  describe("syncRootFolders", () => {
    it("creates missing tags before persisting the folder", async () => {
      serverCache.tags = [{ id: 100, label: "existing" }];
      mockApi.createTag.mockResolvedValue({ id: 300, label: "nonexistent" });
      mockApi.getRootfolders.mockResolvedValue([]);

      const sync = new ReadarrRootFolderSync(mockApi);
      const result = await sync.syncRootFolders(
        [
          {
            path: "/books",
            name: "My Books",
            metadata_profile: "Standard",
            quality_profile: "eBook",
            tags: ["existing", "nonexistent"],
          },
        ],
        serverCache,
      );

      expect(mockApi.createTag).toHaveBeenCalledWith({ label: "nonexistent" });
      expect(mockApi.addRootFolder).toHaveBeenCalledWith(expect.objectContaining({ defaultTags: [100, 300] }));
      expect(result.added).toBe(1);
    });

    it("creates no tags during a dry run", async () => {
      setDryRun(true);
      serverCache.tags = [{ id: 100, label: "existing" }];
      mockApi.getRootfolders.mockResolvedValue([
        {
          path: "/books",
          id: 1,
          name: "My Books",
          defaultMetadataProfileId: 10,
          defaultQualityProfileId: 1,
          defaultTags: [100],
        },
      ]);

      const sync = new ReadarrRootFolderSync(mockApi);
      const result = await sync.syncRootFolders(
        [
          {
            path: "/books",
            name: "My Books",
            metadata_profile: "Standard",
            quality_profile: "eBook",
            tags: ["existing", "nonexistent"],
          },
        ],
        serverCache,
      );

      expect(mockApi.createTag).not.toHaveBeenCalled();
      expect(mockApi.addRootFolder).not.toHaveBeenCalled();
      expect(mockApi.updateRootFolder).not.toHaveBeenCalled();
      expect(serverCache.tags).toEqual([{ id: 100, label: "existing" }]);
      // The missing tag still shows up as a change so the dry run reports the work it would do.
      expect(result.updated).toBe(1);
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
  });
});
