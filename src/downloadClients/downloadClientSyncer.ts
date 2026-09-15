import { ServerCache } from "../cache";
import { ArrType } from "../types/common.types";
import { MergedConfigInstance } from "../types/config.types";
import { DownloadClientSyncResult } from "./downloadClient.types";
import { LidarrDownloadClientSync } from "./downloadClientLidarr";
import { ProwlarrDownloadClientSync } from "./downloadClientProwlarr";
import { RadarrDownloadClientSync } from "./downloadClientRadarr";
import { ReadarrDownloadClientSync } from "./downloadClientReadarr";
import { SonarrDownloadClientSync } from "./downloadClientSonarr";
import { WhisparrDownloadClientSync } from "./downloadClientWhisparr";

export function createDownloadClientSync(arrType: "PROWLARR"): ProwlarrDownloadClientSync;
export function createDownloadClientSync(arrType: "SONARR"): SonarrDownloadClientSync;
export function createDownloadClientSync(arrType: "RADARR"): RadarrDownloadClientSync;
export function createDownloadClientSync(arrType: "LIDARR"): LidarrDownloadClientSync;
export function createDownloadClientSync(arrType: "READARR"): ReadarrDownloadClientSync;
export function createDownloadClientSync(arrType: "WHISPARR"): WhisparrDownloadClientSync;
export function createDownloadClientSync(
  arrType: ArrType,
):
  | ProwlarrDownloadClientSync
  | SonarrDownloadClientSync
  | RadarrDownloadClientSync
  | LidarrDownloadClientSync
  | ReadarrDownloadClientSync
  | WhisparrDownloadClientSync;
export function createDownloadClientSync(arrType: ArrType) {
  switch (arrType) {
    case "PROWLARR":
      return new ProwlarrDownloadClientSync();
    case "SONARR":
      return new SonarrDownloadClientSync();
    case "RADARR":
      return new RadarrDownloadClientSync();
    case "LIDARR":
      return new LidarrDownloadClientSync();
    case "READARR":
      return new ReadarrDownloadClientSync();
    case "WHISPARR":
      return new WhisparrDownloadClientSync();
  }
}

export async function syncDownloadClients(
  arrType: ArrType,
  config: Pick<MergedConfigInstance, "download_clients">,
  serverCache: ServerCache,
): Promise<DownloadClientSyncResult> {
  const sync = createDownloadClientSync(arrType);
  return sync.syncDownloadClients(config, serverCache);
}
