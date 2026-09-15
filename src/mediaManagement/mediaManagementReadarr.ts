import { getClient } from "../clients/client";
import type { ReadarrClient } from "../clients/readarr-client";
import { BaseMediaManagementSync } from "./mediaManagementBase";

export class ReadarrMediaManagementSync extends BaseMediaManagementSync<
  Awaited<ReturnType<ReadarrClient["getNaming"]>>,
  Awaited<ReturnType<ReadarrClient["getMediamanagement"]>>
> {
  protected getApi() {
    return getClient("READARR");
  }
}
