import type { DownloadClientResource } from "../__generated__/chaptarr/data-contracts";
import type { DownloadClientsClient, TagsClient } from "../clients/capabilities";
import type { MediaArrType } from "../types/common.types";
import { MediaDownloadClientSync } from "./downloadClientMedia";

export class ChaptarrDownloadClientSync extends MediaDownloadClientSync<DownloadClientResource> {
  constructor(api: DownloadClientsClient<DownloadClientResource> & TagsClient) {
    super(api);
  }

  protected getArrType(): MediaArrType {
    return "CHAPTARR";
  }
}
