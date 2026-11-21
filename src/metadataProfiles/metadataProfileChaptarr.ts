import type { MetadataProfileResource } from "../__generated__/readarr/data-contracts";
import type { MetadataProfilesClient } from "../clients/capabilities";
import { ReadarrMetadataProfileSync } from "./metadataProfileReadarr";

export class ChaptarrMetadataProfileSync extends ReadarrMetadataProfileSync {
  constructor(api: MetadataProfilesClient<MetadataProfileResource>) {
    super(api, "CHAPTARR");
  }
}
