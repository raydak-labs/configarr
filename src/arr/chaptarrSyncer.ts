import type { ReadarrClient } from "../clients/readarr-client";
import { ChaptarrDownloadClientSync } from "../downloadClients/downloadClientChaptarr";
import { ChaptarrMediaManagementSync } from "../mediaManagement/mediaManagementChaptarr";
import { ChaptarrMetadataProfileSync } from "../metadataProfiles/metadataProfileChaptarr";
import { QualityProfileChaptarrSync } from "../qualityProfiles/qualityProfileChaptarr";
import { ChaptarrRootFolderSync } from "../rootFolder/rootFolderChaptarr";
import type { InputConfigArrInstance } from "../types/config.types";
import { ReadarrSyncer } from "./readarrSyncer";

type BookMediaType = InputConfigArrInstance["media_type"];

export class ChaptarrSyncer extends ReadarrSyncer {
  protected override readonly arrType = "CHAPTARR" as const;
  protected override readonly arrLabel = "Chaptarr";

  protected override createMediaManagementSync(client: ReadarrClient, mediaType: BookMediaType) {
    return new ChaptarrMediaManagementSync(client, mediaType);
  }

  protected override createQualityProfileSync(client: ReadarrClient, mediaType: BookMediaType) {
    return new QualityProfileChaptarrSync(client, mediaType);
  }

  protected override createRootFolderSync(client: ReadarrClient, mediaType: BookMediaType) {
    return new ChaptarrRootFolderSync(client, mediaType);
  }

  protected override createDownloadClientSync(client: ReadarrClient) {
    return new ChaptarrDownloadClientSync(client);
  }

  protected override createMetadataProfileSync(client: ReadarrClient) {
    return new ChaptarrMetadataProfileSync(client);
  }
}
