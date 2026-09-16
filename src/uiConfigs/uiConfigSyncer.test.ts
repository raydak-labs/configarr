import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { syncUiConfig } from "./uiConfigSyncer";
import { getEnvs } from "../env";

vi.mock("../env", () => ({
  getEnvs: vi.fn(() => ({ DRY_RUN: false })),
  getHelpers: vi.fn(() => ({
    configLocation: "/config/config.yml",
    secretLocation: "/config/secrets.yml",
    repoPath: "/repos",
  })),
}));

vi.mock("../logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("uiConfigSyncer", () => {
  const mockGetUiConfig = vi.fn();
  const mockUpdateUiConfig = vi.fn();
  const mockClient = { getUiConfig: mockGetUiConfig, updateUiConfig: mockUpdateUiConfig };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("syncUiConfig", () => {
    test("should skip when uiConfig is undefined", async () => {
      const result = await syncUiConfig(mockClient, "RADARR", undefined);

      expect(result).toEqual({ updated: false, arrType: "RADARR", fieldChanges: [] });
      expect(mockGetUiConfig).not.toHaveBeenCalled();
    });

    test("should handle null config by attempting to sync (null is not undefined)", async () => {
      // Note: null is different from undefined - the syncer only skips on undefined
      const serverConfig = { id: 1, theme: "light" };

      mockGetUiConfig.mockResolvedValue(serverConfig);

      // null as config will be treated as a valid config object
      // The diff calculation will compare null against server config
      await syncUiConfig(mockClient, "SONARR", null as any);

      expect(mockGetUiConfig).toHaveBeenCalled();
    });

    test("should return updated: false when server config is already up-to-date", async () => {
      const serverConfig = { id: 1, theme: "dark", language: "en" };
      const localConfig = { theme: "dark", language: "en" };

      mockGetUiConfig.mockResolvedValue(serverConfig);

      const result = await syncUiConfig(mockClient, "RADARR", localConfig);

      expect(result).toEqual({ updated: false, arrType: "RADARR", fieldChanges: [] });
      expect(mockUpdateUiConfig).not.toHaveBeenCalled();
    });

    test("should detect and apply changes when config differs", async () => {
      const serverConfig = { id: 1, theme: "light", language: "en" };
      const localConfig = { theme: "dark" };

      mockGetUiConfig.mockResolvedValue(serverConfig);
      mockUpdateUiConfig.mockResolvedValue({ ...serverConfig, ...localConfig });

      const result = await syncUiConfig(mockClient, "RADARR", localConfig);

      expect(result).toEqual({
        updated: true,
        arrType: "RADARR",
        fieldChanges: [{ field: "theme", from: "light", to: "dark" }],
      });
      expect(mockUpdateUiConfig).toHaveBeenCalledWith("1", { id: 1, theme: "dark", language: "en" });
    });

    test("should not update in dry-run mode", async () => {
      vi.mocked(getEnvs).mockReturnValue({ DRY_RUN: true } as any);

      const serverConfig = { id: 1, theme: "light" };
      const localConfig = { theme: "dark" };

      mockGetUiConfig.mockResolvedValue(serverConfig);

      const result = await syncUiConfig(mockClient, "SONARR", localConfig);

      expect(result).toEqual({
        updated: true,
        arrType: "SONARR",
        fieldChanges: [{ field: "theme", from: "light", to: "dark" }],
      });
      expect(mockUpdateUiConfig).not.toHaveBeenCalled();
    });

    test("should throw error when serverConfig.id is missing", async () => {
      const serverConfig = { theme: "light" }; // No id field
      const localConfig = { theme: "dark" };

      mockGetUiConfig.mockResolvedValue(serverConfig);

      await expect(syncUiConfig(mockClient, "RADARR", localConfig)).rejects.toThrow(
        "UI config sync failed for RADARR: UI config for RADARR is missing required 'id' field",
      );
    });

    test("should throw error when serverConfig.id is null", async () => {
      const serverConfig = { id: null, theme: "light" };
      const localConfig = { theme: "dark" };

      mockGetUiConfig.mockResolvedValue(serverConfig);

      await expect(syncUiConfig(mockClient, "SONARR", localConfig)).rejects.toThrow("missing required 'id' field");
    });

    test("should throw error when serverConfig.id is 0 (falsy)", async () => {
      const serverConfig = { id: 0, theme: "light" };
      const localConfig = { theme: "dark" };

      mockGetUiConfig.mockResolvedValue(serverConfig);

      await expect(syncUiConfig(mockClient, "LIDARR", localConfig)).rejects.toThrow("missing required 'id' field");
    });

    test("should propagate client errors with context", async () => {
      mockGetUiConfig.mockRejectedValue(new Error("Network error"));

      await expect(syncUiConfig(mockClient, "RADARR", { theme: "dark" })).rejects.toThrow(
        "UI config sync failed for RADARR: Network error",
      );
    });

    test("should handle non-Error thrown objects", async () => {
      mockGetUiConfig.mockRejectedValue("String error");

      await expect(syncUiConfig(mockClient, "RADARR", { theme: "dark" })).rejects.toThrow("UI config sync failed for RADARR: String error");
    });

    test("should work with different arr types", async () => {
      const arrTypes = ["RADARR", "SONARR", "LIDARR", "READARR", "WHISPARR"] as const;

      for (const arrType of arrTypes) {
        vi.clearAllMocks();
        const serverConfig = { id: 1, theme: "light" };
        const localConfig = { theme: "dark" };

        mockGetUiConfig.mockResolvedValue(serverConfig);
        mockUpdateUiConfig.mockResolvedValue({ ...serverConfig, ...localConfig });

        const result = await syncUiConfig(mockClient, arrType, localConfig);

        expect(result).toEqual({ updated: true, arrType, fieldChanges: [{ field: "theme", from: "light", to: "dark" }] });
        expect(mockGetUiConfig).toHaveBeenCalled();
      }
    });

    test("should merge server config with local config on update", async () => {
      const serverConfig = {
        id: 1,
        theme: "light",
        language: "en",
        firstDayOfWeek: 0,
        calendarWeekColumnHeader: "ddd",
      };
      const localConfig = {
        theme: "dark",
        firstDayOfWeek: 1,
      };

      mockGetUiConfig.mockResolvedValue(serverConfig);
      mockUpdateUiConfig.mockResolvedValue({});

      await syncUiConfig(mockClient, "RADARR", localConfig);

      expect(mockUpdateUiConfig).toHaveBeenCalledWith("1", {
        id: 1,
        theme: "dark",
        language: "en",
        firstDayOfWeek: 1,
        calendarWeekColumnHeader: "ddd",
      });
    });
  });
});
