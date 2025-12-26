import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { syncDownloadClientConfig } from "./downloadClientConfigSyncer";
import type { ServerCache } from "../cache";
import type { MergedConfigInstance } from "../types/config.types";
import type { ArrType } from "../types/common.types";

// Mock env - use importOriginal to preserve getHelpers and getBuildInfo
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

// Mock logger
vi.mock("../logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock clients
vi.mock("../clients/unified-client", () => {
  const mockServerConfig = {
    downloadClientWorkingFolders: "/downloads/completed",
    enableCompletedDownloadHandling: true,
    autoRedownloadFailed: true,
    checkForFinishedDownloadInterval: 1,
    autoRedownloadFailedFromInteractiveSearch: false,
  };

  const mockClient = {
    getDownloadClientConfig: vi.fn(() => mockServerConfig),
    updateDownloadClientConfig: vi.fn(() => mockServerConfig),
  };
  return {
    getUnifiedClient: vi.fn(() => ({
      api: mockClient,
    })),
    getSpecificClient: vi.fn(() => mockClient),
  };
});

vi.mock("../clients/radarr-client");
vi.mock("../clients/sonarr-client");
vi.mock("../clients/lidarr-client");
vi.mock("../clients/readarr-client");
vi.mock("../clients/whisparr-client");

// Create a mock ServerCache
const createMockServerCache = (): ServerCache => {
  return {} as unknown as ServerCache;
};

describe("downloadClientConfigSyncer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("syncDownloadClientConfig", () => {
    it("should export syncDownloadClientConfig function", async () => {
      const { syncDownloadClientConfig } = await import("./downloadClientConfigSyncer");
      expect(syncDownloadClientConfig).toBeDefined();
      expect(typeof syncDownloadClientConfig).toBe("function");
    });

    it("should return updated: false when no download_clients config specified", async () => {
      const { syncDownloadClientConfig } = await import("./downloadClientConfigSyncer");
      const config: MergedConfigInstance = {
        custom_formats: [],
        quality_profiles: [],
      };
      const serverCache = createMockServerCache();

      const result = await syncDownloadClientConfig("RADARR", config, serverCache);

      expect(result.updated).toBe(false);
      expect(result.arrType).toBe("RADARR");
    });

    it("should handle all arrTypes without error", async () => {
      const { syncDownloadClientConfig } = await import("./downloadClientConfigSyncer");
      const arrTypes: ArrType[] = ["RADARR", "SONARR", "LIDARR", "READARR", "WHISPARR"];
      const baseConfig: MergedConfigInstance = {
        custom_formats: [],
        quality_profiles: [],
      };

      for (const arrType of arrTypes) {
        const config = { ...baseConfig };
        const result = await syncDownloadClientConfig(arrType, config, createMockServerCache());
        expect(result.arrType).toBe(arrType);
        expect(result.updated).toBe(false);
      }
    });

    it("should normalize field names from snake_case to camelCase", async () => {
      const { syncDownloadClientConfig } = await import("./downloadClientConfigSyncer");
      const { getSpecificClient } = await import("../clients/unified-client");
      const { getEnvs } = await import("../env");

      const mockGetEnvs = vi.mocked(getEnvs);
      mockGetEnvs.mockReturnValue({
        DRY_RUN: false,
        LOG_LEVEL: "silent",
        DEBUG_CREATE_FILES: false,
        CONFIGARR_VERSION: "test",
        ROOT_PATH: "/tmp/test",
      } as any);

      const mockGetConfig = vi.fn().mockResolvedValue({
        id: 1,
        downloadClientWorkingFolders: "/old",
        enableCompletedDownloadHandling: false,
      });

      const mockUpdateConfig = vi.fn().mockResolvedValue({});

      const mockClient = {
        getDownloadClientConfig: mockGetConfig,
        updateDownloadClientConfig: mockUpdateConfig,
      };
      vi.mocked(getSpecificClient).mockReturnValue(mockClient as any);

      const config: MergedConfigInstance = {
        custom_formats: [],
        quality_profiles: [],
        download_clients: {
          config: {
            download_client_working_folders: "/new",
            enable_completed_download_handling: true,
            auto_redownload_failed: false,
          },
        },
      };

      const result = await syncDownloadClientConfig("SONARR", config, createMockServerCache());

      expect(result.updated).toBe(true);
      expect(mockUpdateConfig).toHaveBeenCalled();

      const callArgs = mockUpdateConfig.mock.calls[0];
      if (callArgs && callArgs[1]) {
        const updatedConfig = callArgs[1] as Record<string, any>;
        expect(updatedConfig).toHaveProperty("downloadClientWorkingFolders", "/new");
        expect(updatedConfig).toHaveProperty("enableCompletedDownloadHandling", true);
      }
    });

    it("should filter Radarr-only fields for Radarr", async () => {
      const { syncDownloadClientConfig } = await import("./downloadClientConfigSyncer");
      const { getSpecificClient } = await import("../clients/unified-client");
      const { getEnvs } = await import("../env");

      const mockGetEnvs = vi.mocked(getEnvs);
      mockGetEnvs.mockReturnValue({
        DRY_RUN: false,
        LOG_LEVEL: "silent",
        DEBUG_CREATE_FILES: false,
        CONFIGARR_VERSION: "test",
        ROOT_PATH: "/tmp/test",
      } as any);

      const mockGetConfig = vi.fn().mockResolvedValue({
        id: 1,
        checkForFinishedDownloadInterval: 1,
      });

      const mockUpdateConfig = vi.fn().mockResolvedValue({});

      const mockClient = {
        getDownloadClientConfig: mockGetConfig,
        updateDownloadClientConfig: mockUpdateConfig,
      };
      vi.mocked(getSpecificClient).mockReturnValue(mockClient as any);

      const config: MergedConfigInstance = {
        custom_formats: [],
        quality_profiles: [],
        download_clients: {
          config: {
            check_for_finished_download_interval: 5,
          },
        },
      };

      await syncDownloadClientConfig("RADARR", config, createMockServerCache());

      expect(mockUpdateConfig).toHaveBeenCalled();
      const callArgs = mockUpdateConfig.mock.calls[0];
      if (callArgs && callArgs[1]) {
        const updatedConfig = callArgs[1] as Record<string, any>;
        expect(updatedConfig).toHaveProperty("checkForFinishedDownloadInterval", 5);
      }
    });

    it("should filter out Radarr-only fields for Sonarr", async () => {
      const { syncDownloadClientConfig } = await import("./downloadClientConfigSyncer");
      const { getSpecificClient } = await import("../clients/unified-client");
      const { getEnvs } = await import("../env");

      const mockGetEnvs = vi.mocked(getEnvs);
      mockGetEnvs.mockReturnValue({
        DRY_RUN: false,
        LOG_LEVEL: "silent",
        DEBUG_CREATE_FILES: false,
        CONFIGARR_VERSION: "test",
        ROOT_PATH: "/tmp/test",
      } as any);

      const mockGetConfig = vi.fn().mockResolvedValue({
        id: 1,
      });

      const mockUpdateConfig = vi.fn().mockResolvedValue({});

      const mockClient = {
        getDownloadClientConfig: mockGetConfig,
        updateDownloadClientConfig: mockUpdateConfig,
      };
      vi.mocked(getSpecificClient).mockReturnValue(mockClient as any);

      const config: MergedConfigInstance = {
        custom_formats: [],
        quality_profiles: [],
        download_clients: {
          config: {
            check_for_finished_download_interval: 5,
            enable_completed_download_handling: true,
          },
        },
      };

      await syncDownloadClientConfig("SONARR", config, createMockServerCache());

      expect(mockUpdateConfig).toHaveBeenCalled();
      const callArgs = mockUpdateConfig.mock.calls[0];
      if (callArgs && callArgs[1]) {
        const updatedConfig = callArgs[1] as Record<string, any>;
        expect(updatedConfig).not.toHaveProperty("checkForFinishedDownloadInterval");
        expect(updatedConfig).toHaveProperty("enableCompletedDownloadHandling", true);
      }
    });

    it("should filter out autoRedownloadFailedFromInteractiveSearch for Whisparr", async () => {
      const { syncDownloadClientConfig } = await import("./downloadClientConfigSyncer");
      const { getSpecificClient } = await import("../clients/unified-client");
      const { getEnvs } = await import("../env");

      const mockGetEnvs = vi.mocked(getEnvs);
      mockGetEnvs.mockReturnValue({
        DRY_RUN: false,
        LOG_LEVEL: "silent",
        DEBUG_CREATE_FILES: false,
        CONFIGARR_VERSION: "test",
        ROOT_PATH: "/tmp/test",
      } as any);

      const mockGetConfig = vi.fn().mockResolvedValue({
        id: 1,
      });

      const mockUpdateConfig = vi.fn().mockResolvedValue({});

      const mockClient = {
        getDownloadClientConfig: mockGetConfig,
        updateDownloadClientConfig: mockUpdateConfig,
      };
      vi.mocked(getSpecificClient).mockReturnValue(mockClient as any);

      const config: MergedConfigInstance = {
        custom_formats: [],
        quality_profiles: [],
        download_clients: {
          config: {
            auto_redownload_failed_from_interactive_search: true,
            enable_completed_download_handling: true,
          },
        },
      };

      await syncDownloadClientConfig("WHISPARR", config, createMockServerCache());

      expect(mockUpdateConfig).toHaveBeenCalled();
      const callArgs = mockUpdateConfig.mock.calls[0];
      if (callArgs && callArgs[1]) {
        const updatedConfig = callArgs[1] as Record<string, any>;
        expect(updatedConfig).not.toHaveProperty("autoRedownloadFailedFromInteractiveSearch");
        expect(updatedConfig).toHaveProperty("enableCompletedDownloadHandling", true);
      }
    });

    it("should not update if config is already up-to-date", async () => {
      const { syncDownloadClientConfig } = await import("./downloadClientConfigSyncer");
      const { getSpecificClient } = await import("../clients/unified-client");
      const { getEnvs } = await import("../env");

      const mockGetEnvs = vi.mocked(getEnvs);
      mockGetEnvs.mockReturnValue({
        DRY_RUN: false,
        LOG_LEVEL: "silent",
        DEBUG_CREATE_FILES: false,
        CONFIGARR_VERSION: "test",
        ROOT_PATH: "/tmp/test",
      } as any);

      const mockGetConfig = vi.fn().mockResolvedValue({
        id: 1,
        enableCompletedDownloadHandling: true,
        autoRedownloadFailed: false,
      });

      const mockUpdateConfig = vi.fn().mockResolvedValue({});

      const mockClient = {
        getDownloadClientConfig: mockGetConfig,
        updateDownloadClientConfig: mockUpdateConfig,
      };
      vi.mocked(getSpecificClient).mockReturnValue(mockClient as any);

      const config: MergedConfigInstance = {
        custom_formats: [],
        quality_profiles: [],
        download_clients: {
          config: {
            enable_completed_download_handling: true,
            auto_redownload_failed: false,
          },
        },
      };

      const result = await syncDownloadClientConfig("SONARR", config, createMockServerCache());

      expect(result.updated).toBe(false);
      expect(mockUpdateConfig).not.toHaveBeenCalled();
    });

    it("should handle DRY_RUN mode", async () => {
      const { syncDownloadClientConfig } = await import("./downloadClientConfigSyncer");
      const { getSpecificClient } = await import("../clients/unified-client");
      const { getEnvs } = await import("../env");

      const mockGetEnvs = vi.mocked(getEnvs);
      mockGetEnvs.mockReturnValue({
        DRY_RUN: true,
        LOG_LEVEL: "silent",
        DEBUG_CREATE_FILES: false,
        CONFIGARR_VERSION: "test",
        ROOT_PATH: "/tmp/test",
      } as any);

      const mockGetConfig = vi.fn().mockResolvedValue({
        id: 1,
        enableCompletedDownloadHandling: false,
      });

      const mockUpdateConfig = vi.fn().mockResolvedValue({});

      const mockClient = {
        getDownloadClientConfig: mockGetConfig,
        updateDownloadClientConfig: mockUpdateConfig,
      };
      vi.mocked(getSpecificClient).mockReturnValue(mockClient as any);

      const config: MergedConfigInstance = {
        custom_formats: [],
        quality_profiles: [],
        download_clients: {
          config: {
            enable_completed_download_handling: true,
          },
        },
      };

      const result = await syncDownloadClientConfig("RADARR", config, createMockServerCache());

      expect(result.updated).toBe(true);
      expect(mockUpdateConfig).not.toHaveBeenCalled();
    });

    it("should throw error on API call failure", async () => {
      const { syncDownloadClientConfig } = await import("./downloadClientConfigSyncer");
      const { getSpecificClient } = await import("../clients/unified-client");
      const { getEnvs } = await import("../env");

      const mockGetEnvs = vi.mocked(getEnvs);
      mockGetEnvs.mockReturnValue({
        DRY_RUN: false,
        LOG_LEVEL: "silent",
        DEBUG_CREATE_FILES: false,
        CONFIGARR_VERSION: "test",
        ROOT_PATH: "/tmp/test",
      } as any);

      const mockGetConfig = vi.fn().mockRejectedValue(new Error("API Error: Connection failed"));

      const mockClient = {
        getDownloadClientConfig: mockGetConfig,
        updateDownloadClientConfig: vi.fn(),
      };
      vi.mocked(getSpecificClient).mockReturnValue(mockClient as any);

      const config: MergedConfigInstance = {
        custom_formats: [],
        quality_profiles: [],
        download_clients: {
          config: {
            enable_completed_download_handling: true,
          },
        },
      };

      await expect(syncDownloadClientConfig("RADARR", config, createMockServerCache())).rejects.toThrow(
        "Download client config sync failed for RADARR",
      );
    });

    it("should include common fields for all arrTypes", async () => {
      const { syncDownloadClientConfig } = await import("./downloadClientConfigSyncer");
      const { getSpecificClient } = await import("../clients/unified-client");
      const { getEnvs } = await import("../env");

      const mockGetEnvs = vi.mocked(getEnvs);
      mockGetEnvs.mockReturnValue({
        DRY_RUN: false,
        LOG_LEVEL: "silent",
        DEBUG_CREATE_FILES: false,
        CONFIGARR_VERSION: "test",
        ROOT_PATH: "/tmp/test",
      } as any);

      const mockGetConfig = vi.fn().mockResolvedValue({
        id: 1,
      });

      const mockUpdateConfig = vi.fn().mockResolvedValue({});

      const mockClient = {
        getDownloadClientConfig: mockGetConfig,
        updateDownloadClientConfig: mockUpdateConfig,
      };
      vi.mocked(getSpecificClient).mockReturnValue(mockClient as any);

      const config: MergedConfigInstance = {
        custom_formats: [],
        quality_profiles: [],
        download_clients: {
          config: {
            enable_completed_download_handling: false,
            auto_redownload_failed: true,
          },
        },
      };

      const arrTypes: ArrType[] = ["RADARR", "SONARR", "LIDARR", "READARR"];

      for (const arrType of arrTypes) {
        mockUpdateConfig.mockClear();

        await syncDownloadClientConfig(arrType, config, createMockServerCache());

        expect(mockUpdateConfig).toHaveBeenCalled();
        const callArgs = mockUpdateConfig.mock.calls[0];
        if (callArgs && callArgs[1]) {
          const updatedConfig = callArgs[1] as Record<string, any>;
          expect(updatedConfig).toHaveProperty("enableCompletedDownloadHandling", false);
          expect(updatedConfig).toHaveProperty("autoRedownloadFailed", true);
        }
      }
    });
  });
});
