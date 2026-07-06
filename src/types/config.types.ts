import { z } from "zod";
import { ConfigarrCF, ConfigarrCFSchema } from "./common.types";
import { TrashCF, TrashCFSchema, TrashQualityDefinitionQualitySchema, TrashScoresSchema } from "./trashguide.types";

// ============================================================================
// Each type below is derived from its Zod schema (type X = z.infer<typeof XSchema>)
// so the compiler enforces that they can never drift apart - a field missing from
// a schema becomes a compile error at every place the code reads it, instead of
// silently disappearing at runtime (Zod strips unrecognized keys on a successful
// parse). Two kinds of exception keep a manually-written type instead:
//   - ImportCF/ConfigarrCF (common.types.ts) extend generated __generated__ API
//     client types, which aren't reasonably re-modeled in Zod.
//   - The "Derived types" section at the end (ConfigArrInstance, ConfigQualityProfile,
//     etc.) is the merged/output shape produced by this app's own code (transformConfig,
//     mergeConfigsAndTemplates) - never parsed from external bytes, so there's nothing
//     to validate and no schema for it.
// ============================================================================

export const CustomFormatDefinitionsSchema = z.array(z.union([TrashCFSchema, ConfigarrCFSchema]));
export type CustomFormatDefinitions = (TrashCF | ConfigarrCF)[];

const ScoreAssignmentSchema = z.object({
  name: z.string(),
  score: z.number().optional(),
  use_default_score: z.boolean().optional(),
});

export const InputConfigIncludeItemSchema = z.object({
  // depends on source what this actually is. Can be the filename -> recyclarr or id in the files -> trash
  template: z.string(),
  source: z.enum(["TRASH", "RECYCLARR"]).optional(),
  // Optional preferred ratio (0.0 - 1.0) applied when this include resolves to a
  // TRaSH quality definition. Has no effect for quality profile includes.
  preferred_ratio: z.number().min(0).max(1).optional(),
  // @experimental @since v1.28.0 - TRaSH quality-profile include only: include optional
  // `default:true` CFs from default groups. Defaults to instance-level setting, then true.
  trash_cfgroup_include_optional: z.boolean().optional(),
  // @experimental @since v1.28.0 - TRaSH quality-profile include only: include all CFs
  // from matched default groups.
  trash_cfgroup_include_unrequired: z.boolean().optional(),
  // @experimental @since v1.28.0 - TRaSH quality-profile include only: add CF trash IDs
  // on top of matched default-group selection.
  trash_cfgroup_include_cfs: z.array(z.object({ id: z.string() })).optional(),
  // @experimental @since v1.28.0 - TRaSH quality-profile include only: explicit deny-list
  // of CF trash IDs from matched default groups (wins over include).
  trash_cfgroup_exclude_cfs: z.array(z.object({ id: z.string() })).optional(),
});
export type InputConfigIncludeItem = z.infer<typeof InputConfigIncludeItemSchema>;

export const InputConfigQualityProfileItemSchema = z.object({
  name: z.string(),
  qualities: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
});
export type InputConfigQualityProfileItem = z.infer<typeof InputConfigQualityProfileItemSchema>;

export const InputConfigQualityProfileSchema = z.object({
  name: z.string(),
  reset_unmatched_scores: z
    .object({
      enabled: z.boolean(),
      except: z.array(z.string()).optional(),
    })
    .optional(),
  // Not a discriminated union on `allowed`: real-world configs (e.g. examples/full)
  // omit `allowed` entirely and rely on its runtime-truthy default of "disabled"
  // (see quality-profiles.ts). The until_quality-required-when-allowed=true invariant
  // is enforced there too, with a clearer error message than Zod could give here.
  upgrade: z
    .object({
      allowed: z.boolean().optional(),
      until_quality: z.string().optional(),
      until_score: z.number().optional(),
      min_format_score: z.number().optional(),
    })
    .optional(),
  min_format_score: z.number().optional(),
  // .keyof() derives from TrashScoresSchema instead of a bare z.string() so this is a
  // single source of truth with TrashQPSchema.trash_score_set (and so a typo'd score-set
  // name gets caught by validation instead of silently resolving to no score at all).
  score_set: TrashScoresSchema.keyof().optional(),
  quality_sort: z.string().optional(),
  language: z.string().optional(),
  qualities: z.array(InputConfigQualityProfileItemSchema).optional(),
});
export type InputConfigQualityProfile = z.infer<typeof InputConfigQualityProfileSchema>;

