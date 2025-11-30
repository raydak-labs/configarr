import { InputConfigMetadataProfile } from "../types/config.types";

// Common interface for all metadata profile resources
// All metadata profiles must have at least id and name
export interface BaseMetadataProfileResource {
  id?: number;
  name?: string | null;
}

// Shared types for metadata profile operations
// Generic type T represents the specific MetadataProfileResource type (Lidarr, Readarr, etc.)
export interface MetadataProfileDiff<T extends BaseMetadataProfileResource = any> {
  missingOnServer: InputConfigMetadataProfile[];
  changed: Array<{ config: InputConfigMetadataProfile; server: T }>;
  noChanges: T[];
}

export interface MetadataProfileSyncResult {
  added: number;
  removed: number;
  updated: number;
}
