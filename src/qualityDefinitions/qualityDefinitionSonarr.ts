import { getClient } from "../clients/client";
import type { QualityDefinitionResource } from "../__generated__/sonarr/data-contracts";
import { QualityDefinitionPreferredSync } from "./qualityDefinitionBase";

export class QualityDefinitionSonarrSync extends QualityDefinitionPreferredSync<QualityDefinitionResource> {
  protected getApi() {
    return getClient("SONARR");
  }
}
