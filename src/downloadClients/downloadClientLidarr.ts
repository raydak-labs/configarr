import { getClient } from "../clients/client";
import type { DownloadClientResource } from "../__generated__/lidarr/data-contracts";
import { MediaArrType } from "../types/common.types";
import { MediaDownloadClientSync } from "./downloadClientMedia";

export class LidarrDownloadClientSync extends MediaDownloadClientSync<DownloadClientResource> {
  protected getArrType(): MediaArrType {
    return "LIDARR";
  }

  protected getApi() {
    return getClient("LIDARR");
  }
}
