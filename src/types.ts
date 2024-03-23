import {
  CustomFormatResource,
  CustomFormatSpecificationSchema,
} from "./__generated__/MySuperbApi";

export type DynamicImportType<T> = { default: T };

/** Used in the UI of Sonarr/Radarr to import. Trash JSON are based on that so users can copy&paste stuff */
export type UserFriendlyField = {
  name?: string | null;
  value?: any;
} & Pick<CustomFormatSpecificationSchema, "negate" | "required">;

export type TrashCFSpF = { min: number; max: number };

export type TC1 = Omit<CustomFormatSpecificationSchema, "fields"> & {
  implementation: "ReleaseTitleSpecification" | "LanguageSpecification";
  fields?: UserFriendlyField | null;
};

export type TC2 = Omit<CustomFormatSpecificationSchema, "fields"> & {
  implementation: "SizeSpecification";
  fields?: TrashCFSpF;
};

export type TCM = TC1 | TC2;

export type TrashCFResource = Omit<CustomFormatResource, "specifications"> & {
  specifications?: TCM[] | null;
};

export type TrashCF = {
  trash_id: string;
  trash_scores?: {
    default: number;
  };
  trash_regex?: string;
  trash_description?: string;
} & TrashCFResource;

export type ConfigarrCF = {
  configarr_id: string;
  configarr_scores?: {
    default: number;
  };
} & TrashCFResource;

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
  quality_profiles: { name: string }[];
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
