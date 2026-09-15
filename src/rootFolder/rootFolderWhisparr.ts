import { getClient } from "../clients/client";
import { PathRootFolderSync } from "./rootFolderBase";

export class WhisparrRootFolderSync extends PathRootFolderSync {
  protected getApi() {
    return getClient("WHISPARR");
  }
}
