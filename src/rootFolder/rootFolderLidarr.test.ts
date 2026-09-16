import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mocked } from "vitest";
import { MonitorTypes, NewItemMonitorTypes } from "../__generated__/lidarr/data-contracts";
import { LidarrRootFolderApi, LidarrRootFolderSync } from "./rootFolderLidarr";
import { ServerCache } from "../cache";
import { InputConfigRootFolderLidarr } from "../types/config.types";

describe("LidarrRootFolderSync", () => {
  const mockApi: Mocked<LidarrRootFolderApi> = {
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
    serverCache = new ServerCache();
    serverCache.tags = [];
    mockApi.getQualityProfiles.mockResolvedValue([
      { id: 1, name: "Any" },
      { id: 2, name: "Lossless" },
    ]);
    mockApi.getMetadataProfiles.mockResolvedValue([
      { id: 10, name: "Standard" },
      { id: 20, name: "Enhanced" },
    ]);
  });

  describe("resolveRootFolderConfig", () => {
    it("should resolve Lidarr config with required fields", async () => {
      serverCache.tags = [
        { id: 100, label: "tag1" },
        { id: 200, label: "tag2" },
      ];

      const sync = new LidarrRootFolderSync(mockApi);
      const config: InputConfigRootFolderLidarr = {
        path: "/music",
        name: "My Music",
        metadata_profile: "Standard",
        quality_profile: "Any",
      };

      const result = await sync.resolveRootFolderConfig(config, serverCache);

      expect(result).toEqual({
        path: "/music",
        name: "My Music",
        defaultMetadataProfileId: 10,
        defaultQualityProfileId: 1,
        defaultTags: [],
      });
    });

    it("fetches quality and metadata profiles once across resolves", async () => {
      const sync = new LidarrRootFolderSync(mockApi);
      const config: InputConfigRootFolderLidarr = {
        path: "/music",
        name: "My Music",
        metadata_profile: "Standard",
        quality_profile: "Any",
      };

      await sync.resolveRootFolderConfig(config, serverCache);
      await sync.resolveRootFolderConfig({ ...config, path: "/music2", name: "Other" }, serverCache);

      expect(mockApi.getQualityProfiles).toHaveBeenCalledTimes(1);
      expect(mockApi.getMetadataProfiles).toHaveBeenCalledTimes(1);
    });

    it("uses cached quality profiles instead of fetching", async () => {
      serverCache.qualityProfiles = [
        { id: 1, name: "Any" },
        { id: 2, name: "Lossless" },
      ];

      const sync = new LidarrRootFolderSync(mockApi);
      const result = await sync.resolveRootFolderConfig(
        {
          path: "/music",
          name: "My Music",
          metadata_profile: "Standard",
          quality_profile: "Any",
        },
        serverCache,
      );

      expect(mockApi.getQualityProfiles).not.toHaveBeenCalled();
      expect(mockApi.getMetadataProfiles).toHaveBeenCalledTimes(1);
      expect(result.defaultQualityProfileId).toBe(1);
    });

    it("should resolve Lidarr config with optional monitor fields", async () => {
      serverCache.tags = [];

      const sync = new LidarrRootFolderSync(mockApi);
      const config: InputConfigRootFolderLidarr = {
        path: "/music",
        name: "My Music",
        metadata_profile: "Standard",
        quality_profile: "Any",
        monitor: "all",
        monitor_new_album: "new",
      };

      const result = await sync.resolveRootFolderConfig(config, serverCache);

      expect(result).toEqual({
        path: "/music",
        name: "My Music",
        defaultMetadataProfileId: 10,
        defaultQualityProfileId: 1,
        defaultMonitorOption: "all",
        defaultNewItemMonitorOption: "new",
        defaultTags: [],
      });
    });

    it("should resolve Lidarr config with existing tags", async () => {
      serverCache.tags = [
        { id: 100, label: "tag1" },
        { id: 200, label: "tag2" },
      ];

      const sync = new LidarrRootFolderSync(mockApi);
      const config: InputConfigRootFolderLidarr = {
        path: "/music",
        name: "My Music",
        metadata_profile: "Standard",
        quality_profile: "Any",
        tags: ["tag1", "tag2"],
      };

      const result = await sync.resolveRootFolderConfig(config, serverCache);

      expect(result).toEqual({
        path: "/music",
        name: "My Music",
        defaultMetadataProfileId: 10,
        defaultQualityProfileId: 1,
        defaultTags: [100, 200],
      });
    });

    it("should throw error for missing metadata profile", async () => {
      serverCache.tags = [];

      const sync = new LidarrRootFolderSync(mockApi);
      const config: InputConfigRootFolderLidarr = {
        path: "/music",
        name: "My Music",
        metadata_profile: "NonExistent",
        quality_profile: "Any",
      };

      await expect(sync.resolveRootFolderConfig(config, serverCache)).rejects.toThrow(
        "Metadata profile 'NonExistent' not found on Lidarr server",
      );
    });

    it("should throw error for missing quality profile", async () => {
      serverCache.tags = [];

      const sync = new LidarrRootFolderSync(mockApi);
      const config: InputConfigRootFolderLidarr = {
        path: "/music",
        name: "My Music",
        metadata_profile: "Standard",
        quality_profile: "NonExistent",
      };

      await expect(sync.resolveRootFolderConfig(config, serverCache)).rejects.toThrow(
        "Quality profile 'NonExistent' not found on Lidarr server",
      );
    });

    it("should create missing tags", async () => {
      serverCache.tags = [{ id: 100, label: "existing" }];
      mockApi.createTag.mockResolvedValue({ id: 300, label: "nonexistent" });

      const sync = new LidarrRootFolderSync(mockApi);
      const config: InputConfigRootFolderLidarr = {
        path: "/music",
        name: "My Music",
        metadata_profile: "Standard",
        quality_profile: "Any",
        tags: ["existing", "nonexistent"],
      };

      const result = await sync.resolveRootFolderConfig(config, serverCache);

      expect(mockApi.createTag).toHaveBeenCalledWith({ label: "nonexistent" });
      expect(result).toEqual({
        path: "/music",
        name: "My Music",
        defaultMetadataProfileId: 10,
        defaultQualityProfileId: 1,
        defaultTags: [100, 300],
      });
      expect(serverCache.tags).toEqual([
        { id: 100, label: "existing" },
        { id: 300, label: "nonexistent" },
      ]);
    });
  });

  describe("calculateDiff", () => {
    it("should handle object root folders", async () => {
      mockApi.getRootfolders.mockResolvedValue([{ path: "/existing" }]);

      const sync = new LidarrRootFolderSync(mockApi);
      const result = await sync.calculateDiff(
        [
          { path: "/existing", name: "existing", metadata_profile: "Standard", quality_profile: "Any" },
          { path: "/new", name: "new", metadata_profile: "Standard", quality_profile: "Any" },
        ],
        serverCache,
      );

      expect(result?.missingOnServer).toEqual([{ path: "/new", name: "new", metadata_profile: "Standard", quality_profile: "Any" }]);
      expect(result?.notAvailableAnymore).toEqual([]);
      expect(result?.changed).toHaveLength(1);
      expect(result?.changed[0]?.config).toEqual({
        path: "/existing",
        name: "existing",
        metadata_profile: "Standard",
        quality_profile: "Any",
      });
      expect(result?.changed[0]?.server).toEqual({ path: "/existing" });
      expect(result?.changed[0]?.fieldChanges.length).toBeGreaterThan(0);
    });

    it("should handle server returning objects", async () => {
      mockApi.getRootfolders.mockResolvedValue([
        { path: "/server-folder", id: 1, name: "Server Folder" },
        { path: "/old-server", id: 2, name: "Old Server" },
      ]);

      const sync = new LidarrRootFolderSync(mockApi);
      const result = await sync.calculateDiff(
        [
          { path: "/server-folder", name: "Config Folder", metadata_profile: "Standard", quality_profile: "Any" },
          { path: "/new-config", name: "New Config", metadata_profile: "Standard", quality_profile: "Any" },
        ],
        serverCache,
      );

      expect(result?.missingOnServer).toEqual([
        { path: "/new-config", name: "New Config", metadata_profile: "Standard", quality_profile: "Any" },
      ]);
      expect(result?.notAvailableAnymore).toEqual([{ path: "/old-server", id: 2, name: "Old Server" }]);
      expect(result?.changed).toHaveLength(1);
      expect(result?.changed[0]?.config).toEqual({
        path: "/server-folder",
        name: "Config Folder",
        metadata_profile: "Standard",
        quality_profile: "Any",
      });
      expect(result?.changed[0]?.server).toEqual({ path: "/server-folder", id: 1, name: "Server Folder" });
      expect(result?.changed[0]?.fieldChanges.length).toBeGreaterThan(0);
    });

    it("exposes structured fieldChanges for a changed root folder", async () => {
      mockApi.getRootfolders.mockResolvedValue([
        { path: "/music", id: 1, name: "old-name", defaultQualityProfileId: 1, defaultMetadataProfileId: 10, defaultTags: [] },
      ]);

      const sync = new LidarrRootFolderSync(mockApi);
      const result = await sync.calculateDiff(
        [{ path: "/music", name: "new-name", metadata_profile: "Standard", quality_profile: "Any" }],
        serverCache,
      );

      expect(result?.changed).toHaveLength(1);
      expect(result?.changed[0]?.fieldChanges).toContainEqual({ field: "name", from: "old-name", to: "new-name" });
    });

    it("does not treat omitted monitor as a change against the server default", async () => {
      mockApi.getRootfolders.mockResolvedValue([
        {
          path: "/music",
          id: 1,
          name: "My Music",
          defaultMetadataProfileId: 10,
          defaultQualityProfileId: 1,
          defaultMonitorOption: MonitorTypes.All,
          defaultNewItemMonitorOption: NewItemMonitorTypes.All,
          defaultTags: [],
        },
      ]);

      const sync = new LidarrRootFolderSync(mockApi);
      const result = await sync.calculateDiff(
        [{ path: "/music", name: "My Music", metadata_profile: "Standard", quality_profile: "Any" }],
        serverCache,
      );

      expect(result).toBeNull();
    });
  });
});
