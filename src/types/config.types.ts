import { ConfigarrCF } from "./common.types";
import { TrashCF, TrashQualityDefinitionQuality, TrashScores } from "./trashguide.types";

export type CustomFormatDefinitions = (TrashCF | ConfigarrCF)[];

export type InputConfigSchema = {
  trashGuideUrl?: string;
  trashRevision?: string;
  recyclarrConfigUrl?: string;
  recyclarrRevision?: string;
  localCustomFormatsPath?: string;
  localConfigTemplatesPath?: string;
  // @experimental since v1.12.0
  enableFullGitClone?: boolean;
  customFormatDefinitions?: CustomFormatDefinitions;

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
  /**
   * @deprecated replaced with assign_scores_to
   */
  quality_profiles?: { name: string; score?: number }[];
  assign_scores_to?: { name: string; score?: number }[];
};

export type InputConfigCustomFormatGroup = {
  trash_guide?: { id: string; include_unrequired?: boolean }[];
  assign_scores_to?: { name: string; score?: number }[];
};

export type InputConfigArrInstance = {
  base_url: string;
  api_key: string;
  /**
   * since v1.11.0
   */
  enabled?: boolean;
  /**
   * since v1.12.0
   * Deletes all CustomFormats which are not defined in any qualityprofile
   */
  delete_unmanaged_custom_formats?: {
    enabled: boolean;
    /**
     * Names of custom formats to ignore deleting
     */
    ignore?: string[];
  };
  quality_definition?: {
    type?: string;
    preferred_ratio?: number; // 0.0 - 1.0
    // @experimental
    qualities?: TrashQualityDefinitionQuality[];
  };
  include?: InputConfigIncludeItem[];
  /**
   * @experimental since v1.12.0
   */
  custom_format_groups?: InputConfigCustomFormatGroup[];
  custom_formats?: InputConfigCustomFormat[];
  // TODO this is not correct. The profile can be added partly -> InputConfigQualityProfile
  quality_profiles: ConfigQualityProfile[];
  /* @experimental */
  media_management?: MediaManagementType;
  /* @experimental */
  media_naming_api?: MediaNamingApiType;
  renameQualityProfiles?: { from: string; to: string }[];
  cloneQualityProfiles?: { from: string; to: string }[];

  // this is recyclarr specific: https://recyclarr.dev/wiki/yaml/config-reference/media-naming/
  media_naming?: MediaNamingType;

  /**
   * @experimental since v1.14.0
   */
  root_folders?: string[];
  /**
   * @experimental since v1.14.0
   */
  delay_profiles?: {
    default?: InputConfigDelayProfile;
    additional?: InputConfigDelayProfile[];
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

export type MediaManagementType = {
  // APIs not consistent across different *arrs. Keeping empty or generic
};

// HINT: Experimental
export type MediaNamingApiType = {
  // APIs not consistent across different *arrs. Keeping empty or generic
};

export type MediaNamingType = {
  // radarr
  folder?: string;
  movie?: {
    rename?: boolean;
    standard?: string;
  };

  // sonarr
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
  upgrade?: {
    allowed: boolean;
    until_quality: string;
    until_score: number;
    min_format_score?: number; // default 1
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
  // depends on source what this actually is. Can be the filename -> recyclarr or id in the files -> trash
  template: string;
  source?: "TRASH" | "RECYCLARR";
};

export type ConfigSchema = InputConfigSchema;

export type ConfigCustomFormat = Pick<InputConfigCustomFormat, "trash_ids"> & Required<Pick<InputConfigCustomFormat, "assign_scores_to">>;

export type ConfigCustomFormatList = Pick<ConfigArrInstance, "custom_formats">;

export type ConfigArrInstance = OmitTyped<InputConfigArrInstance, "custom_formats" | "include" | "quality_profiles"> & {
  include?: ConfigIncludeItem[];
  custom_formats: ConfigCustomFormat[];
  quality_profiles: ConfigQualityProfile[];
};

export type ConfigQualityProfile = OmitTyped<Required<InputConfigQualityProfile>, "qualities" | "reset_unmatched_scores" | "language"> & {
  qualities: ConfigQualityProfileItem[];
  reset_unmatched_scores?: InputConfigQualityProfile["reset_unmatched_scores"];
} & Pick<InputConfigQualityProfile, "language">;

export type ConfigQualityProfileItem = InputConfigQualityProfileItem;

export type ConfigIncludeItem = OmitTyped<InputConfigIncludeItem, "source"> & {
  source: InputConfigIncludeItem["source"];
};

// TODO maybe reduce
export type InputConfigInstance = OmitTyped<InputConfigArrInstance, "api_key" | "base_url">;
export type MergedConfigInstance = OmitTyped<ConfigArrInstance, "api_key" | "base_url" | "include">;
