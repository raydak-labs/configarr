import { TrashScores } from "./trashguide.types";

export type InputConfigSchema = {
  trashGuideUrl?: string;
  trashRevision?: string;
  recyclarrConfigUrl?: string;
  recyclarrRevision?: string;
  localCustomFormatsPath?: string;
  localConfigTemplatesPath?: string;
  customFormatDefinitions?: [];

  sonarr?: Record<string, InputConfigArrInstance>;
  radarr?: Record<string, InputConfigArrInstance>;
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
  };
  include?: InputConfigIncludeItem[];
  custom_formats?: InputConfigCustomFormat[];
  // TODO this is not correct. The profile can be added partly -> InputConfigQualityProfile
  quality_profiles: ConfigQualityProfile[];
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
