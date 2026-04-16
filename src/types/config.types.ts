import { z } from "zod";
import { ConfigarrCFSchema } from "./common.types";
import { TrashCFSchema, TrashQualityDefinitionQualitySchema, TrashScores, TrashQualityDefinitionQuality } from "./trashguide.types";

// ============================================================================
// Zod Schemas — used for runtime validation only.
// Types are defined manually below to preserve exact TypeScript semantics
// (especially around optional vs. undefined in Required<> and keyof).
// ============================================================================

export const CustomFormatDefinitionsSchema = z.array(z.union([TrashCFSchema, ConfigarrCFSchema]));

const ScoreAssignmentSchema = z.object({
  name: z.string(),
  score: z.number().optional(),
  use_default_score: z.boolean().optional(),
});

export const InputConfigIncludeItemSchema = z.object({
  template: z.string(),
  source: z.enum(["TRASH", "RECYCLARR"]).optional(),
  preferred_ratio: z.number().min(0).max(1).optional(),
});

export const InputConfigQualityProfileItemSchema = z.object({
  name: z.string(),
  qualities: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
});

export const InputConfigQualityProfileSchema = z.object({
  name: z.string(),
  reset_unmatched_scores: z
    .object({
      enabled: z.boolean(),
      except: z.array(z.string()).optional(),
    })
    .optional(),
  upgrade: z
    .union([
      z.object({
        allowed: z.literal(true),
        until_quality: z.string(),
        until_score: z.number(),
        min_format_score: z.number().optional(),
      }),
      z.object({
        allowed: z.literal(false),
        until_quality: z.string().optional(),
        until_score: z.number().optional(),
        min_format_score: z.number().optional(),
      }),
    ])
    .optional(),
  min_format_score: z.number().optional(),
  score_set: z.string().optional(),
  quality_sort: z.string().optional(),
  language: z.string().optional(),
  qualities: z.array(InputConfigQualityProfileItemSchema).optional(),
});

export const InputConfigCustomFormatSchema = z.object({
  trash_ids: z.array(z.string()).optional(),
  quality_profiles: z.array(ScoreAssignmentSchema).optional(),
  assign_scores_to: z.array(ScoreAssignmentSchema).optional(),
});

export const InputConfigCustomFormatGroupSchema = z.object({
  trash_guide: z
    .array(
      z.object({
        id: z.string(),
        include_unrequired: z.boolean().optional(),
      }),
    )
    .optional(),
  assign_scores_to: z
    .array(
      z.object({
        name: z.string(),
        score: z.number().optional(),
      }),
    )
    .optional(),
});

const MonitorSchema = z.enum(["all", "future", "missing", "existing", "latest", "first", "none", "unknown"]);

export const InputConfigRootFolderLidarrSchema = z.object({
  path: z.string(),
  name: z.string(),
  metadata_profile: z.string(),
  quality_profile: z.string(),
  monitor: MonitorSchema.optional(),
  monitor_new_album: z.enum(["all", "none", "new"]).optional(),
  tags: z.array(z.string()).optional(),
});

export const InputConfigRootFolderReadarrSchema = z.object({
  path: z.string(),
  name: z.string(),
  metadata_profile: z.string(),
  quality_profile: z.string(),
  monitor: MonitorSchema.optional(),
  monitor_new_items: z.enum(["all", "none", "new"]).optional(),
  tags: z.array(z.string()).optional(),
  is_calibre_library: z.boolean().optional(),
  calibre_host: z.string().optional(),
  calibre_port: z.number().optional(),
  calibre_url_base: z.string().optional(),
  calibre_username: z.string().optional(),
  calibre_password: z.string().optional(),
  calibre_library: z.string().optional(),
  calibre_output_format: z.string().optional(),
  calibre_output_profile: z.string().optional(),
  calibre_use_ssl: z.boolean().optional(),
});

export const InputConfigRootFolderGenericSchema = z.string();

export const InputConfigRootFolderSchema = z.union([
  InputConfigRootFolderGenericSchema,
  InputConfigRootFolderLidarrSchema,
  InputConfigRootFolderReadarrSchema,
]);

