import {
  QualityDefinitionResource as QDRRadarr,
  CustomFormatResource as RadarrCustomFormatResource,
  CustomFormatSpecificationSchema as RadarrCustomFormatSpecificationSchema,
  QualityProfileQualityItemResource as RadarrQualityProfileQualityItemResource,
  QualityProfileResource as RadarrQualityProfileResource,
  TagResource as RadarrTagResource,
} from "../__generated__/radarr/data-contracts";
import {
  QualityDefinitionResource as QDRSonarr,
  CustomFormatResource as SonarrCustomFormatResource,
  CustomFormatSpecificationSchema as SonarrCustomFormatSpecificationSchema,
  QualityProfileQualityItemResource as SonarrQualityProfileQualityItemResource,
  QualityProfileResource as SonarrQualityProfileResource,
} from "../__generated__/sonarr/data-contracts";

// Mapping/TRaSH helpers still share Sonarr∩Radarr intersections. Client and cache return types do not use these.

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
/** Lidarr nightly delay-profile protocol rows (openapi still stale; extend manually). */
export type MergedDelayProfileProtocolItem = {
  name?: string | null;
  protocol?: string | null;
  allowed?: boolean;
  delay?: number;
};

export type MergedDelayProfileResource = import("../__generated__/sonarr/data-contracts").DelayProfileResource &
  import("../__generated__/radarr/data-contracts").DelayProfileResource & {
    name?: string | null;
    items?: MergedDelayProfileProtocolItem[] | null;
  };

export type MergedTagResource = RadarrTagResource;
