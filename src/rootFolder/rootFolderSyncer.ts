import { ServerCache } from "../cache";
import { ArrType } from "../types/common.types";
import { InputConfigRootFolder } from "../types/config.types";
import { RootFolderSyncResult } from "./rootFolder.types";
import { BaseRootFolderSync, GenericRootFolderSync } from "./rootFolderBase";
import { LidarrRootFolderSync } from "./rootFolderLidarr";

export function createRootFolderSync(arrType: ArrType): BaseRootFolderSync {
  switch (arrType) {
    case "LIDARR":
      return new LidarrRootFolderSync();
    default:
      return new GenericRootFolderSync(arrType);
  }
}

export async function syncRootFolders(
  arrType: ArrType,
  rootFolders: InputConfigRootFolder[] | undefined,
  serverCache: ServerCache,
): Promise<RootFolderSyncResult> {
  if (!rootFolders) {
    return { added: 0, removed: 0, updated: 0 };
  }

  const sync = createRootFolderSync(arrType);
  return sync.syncRootFolders(rootFolders, serverCache);
}
