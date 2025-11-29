import type {
  DownloadClientResource as RadarrDownloadClientResource,
  Field as RadarrDownloadClientField,
  TagResource as RadarrDownloadClientTagResource,
} from "../__generated__/radarr/data-contracts";
import type {
  DownloadClientResource as SonarrDownloadClientResource,
  Field as SonarrDownloadClientField,
  TagResource as SonarrDownloadClientTagResource,
} from "../__generated__/sonarr/data-contracts";
import type {
  DownloadClientResource as LidarrDownloadClientResource,
  Field as LidarrDownloadClientField,
  TagResource as LidarrTagResource,
} from "../__generated__/lidarr/data-contracts";
import type {
  DownloadClientResource as ReadarrDownloadClientResource,
  Field as ReadarrDownloadClientField,
  TagResource as ReadarrTagResource,
} from "../__generated__/readarr/data-contracts";
import type {
  DownloadClientResource as WhisparrDownloadClientResource,
  Field as WhisparrDownloadClientField,
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
