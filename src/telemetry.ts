import { getEnvs } from "./env";
import { logger } from "./logger";
import { ArrType } from "./types/common.types";
import { InputConfigSchema, InputConfigArrInstance, MergedConfigInstance } from "./types/config.types";
import ky from "ky";

export interface TelemetryConfig {
  enabled?: boolean;
}

export interface TelemetryData {
  // Version info
  version: string;

  // Global Arr type configuration
  sonarr_enabled: boolean;
  radarr_enabled: boolean;
  whisparr_enabled: boolean;
  readarr_enabled: boolean;
  lidarr_enabled: boolean;

  // Template sources
  recyclarr_templates: boolean;
  trash_guide_templates: boolean;
  local_templates: boolean;

  // Local paths usage
  local_custom_formats_path: boolean;
  local_config_templates_path: boolean;

  // Custom format features
  custom_formats: boolean;
  custom_format_groups: boolean;
  custom_format_group_scores: boolean;
  delete_unmanaged_custom_formats: boolean;
  custom_format_definitions: boolean;

  // Quality profile features
  quality_profiles: boolean;
  quality_definition: boolean;
  rename_quality_profiles: boolean;
  clone_quality_profiles: boolean;

  // Media management features
  media_management: boolean;
  media_naming: boolean;
  media_naming_api: boolean;

  // Root folder management
  root_folders: boolean;

  // Delay profiles
  delay_profiles: boolean;

  // Experimental features
  enable_full_git_clone: boolean;

  // Instance statistics by arr type
  sonarr_instances: number;
  radarr_instances: number;
  whisparr_instances: number;
  readarr_instances: number;
  lidarr_instances: number;
  total_instances: number;

  // Template usage counts
  local_template_count: number;
}

let telemetryInstance: Telemetry | null = null;

export class Telemetry {
  private hasTracked: boolean = false;
  private telemetryData: Partial<TelemetryData> | null = null;
  private static isEnabledCache: boolean | null = null;

  public static isEnabled(config?: TelemetryConfig): boolean {
    if (this.isEnabledCache == null) {
      this.isEnabledCache = getEnvs().TELEMETRY_ENABLED ?? config?.enabled ?? false;
    }

    return this.isEnabledCache;
  }

  constructor(config?: TelemetryConfig) {
    // Environment variable takes precedence, then config file setting
    if (Telemetry.isEnabled(config)) {
      logger.info("Telemetry enabled - Thank you for helping improve Configarr!");
    }
  }

  private async track(eventName: string, data: TelemetryData) {
    if (!Telemetry.isEnabledCache || this.hasTracked) {
      return;
    }

    try {
      // disable custom umami for now
      // const umami = new Umami({
      //   websiteId: "6b0669cc-8047-4382-a551-95e1a6e92d42",
      //   hostUrl: "https://telemetry.configarr.de",
      // });

      // // Cast to any to handle external API type requirements
      // await umami.track(eventName, data as any);

      await ky.post("https://eu.i.posthog.com/capture/", {
        body: JSON.stringify({
          api_key: "phc_So3UZ2BxlK56T2UDPtVwMqPZ0F1XOQNOhHss2JNqMKF", // gitleaks:allow
          event: eventName,
          properties: {
            distinct_id: "anonymous",
            ...data,
          },
        }),
        timeout: 1000,
      });
    } catch (error) {
      logger.debug(`Telemetry tracking failed (maybe AdBlocker). Ignoring.`);

      if (getEnvs().LOG_STACKTRACE) {
        logger.debug(error);
      }
    }
  }

  public trackFeatureUsage(globalConfig: InputConfigSchema, instances: Record<ArrType, InputConfigArrInstance[]>): void {
    if (!Telemetry.isEnabledCache || this.hasTracked) {
      return;
    }

    this.telemetryData = this.collectTelemetryData(globalConfig, instances);
  }

