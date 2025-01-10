import { ArrType } from "./common.types";
import { ConfigArrInstance, InputConfigCustomFormat } from "./config.types";

export type RecyclarrCustomFormats = Partial<Pick<InputConfigCustomFormat, "trash_ids" | "quality_profiles" | "assign_scores_to">> & {};

export type RecyclarrConfigInstance = OmitTyped<ConfigArrInstance, "custom_formats"> & {
  custom_formats: RecyclarrCustomFormats[];
};

export type RecyclarrTemplates = Partial<
  Pick<RecyclarrConfigInstance, "quality_definition" | "custom_formats" | "include" | "quality_profiles">
>;

export type RecyclarrArrSupported = Subset<ArrType, "RADARR" | "SONARR">;
