import { getClient } from "../clients/client";
import type { QualityDefinitionResource } from "../__generated__/readarr/data-contracts";
import { QualityDefinitionSync } from "./qualityDefinitionBase";

export class QualityDefinitionReadarrSync extends QualityDefinitionSync<QualityDefinitionResource> {
  protected getApi() {
    return getClient("READARR");
  }
}
