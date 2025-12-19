import { ServerCache } from "../cache";
import { ArrType } from "../types/common.types";
import { MergedConfigInstance } from "../types/config.types";
import { BaseDownloadClientSync } from "./downloadClientBase";
import { GenericDownloadClientSync } from "./downloadClientGeneric";
import { DownloadClientSyncResult } from "../types/download-client.types";

function createDownloadClientSync(arrType: ArrType): BaseDownloadClientSync {
  return new GenericDownloadClientSync(arrType);
}

export async function syncDownloadClients(
  arrType: ArrType,
  config: MergedConfigInstance,
  serverCache: ServerCache,
): Promise<DownloadClientSyncResult> {
  const sync = createDownloadClientSync(arrType);
  return sync.syncDownloadClients(config, serverCache);
}
