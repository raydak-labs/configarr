import { getClient } from "../clients/client";
import type { QualityDefinitionResource } from "../__generated__/lidarr/data-contracts";
import { QualityDefinitionPreferredSync } from "./qualityDefinitionBase";

export class QualityDefinitionLidarrSync extends QualityDefinitionPreferredSync<QualityDefinitionResource> {
  protected getApi() {
    return getClient("LIDARR");
  }
}
