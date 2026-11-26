import type { MetadataProfileResource } from "../__generated__/readarr/data-contracts";
import type { MetadataProfilesClient } from "../clients/capabilities";
import { BookMetadataProfileSync } from "./metadataProfileBook";

export class ReadarrMetadataProfileSync extends BookMetadataProfileSync {
  constructor(api: MetadataProfilesClient<MetadataProfileResource>) {
    super(api);
  }

  protected getArrType(): "READARR" {
    return "READARR";
  }
}
