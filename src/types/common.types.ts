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

export type MappedTemplates = Partial<
  Pick<InputConfigArrInstance, "quality_definition" | "custom_formats" | "include" | "quality_profiles">
>;

export type MappedMergedTemplates = MappedTemplates & Required<Pick<MappedTemplates, "custom_formats" | "quality_profiles">>;

export type ArrType = "RADARR" | "SONARR" | "WHISPARR" | "READARR";

export type QualityDefintionsSonarr = "anime" | "series" | "custom";
export type QualityDefintionsRadarr = "movie" | "custom";
