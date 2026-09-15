import { getClient } from "../clients/client";
import type { SonarrClient } from "../clients/sonarr-client";
import { BaseMediaManagementSync } from "./mediaManagementBase";

export class SonarrMediaManagementSync extends BaseMediaManagementSync<
  Awaited<ReturnType<SonarrClient["getNaming"]>>,
  Awaited<ReturnType<SonarrClient["getMediamanagement"]>>
> {
  protected getApi() {
    return getClient("SONARR");
  }
}
