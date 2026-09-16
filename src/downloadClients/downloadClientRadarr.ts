import type { DownloadClientResource } from "../__generated__/radarr/data-contracts";
import { MediaArrType } from "../types/common.types";
import { MediaDownloadClientSync } from "./downloadClientMedia";

export class RadarrDownloadClientSync extends MediaDownloadClientSync<DownloadClientResource> {
  protected getArrType(): MediaArrType {
    return "RADARR";
  }
}
