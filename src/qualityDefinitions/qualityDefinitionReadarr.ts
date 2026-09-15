import { getClient } from "../clients/client";
import { TrashQualityDefinitionQuality } from "../types/trashguide.types";
import { calculateQualityDefinitionDiffCore } from "./qualityDefinitionBase";
import { QualityDefinitionReadarrResource } from "./qualityDefinition.types";

export class QualityDefinitionReadarrSync {
  loadFromServer() {
    return getClient("READARR").getQualityDefinitions();
  }

  updateOnServer(restData: QualityDefinitionReadarrResource[]) {
    return getClient("READARR").updateQualityDefinitions(restData);
  }

  calculateDiff(serverQDs: QualityDefinitionReadarrResource[], qualityDefinitions: TrashQualityDefinitionQuality[]) {
    return calculateQualityDefinitionDiffCore(serverQDs, qualityDefinitions, () => {});
  }
}