export const InputConfigCustomFormatSchema = z.object({
  trash_ids: z.array(z.string()).optional(),
  /** @deprecated replaced with assign_scores_to */
  quality_profiles: z.array(ScoreAssignmentSchema).optional(),
  assign_scores_to: z.array(ScoreAssignmentSchema).optional(),
});
export type InputConfigCustomFormat = z.infer<typeof InputConfigCustomFormatSchema>;

/** One TRaSH cf-group reference under `custom_format_groups[].trash_guide`. */
export const InputConfigCfGroupTrashGuideItemSchema = z.object({
  id: z.string(),
  include_unrequired: z.boolean().optional(),
  /** If set, these CF `trash_id`s are added to the group base selection (must exist in the group JSON). */
  include: z.array(z.object({ id: z.string() })).optional(),
  /** Remove these CF `trash_id`s from the selection; wins over `include` when both list the same id. */
  exclude: z.array(z.object({ id: z.string() })).optional(),
});
export type InputConfigCfGroupTrashGuideItem = z.infer<typeof InputConfigCfGroupTrashGuideItemSchema>;

export const InputConfigCustomFormatGroupSchema = z.object({
  trash_guide: z.array(InputConfigCfGroupTrashGuideItemSchema).optional(),
  assign_scores_to: z
    .array(
      z.object({
        name: z.string(),
        score: z.number().optional(),
      }),
    )
    .optional(),
});
export type InputConfigCustomFormatGroup = z.infer<typeof InputConfigCustomFormatGroupSchema>;

/**
 * @experimental
 * @since v1.28.0
 */
export const InputConfigTrashCfGroupConfigSchema = z.object({
  // @experimental include optional `default:true` CFs in TRaSH auto-group loading. @default true
  include_optional: z.boolean().optional(),
  // @experimental include all CFs from matched TRaSH groups. @default false
  include_unrequired: z.boolean().optional(),
  // @experimental add specific CF ids on top of TRaSH auto-group base selection.
  include_cfs: z.array(z.object({ id: z.string() })).optional(),
  // @experimental deny-list CF ids for TRaSH auto-group loading (wins over include).
  exclude_cfs: z.array(z.object({ id: z.string() })).optional(),
});
export type InputConfigTrashCfGroupConfig = z.infer<typeof InputConfigTrashCfGroupConfigSchema>;

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
export type InputConfigRootFolderLidarr = z.infer<typeof InputConfigRootFolderLidarrSchema>;

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
export type InputConfigRootFolderReadarr = z.infer<typeof InputConfigRootFolderReadarrSchema>;

export const InputConfigRootFolderGenericSchema = z.string();
export type InputConfigRootFolderGeneric = z.infer<typeof InputConfigRootFolderGenericSchema>;

export const InputConfigRootFolderSchema = z.union([
  InputConfigRootFolderGenericSchema,
  InputConfigRootFolderLidarrSchema,
  InputConfigRootFolderReadarrSchema,
]);
export type InputConfigRootFolder = z.infer<typeof InputConfigRootFolderSchema>;

export const InputConfigDownloadClientConfigSchema = z.object({
  download_client_working_folders: z.string().optional(),
  enable_completed_download_handling: z.boolean().optional(),
  auto_redownload_failed: z.boolean().optional(),
  auto_redownload_failed_from_interactive_search: z.boolean().optional(),
  check_for_finished_download_interval: z.number().optional(),
});
export type InputConfigDownloadClientConfig = z.infer<typeof InputConfigDownloadClientConfigSchema>;

export const InputConfigRemotePathSchema = z.object({
  host: z.string(),
  remote_path: z.string(),
  local_path: z.string(),
});
export type InputConfigRemotePath = z.infer<typeof InputConfigRemotePathSchema>;

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
export type InputConfigDelayProfile = z.infer<typeof InputConfigDelayProfileSchema>;

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
export type InputConfigDownloadClient = z.infer<typeof InputConfigDownloadClientSchema>;

// APIs not consistent across different *arrs. Keeping empty/generic and open to arbitrary keys.
export const MediaManagementTypeSchema = z.object({}).passthrough();
export type MediaManagementType = z.infer<typeof MediaManagementTypeSchema>;

