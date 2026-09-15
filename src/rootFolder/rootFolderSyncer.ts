import { ServerCache } from "../cache";
import { MediaArrType } from "../types/common.types";
import { InputConfigRootFolder } from "../types/config.types";
import { RootFolderSyncResult } from "./rootFolder.types";
import { BaseRootFolderSync } from "./rootFolderBase";
import { LidarrRootFolderSync } from "./rootFolderLidarr";
import { RadarrRootFolderSync } from "./rootFolderRadarr";
import { ReadarrRootFolderSync } from "./rootFolderReadarr";
import { SonarrRootFolderSync } from "./rootFolderSonarr";
import { WhisparrRootFolderSync } from "./rootFolderWhisparr";

export function createRootFolderSync(arrType: MediaArrType): BaseRootFolderSync {
  switch (arrType) {
    case "LIDARR":
      return new LidarrRootFolderSync();
    case "READARR":
      return new ReadarrRootFolderSync();
    case "SONARR":
      return new SonarrRootFolderSync();
    case "RADARR":
      return new RadarrRootFolderSync();
    case "WHISPARR":
      return new WhisparrRootFolderSync();
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
