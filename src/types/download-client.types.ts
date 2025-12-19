import { InputConfigDownloadClient } from "./config.types";
import type {
  Field as LidarrDownloadClientField,
  DownloadClientResource as LidarrDownloadClientResource,
  TagResource as LidarrTagResource,
} from "../__generated__/lidarr/data-contracts";
import type {
  Field as RadarrDownloadClientField,
  DownloadClientResource as RadarrDownloadClientResource,
  TagResource as RadarrDownloadClientTagResource,
} from "../__generated__/radarr/data-contracts";
import type {
  Field as ReadarrDownloadClientField,
  DownloadClientResource as ReadarrDownloadClientResource,
  TagResource as ReadarrTagResource,
} from "../__generated__/readarr/data-contracts";
import type {
  Field as SonarrDownloadClientField,
  DownloadClientResource as SonarrDownloadClientResource,
  TagResource as SonarrDownloadClientTagResource,
} from "../__generated__/sonarr/data-contracts";
import type {
  Field as WhisparrDownloadClientField,
  DownloadClientResource as WhisparrDownloadClientResource,
  TagResource as WhisparrTagResource,
} from "../__generated__/whisparr/data-contracts";

/**
 * Canonical union of all generator-specific download client resources.
 *
 * All client-facing logic (schema retrieval, diffing, sync, etc.)
 * should depend on this type instead of generator-specific resources.
 */
export type DownloadClientResource =
  | RadarrDownloadClientResource
  | SonarrDownloadClientResource
  | LidarrDownloadClientResource
  | ReadarrDownloadClientResource
  | WhisparrDownloadClientResource;

/**
 * Canonical union of all generator-specific download client fields.
 *
 * Use this in any code that works with download client configuration
 * fields across different Arr implementations.
 */
export type DownloadClientField =
  | RadarrDownloadClientField
  | SonarrDownloadClientField
  | LidarrDownloadClientField
  | ReadarrDownloadClientField
  | WhisparrDownloadClientField;

/**
 * Canonical union of all generator-specific tag resources used by
 * download clients. Prefer this over generator-specific tag types
 * in client-facing code.
 */
export type DownloadClientTagResource =
  | RadarrDownloadClientTagResource
  | SonarrDownloadClientTagResource
  | LidarrTagResource
  | ReadarrTagResource
  | WhisparrTagResource;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConnectionTestResult {
  success: boolean;
  message?: string;
  error?: string;
}

export type DownloadClientDiff = {
  create: InputConfigDownloadClient[];
  update: { config: InputConfigDownloadClient; server: DownloadClientResource; partialUpdate: boolean }[];
  unchanged: { config: InputConfigDownloadClient; server: DownloadClientResource }[];
  deleted: DownloadClientResource[];
};

export interface DownloadClientSyncResult {
  added: number;
  updated: number;
  removed: number;
}

export type TagLike = { id?: number; label?: string | null };
