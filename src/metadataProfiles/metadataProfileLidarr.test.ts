import { describe, it, expect, vi, beforeEach } from "vitest";
import { LidarrMetadataProfileSync } from "./metadataProfileLidarr";
import { ServerCache } from "../cache";
import { InputConfigLidarrMetadataProfile } from "../types/config.types";
import { getUnifiedClient, getSpecificClient } from "../clients/unified-client";

// Mock the unified client
vi.mock("../clients/unified-client", () => ({
  getUnifiedClient: vi.fn(),
  getSpecificClient: vi.fn(),
}));

describe("LidarrMetadataProfileSync", () => {
  const mockApi = {
    getMetadataProfiles: vi.fn(),
    createMetadataProfile: vi.fn(),
    updateMetadataProfile: vi.fn(),
    deleteMetadataProfile: vi.fn(),
  };

  let serverCache: ServerCache;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getMetadataProfiles.mockResolvedValue([]);
    (getUnifiedClient as any).mockReturnValue({
      api: mockApi,
    });
    (getSpecificClient as any).mockReturnValue(mockApi);
    serverCache = new ServerCache([], [], [], []);
  });

  describe("resolveConfig", () => {
    it("should resolve basic Lidarr config", async () => {
      const sync = new LidarrMetadataProfileSync();
      const config: InputConfigLidarrMetadataProfile = {
        name: "Test Profile",
      };

      const result = await sync.resolveConfig(config, serverCache);

      expect(result).toEqual({
        name: "Test Profile",
      });
    });

    it("should resolve config with primary types - new profile", async () => {
      const sync = new LidarrMetadataProfileSync();
      const config: InputConfigLidarrMetadataProfile = {
        name: "Test Profile",
        primary_types: ["Album", "EP"],
      };

      const result = await sync.resolveConfig(config, serverCache);

      expect(result).toEqual({
        name: "Test Profile",
        id: undefined,
        primaryAlbumTypes: [
          { albumType: "Album", allowed: true },
          { albumType: "EP", allowed: true },
        ],
      });
    });

    it("should resolve config with primary types - updating existing profile", async () => {
      const serverProfile = {
        id: 1,
        name: "Test Profile",
        primaryAlbumTypes: [
          { id: 1, albumType: { id: 1, name: "Album" }, allowed: true },
          { id: 2, albumType: { id: 2, name: "EP" }, allowed: true },
          { id: 3, albumType: { id: 3, name: "Single" }, allowed: false },
        ],
      };
      mockApi.getMetadataProfiles.mockResolvedValue([serverProfile]);

      const sync = new LidarrMetadataProfileSync();
      const config: InputConfigLidarrMetadataProfile = {
        name: "Test Profile",
        primary_types: ["Album", "EP"], // Single not listed, should be disabled
      };

      const result = await sync.resolveConfig(config, serverCache);

      expect(result).toEqual({
        name: "Test Profile",
        id: 1,
        primaryAlbumTypes: [
          { id: 1, albumType: { id: 1, name: "Album" }, allowed: true },
          { id: 2, albumType: { id: 2, name: "EP" }, allowed: true },
          { id: 3, albumType: { id: 3, name: "Single" }, allowed: false }, // Disabled
        ],
      });
    });

    it("should resolve config with secondary types", async () => {
      const sync = new LidarrMetadataProfileSync();
      const config: InputConfigLidarrMetadataProfile = {
        name: "Test Profile",
        secondary_types: ["Compilation", "Live"],
      };

      const result = await sync.resolveConfig(config, serverCache);

      expect(result).toEqual({
        name: "Test Profile",
        id: undefined,
        secondaryAlbumTypes: [
          { albumType: "Compilation", allowed: true },
          { albumType: "Live", allowed: true },
        ],
      });
    });

    it("should resolve config with release statuses", async () => {
      const sync = new LidarrMetadataProfileSync();
      const config: InputConfigLidarrMetadataProfile = {
        name: "Test Profile",
        release_statuses: ["Official", "Promotion"],
      };

      const result = await sync.resolveConfig(config, serverCache);

      expect(result).toEqual({
        name: "Test Profile",
        id: undefined,
        releaseStatuses: [
          { releaseStatus: "Official", allowed: true },
          { releaseStatus: "Promotion", allowed: true },
        ],
      });
    });

    it("should disable types not in the config array when updating", async () => {
      const serverProfile = {
        id: 1,
        name: "Test Profile",
        secondaryAlbumTypes: [
          { id: 1, albumType: { id: 1, name: "Studio" }, allowed: true },
          { id: 2, albumType: { id: 2, name: "Live" }, allowed: true },
          { id: 3, albumType: { id: 3, name: "Compilation" }, allowed: true },
        ],
      };
      mockApi.getMetadataProfiles.mockResolvedValue([serverProfile]);

      const sync = new LidarrMetadataProfileSync();
      const config: InputConfigLidarrMetadataProfile = {
        name: "Test Profile",
        secondary_types: ["Studio"], // Only Studio enabled, others should be disabled
      };

      const result = await sync.resolveConfig(config, serverCache);

      expect(result).toEqual({
        name: "Test Profile",
        id: 1,
        secondaryAlbumTypes: [
          { id: 1, albumType: { id: 1, name: "Studio" }, allowed: true },
          { id: 2, albumType: { id: 2, name: "Live" }, allowed: false }, // Disabled
          { id: 3, albumType: { id: 3, name: "Compilation" }, allowed: false }, // Disabled
        ],
      });
    });
  });

  describe("validation", () => {
    it("should throw error for empty primary_types array in calculateDiff", async () => {
      const sync = new LidarrMetadataProfileSync();
      const config: InputConfigLidarrMetadataProfile = {
        name: "Test Profile",
        primary_types: [], // Empty array should be rejected
        secondary_types: ["Studio"],
        release_statuses: ["Official"],
      };

      await expect(sync.calculateDiff([config], serverCache)).rejects.toThrow("primary_types must be defined");
    });

    it("should throw error for empty secondary_types array in calculateDiff", async () => {
      const sync = new LidarrMetadataProfileSync();
      const config: InputConfigLidarrMetadataProfile = {
        name: "Test Profile",
        primary_types: ["Album"],
        secondary_types: [], // Empty array should be rejected
        release_statuses: ["Official"],
      };

      await expect(sync.calculateDiff([config], serverCache)).rejects.toThrow("secondary_types must be defined");
    });

    it("should throw error for empty release_statuses array in calculateDiff", async () => {
      const sync = new LidarrMetadataProfileSync();
      const config: InputConfigLidarrMetadataProfile = {
        name: "Test Profile",
        primary_types: ["Album"],
        secondary_types: ["Studio"],
        release_statuses: [], // Empty array should be rejected
      };

      await expect(sync.calculateDiff([config], serverCache)).rejects.toThrow("release_statuses must be defined");
    });

    it("should validate all profiles and report all errors at once", async () => {
      const sync = new LidarrMetadataProfileSync();
      const configs: InputConfigLidarrMetadataProfile[] = [
        {
          name: "Profile 1",
          primary_types: [], // Error
          secondary_types: ["Studio"],
          release_statuses: ["Official"],
        },
        {
          name: "Profile 2",
          primary_types: ["Album"],
          secondary_types: [], // Error
          release_statuses: ["Official"],
        },
        {
          name: "Profile 3",
          primary_types: ["Album"],
          secondary_types: ["Studio"],
          release_statuses: [], // Error
        },
      ];

      await expect(sync.calculateDiff(configs, serverCache)).rejects.toThrow("Metadata profile validation failed");
    });
  });

  describe("calculateDiff", () => {
    it("should detect missing profiles", async () => {
      mockApi.getMetadataProfiles.mockResolvedValue([]);

      const sync = new LidarrMetadataProfileSync();
      const result = await sync.calculateDiff(
        [{ name: "New Profile", primary_types: ["Album"], secondary_types: ["Studio"], release_statuses: ["Official"] }],
        serverCache,
      );

      expect(result).toEqual({
        missingOnServer: [{ name: "New Profile", primary_types: ["Album"], secondary_types: ["Studio"], release_statuses: ["Official"] }],
        noChanges: [],
        changed: [],
      });
    });

    it("should return null for empty config (no automatic deletion)", async () => {
      mockApi.getMetadataProfiles.mockResolvedValue([{ name: "Old Profile", id: 1 }]);

      const sync = new LidarrMetadataProfileSync();
      const result = await sync.calculateDiff([], serverCache);

      // Empty config means no profiles to manage, so no changes
      expect(result).toBeNull();
    });

    it("should ignore unmanaged profiles (no automatic deletion)", async () => {
      mockApi.getMetadataProfiles.mockResolvedValue([{ name: "Server Profile", id: 1 }]);

      const sync = new LidarrMetadataProfileSync();
      const result = await sync.calculateDiff([], serverCache);

      // Unmanaged profiles are not included in diff - deletion is handled separately
      expect(result).toBeNull();
    });

    it("should return null when config is null", async () => {
      const sync = new LidarrMetadataProfileSync();
      const result = await sync.calculateDiff(null as any, serverCache);

      expect(result).toBeNull();
    });

    it("should detect no changes when profiles match", async () => {
      const serverProfile = {
        name: "Test Profile",
        id: 1,
        primaryAlbumTypes: [
          { id: 1, albumType: { id: 1, name: "Album" }, allowed: true },
          { id: 2, albumType: { id: 2, name: "EP" }, allowed: false },
        ],
        secondaryAlbumTypes: [{ id: 1, albumType: { id: 1, name: "Studio" }, allowed: true }],
        releaseStatuses: [{ id: 1, releaseStatus: { id: 1, name: "Official" }, allowed: true }],
      };
      mockApi.getMetadataProfiles.mockResolvedValue([serverProfile]);

      const sync = new LidarrMetadataProfileSync();
      const config: InputConfigLidarrMetadataProfile = {
        name: "Test Profile",
        primary_types: ["Album"], // Only Album enabled
        secondary_types: ["Studio"],
        release_statuses: ["Official"],
      };

      const result = await sync.calculateDiff([config], serverCache);

      expect(result).toBeNull();
    });

    it("should detect changes when enabled types differ", async () => {
      const serverProfile = {
        name: "Test Profile",
        id: 1,
        primaryAlbumTypes: [
          { id: 1, albumType: { id: 1, name: "Album" }, allowed: true },
          { id: 2, albumType: { id: 2, name: "EP" }, allowed: false },
        ],
        secondaryAlbumTypes: [{ id: 1, albumType: { id: 1, name: "Studio" }, allowed: true }],
        releaseStatuses: [{ id: 1, releaseStatus: { id: 1, name: "Official" }, allowed: true }],
      };
      mockApi.getMetadataProfiles.mockResolvedValue([serverProfile]);

      const sync = new LidarrMetadataProfileSync();
      const config: InputConfigLidarrMetadataProfile = {
        name: "Test Profile",
        primary_types: ["Album", "EP"], // EP should be enabled but is disabled on server
        secondary_types: ["Studio"],
        release_statuses: ["Official"],
      };

      const result = await sync.calculateDiff([config], serverCache);

      expect(result).toEqual({
        missingOnServer: [],
        noChanges: [],
        changed: [{ config, server: serverProfile }],
      });
    });
  });
});
