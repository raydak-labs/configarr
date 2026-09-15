import { getClient } from "../clients/client";
import type { WhisparrClient } from "../clients/whisparr-client";
import { BaseMediaManagementSync } from "./mediaManagementBase";

export class WhisparrMediaManagementSync extends BaseMediaManagementSync<
  Awaited<ReturnType<WhisparrClient["getNaming"]>>,
  Awaited<ReturnType<WhisparrClient["getMediamanagement"]>>
> {
  protected getApi() {
    return getClient("WHISPARR");
  }
}
