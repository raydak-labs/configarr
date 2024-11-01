import { MergedCustomFormatResource, MergedCustomFormatSpecificationSchema } from "./__generated__/mergedTypes";

export type DynamicImportType<T> = { default: T };

type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];

/** Used in the UI of Sonarr/Radarr to import. Trash JSON are based on that so users can copy&paste stuff */
export type UserFriendlyField = {
  name?: string | null; // TODO validate if this can really appear? As Input
  value?: any;
} & Pick<MergedCustomFormatSpecificationSchema, "negate" | "required">;

export type TrashCFSpF = { min: number; max: number; exceptLanguage: boolean; value: any };

/*
Language values:
0 = Unknown
-2 = Original
*/
export type CustomFormatImportImplementation =
  | "ReleaseTitleSpecification" // Value string
  | "LanguageSpecification" // value number
  | "SizeSpecification" // special
  | "IndexerFlagSpecification" // value number
  | "SourceSpecification" // value number
  | "ResolutionSpecification" // value number
  | "ReleaseGroupSpecification"; // value string

export type TC1 = Omit<MergedCustomFormatSpecificationSchema, "fields"> & {
  implementation: "ReleaseTitleSpecification" | "LanguageSpecification";
  fields?: RequireAtLeastOne<TrashCFSpF> | null;
};

export type TC2 = Omit<MergedCustomFormatSpecificationSchema, "fields"> & {
  implementation: "SizeSpecification";
  fields?: RequireAtLeastOne<TrashCFSpF>;
};

export type TCM = TC1 | TC2;

export type ImportCF = Omit<MergedCustomFormatResource, "specifications"> & {
  specifications?: TCM[] | null;
};

export type TrashScores = {
  default?: number;
  "anime-sonarr"?: number;
  "anime-radarr"?: number;
  "sqp-1-1080p"?: number;
  "sqp-1-2160p"?: number;
  "sqp-2"?: number;
  "sqp-3"?: number;
  "sqp-4"?: number;
  "sqp-5"?: number;
  "french-vostfr"?: number;
};

export type TrashCF = {
  trash_id: string;
  trash_scores?: TrashScores;
  trash_regex?: string;
  trash_description?: string;
} & ImportCF;

type TrashQPItem = {
  name: string;
  allowed: boolean;
  items?: string[];
};

export type TrashQP = {
  trash_id: string;
  name: string;
  trash_score_set: keyof TrashCF["trash_scores"];
  upgradeAllowed: boolean;
  cutoff: string;
  minFormatScore: number;
  cutoffFormatScore: number;
  items: TrashQPItem[];
  formatItems: {
    [key: string]: string;
  };
};

export type ConfigarrCF = {
  configarr_id: string;
  configarr_scores?: TrashCF["trash_scores"];
} & ImportCF;

export type CFProcessing = {
  carrIdMapping: Map<
    string,
    {
      carrConfig: ConfigarrCF;
      requestConfig: MergedCustomFormatResource;
    }
  >;
  cfNameToCarrConfig: Map<string, ConfigarrCF>;
};

export type InputConfigSchema = {
  trashGuideUrl: string;
  trashRevision?: string;
  recyclarrConfigUrl: string;
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

export type InputConfigArrInstance = Omit<ConfigArrInstance, "custom_formats"> & {
  custom_formats: InputConfigCustomFormat[];
};

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
};

export type TrashQualityDefintionQuality = {
  quality: string;
  min: number;
  preferred: number;
  max: number;
};

export type TrashQualityDefintion = {
  trash_id: string;
  type: string;
  qualities: TrashQualityDefintionQuality[];
};

export type RecyclarrCustomFormats = Partial<Pick<InputConfigCustomFormat, "trash_ids" | "quality_profiles" | "assign_scores_to">> & {};

export type RecyclarrConfigInstance = Omit<ConfigArrInstance, "custom_formats"> & {
  custom_formats: RecyclarrCustomFormats[];
};

// TODO
export type YamlConfigIncludeRecyclarr = {
  template: string;
  type: "RECYCLARR";
};

export type YamlConfigIncludeTrash = {
  // TODO or use template?
  id: string;
  type: "TRASH";
};
export type YamlConfigIncludeItem = YamlConfigIncludeRecyclarr | YamlConfigIncludeTrash;

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
// END TODO

export type RecyclarrTemplates = Partial<
  Pick<RecyclarrConfigInstance, "quality_definition" | "custom_formats" | "include" | "quality_profiles">
>;

export type RecyclarrMergedTemplates = RecyclarrTemplates & Required<Pick<RecyclarrTemplates, "custom_formats" | "quality_profiles">>;

export type MappedTemplates = Partial<Pick<ConfigArrInstance, "quality_definition" | "custom_formats" | "include" | "quality_profiles">>;

export type MappedMergedTemplates = MappedTemplates & Required<Pick<MappedTemplates, "custom_formats" | "quality_profiles">>;

export type ArrType = "SONARR" | "RADARR"; // anime and series exists in trash guide

export type QualityDefintionsSonarr = "anime" | "series" | "custom";
export type QualityDefintionsRadarr = "movie" | "custom";
