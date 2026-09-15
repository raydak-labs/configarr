import { getClient } from "../clients/client";
import type { QualityDefinitionResource } from "../__generated__/radarr/data-contracts";
import { QualityDefinitionPreferredSync } from "./qualityDefinitionBase";

export class QualityDefinitionRadarrSync extends QualityDefinitionPreferredSync<QualityDefinitionResource> {
  protected getApi() {
    return getClient("RADARR");
  }
}
