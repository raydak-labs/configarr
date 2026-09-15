import { ServerCache } from "../cache";
import { ArrType } from "../types/common.types";
import { MergedConfigInstance } from "../types/config.types";
import { DownloadClientSyncResult } from "./downloadClient.types";
import { MediaDownloadClientSync } from "./downloadClientMedia";
import { ProwlarrDownloadClientSync } from "./downloadClientProwlarr";

export function createDownloadClientSync(arrType: ArrType): MediaDownloadClientSync | ProwlarrDownloadClientSync {
  switch (arrType) {
    case "PROWLARR":
      return new ProwlarrDownloadClientSync();
    default:
      return new MediaDownloadClientSync(arrType);
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
