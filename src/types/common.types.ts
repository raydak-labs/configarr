import { MergedCustomFormatResource, MergedCustomFormatSpecificationSchema } from "../__generated__/mergedTypes";
import { InputConfigArrInstance } from "./config.types";
import { TrashCF, TrashCFSpF } from "./trashguide.types";

export type DynamicImportType<T> = { default: T };

type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];

/** Used in the UI of Sonarr/Radarr to import. Trash JSON are based on that so users can copy&paste stuff */
export type UserFriendlyField = {
  name?: string | null; // TODO validate if this can really appear? As Input
  value?: any;
} & Pick<MergedCustomFormatSpecificationSchema, "negate" | "required">;

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

export type TC1 = OmitTyped<MergedCustomFormatSpecificationSchema, "fields"> & {
  implementation: "ReleaseTitleSpecification" | "LanguageSpecification";
  fields?: RequireAtLeastOne<TrashCFSpF> | null;
};

export type TC2 = OmitTyped<MergedCustomFormatSpecificationSchema, "fields"> & {
  implementation: "SizeSpecification";
  fields?: RequireAtLeastOne<TrashCFSpF>;
};

export type TCM = TC1 | TC2;

export type ImportCF = OmitTyped<MergedCustomFormatResource, "specifications"> & {
  specifications?: TCM[] | null;
} & Required<Pick<MergedCustomFormatResource, "name">>;

export type ConfigarrCFMeta = {
  configarr_id: string;
  configarr_scores?: TrashCF["trash_scores"];
};

export type ConfigarrCF = ConfigarrCFMeta & ImportCF;

type CFConfigGroup = {
  carrConfig: ConfigarrCF;
  requestConfig: MergedCustomFormatResource;
};

export type CFIDToConfigGroup = Map<string, CFConfigGroup>;

export type CFProcessing = {
  carrIdMapping: CFIDToConfigGroup;
  cfNameToCarrConfig: Map<string, ConfigarrCF>;
};

export type MappedTemplates = Partial<
  Pick<
    InputConfigArrInstance,
    | "quality_definition"
    | "custom_formats"
    | "custom_format_groups"
    | "include"
    | "quality_profiles"
    | "customFormatDefinitions"
    | "media_management"
    | "media_naming"
    | "media_naming_api"
    | "delete_unmanaged_custom_formats"
    | "delete_unmanaged_quality_profiles"
    | "root_folders"
    | "delay_profiles"
    | "download_clients"
  >
>;

export type MappedMergedTemplates = MappedTemplates & Required<Pick<MappedTemplates, "custom_formats" | "quality_profiles">>;

export const ArrTypeConst = ["RADARR", "SONARR", "WHISPARR", "READARR", "LIDARR"] as const;
export type ArrType = (typeof ArrTypeConst)[number];

export type QualityDefinitionsSonarr = "anime" | "series" | "custom";
export type QualityDefinitionsRadarr = "movie" | "sqp-streaming" | "sqp-uhd" | "custom";
