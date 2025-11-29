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

export type DownloadClientResource =
  | RadarrDownloadClientResource
  | SonarrDownloadClientResource
  | LidarrDownloadClientResource
  | ReadarrDownloadClientResource
  | WhisparrDownloadClientResource;

export type DownloadClientField =
  | RadarrDownloadClientField
  | SonarrDownloadClientField
  | LidarrDownloadClientField
  | ReadarrDownloadClientField
  | WhisparrDownloadClientField;

export type DownloadClientTagResource =
  | RadarrDownloadClientTagResource
  | SonarrDownloadClientTagResource
  | LidarrTagResource
  | ReadarrTagResource
  | WhisparrTagResource;
