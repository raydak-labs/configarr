import { getClient } from "../clients/client";
import type { RadarrClient } from "../clients/radarr-client";
import { BaseMediaManagementSync } from "./mediaManagementBase";

export class RadarrMediaManagementSync extends BaseMediaManagementSync<
  Awaited<ReturnType<RadarrClient["getNaming"]>>,
  Awaited<ReturnType<RadarrClient["getMediamanagement"]>>
> {
  protected getApi() {
    return getClient("RADARR");
  }
}
