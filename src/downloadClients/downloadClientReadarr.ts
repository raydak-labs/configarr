import type { DownloadClientResource } from "../__generated__/readarr/data-contracts";
import type { DownloadClientsClient, TagsClient } from "../clients/capabilities";
import type { MediaArrType } from "../types/common.types";
import { MediaDownloadClientSync } from "./downloadClientMedia";

export class ReadarrDownloadClientSync extends MediaDownloadClientSync<DownloadClientResource> {
  constructor(
    api: DownloadClientsClient<DownloadClientResource> & TagsClient,
    private readonly arrType: MediaArrType = "READARR",
  ) {
    super(api);
  }

  protected getArrType(): MediaArrType {
    return this.arrType;
  }
}
