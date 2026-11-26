import type { DownloadClientResource } from "../__generated__/readarr/data-contracts";
import type { DownloadClientsClient, TagsClient } from "../clients/capabilities";
import { ReadarrDownloadClientSync } from "./downloadClientReadarr";

export class ChaptarrDownloadClientSync extends ReadarrDownloadClientSync {
  constructor(api: DownloadClientsClient<DownloadClientResource> & TagsClient) {
    super(api, "CHAPTARR");
  }
}
