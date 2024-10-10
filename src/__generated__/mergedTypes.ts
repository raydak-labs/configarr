import {
  QualityDefinitionResource as QDRRadarr,
  CustomFormatResource as RadarrCustomFormatResource,
  CustomFormatSpecificationSchema as RadarrCustomFormatSpecificationSchema,
  ProfileFormatItemResource as RadarrProfileFormatItemResource,
  QualityProfileQualityItemResource as RadarrQualityProfileQualityItemResource,
  QualityProfileResource as RadarrQualityProfileResource,
} from "./radarr/data-contracts";
import {
  QualityDefinitionResource as QDRSonarr,
  CustomFormatResource as SonarrCustomFormatResource,
  CustomFormatSpecificationSchema as SonarrCustomFormatSpecificationSchema,
  ProfileFormatItemResource as SonarrProfileFormatItemResource,
  QualityProfileQualityItemResource as SonarrQualityProfileQualityItemResource,
  QualityProfileResource as SonarrQualityProfileResource,
} from "./sonarr/data-contracts";

// Those types are only to make the API client unified usable.
// Sonarr and Radarr slightly differ in API fields and therefore at the moment we can ignore those changes.
// If someday we need specific fields per *arr instance then we have to split the API usage and modify every module.

type QDRMerged = QDRSonarr & QDRRadarr;
type QDRPickedSource = Omit<NonNullable<QDRMerged["quality"]>, "source">;
type CustomQualitySource<T> = {
  quality?: T & {
    source?: string;
  };
};

type OmittedQuality = Omit<QDRMerged, "quality">;

export type MergedQualityDefinitionResource = OmittedQuality & Partial<CustomQualitySource<QDRPickedSource>>;
export type MergedCustomFormatResource = SonarrCustomFormatResource & RadarrCustomFormatResource;
export type MergedProfileFormatItemResource = SonarrProfileFormatItemResource & RadarrProfileFormatItemResource;

type QPQIRMerged = SonarrQualityProfileQualityItemResource & RadarrQualityProfileQualityItemResource;
type QPQIRPickedSource = Omit<NonNullable<QPQIRMerged["quality"]>, "source">;

export type MergedQualityProfileQualityItemResource = Omit<QPQIRMerged, "items" | "quality"> &
  Partial<
    Omit<QPQIRMerged, "items" | "quality"> & {
      items?: MergedQualityProfileQualityItemResource[] | null;
      quality?: QPQIRPickedSource & { source?: string };
    }
  >;

type QPRMerged = SonarrQualityProfileResource & RadarrQualityProfileResource;

export type MergedQualityProfileResource = Omit<QPRMerged, "items"> &
  Partial<
    Omit<QPRMerged, "items"> & {
      items?: MergedQualityProfileQualityItemResource[] | null;
    }
  >;

export type MergedCustomFormatSpecificationSchema = RadarrCustomFormatSpecificationSchema & SonarrCustomFormatSpecificationSchema;
