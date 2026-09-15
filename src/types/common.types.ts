import { ConfigQualityProfile, InputConfigArrInstance } from "./config.types";

export type DynamicImportType<T> = { default: T };

export type MappedTemplates = Partial<
  Pick<
    InputConfigArrInstance,
    | "quality_definition"
    | "custom_formats"
    | "custom_format_groups"
    | "include"
    | "customFormatDefinitions"
    | "media_management"
    | "media_naming"
    | "media_naming_api"
    | "ui_config"
    | "delete_unmanaged_custom_formats"
    | "delete_unmanaged_quality_profiles"
    | "delete_unmanaged_metadata_profiles"
    | "metadata_profiles"
    | "root_folders"
    | "delay_profiles"
    | "download_clients"
  >
> & {
  // Not picked from InputConfigArrInstance: by the time profiles live in mergedTemplates
  // they're being progressively resolved/defaulted toward the fully-merged shape (see
  // mergeConfigsAndTemplates), not the raw, possibly-sparse input shape.
  quality_profiles?: ConfigQualityProfile[];
};

export type MappedMergedTemplates = MappedTemplates & Required<Pick<MappedTemplates, "custom_formats" | "quality_profiles">>;

export const ArrTypeConst = ["RADARR", "SONARR", "WHISPARR", "READARR", "LIDARR", "PROWLARR"] as const;
export type ArrType = (typeof ArrTypeConst)[number];
export type MediaArrType = Exclude<ArrType, "PROWLARR">;

export type QualityDefinitionsSonarr = "anime" | "series" | "custom";
export type QualityDefinitionsRadarr = "movie" | "sqp-streaming" | "sqp-uhd" | "custom";
