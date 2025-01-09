import { ConfigarrCF } from "./common.types";
import { TrashCF, TrashScores } from "./trashguide.types";

export type CustomFormatDefinitions = (TrashCF | ConfigarrCF)[];

export type InputConfigSchema = {
  trashGuideUrl?: string;
  trashRevision?: string;
  recyclarrConfigUrl?: string;
  recyclarrRevision?: string;
  localCustomFormatsPath?: string;
  localConfigTemplatesPath?: string;
  customFormatDefinitions?: CustomFormatDefinitions;

  sonarr?: Record<string, InputConfigArrInstance>;
  radarr?: Record<string, InputConfigArrInstance>;
  whisparr?: Record<string, InputConfigArrInstance>;
  readarr?: Record<string, InputConfigArrInstance>;
};

export type InputConfigCustomFormat = {
  trash_ids?: string[];
  /**
   * @deprecated replaced with assign_scores_to
   */
  quality_profiles?: { name: string; score?: number }[];
  assign_scores_to?: { name: string; score?: number }[];
};

export type InputConfigArrInstance = {
  base_url: string;
  api_key: string;
  quality_definition?: {
    type: string;
    preferred_ratio?: number; // 0.0 - 1.0
  };
  include?: InputConfigIncludeItem[];
  custom_formats?: InputConfigCustomFormat[];
  // TODO this is not correct. The profile can be added partly -> InputConfigQualityProfile
  quality_profiles: ConfigQualityProfile[];
  /* @experimental */
  media_management?: MediaManagementType;
  /* @experimental */
  media_naming_api?: MediaNamingApiType;

  // this is recyclarr specific: https://recyclarr.dev/wiki/yaml/config-reference/media-naming/
  media_naming?: MediaNamingType;
} & Pick<InputConfigSchema, "customFormatDefinitions">;

// HINT: Experimental
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

export type ConfigQualityProfile = OmitTyped<Required<InputConfigQualityProfile>, "qualities" | "reset_unmatched_scores"> & {
  qualities: ConfigQualityProfileItem[];
  reset_unmatched_scores?: InputConfigQualityProfile["reset_unmatched_scores"];
};

export type ConfigQualityProfileItem = InputConfigQualityProfileItem;

export type ConfigIncludeItem = OmitTyped<InputConfigIncludeItem, "source"> & {
  source: InputConfigIncludeItem["source"];
};

// TODO maybe reduce
export type InputConfigInstance = OmitTyped<InputConfigArrInstance, "api_key" | "base_url">;
export type MergedConfigInstance = OmitTyped<ConfigArrInstance, "api_key" | "base_url" | "include">;
