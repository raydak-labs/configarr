import {
  QualityDefinitionResource as QDRRadarr,
  CustomFormatResource as RadarrCustomFormatResource,
  CustomFormatSpecificationSchema as RadarrCustomFormatSpecificationSchema,
  ProfileFormatItemResource as RadarrProfileFormatItemResource,
  QualityProfileQualityItemResource as RadarrQualityProfileQualityItemResource,
  QualityProfileResource as RadarrQualityProfileResource,
  RootFolderResource as RadarrRootFolderResource,
} from "./radarr/data-contracts";
import {
  QualityDefinitionResource as QDRSonarr,
  CustomFormatResource as SonarrCustomFormatResource,
  CustomFormatSpecificationSchema as SonarrCustomFormatSpecificationSchema,
  ProfileFormatItemResource as SonarrProfileFormatItemResource,
  QualityProfileQualityItemResource as SonarrQualityProfileQualityItemResource,
  QualityProfileResource as SonarrQualityProfileResource,
  RootFolderResource as SonarrRootFolderResource,
} from "./sonarr/data-contracts";

// Those types are only to make the API client unified usable.
// Sonarr and Radarr slightly differ in API fields and therefore at the moment we can ignore those changes.
// If someday we need specific fields per *arr instance then we have to split the API usage and modify every module.

type QDRMerged = QDRSonarr & QDRRadarr;
type QDRPickedSource = OmitTyped<NonNullable<QDRMerged["quality"]>, "source">;
type CustomQualitySource<T> = {
  quality?: T & {
    source?: string;
  };
};

type OmittedQuality = OmitTyped<QDRMerged, "quality">;

export type MergedQualityDefinitionResource = OmittedQuality & Partial<CustomQualitySource<QDRPickedSource>>;
export type MergedCustomFormatResource = SonarrCustomFormatResource & RadarrCustomFormatResource;
export type MergedProfileFormatItemResource = SonarrProfileFormatItemResource & RadarrProfileFormatItemResource;

type QPQIRMerged = SonarrQualityProfileQualityItemResource & RadarrQualityProfileQualityItemResource;
type QPQIRPickedSource = OmitTyped<NonNullable<QPQIRMerged["quality"]>, "source">;

export type MergedQualityProfileQualityItemResource = OmitTyped<QPQIRMerged, "items" | "quality"> &
  Partial<
    OmitTyped<QPQIRMerged, "items" | "quality"> & {
      items?: MergedQualityProfileQualityItemResource[] | null;
      quality?: QPQIRPickedSource & { source?: string };
    }
  >;

type QPRMerged = SonarrQualityProfileResource & RadarrQualityProfileResource;

export type MergedQualityProfileResource = OmitTyped<QPRMerged, "items"> &
  Partial<
    OmitTyped<QPRMerged, "items"> & {
      items?: MergedQualityProfileQualityItemResource[] | null;
    }
  >;

export type MergedCustomFormatSpecificationSchema = RadarrCustomFormatSpecificationSchema & SonarrCustomFormatSpecificationSchema;
export type MergedRootFolderResource = SonarrRootFolderResource & RadarrRootFolderResource;