  public trackInstanceConfig(instanceConfig: MergedConfigInstance, arrType: ArrType): void {
    if (!Telemetry.isEnabledCache || this.hasTracked || !this.telemetryData) {
      return;
    }

    // Update telemetry data based on merged instance config
    this.updateTelemetryFromInstance(instanceConfig);

    // Increment instance count for this arr type
    const data = this.telemetryData! as TelemetryData;
    switch (arrType) {
      case "SONARR":
        data.sonarr_instances++;
        break;
      case "RADARR":
        data.radarr_instances++;
        break;
      case "WHISPARR":
        data.whisparr_instances++;
        break;
      case "READARR":
        data.readarr_instances++;
        break;
      case "LIDARR":
        data.lidarr_instances++;
        break;
    }
    data.total_instances++;
  }

  public async finalizeTracking(): Promise<void> {
    if (!Telemetry.isEnabledCache || this.hasTracked || !this.telemetryData) {
      return;
    }

    try {
      await this.track("feature_usage", this.telemetryData as TelemetryData);
    } catch (error) {
      logger.debug(`Telemetry finalization failed: ${error}`);
    }
    this.hasTracked = true;
  }

  private updateTelemetryFromInstance(instanceConfig: MergedConfigInstance): void {
    if (!this.telemetryData) return;

    // Update all feature usage flags based on the merged instance config

    // Custom format features
    if (!this.telemetryData.custom_formats && instanceConfig.custom_formats && instanceConfig.custom_formats.length > 0) {
      this.telemetryData.custom_formats = true;
    }
    if (!this.telemetryData.custom_format_groups && instanceConfig.custom_format_groups && instanceConfig.custom_format_groups.length > 0) {
      this.telemetryData.custom_format_groups = true;
      // Check for custom format group scores
      if (
        !this.telemetryData.custom_format_group_scores &&
        instanceConfig.custom_format_groups.some((group) => group.assign_scores_to?.some((assign) => assign.score !== undefined))
      ) {
        this.telemetryData.custom_format_group_scores = true;
      }
    }
    if (!this.telemetryData.delete_unmanaged_custom_formats && instanceConfig.delete_unmanaged_custom_formats?.enabled) {
      this.telemetryData.delete_unmanaged_custom_formats = true;
    }

    // Quality profile features
    if (!this.telemetryData.quality_profiles && instanceConfig.quality_profiles && instanceConfig.quality_profiles.length > 0) {
      this.telemetryData.quality_profiles = true;
    }
    if (!this.telemetryData.quality_definition && instanceConfig.quality_definition) {
      this.telemetryData.quality_definition = true;
    }
    if (
      !this.telemetryData.rename_quality_profiles &&
      instanceConfig.renameQualityProfiles &&
      instanceConfig.renameQualityProfiles.length > 0
    ) {
      this.telemetryData.rename_quality_profiles = true;
    }
    if (
      !this.telemetryData.clone_quality_profiles &&
      instanceConfig.cloneQualityProfiles &&
      instanceConfig.cloneQualityProfiles.length > 0
    ) {
      this.telemetryData.clone_quality_profiles = true;
    }

    // Media management features
    if (!this.telemetryData.media_management && instanceConfig.media_management) {
      this.telemetryData.media_management = true;
    }
    if (!this.telemetryData.media_naming && instanceConfig.media_naming) {
      this.telemetryData.media_naming = true;
    }
    if (!this.telemetryData.media_naming_api && instanceConfig.media_naming_api) {
      this.telemetryData.media_naming_api = true;
    }

    // Root folder management
    if (!this.telemetryData.root_folders && instanceConfig.root_folders && instanceConfig.root_folders.length > 0) {
      this.telemetryData.root_folders = true;
    }

    // Delay profiles
    if (!this.telemetryData.delay_profiles && instanceConfig.delay_profiles) {
      this.telemetryData.delay_profiles = true;
    }
  }

