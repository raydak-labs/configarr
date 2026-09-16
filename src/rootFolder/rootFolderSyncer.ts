import { getClient } from "../clients/client";
import { ServerCache } from "../cache";
import { MediaArrType } from "../types/common.types";
import { InputConfigRootFolder } from "../types/config.types";
import { RootFolderSyncResult } from "./rootFolder.types";
import { BaseRootFolderSync, PathRootFolderSync } from "./rootFolderBase";
import { LidarrRootFolderSync } from "./rootFolderLidarr";
import { ReadarrRootFolderSync } from "./rootFolderReadarr";

export function createRootFolderSync(arrType: MediaArrType): BaseRootFolderSync {
  switch (arrType) {
    case "LIDARR":
      return new LidarrRootFolderSync(getClient("LIDARR"));
    case "READARR":
      return new ReadarrRootFolderSync(getClient("READARR"));
    case "SONARR":
      return new PathRootFolderSync(getClient("SONARR"));
    case "RADARR":
      return new PathRootFolderSync(getClient("RADARR"));
    case "WHISPARR":
      return new PathRootFolderSync(getClient("WHISPARR"));
  }
}

export async function syncRootFolders(
  arrType: MediaArrType,
  rootFolders: InputConfigRootFolder[] | undefined,
  serverCache: ServerCache,
): Promise<RootFolderSyncResult> {
  if (!rootFolders) {
    return { added: 0, removed: 0, updated: 0, diffEntries: [] };
  }

  const sync = createRootFolderSync(arrType);
  return sync.syncRootFolders(rootFolders, serverCache);
}