export const InputConfigDownloadClientConfigSchema = z.object({
  download_client_working_folders: z.string().optional(),
  enable_completed_download_handling: z.boolean().optional(),
  auto_redownload_failed: z.boolean().optional(),
  auto_redownload_failed_from_interactive_search: z.boolean().optional(),
  check_for_finished_download_interval: z.number().optional(),
});

export const InputConfigRemotePathSchema = z.object({
  host: z.string(),
  remote_path: z.string(),
  local_path: z.string(),
});

export const InputConfigDelayProfileSchema = z.object({
  enableUsenet: z.boolean().optional(),
  enableTorrent: z.boolean().optional(),
  preferredProtocol: z.string().optional(),
  usenetDelay: z.number().optional(),
  torrentDelay: z.number().optional(),
  bypassIfHighestQuality: z.boolean().optional(),
  bypassIfAboveCustomFormatScore: z.boolean().optional(),
  minimumCustomFormatScore: z.number().optional(),
  order: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

export const InputConfigDownloadClientSchema = z.object({
  name: z.string(),
  type: z.string(),
  enable: z.boolean().optional(),
  priority: z.number().optional(),
  remove_completed_downloads: z.boolean().optional(),
  remove_failed_downloads: z.boolean().optional(),
  fields: z.record(z.string(), z.any()).optional(),
  tags: z.array(z.union([z.string(), z.number()])).optional(),
});

export const MediaManagementTypeSchema = z.object({}).passthrough();
export const UiConfigTypeSchema = z.object({}).passthrough();
export const MediaNamingApiTypeSchema = z.object({}).passthrough();

export const MediaNamingTypeSchema = z.object({
  folder: z.string().optional(),
  movie: z
    .object({
      rename: z.boolean().optional(),
      standard: z.string().optional(),
    })
    .optional(),
  series: z.string().optional(),
  season: z.string().optional(),
  episodes: z
    .object({
      rename: z.boolean().optional(),
      standard: z.string().optional(),
      daily: z.string().optional(),
      anime: z.string().optional(),
    })
    .optional(),
});

const DeleteUnmanagedSchema = z.object({
  enabled: z.boolean(),
  ignore: z.array(z.string()).optional(),
});

export const InputConfigLidarrMetadataProfileSchema = z.object({
  name: z.string(),
  primary_types: z.array(z.string()).optional(),
  secondary_types: z.array(z.string()).optional(),
  release_statuses: z.array(z.string()).optional(),
});

export const InputConfigReadarrMetadataProfileSchema = z.object({
  name: z.string(),
  min_popularity: z.number().optional(),
  skip_missing_date: z.boolean().optional(),
  skip_missing_isbn: z.boolean().optional(),
  skip_parts_and_sets: z.boolean().optional(),
  skip_secondary_series: z.boolean().optional(),
  allowed_languages: z.array(z.string()).nullable().optional(),
  min_pages: z.number().nullable().optional(),
  must_not_contain: z.array(z.string()).optional(),
});

export const InputConfigMetadataProfileSchema = z.union([InputConfigLidarrMetadataProfileSchema, InputConfigReadarrMetadataProfileSchema]);

export const InputConfigArrInstanceSchema = z.object({
  base_url: z.string(),
  api_key: z.string(),
  enabled: z.boolean().optional(),
  delete_unmanaged_custom_formats: DeleteUnmanagedSchema.optional(),
  delete_unmanaged_quality_profiles: DeleteUnmanagedSchema.optional(),
  quality_definition: z
    .object({
      type: z.string().optional(),
      preferred_ratio: z.number().min(0).max(1).optional(),
      qualities: z.array(TrashQualityDefinitionQualitySchema).optional(),
    })
    .optional(),
  include: z.array(InputConfigIncludeItemSchema).optional(),
  custom_format_groups: z.array(InputConfigCustomFormatGroupSchema).optional(),
  custom_formats: z.array(InputConfigCustomFormatSchema).optional(),
  quality_profiles: z.array(InputConfigQualityProfileSchema),
  media_management: MediaManagementTypeSchema.optional(),
  ui_config: UiConfigTypeSchema.optional(),
  media_naming_api: MediaNamingApiTypeSchema.optional(),
  renameQualityProfiles: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
  cloneQualityProfiles: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
  media_naming: MediaNamingTypeSchema.optional(),
  metadata_profiles: z.array(InputConfigMetadataProfileSchema).optional(),
  delete_unmanaged_metadata_profiles: DeleteUnmanagedSchema.optional(),
  root_folders: z.array(InputConfigRootFolderSchema).optional(),
  delay_profiles: z
    .object({
      default: InputConfigDelayProfileSchema.optional(),
      additional: z.array(InputConfigDelayProfileSchema).optional(),
    })
    .optional(),
  download_clients: z
    .object({
      data: z.array(InputConfigDownloadClientSchema).optional(),
      update_password: z.boolean().optional(),
      delete_unmanaged: DeleteUnmanagedSchema.optional(),
      config: InputConfigDownloadClientConfigSchema.optional(),
      remote_paths: z.array(InputConfigRemotePathSchema).optional(),
      delete_unmanaged_remote_paths: z.boolean().optional(),
    })
    .optional(),
  customFormatDefinitions: CustomFormatDefinitionsSchema.optional(),
});

export const InputConfigSchemaSchema = z.object({
  trashGuideUrl: z.string().optional(),
  trashRevision: z.string().optional(),
  recyclarrConfigUrl: z.string().optional(),
  recyclarrRevision: z.string().optional(),
  localCustomFormatsPath: z.string().optional(),
  localConfigTemplatesPath: z.string().optional(),
  enableFullGitClone: z.boolean().optional(),
  telemetry: z.boolean().optional(),
  customFormatDefinitions: CustomFormatDefinitionsSchema.optional(),
  compatibilityTrashGuide20260219Enabled: z.boolean().optional(),

  sonarr: z.record(z.string(), InputConfigArrInstanceSchema).optional(),
  sonarrEnabled: z.boolean().optional(),

  radarr: z.record(z.string(), InputConfigArrInstanceSchema).optional(),
  radarrEnabled: z.boolean().optional(),

  whisparr: z.record(z.string(), InputConfigArrInstanceSchema).optional(),
  whisparrEnabled: z.boolean().optional(),

  readarr: z.record(z.string(), InputConfigArrInstanceSchema).optional(),
  readarrEnabled: z.boolean().optional(),

  lidarr: z.record(z.string(), InputConfigArrInstanceSchema).optional(),
  lidarrEnabled: z.boolean().optional(),
});

// ============================================================================
// Types — manually defined to preserve exact TypeScript semantics.
// ============================================================================

import type { ConfigarrCF } from "./common.types";
import type { TrashCF } from "./trashguide.types";

export type CustomFormatDefinitions = (TrashCF | ConfigarrCF)[];

export type InputConfigSchema = {
  trashGuideUrl?: string;
  trashRevision?: string;
  recyclarrConfigUrl?: string;
  recyclarrRevision?: string;
  localCustomFormatsPath?: string;
  localConfigTemplatesPath?: string;
  enableFullGitClone?: boolean;
  telemetry?: boolean;
  customFormatDefinitions?: CustomFormatDefinitions;
  compatibilityTrashGuide20260219Enabled?: boolean;
  /**
   * Silences warnings emitted when a Quality Profile contains CustomFormats that TRaSH-Guides
   * marks as mutually exclusive in `conflicts.json`. Sync behavior itself is not changed — only
   * the log output is suppressed. Useful when conflicting CFs are intentionally configured.
   * @default false
   */
  silenceTrashConflictWarnings?: boolean;

  sonarr?: Record<string, InputConfigArrInstance>;
  sonarrEnabled?: boolean;

  radarr?: Record<string, InputConfigArrInstance>;
  radarrEnabled?: boolean;

  whisparr?: Record<string, InputConfigArrInstance>;
  whisparrEnabled?: boolean;

  readarr?: Record<string, InputConfigArrInstance>;
  readarrEnabled?: boolean;

  lidarr?: Record<string, InputConfigArrInstance>;
  lidarrEnabled?: boolean;
};

export type InputConfigCustomFormat = {
  trash_ids?: string[];
  /** @deprecated replaced with assign_scores_to */
  quality_profiles?: { name: string; score?: number; use_default_score?: boolean }[];
  assign_scores_to?: { name: string; score?: number; use_default_score?: boolean }[];
};

export type InputConfigCustomFormatGroup = {
  trash_guide?: { id: string; include_unrequired?: boolean }[];
  assign_scores_to?: { name: string; score?: number }[];
};

export type InputConfigRootFolderLidarr = {
  path: string;
  name: string;
  metadata_profile: string;
  quality_profile: string;
  monitor?: "all" | "future" | "missing" | "existing" | "latest" | "first" | "none" | "unknown";
  monitor_new_album?: "all" | "none" | "new";
  tags?: string[];
};

export type InputConfigRootFolderReadarr = {
  path: string;
  name: string;
  metadata_profile: string;
  quality_profile: string;
  monitor?: "all" | "future" | "missing" | "existing" | "latest" | "first" | "none" | "unknown";
  monitor_new_items?: "all" | "none" | "new";
  tags?: string[];
  is_calibre_library?: boolean;
  calibre_host?: string;
  calibre_port?: number;
  calibre_url_base?: string;
  calibre_username?: string;
  calibre_password?: string;
  calibre_library?: string;
  calibre_output_format?: string;
  calibre_output_profile?: string;
  calibre_use_ssl?: boolean;
};

export type InputConfigRootFolderGeneric = string;

export type InputConfigRootFolder = InputConfigRootFolderGeneric | InputConfigRootFolderLidarr | InputConfigRootFolderReadarr;

export type InputConfigDownloadClientConfig = {
  download_client_working_folders?: string;
  enable_completed_download_handling?: boolean;
  auto_redownload_failed?: boolean;
  auto_redownload_failed_from_interactive_search?: boolean;
  check_for_finished_download_interval?: number;
};

export interface InputConfigRemotePath {
  host: string;
  remote_path: string;
  local_path: string;
}

export type InputConfigArrInstance = {
  base_url: string;
  api_key: string;
  enabled?: boolean;
  delete_unmanaged_custom_formats?: {
    enabled: boolean;
    ignore?: string[];
  };
  delete_unmanaged_quality_profiles?: {
    enabled: boolean;
    ignore?: string[];
  };
  quality_definition?: {
    type?: string;
    preferred_ratio?: number;
    qualities?: TrashQualityDefinitionQuality[];
  };
  include?: InputConfigIncludeItem[];
  custom_format_groups?: InputConfigCustomFormatGroup[];
  custom_formats?: InputConfigCustomFormat[];
  quality_profiles: ConfigQualityProfile[];
  media_management?: MediaManagementType;
  ui_config?: UiConfigType;
  media_naming_api?: MediaNamingApiType;
  renameQualityProfiles?: { from: string; to: string }[];
  cloneQualityProfiles?: { from: string; to: string }[];
  media_naming?: MediaNamingType;
  metadata_profiles?: InputConfigMetadataProfile[];
  delete_unmanaged_metadata_profiles?: {
    enabled: boolean;
    ignore?: string[];
  };
  root_folders?: InputConfigRootFolder[];
  delay_profiles?: {
    default?: InputConfigDelayProfile;
    additional?: InputConfigDelayProfile[];
  };
  download_clients?: {
    data?: InputConfigDownloadClient[];
    update_password?: boolean;
    delete_unmanaged?: {
      enabled: boolean;
      ignore?: string[];
    };
    config?: InputConfigDownloadClientConfig;
    remote_paths?: InputConfigRemotePath[];
    delete_unmanaged_remote_paths?: boolean;
  };
} & Pick<InputConfigSchema, "customFormatDefinitions">;

export type InputConfigDelayProfile = {
  enableUsenet?: boolean;
  enableTorrent?: boolean;
  preferredProtocol?: string;
  usenetDelay?: number;
  torrentDelay?: number;
  bypassIfHighestQuality?: boolean;
  bypassIfAboveCustomFormatScore?: boolean;
  minimumCustomFormatScore?: number;
  order?: number;
  tags?: string[];
};

export type InputConfigDownloadClient = {
  name: string;
  type: string;
  enable?: boolean;
  priority?: number;
  remove_completed_downloads?: boolean;
  remove_failed_downloads?: boolean;
  fields?: Record<string, any>;
  tags?: (string | number)[];
};

export type MediaManagementType = {
  // APIs not consistent across different *arrs. Keeping empty or generic
};

export type UiConfigType = {
  // APIs not consistent across different *arrs. Keeping empty or generic
};

export type MediaNamingApiType = {
  // APIs not consistent across different *arrs. Keeping empty or generic
};

export type MediaNamingType = {
  folder?: string;
  movie?: {
    rename?: boolean;
    standard?: string;
  };
  series?: string;
  season?: string;
  episodes?: {
    rename?: boolean;
    standard?: string;
    daily?: string;
    anime?: string;
  };
};

export type InputConfigQualityProfile = {
  name: string;
  reset_unmatched_scores?: {
    enabled: boolean;
    except?: string[];
  };
  upgrade?:
    | {
        allowed: true;
        until_quality: string;
        until_score: number;
        min_format_score?: number;
      }
    | {
        allowed: false;
        until_quality?: string;
        until_score?: number;
        min_format_score?: number;
      };
  min_format_score?: number;
  score_set?: keyof TrashScores;
  quality_sort?: string;
  language?: string;
  qualities?: InputConfigQualityProfileItem[];
};

export type InputConfigQualityProfileItem = {
  name: string;
  qualities?: string[];
  enabled?: boolean;
};

export type InputConfigIncludeItem = {
  template: string;
  source?: "TRASH" | "RECYCLARR";
  preferred_ratio?: number;
};

export type InputConfigLidarrMetadataProfile = {
  name: string;
  primary_types?: string[];
  secondary_types?: string[];
  release_statuses?: string[];
};

export type InputConfigReadarrMetadataProfile = {
  name: string;
  min_popularity?: number;
  skip_missing_date?: boolean;
  skip_missing_isbn?: boolean;
  skip_parts_and_sets?: boolean;
  skip_secondary_series?: boolean;
  allowed_languages?: string[] | null;
  min_pages?: number | null;
  must_not_contain?: string[];
};

export type InputConfigMetadataProfile = InputConfigLidarrMetadataProfile | InputConfigReadarrMetadataProfile;

// --- Derived types ---

export type ConfigSchema = InputConfigSchema;

export type ConfigCustomFormat = Pick<InputConfigCustomFormat, "trash_ids"> & Pick<InputConfigCustomFormat, "assign_scores_to">;

export type ConfigCustomFormatList = Pick<ConfigArrInstance, "custom_formats">;

export type ConfigArrInstance = OmitTyped<InputConfigArrInstance, "custom_formats" | "include" | "quality_profiles"> & {
  include?: ConfigIncludeItem[];
  custom_formats: ConfigCustomFormat[];
  quality_profiles: ConfigQualityProfile[];
  metadata_profiles?: InputConfigMetadataProfile[];
};

export type ConfigQualityProfile = OmitTyped<Required<InputConfigQualityProfile>, "qualities" | "reset_unmatched_scores" | "language"> & {
  qualities: ConfigQualityProfileItem[];
  reset_unmatched_scores?: InputConfigQualityProfile["reset_unmatched_scores"];
} & Pick<InputConfigQualityProfile, "language">;

export type ConfigQualityProfileItem = InputConfigQualityProfileItem;

export type ConfigIncludeItem = OmitTyped<InputConfigIncludeItem, "source"> & {
  source: InputConfigIncludeItem["source"];
};

export type InputConfigInstance = OmitTyped<InputConfigArrInstance, "api_key" | "base_url">;
export type MergedConfigInstance = OmitTyped<ConfigArrInstance, "api_key" | "base_url" | "include">;
