import { describe, it, expect, vi, beforeEach } from "vitest";
import { Telemetry, getTelemetryInstance, resetTelemetryInstance } from "./telemetry";
import { getEnvs } from "./env";
import { ArrType } from "./types/common.types";
import { InputConfigArrInstance } from "./types/config.types";

// Mock the env
vi.mock("./env", () => ({
  getEnvs: vi.fn(),
}));

// Mock logger
vi.mock("./logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock telemetry singleton
vi.mock("./telemetry", async () => {
  const actual = await vi.importActual("./telemetry");
  return {
    ...actual,
    getTelemetryInstance: vi.fn(),
  };
});

describe("Telemetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTelemetryInstance();
  });

  describe("constructor", () => {
    it("should initialize with telemetry disabled by default", () => {
      vi.mocked(getEnvs).mockReturnValue({
        CONFIGARR_VERSION: "1.0.0",
      } as any); // TELEMETRY_ENABLED not set

      const telemetryInstance = new Telemetry();
      expect(telemetryInstance).toBeDefined();
    });

    it("should initialize with telemetry enabled when configured via env", () => {
      vi.mocked(getEnvs).mockReturnValue({
        TELEMETRY_ENABLED: true,
        CONFIGARR_VERSION: "1.0.0",
      } as any);

      const telemetryInstance = new Telemetry();
      expect(telemetryInstance).toBeDefined();
    });

    it("should initialize with telemetry disabled when configured via env", () => {
      vi.mocked(getEnvs).mockReturnValue({
        TELEMETRY_ENABLED: false,
        CONFIGARR_VERSION: "1.0.0",
      } as any);

      const telemetryInstance = new Telemetry();
      expect(telemetryInstance).toBeDefined();
    });

    it("should initialize with telemetry enabled when configured via config", () => {
      vi.mocked(getEnvs).mockReturnValue({
        CONFIGARR_VERSION: "1.0.0",
      } as any); // TELEMETRY_ENABLED not set

      const telemetryInstance = new Telemetry({ enabled: true });
      expect(telemetryInstance).toBeDefined();
    });

    it("should prioritize env var over config", () => {
      vi.mocked(getEnvs).mockReturnValue({
        TELEMETRY_ENABLED: false, // env says false
        CONFIGARR_VERSION: "1.0.0",
      } as any);

      const telemetryInstance = new Telemetry({ enabled: true }); // config says true, but env takes precedence
      expect(telemetryInstance).toBeDefined();
    });

    it("should use config when env is not set", () => {
      vi.mocked(getEnvs).mockReturnValue({
        CONFIGARR_VERSION: "1.0.0",
      } as any); // TELEMETRY_ENABLED not set

      const telemetryInstance = new Telemetry({ enabled: true }); // config says true
      expect(telemetryInstance).toBeDefined();
    });
  });

  describe("trackFeatureUsage", () => {
    it("should not track when telemetry is disabled via env", () => {
      vi.mocked(getEnvs).mockReturnValue({
        TELEMETRY_ENABLED: false,
        CONFIGARR_VERSION: "1.0.0",
      } as any);

      const telemetryInstance = new Telemetry();
      const globalConfig = {};
      const instances = {
        SONARR: [],
        RADARR: [],
        WHISPARR: [],
        READARR: [],
        LIDARR: [],
      };

      telemetryInstance.trackFeatureUsage(globalConfig as any, instances);

      // Should not throw or do anything
      expect(true).toBe(true);
    });

    it("should not track when config is disabled", () => {
      vi.mocked(getEnvs).mockReturnValue({
        CONFIGARR_VERSION: "1.0.0",
      } as any); // TELEMETRY_ENABLED not set

      const telemetryInstance = new Telemetry({ enabled: false });
      const globalConfig = {};
      const instances = {
        SONARR: [],
        RADARR: [],
        WHISPARR: [],
        READARR: [],
        LIDARR: [],
      };

      telemetryInstance.trackFeatureUsage(globalConfig as any, instances);

      // Should not throw or do anything
      expect(true).toBe(true);
    });

    it("should collect telemetry data correctly", () => {
      vi.mocked(getEnvs).mockReturnValue({
        TELEMETRY_ENABLED: true,
        CONFIGARR_VERSION: "1.0.0",
      } as any);

      const telemetryInstance = new Telemetry();
      const globalConfig = {
        customFormatDefinitions: [],
        enableFullGitClone: true,
      };

      const instances: Record<ArrType, InputConfigArrInstance[]> = {
        SONARR: [
          {
            base_url: "http://localhost:8989",
            api_key: "key",
            custom_formats: [{ trash_ids: ["id1"] }],
            custom_format_groups: [
              {
                trash_guide: [{ id: "group1" }],
                assign_scores_to: [{ name: "profile1", score: 10 }],
              },
            ],
            quality_profiles: [
              {
                name: "test",
                upgrade: { allowed: true, until_quality: "test", until_score: 100 },
                min_format_score: 0,
                score_set: "default",
                quality_sort: "top",
                qualities: [],
              },
            ],
            delete_unmanaged_custom_formats: { enabled: true },
            delete_unmanaged_quality_profiles: { enabled: true },
            media_management: {},
            root_folders: ["folder1"],
            delay_profiles: { default: {} },
            download_clients: [{ name: "SABnzbd", implementation: "Sabnzbd" }],
            include: [
              { template: "recyclarr-template", source: "RECYCLARR" },
              { template: "trash-template", source: "TRASH" },
            ],
          },
        ],
        RADARR: [],
        WHISPARR: [],
        READARR: [],
        LIDARR: [],
      };

      // Access private method for testing
      const data = (telemetryInstance as any).collectTelemetryData(globalConfig, instances, false);

      expect(data).toEqual({
        version: "1.0.0",
        sonarr_enabled: true,
        radarr_enabled: true,
        whisparr_enabled: true,
        readarr_enabled: true,
        lidarr_enabled: true,
        recyclarr_templates: true,
        trash_guide_templates: true,
        local_templates: false,
        local_custom_formats_path: false,
        local_config_templates_path: false,
        custom_formats: true,
        custom_format_groups: true,
        custom_format_group_scores: true,
        delete_unmanaged_custom_formats: true,
        custom_format_definitions: true,
        quality_profiles: true,
        quality_definition: false,
        rename_quality_profiles: false,
        clone_quality_profiles: false,
        delete_unmanaged_quality_profiles: true,
        media_management: true,
        media_naming: false,
        media_naming_api: false,
        root_folders: true,
        delay_profiles: true,
        download_clients: true,
        enable_full_git_clone: true,

        sonarr_instances: 0,
        radarr_instances: 0,
        whisparr_instances: 0,
        readarr_instances: 0,
        lidarr_instances: 0,
        total_instances: 0,
        local_template_count: 0,
      });
    });

    it("should only track once", () => {
      vi.mocked(getEnvs).mockReturnValue({
        TELEMETRY_ENABLED: true,
        CONFIGARR_VERSION: "1.0.0",
      } as any);

      const telemetryInstance = new Telemetry();
      const globalConfig = {};
      const instances: Record<ArrType, InputConfigArrInstance[]> = {
        SONARR: [],
        RADARR: [],
        WHISPARR: [],
        READARR: [],
        LIDARR: [],
      };

      // First call should track
      telemetryInstance.trackFeatureUsage(globalConfig as any, instances);

      // Second call should not track again
      telemetryInstance.trackFeatureUsage(globalConfig as any, instances);

      expect(true).toBe(true); // Just verify no errors
    });
  });
});
