import { getClient } from "../clients/client";
import { PathRootFolderSync } from "./rootFolderBase";

export class RadarrRootFolderSync extends PathRootFolderSync {
  protected getApi() {
    return getClient("RADARR");
  }
}
