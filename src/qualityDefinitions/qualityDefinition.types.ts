export type QualityDefinitionShared = {
  id?: number;
  title?: string | null;
  weight?: number;
  minSize?: number | null;
  maxSize?: number | null;
  quality?: {
    id?: number;
    name?: string | null;
    source?: string;
    resolution?: number;
  } | null;
};

export type QualityDefinitionPreferredResource = QualityDefinitionShared & {
  preferredSize: number | null;
};

export type QualityDefinitionReadarrResource = QualityDefinitionShared;

export type QualityDefinitionPayload = QualityDefinitionPreferredResource | QualityDefinitionReadarrResource;

export type QualityDefinitionGenericArrType = "SONARR" | "RADARR" | "LIDARR" | "WHISPARR";
