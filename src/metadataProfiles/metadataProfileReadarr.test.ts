import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReadarrMetadataProfileSync } from "./metadataProfileReadarr";
import { ServerCache } from "../cache";
import { InputConfigReadarrMetadataProfile } from "../types/config.types";
import { getUnifiedClient, getSpecificClient } from "../clients/unified-client";

// Mock the unified client
vi.mock("../clients/unified-client", () => ({
  getUnifiedClient: vi.fn(),
  getSpecificClient: vi.fn(),
}));

describe("ReadarrMetadataProfileSync", () => {
  const mockApi = {
    getMetadataProfiles: vi.fn(),
    createMetadataProfile: vi.fn(),
    updateMetadataProfile: vi.fn(),
    deleteMetadataProfile: vi.fn(),
  };

  let serverCache: ServerCache;

  beforeEach(() => {
    vi.clearAllMocks();
    (getUnifiedClient as any).mockReturnValue({
      api: mockApi,
    });
    (getSpecificClient as any).mockReturnValue(mockApi);
    serverCache = new ServerCache([], [], [], []);
  });

  describe("resolveConfig", () => {
    it("should resolve basic Readarr config", async () => {
      const sync = new ReadarrMetadataProfileSync();
      const config: InputConfigReadarrMetadataProfile = {
        name: "Test Profile",
      };

      const result = await sync.resolveConfig(config, serverCache);

      expect(result).toEqual({
        name: "Test Profile",
      });
    });

    it("should resolve config with snake_case fields", async () => {
      const sync = new ReadarrMetadataProfileSync();
      const config: InputConfigReadarrMetadataProfile = {
        name: "Test Profile",
        min_popularity: 50,
        skip_missing_date: true,
        skip_missing_isbn: false,
        skip_parts_and_sets: true,
        skip_secondary_series: false,
        allowed_languages: ["eng", "fra", "deu"],
        min_pages: 10,
        must_not_contain: ["bad", "words"],
      };

      const result = await sync.resolveConfig(config, serverCache);

      expect(result).toEqual({
        name: "Test Profile",
        minPopularity: 50,
        skipMissingDate: true,
        skipMissingIsbn: false,
        skipPartsAndSets: true,
        skipSeriesSecondary: false,
        allowedLanguages: "eng,fra,deu",
        minPages: 10,
        ignored: ["bad", "words"],
      });
    });

    it("should normalize allowed languages array", async () => {
      const sync = new ReadarrMetadataProfileSync();
      const config: InputConfigReadarrMetadataProfile = {
        name: "Test Profile",
        allowed_languages: ["eng", "fra", "deu"],
      };

      const result = await sync.resolveConfig(config, serverCache);

      expect(result).toEqual({
        name: "Test Profile",
        allowedLanguages: "eng,fra,deu",
      });
    });

    it("should normalize allowed languages array with multiple formats", async () => {
      const sync = new ReadarrMetadataProfileSync();
      const config: InputConfigReadarrMetadataProfile = {
        name: "Test Profile",
        allowed_languages: ["eng", "fra", "deu", "spa"],
      };

      const result = await sync.resolveConfig(config, serverCache);

      expect(result).toEqual({
        name: "Test Profile",
        allowedLanguages: "eng,fra,deu,spa",
      });
    });

    it("should handle null/undefined allowed languages", async () => {
      const sync = new ReadarrMetadataProfileSync();
      const config: InputConfigReadarrMetadataProfile = {
        name: "Test Profile",
        allowed_languages: null,
      };

      const result = await sync.resolveConfig(config, serverCache);

      expect(result).toEqual({
        name: "Test Profile",
      });
    });

    it("should normalize ignored field to array", async () => {
      const sync = new ReadarrMetadataProfileSync();
      const config: InputConfigReadarrMetadataProfile = {
        name: "Test Profile",
        must_not_contain: ["single,word"],
      };

      const result = await sync.resolveConfig(config, serverCache);

      expect(result).toEqual({
        name: "Test Profile",
        ignored: ["single,word"],
      });
    });

    it("should handle ignored as array", async () => {
      const sync = new ReadarrMetadataProfileSync();
      const config: InputConfigReadarrMetadataProfile = {
        name: "Test Profile",
        must_not_contain: ["word1", "word2"],
      };

      const result = await sync.resolveConfig(config, serverCache);

      expect(result).toEqual({
        name: "Test Profile",
        ignored: ["word1", "word2"],
      });
    });
  });

  describe("calculateDiff", () => {
    it("should detect missing profiles", async () => {
      mockApi.getMetadataProfiles.mockResolvedValue([]);

      const sync = new ReadarrMetadataProfileSync();
      const result = await sync.calculateDiff([{ name: "New Profile" }], serverCache);

      expect(result).toEqual({
        missingOnServer: [{ name: "New Profile" }],
        noChanges: [],
        changed: [],
      });
    });

    it("should return null when config is empty array", async () => {
      mockApi.getMetadataProfiles.mockResolvedValue([{ name: "Old Profile", id: 1 }]);

      const sync = new ReadarrMetadataProfileSync();
      const result = await sync.calculateDiff([], serverCache);

      // Empty config means no management - return null instead of deleting everything
      expect(result).toBeNull();
    });

    it("should return null when config is null", async () => {
      const sync = new ReadarrMetadataProfileSync();
      const result = await sync.calculateDiff(null as any, serverCache);

      expect(result).toBeNull();
    });

    it("should detect configuration changes", async () => {
      const serverProfile = {
        name: "Test Profile",
        id: 1,
        minPopularity: 50,
        skipMissingDate: false,
      };
      mockApi.getMetadataProfiles.mockResolvedValue([serverProfile]);

      const sync = new ReadarrMetadataProfileSync();
      const config: InputConfigReadarrMetadataProfile = {
        name: "Test Profile",
        min_popularity: 75, // Different from server
        skip_missing_date: true, // Different from server
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
