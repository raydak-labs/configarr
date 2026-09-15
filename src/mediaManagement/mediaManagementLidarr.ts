import { getClient } from "../clients/client";
import type { LidarrClient } from "../clients/lidarr-client";
import { BaseMediaManagementSync } from "./mediaManagementBase";

export class LidarrMediaManagementSync extends BaseMediaManagementSync<
  Awaited<ReturnType<LidarrClient["getNaming"]>>,
  Awaited<ReturnType<LidarrClient["getMediamanagement"]>>
> {
  protected getApi() {
    return getClient("LIDARR");
  }
}
