import { getClient } from "../clients/client";
import type { QualityDefinitionResource } from "../__generated__/whisparr/data-contracts";
import { QualityDefinitionPreferredSync } from "./qualityDefinitionBase";

export class QualityDefinitionWhisparrSync extends QualityDefinitionPreferredSync<QualityDefinitionResource> {
  protected getApi() {
    return getClient("WHISPARR");
  }
}
