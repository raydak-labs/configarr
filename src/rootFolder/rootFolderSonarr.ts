import { getClient } from "../clients/client";
import { PathRootFolderSync } from "./rootFolderBase";

export class SonarrRootFolderSync extends PathRootFolderSync {
  protected getApi() {
    return getClient("SONARR");
  }
}
