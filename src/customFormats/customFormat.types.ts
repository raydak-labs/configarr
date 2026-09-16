import { z } from "zod";
import type { TrashCF, TrashCFSpF } from "../types/trashguide.types";

export type CustomFormatSpecification = {
  id?: number;
  name?: string | null;
  implementation?: string | null;
  implementationName?: string | null;
  infoLink?: string | null;
  negate?: boolean;
  required?: boolean;
  fields?: Array<{
    name?: string | null;
    value?: unknown;
    order?: number;
    label?: string | null;
    unit?: string | null;
    helpText?: string | null;
    type?: string | null;
    advanced?: boolean;
    isFloat?: boolean;
  }> | null;
};

/** TRaSH/config mapping payload sent to *arr custom-format APIs. */
export type CustomFormatRequest = {
  id?: number;
  name?: string | null;
  includeCustomFormatWhenRenaming?: boolean | null;
  specifications?: CustomFormatSpecification[] | null;
};

/** Used in the UI of Sonarr/Radarr to import. Trash JSON are based on that so users can copy&paste stuff */
export type UserFriendlyField = {
  name?: string | null;
  value?: any;
  negate?: boolean;
  required?: boolean;
};

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

export type ReleaseTitleOrLanguageSpecification = OmitTyped<CustomFormatSpecification, "fields"> & {
  implementation: "ReleaseTitleSpecification" | "LanguageSpecification";
  fields?: RequireAtLeastOne<TrashCFSpF> | null;
};

export type SizeSpecificationImport = OmitTyped<CustomFormatSpecification, "fields"> & {
  implementation: "SizeSpecification";
  fields?: RequireAtLeastOne<TrashCFSpF>;
};

export type CustomFormatSpecificationImport = ReleaseTitleOrLanguageSpecification | SizeSpecificationImport;

export type ImportCF = OmitTyped<CustomFormatRequest, "specifications"> & {
  specifications?: CustomFormatSpecificationImport[] | null;
} & Required<Pick<CustomFormatRequest, "name">>;

export type ConfigarrCFMeta = {
  configarr_id: string;
  configarr_scores?: TrashCF["trash_scores"];
};

export type ConfigarrCF = ConfigarrCFMeta & ImportCF;

export const ConfigarrCFSchema: z.ZodType<ConfigarrCF> = z
  .any()
  .refine((v) => v != null && typeof v === "object" && typeof v.configarr_id === "string" && typeof v.name === "string", {
    message: "ConfigarrCF must be an object with 'configarr_id' and 'name' string fields",
  });

type CFConfigGroup = {
  carrConfig: ConfigarrCF;
  requestConfig: CustomFormatRequest;
};

export type CFIDToConfigGroup = Map<string, CFConfigGroup>;

export type CFProcessing = {
  carrIdMapping: CFIDToConfigGroup;
  /** Last merge-order winner per CF `name` (same row Sonarr/Radarr); used by manageCf. */
  cfNameToCarrConfig: Map<string, ConfigarrCF>;
};
