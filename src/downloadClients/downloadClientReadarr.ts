import { getClient } from "../clients/client";
import type { DownloadClientResource } from "../__generated__/readarr/data-contracts";
import { MediaArrType } from "../types/common.types";
import { MediaDownloadClientSync } from "./downloadClientMedia";

export class ReadarrDownloadClientSync extends MediaDownloadClientSync<DownloadClientResource> {
  protected getArrType(): MediaArrType {
    return "READARR";
  }

  protected getApi() {
    return getClient("READARR");
  }
}
