import { CustomFormatResource, CustomFormatSpecificationSchema } from "./__generated__/generated-sonarr-api";

export type DynamicImportType<T> = { default: T };

/** Used in the UI of Sonarr/Radarr to import. Trash JSON are based on that so users can copy&paste stuff */
export type UserFriendlyField = {
  name?: string | null;
  value?: any;
} & Pick<CustomFormatSpecificationSchema, "negate" | "required">;

export type TrashCFSpF = { min: number; max: number };

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

export type TC1 = Omit<CustomFormatSpecificationSchema, "fields"> & {
  implementation: "ReleaseTitleSpecification" | "LanguageSpecification";
  fields?: UserFriendlyField | null;
};

export type TC2 = Omit<CustomFormatSpecificationSchema, "fields"> & {
  implementation: "SizeSpecification";
  fields?: TrashCFSpF;
};

export type TCM = TC1 | TC2;

export type ImportCF = Omit<CustomFormatResource, "specifications"> & {
  specifications?: TCM[] | null;
};

export type TrashCF = {
  trash_id: string;
  trash_scores?: {
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
  trash_regex?: string;
  trash_description?: string;
} & ImportCF;

export type ConfigarrCF = {
  configarr_id: string;
  configarr_scores?: TrashCF["trash_scores"];
} & ImportCF;

export type CFProcessing = {
  carrIdMapping: Map<
    string,
    {
      carrConfig: ConfigarrCF;
      requestConfig: CustomFormatResource;
    }
  >;
  cfNameToCarrConfig: Map<string, ConfigarrCF>;
};

export type YamlList = {
  trash_ids?: string[];
  quality_profiles: { name: string; score?: number }[];
};

export type YamlInput = {
  custom_formats: YamlList[];
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

export type YamlConfigInstance = {
  base_url: string;
  api_key: string;
  quality_definition?: {
    type: string;
  };
  include?: { template: string }[];
  custom_formats: YamlList[];
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
  quality_sort: string;
  qualities: YamlConfigQualityProfileItems[];
};

export type YamlConfigQualityProfileItems = {
  name: string;
  qualities?: string[];
};

export type RecyclarrTemplates = Partial<
  Pick<YamlConfigInstance, "quality_definition" | "custom_formats" | "include" | "quality_profiles">
>;

export type RecyclarrMergedTemplates = RecyclarrTemplates & Required<Pick<RecyclarrTemplates, "custom_formats" | "quality_profiles">>;

export type YamlConfig = {
  trashGuideUrl: string;
  trashRevision?: string;
  recyclarrConfigUrl: string;
  recyclarrRevision?: string;
  localCustomFormatsPath?: string;
  localConfigTemplatesPath?: string;
  customFormatDefinitions?: [];

  sonarr: {
    [key: string]: YamlConfigInstance;
  };
  radarr: {
    [key: string]: YamlConfigInstance;
  };
};

export type ArrType = "SONARR" | "RADARR"; // anime and series exists in trash guide

export type QualityDefintionsSonarr = "anime" | "series" | "custom";
export type QualityDefintionsRadarr = "movie" | "custom";
