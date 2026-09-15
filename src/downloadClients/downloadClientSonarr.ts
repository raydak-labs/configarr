import { getClient } from "../clients/client";
import type { DownloadClientResource } from "../__generated__/sonarr/data-contracts";
import { MediaArrType } from "../types/common.types";
import { MediaDownloadClientSync } from "./downloadClientMedia";

export class SonarrDownloadClientSync extends MediaDownloadClientSync<DownloadClientResource> {
  protected getArrType(): MediaArrType {
    return "SONARR";
  }

  protected getApi() {
    return getClient("SONARR");
  }
}
