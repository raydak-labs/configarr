import { describe, it, expect, vi, beforeEach } from "vitest";
import { LidarrRootFolderSync } from "./rootFolderLidarr";
import { ServerCache } from "../cache";
import { InputConfigRootFolderLidarr } from "../types/config.types";
import { getSpecificClient } from "../clients/unified-client";

// Mock the unified client
vi.mock("../clients/unified-client", () => ({
  getSpecificClient: vi.fn(),
}));

// Mock the quality profiles loader
vi.mock("../quality-profiles", () => ({
  loadQualityProfilesFromServer: vi.fn(),
}));

import { loadQualityProfilesFromServer } from "../quality-profiles";

describe("LidarrRootFolderSync", () => {
  const mockApi = {
    getRootfolders: vi.fn(),
    getMetadataProfiles: vi.fn(),
    createTag: vi.fn(),
  };

  let serverCache: ServerCache;

  beforeEach(() => {
    vi.clearAllMocks();
    (getSpecificClient as any).mockReturnValue(mockApi);
    serverCache = new ServerCache([], [], [], []);
    serverCache.tags = [];
    vi.mocked(loadQualityProfilesFromServer).mockResolvedValue([
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

      const sync = new LidarrRootFolderSync();
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

    it("should resolve Lidarr config with optional monitor fields", async () => {
      serverCache.tags = [];

      const sync = new LidarrRootFolderSync();
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

      const sync = new LidarrRootFolderSync();
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

      const sync = new LidarrRootFolderSync();
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

      const sync = new LidarrRootFolderSync();
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

      const sync = new LidarrRootFolderSync();
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
      mockApi.getRootfolders.mockResolvedValue(["/existing"]);

      const sync = new LidarrRootFolderSync();
      const result = await sync.calculateDiff(
        [
          { path: "/existing", name: "existing", metadata_profile: "Standard", quality_profile: "Any" },
          { path: "/new", name: "new", metadata_profile: "Standard", quality_profile: "Any" },
        ],
        serverCache,
      );

      expect(result).toEqual({
        missingOnServer: [{ path: "/new", name: "new", metadata_profile: "Standard", quality_profile: "Any" }],
        notAvailableAnymore: [],
        changed: [
          { config: { path: "/existing", name: "existing", metadata_profile: "Standard", quality_profile: "Any" }, server: "/existing" },
        ],
      });
    });

    it("should handle server returning objects", async () => {
      mockApi.getRootfolders.mockResolvedValue([
        { path: "/server-folder", id: 1, name: "Server Folder" },
        { path: "/old-server", id: 2, name: "Old Server" },
      ]);

      const sync = new LidarrRootFolderSync();
      const result = await sync.calculateDiff(
        [
          { path: "/server-folder", name: "Config Folder", metadata_profile: "Standard", quality_profile: "Any" },
          { path: "/new-config", name: "New Config", metadata_profile: "Standard", quality_profile: "Any" },
        ],
        serverCache,
      );

      expect(result).toEqual({
        missingOnServer: [{ path: "/new-config", name: "New Config", metadata_profile: "Standard", quality_profile: "Any" }],
        notAvailableAnymore: [{ path: "/old-server", id: 2, name: "Old Server" }],
        changed: [
          {
            config: { path: "/server-folder", name: "Config Folder", metadata_profile: "Standard", quality_profile: "Any" },
            server: { path: "/server-folder", id: 1, name: "Server Folder" },
          },
        ],
      });
    });
  });
});
