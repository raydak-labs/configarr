import type { DownloadClientResource } from "../__generated__/whisparr/data-contracts";
import type { MediaArrType } from "../types/common.types";
import { MediaDownloadClientSync } from "./downloadClientMedia";

export class WhisparrDownloadClientSync extends MediaDownloadClientSync<DownloadClientResource> {
  protected getArrType(): MediaArrType {
    return "WHISPARR";
  }
}
