import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateRootFolderDiff, resolveRootFolderConfig } from "./root-folder";
import { getUnifiedClient } from "./clients/unified-client";
import { ServerCache } from "./cache";
import { InputConfigRootFolderLidarr } from "./types/config.types";

// Mock the unified client
vi.mock("./clients/unified-client", () => ({
  getUnifiedClient: vi.fn(),
}));

// Mock the quality profiles loader
vi.mock("./quality-profiles", () => ({
  loadQualityProfilesFromServer: vi.fn(),
}));

import { loadQualityProfilesFromServer } from "./quality-profiles";

describe("root-folder", () => {
  const mockApi = {
    getRootfolders: vi.fn(),
    getMetadataProfiles: vi.fn(),
    createTag: vi.fn(),
  };

  let serverCache: ServerCache;

  beforeEach(() => {
    vi.clearAllMocks();
    (getUnifiedClient as any).mockReturnValue(mockApi);
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

  describe("calculateRootFolderDiff", () => {
    it("should handle string root folders", async () => {
      mockApi.getRootfolders.mockResolvedValue(["/existing"]);

      const result = await calculateRootFolderDiff(["/existing", "/new"], "RADARR", serverCache);

      expect(result).toEqual({
        missingOnServer: ["/new"],
        notAvailableAnymore: [],
        changed: [],
      });
    });

    it("should handle object root folders", async () => {
      mockApi.getRootfolders.mockResolvedValue(["/existing"]);

      const result = await calculateRootFolderDiff(
        [
          { path: "/existing", name: "existing", metadata_profile: "Standard", quality_profile: "Any" },
          { path: "/new", name: "new", metadata_profile: "Standard", quality_profile: "Any" },
        ],
        "LIDARR",
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

    it("should detect root folders not available anymore", async () => {
      mockApi.getRootfolders.mockResolvedValue(["/old-folder"]);

      const result = await calculateRootFolderDiff(["/new-folder"], "RADARR", serverCache);

      expect(result).toEqual({
        missingOnServer: ["/new-folder"],
        notAvailableAnymore: ["/old-folder"],
        changed: [],
      });
    });

    it("should handle mixed string and object root folders", async () => {
      mockApi.getRootfolders.mockResolvedValue(["/string-folder", "/object-folder"]);

      const result = await calculateRootFolderDiff(
        [
          "/string-folder",
          { path: "/object-folder", name: "object", metadata_profile: "Standard", quality_profile: "Any" },
          { path: "/new-object", name: "new", metadata_profile: "Standard", quality_profile: "Any" },
        ],
        "RADARR",
        serverCache,
      );

      expect(result).toEqual({
        missingOnServer: [{ path: "/new-object", name: "new", metadata_profile: "Standard", quality_profile: "Any" }],
        notAvailableAnymore: [],
        changed: [],
      });
    });

    it("should handle server returning objects", async () => {
      mockApi.getRootfolders.mockResolvedValue([
        { path: "/server-folder", id: 1, name: "Server Folder" },
        { path: "/old-server", id: 2, name: "Old Server" },
      ]);

      const result = await calculateRootFolderDiff(
        [
          { path: "/server-folder", name: "Config Folder", metadata_profile: "Standard", quality_profile: "Any" },
          { path: "/new-config", name: "New Config", metadata_profile: "Standard", quality_profile: "Any" },
        ],
        "LIDARR",
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

    it("should handle empty config", async () => {
      mockApi.getRootfolders.mockResolvedValue(["/server-folder"]);

      const result = await calculateRootFolderDiff([], "RADARR", serverCache);

      expect(result).toEqual({
        missingOnServer: [],
        notAvailableAnymore: ["/server-folder"],
        changed: [],
      });
    });

    it("should handle null/undefined config", async () => {
      mockApi.getRootfolders.mockResolvedValue([]);

      const result = await calculateRootFolderDiff(null as any, "RADARR", serverCache);

      expect(result).toBeNull();
    });
  });

  describe("resolveRootFolderConfig", () => {
    it("should handle string config for non-Lidarr", async () => {
      const result = await resolveRootFolderConfig("/path/to/folder", "RADARR", serverCache);
      expect(result).toEqual({ path: "/path/to/folder" });
    });

    it("should resolve Lidarr config with required fields", async () => {
      serverCache.tags = [
        { id: 100, label: "tag1" },
        { id: 200, label: "tag2" },
      ];

      const config: InputConfigRootFolderLidarr = {
        path: "/music",
        name: "My Music",
        metadata_profile: "Standard",
        quality_profile: "Any",
      };

      const result = await resolveRootFolderConfig(config, "LIDARR", serverCache);

      expect(result).toEqual({
        path: "/music",
        name: "My Music",
        defaultMetadataProfileId: 10,
        defaultQualityProfileId: 1,
      });
    });

    it("should resolve Lidarr config with optional monitor fields", async () => {
      serverCache.tags = [];

      const config: InputConfigRootFolderLidarr = {
        path: "/music",
        name: "My Music",
        metadata_profile: "Standard",
        quality_profile: "Any",
        monitor: "all",
        monitor_new_album: "new",
      };

      const result = await resolveRootFolderConfig(config, "LIDARR", serverCache);

      expect(result).toEqual({
        path: "/music",
        name: "My Music",
        defaultMetadataProfileId: 10,
        defaultQualityProfileId: 1,
        defaultMonitorOption: "all",
        defaultNewItemMonitorOption: "new",
      });
    });

    it("should resolve Lidarr config with existing tags", async () => {
      serverCache.tags = [
        { id: 100, label: "tag1" },
        { id: 200, label: "tag2" },
      ];

      const config: InputConfigRootFolderLidarr = {
        path: "/music",
        name: "My Music",
        metadata_profile: "Standard",
        quality_profile: "Any",
        tags: ["tag1", "tag2"],
      };

      const result = await resolveRootFolderConfig(config, "LIDARR", serverCache);

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

      const config: InputConfigRootFolderLidarr = {
        path: "/music",
        name: "My Music",
        metadata_profile: "NonExistent",
        quality_profile: "Any",
      };

      await expect(resolveRootFolderConfig(config, "LIDARR", serverCache)).rejects.toThrow(
        "Metadata profile 'NonExistent' not found on Lidarr server",
      );
    });

    it("should throw error for missing quality profile", async () => {
      serverCache.tags = [];

      const config: InputConfigRootFolderLidarr = {
        path: "/music",
        name: "My Music",
        metadata_profile: "Standard",
        quality_profile: "NonExistent",
      };

      await expect(resolveRootFolderConfig(config, "LIDARR", serverCache)).rejects.toThrow(
        "Quality profile 'NonExistent' not found on Lidarr server",
      );
    });

    it("should create missing tags", async () => {
      serverCache.tags = [{ id: 100, label: "existing" }];
      mockApi.createTag.mockResolvedValue({ id: 300, label: "nonexistent" });

      const config: InputConfigRootFolderLidarr = {
        path: "/music",
        name: "My Music",
        metadata_profile: "Standard",
        quality_profile: "Any",
        tags: ["existing", "nonexistent"],
      };

      const result = await resolveRootFolderConfig(config, "LIDARR", serverCache);

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
});