  private collectTelemetryData(globalConfig: InputConfigSchema, instances: Record<ArrType, InputConfigArrInstance[]>): TelemetryData {
    const arrTypes = Object.keys(instances) as ArrType[];
    const allInstances = Object.values(instances).flat();

    // Count template sources
    let recyclarrTemplateCount = 0;
    let trashGuideTemplateCount = 0;
    let localTemplateCount = 0;

    for (const instance of allInstances) {
      if (instance.include) {
        for (const include of instance.include) {
          if (include.source === "RECYCLARR") {
            recyclarrTemplateCount++;
          } else if (include.source === "TRASH") {
            trashGuideTemplateCount++;
          } else {
            localTemplateCount++;
          }
        }
      }
    }

    // Check for custom format group scores
    let usesCustomFormatGroupScores = false;
    for (const instance of allInstances) {
      if (instance.custom_format_groups) {
        for (const group of instance.custom_format_groups) {
          if (group.assign_scores_to?.some((assign) => assign.score !== undefined)) {
            usesCustomFormatGroupScores = true;
            break;
          }
        }
        if (usesCustomFormatGroupScores) break;
      }
    }

    return {
      version: getEnvs().CONFIGARR_VERSION || "unknown",

      // Global Arr type configuration
      sonarr_enabled: globalConfig.sonarrEnabled !== false,
      radarr_enabled: globalConfig.radarrEnabled !== false,
      whisparr_enabled: globalConfig.whisparrEnabled !== false,
      readarr_enabled: globalConfig.readarrEnabled !== false,
      lidarr_enabled: globalConfig.lidarrEnabled !== false,

      recyclarr_templates: recyclarrTemplateCount > 0,
      trash_guide_templates: trashGuideTemplateCount > 0,
      local_templates: localTemplateCount > 0,

      // Local paths usage
      local_custom_formats_path: globalConfig.localCustomFormatsPath !== undefined,
      local_config_templates_path: globalConfig.localConfigTemplatesPath !== undefined,

      custom_formats: allInstances.some((i) => i.custom_formats && i.custom_formats.length > 0),
      custom_format_groups: allInstances.some((i) => i.custom_format_groups && i.custom_format_groups.length > 0),
      custom_format_group_scores: usesCustomFormatGroupScores,
      delete_unmanaged_custom_formats: allInstances.some((i) => i.delete_unmanaged_custom_formats?.enabled),
      custom_format_definitions: globalConfig.customFormatDefinitions !== undefined,

      quality_profiles: allInstances.some((i) => i.quality_profiles && i.quality_profiles.length > 0),
      quality_definition: allInstances.some((i) => i.quality_definition !== undefined),
      rename_quality_profiles: allInstances.some((i) => i.renameQualityProfiles && i.renameQualityProfiles.length > 0),
      clone_quality_profiles: allInstances.some((i) => i.cloneQualityProfiles && i.cloneQualityProfiles.length > 0),

      media_management: allInstances.some((i) => i.media_management !== undefined),
      media_naming: allInstances.some((i) => i.media_naming !== undefined),
      media_naming_api: allInstances.some((i) => i.media_naming_api !== undefined),

      root_folders: allInstances.some((i) => i.root_folders && i.root_folders.length > 0),

      delay_profiles: allInstances.some((i) => i.delay_profiles !== undefined),

      enable_full_git_clone: globalConfig.enableFullGitClone === true,

      sonarr_instances: 0,
      radarr_instances: 0,
      whisparr_instances: 0,
      readarr_instances: 0,
      lidarr_instances: 0,
      total_instances: 0,

      local_template_count: localTemplateCount,
    };
  }
}

export function getTelemetryInstance(config?: TelemetryConfig): Telemetry {
  if (telemetryInstance == null) {
    telemetryInstance = new Telemetry(config);
  }
  return telemetryInstance;
}

// For testing: reset the singleton instance
export function resetTelemetryInstance(): void {
  telemetryInstance = null;
}
