import { TrashCF, TrashScores } from "./trashguide.types";

export type InputConfigSchema = {
  trashGuideUrl?: string;
  trashRevision?: string;
  recyclarrConfigUrl?: string;
  recyclarrRevision?: string;
  localCustomFormatsPath?: string;
  localConfigTemplatesPath?: string;
  customFormatDefinitions?: [];

  sonarr: Record<string, InputConfigArrInstance>;
  radarr: Record<string, InputConfigArrInstance>;
};

export type ConfigSchema = InputConfigSchema & {
  sonarr: Record<string, ConfigArrInstance>;
  radarr: Record<string, ConfigArrInstance>;
};

export type InputConfigCustomFormat = {
  trash_ids?: string[];
  /**
   * @deprecated replaced with assign_scores_to
   */
  quality_profiles?: { name: string; score?: number }[];
  assign_scores_to?: { name: string; score?: number }[];
};

export type ConfigCustomFormat = Pick<InputConfigCustomFormat, "trash_ids"> & Required<Pick<InputConfigCustomFormat, "assign_scores_to">>;

export type ConfigCustomFormatList = Pick<ConfigArrInstance, "custom_formats">;

export type ConfigArrInstance = {
  base_url: string;
  api_key: string;
  quality_definition?: {
    type: string;
  };
  include?: YamlConfigIncludeItem[];
  custom_formats: ConfigCustomFormat[];
  quality_profiles: ConfigQualityProfile[];
};

export type InputConfigArrInstance = Omit<ConfigArrInstance, "custom_formats" | "include" | "quality_profiles"> & {
  custom_formats?: InputConfigCustomFormat[];
  include?: InputConfigIncludeItem[];
  // TODO this is not correct. The profile can be added partly -> InputConfigQualityProfile
  quality_profiles: ConfigQualityProfile[];
};

export type InputConfigQualityProfile = Omit<Partial<ConfigQualityProfile>, "name"> & Pick<ConfigQualityProfile, "name">;

export type ConfigQualityProfile = {
  name: string;
  reset_unmatched_scores?: {
    enabled: boolean;
    except?: string[];
  };
  upgrade: {
    allowed: boolean;
    until_quality: string;
    until_score: number;
    min_format_score?: number; // default 1
  };
  min_format_score: number;
  score_set: keyof TrashScores;
  quality_sort: string;
  qualities: ConfigQualityProfileItem[];
};

export type ConfigQualityProfileItem = {
  name: string;
  qualities?: string[];
  enabled?: boolean;
}; // TODO

export type YamlConfigIncludeRecyclarr = {
  template: string;
  type: "RECYCLARR";
};

export type YamlConfigIncludeTrash = {
  // TODO or use template?
  id: string;
  type: "TRASH";
};

export type YamlConfigIncludeGeneric = {
  // depends on source what this actually is. Can be the filename -> recyclarr or id in the files -> trash
  template: string;
  source: "TRASH";
};
// export type YamlConfigIncludeItem = YamlConfigIncludeRecyclarr | YamlConfigIncludeTrash;

export type InputConfigIncludeItem = Omit<YamlConfigIncludeItem, "source"> & {
  source?: YamlConfigIncludeItem["source"];
};

export type YamlConfigIncludeItem = {
  // depends on source what this actually is. Can be the filename -> recyclarr or id in the files -> trash
  template: string;
  source: "TRASH" | "RECYCLARR";
};

export type YamlConfigInstance = {
  base_url: string;
  api_key: string;
  quality_definition?: {
    type: string;
  };
  include?: YamlConfigIncludeItem[];
  custom_formats: InputConfigCustomFormat[];
  quality_profiles: YamlConfigQualityProfile[];
};

export type YamlConfigQualityProfile = {
  name: string;
  reset_unmatched_scores?: {
    enabled: boolean;
    except?: string[];
  };
  upgrade: {
    allowed: boolean;
    until_quality: string;
    until_score: number;
  };
  min_format_score: number;
  score_set: keyof TrashCF["trash_scores"];
  quality_sort: "top" | "bottom";
  qualities: YamlConfigQualityProfileItems[];
};

export type YamlConfigQualityProfileItems = {
  name: string;
  qualities?: string[];
};
