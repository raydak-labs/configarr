import { ServerCache } from "../cache";
import { ArrType } from "../types/common.types";
import { MergedConfigInstance } from "../types/config.types";
import { MetadataProfileSyncResult } from "./metadataProfile.types";
import { BaseMetadataProfileSync } from "./metadataProfileBase";
import { LidarrMetadataProfileSync } from "./metadataProfileLidarr";
import { ReadarrMetadataProfileSync } from "./metadataProfileReadarr";

function createMetadataProfileSync(arrType: ArrType): BaseMetadataProfileSync {
  switch (arrType) {
    case "LIDARR":
      return new LidarrMetadataProfileSync();
    case "READARR":
      return new ReadarrMetadataProfileSync();
    default:
      throw new Error(`Metadata profile synchronization is not supported for Arr type: ${arrType}`);
  }
}

/**
 * Sync metadata profiles - handles add/update and deletion in one unified call
 * Takes the full config object to handle all scenarios
 */
export async function syncMetadataProfiles(
  arrType: ArrType,
  config: MergedConfigInstance,
  serverCache: ServerCache,
): Promise<MetadataProfileSyncResult> {
  const sync = createMetadataProfileSync(arrType);
  return sync.syncMetadataProfiles(config, serverCache);
}
