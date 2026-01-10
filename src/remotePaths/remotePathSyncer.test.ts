import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncRemotePaths } from "./remotePathSyncer";
import { getUnifiedClient, getSpecificClient } from "../clients/unified-client";
import { RemotePathMappingResource } from "./remotePath.types";

// Mock env - use importOriginal to preserve other env functions
vi.mock("../env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../env")>();
  return {
    ...actual,
    getEnvs: vi.fn(() => ({
      DRY_RUN: false,
      LOG_LEVEL: "silent",
      DEBUG_CREATE_FILES: false,
      CONFIGARR_VERSION: "test",
      ROOT_PATH: "/tmp/test",
    })),
  };
});

vi.mock("../clients/unified-client");
vi.mock("../logger");

describe("remotePathSyncer", () => {
  let mockCache: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCache = {
      tags: [],
    };
  });

  it("should return early when no remote_paths in config", async () => {
    const config: any = {
      custom_formats: [],
      quality_profiles: [],
      download_clients: {},
    };

    const result = await syncRemotePaths("RADARR", config, mockCache);

    expect(result).toEqual({
      created: 0,
      updated: 0,
      deleted: 0,
      unchanged: 0,
      arrType: "RADARR",
    });
  });

  // Note: Config validation (empty strings, duplicates) now happens earlier in validateConfig (config.ts)
  // These tests are removed as validation is no longer part of the syncer's responsibility

  it("should return zero counts when no changes needed", async () => {
    const config: any = {
      custom_formats: [],
      quality_profiles: [],
      download_clients: {
        remote_paths: [],
      },
    };

    const result = await syncRemotePaths("RADARR", config, mockCache);

    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.deleted).toBe(0);
    expect(result.arrType).toBe("RADARR");
  });

  describe("integration tests", () => {
    let mockRadarrClient: any;

    beforeEach(() => {
      mockRadarrClient = {
        getRemotePathMappings: vi.fn(),
        createRemotePathMapping: vi.fn(),
        updateRemotePathMapping: vi.fn(),
        deleteRemotePathMapping: vi.fn(),
      };

      vi.mocked(getUnifiedClient).mockReturnValue({
        api: mockRadarrClient,
      } as any);

      // Mock getSpecificClient for all arrTypes
      vi.mocked(getSpecificClient).mockImplementation((arrType?: string) => {
        return mockRadarrClient;
      });
    });

    it("should handle already exists error by falling back to update", async () => {
      const serverMappings: RemotePathMappingResource[] = [
        { id: 1, host: "transmission", remotePath: "/downloads", localPath: "/old/path" },
      ];

      mockRadarrClient.getRemotePathMappings.mockResolvedValue(serverMappings);
      mockRadarrClient.createRemotePathMapping.mockRejectedValue(new Error("RemotePath already configured"));
      mockRadarrClient.updateRemotePathMapping.mockResolvedValue({
        id: 1,
        host: "transmission",
        remotePath: "/downloads",
        localPath: "/new/path",
      });

      const config: any = {
        custom_formats: [],
        quality_profiles: [],
        download_clients: {
          remote_paths: [
            {
              host: "transmission",
              remote_path: "/downloads",
              local_path: "/new/path",
            },
          ],
        },
      };

      const result = await syncRemotePaths("RADARR", config, mockCache);

      expect(result.updated).toBe(1);
      expect(mockRadarrClient.updateRemotePathMapping).toHaveBeenCalledWith(
        "1",
        expect.objectContaining({
          id: 1,
          host: "transmission",
          remotePath: "/downloads",
          localPath: "/new/path",
        }),
      );
    });

    it("should normalize paths with trailing slashes for comparison", async () => {
      const serverMappings: RemotePathMappingResource[] = [
        { id: 1, host: "transmission", remotePath: "/downloads/", localPath: "/data/downloads" },
      ];

      mockRadarrClient.getRemotePathMappings.mockResolvedValue(serverMappings);

      const config: any = {
        custom_formats: [],
        quality_profiles: [],
        download_clients: {
          remote_paths: [
            {
              host: "transmission",
              remote_path: "/downloads",
              local_path: "/data/downloads",
            },
          ],
        },
      };

      const result = await syncRemotePaths("RADARR", config, mockCache);

      // Should be detected as unchanged (paths are the same after normalization)
      expect(result.unchanged).toBe(1);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(mockRadarrClient.createRemotePathMapping).not.toHaveBeenCalled();
    });

    it("should delete all mappings when delete_unmanaged_remote_paths is true with empty array", async () => {
      const serverMappings: RemotePathMappingResource[] = [
        { id: 1, host: "transmission", remotePath: "/downloads", localPath: "/data/downloads" },
        { id: 2, host: "qbittorrent", remotePath: "/downloads", localPath: "/data/downloads2" },
      ];

      mockRadarrClient.getRemotePathMappings.mockResolvedValue(serverMappings);
      mockRadarrClient.deleteRemotePathMapping.mockResolvedValue(undefined);

      const config: any = {
        custom_formats: [],
        quality_profiles: [],
        download_clients: {
          remote_paths: [],
          delete_unmanaged_remote_paths: true,
        },
      };

      const result = await syncRemotePaths("RADARR", config, mockCache);

      expect(result.deleted).toBe(2);
      expect(mockRadarrClient.deleteRemotePathMapping).toHaveBeenCalledWith("1");
      expect(mockRadarrClient.deleteRemotePathMapping).toHaveBeenCalledWith("2");
    });

    it("should create and update mappings based on diff", async () => {
      const serverMappings: RemotePathMappingResource[] = [
        { id: 1, host: "transmission", remotePath: "/downloads", localPath: "/old/path" },
        { id: 2, host: "qbittorrent", remotePath: "/downloads", localPath: "/data/downloads" },
      ];

      mockRadarrClient.getRemotePathMappings.mockResolvedValue(serverMappings);
      mockRadarrClient.createRemotePathMapping.mockResolvedValue({
        id: 3,
        host: "deluge",
        remotePath: "/downloads",
        localPath: "/data/downloads",
      });
      mockRadarrClient.updateRemotePathMapping.mockResolvedValue({
        id: 1,
        host: "transmission",
        remotePath: "/downloads",
        localPath: "/new/path",
      });

      const config: any = {
        custom_formats: [],
        quality_profiles: [],
        download_clients: {
          remote_paths: [
            {
              host: "transmission",
              remote_path: "/downloads",
              local_path: "/new/path", // Update
            },
            {
              host: "deluge",
              remote_path: "/downloads",
              local_path: "/data/downloads", // Create
            },
          ],
        },
      };

      const result = await syncRemotePaths("RADARR", config, mockCache);

      expect(result.created).toBe(1);
      expect(result.updated).toBe(1);
      expect(result.deleted).toBe(1); // qbittorrent deleted
      expect(mockRadarrClient.createRemotePathMapping).toHaveBeenCalledWith({
        host: "deluge",
        remotePath: "/downloads",
        localPath: "/data/downloads",
      });
      expect(mockRadarrClient.updateRemotePathMapping).toHaveBeenCalledWith(
        "1",
        expect.objectContaining({
          id: 1,
          host: "transmission",
          remotePath: "/downloads",
          localPath: "/new/path",
        }),
      );
    });

    it("should handle different hosts with same remote path", async () => {
      const serverMappings: RemotePathMappingResource[] = [];

      mockRadarrClient.getRemotePathMappings.mockResolvedValue(serverMappings);
      mockRadarrClient.createRemotePathMapping
        .mockResolvedValueOnce({
          id: 1,
          host: "transmission",
          remotePath: "/downloads",
          localPath: "/data/downloads",
        })
        .mockResolvedValueOnce({
          id: 2,
          host: "qbittorrent",
          remotePath: "/downloads",
          localPath: "/data/downloads2",
        });

      const config: any = {
        custom_formats: [],
        quality_profiles: [],
        download_clients: {
          remote_paths: [
            {
              host: "transmission",
              remote_path: "/downloads",
              local_path: "/data/downloads",
            },
            {
              host: "qbittorrent",
              remote_path: "/downloads",
              local_path: "/data/downloads2",
            },
          ],
        },
      };

      const result = await syncRemotePaths("RADARR", config, mockCache);

      expect(result.created).toBe(2);
      expect(mockRadarrClient.createRemotePathMapping).toHaveBeenCalledTimes(2);
    });
  });
});