export const UiConfigTypeSchema = z.object({}).passthrough();
export type UiConfigType = z.infer<typeof UiConfigTypeSchema>;

export const MediaNamingApiTypeSchema = z.object({}).passthrough();
export type MediaNamingApiType = z.infer<typeof MediaNamingApiTypeSchema>;

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
export type MediaNamingType = z.infer<typeof MediaNamingTypeSchema>;

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
export type InputConfigLidarrMetadataProfile = z.infer<typeof InputConfigLidarrMetadataProfileSchema>;

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
export type InputConfigReadarrMetadataProfile = z.infer<typeof InputConfigReadarrMetadataProfileSchema>;

export const InputConfigMetadataProfileSchema = z.union([InputConfigLidarrMetadataProfileSchema, InputConfigReadarrMetadataProfileSchema]);
export type InputConfigMetadataProfile = z.infer<typeof InputConfigMetadataProfileSchema>;

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
  // @experimental since v1.12.0 (expanded cf-group semantics since v1.28.0)
  custom_format_groups: z.array(InputConfigCustomFormatGroupSchema).optional(),
  // @experimental @since v1.28.0 - Instance-level defaults for TRaSH auto CF-group loading.
  // Can be overridden per include item with `trash_cfgroup_*` fields.
  trash_cfgroup_config: InputConfigTrashCfGroupConfigSchema.optional(),
  custom_formats: z.array(InputConfigCustomFormatSchema).optional(),
  // Optional at the input stage: an instance can rely entirely on `include` templates
  // for its profiles without declaring any directly (see examples/full's sonarr instance).
  quality_profiles: z.array(InputConfigQualityProfileSchema).optional(),
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
export type InputConfigArrInstance = z.infer<typeof InputConfigArrInstanceSchema>;

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
  // Silences warnings emitted when a Quality Profile contains CustomFormats that TRaSH-Guides
  // marks as mutually exclusive in `conflicts.json`. Sync behavior itself is not changed - only
  // the log output is suppressed. Useful when conflicting CFs are intentionally configured.
  // @default false
  silenceTrashConflictWarnings: z.boolean().optional(),
  // Suppresses warnings when `custom_format_groups` excludes a CF that TRaSH marks as `required`
  // in the cf-group JSON. Sync behavior unchanged - only log output affected.
  // @since v1.28.0 @default false
  silenceRequiredCfGroupExclusionWarnings: z.boolean().optional(),

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
export type InputConfigSchema = z.infer<typeof InputConfigSchemaSchema>;

// ============================================================================
// Derived types - built by this app's own code (transformConfig, mergeConfigsAndTemplates)
// from the schema-derived types above. Never independently parsed from external input,
// so there's no schema for these; ordinary TypeScript type composition is enough.
// ============================================================================

export type ConfigSchema = InputConfigSchema;

export type ConfigCustomFormat = Pick<InputConfigCustomFormat, "trash_ids"> & Pick<InputConfigCustomFormat, "assign_scores_to">;

export type ConfigCustomFormatList = Pick<ConfigArrInstance, "custom_formats">;

export type ConfigArrInstance = OmitTyped<InputConfigArrInstance, "custom_formats" | "include" | "quality_profiles"> & {
  include?: ConfigIncludeItem[];
  custom_formats: ConfigCustomFormat[];
  quality_profiles: ConfigQualityProfile[];
  metadata_profiles?: InputConfigMetadataProfile[];
};

export type ConfigQualityProfile = OmitTyped<
  Required<InputConfigQualityProfile>,
  "qualities" | "reset_unmatched_scores" | "language" | "score_set"
> & {
  qualities: ConfigQualityProfileItem[];
  reset_unmatched_scores?: InputConfigQualityProfile["reset_unmatched_scores"];
} & Pick<InputConfigQualityProfile, "language" | "score_set">;

export type ConfigQualityProfileItem = InputConfigQualityProfileItem;

export type ConfigIncludeItem = OmitTyped<InputConfigIncludeItem, "source"> & {
  source: InputConfigIncludeItem["source"];
};

export type InputConfigInstance = OmitTyped<InputConfigArrInstance, "api_key" | "base_url">;
export type MergedConfigInstance = OmitTyped<ConfigArrInstance, "api_key" | "base_url" | "include">;
