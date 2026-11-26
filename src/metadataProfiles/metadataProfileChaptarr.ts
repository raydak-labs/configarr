import type { MetadataProfileResource } from "../__generated__/chaptarr/data-contracts";
import type { MetadataProfilesClient } from "../clients/capabilities";
import { BookMetadataProfileSync } from "./metadataProfileBook";

export class ChaptarrMetadataProfileSync extends BookMetadataProfileSync {
  constructor(api: MetadataProfilesClient<MetadataProfileResource>) {
    super(api);
  }

  protected getArrType(): "CHAPTARR" {
    return "CHAPTARR";
  }
}
