import { getClient } from "../clients/client";
import { TrashQualityDefinitionQuality } from "../types/trashguide.types";
import { calculateQualityDefinitionDiffCore } from "./qualityDefinitionBase";
import { QualityDefinitionGenericArrType, QualityDefinitionPreferredResource } from "./qualityDefinition.types";

export class QualityDefinitionGenericSync {
  constructor(private arrType: QualityDefinitionGenericArrType) {}

  loadFromServer() {
    return getClient(this.arrType).getQualityDefinitions();
  }

  updateOnServer(restData: QualityDefinitionPreferredResource[]) {
    return getClient(this.arrType).updateQualityDefinitions(restData);
  }

  calculateDiff(serverQDs: QualityDefinitionPreferredResource[], qualityDefinitions: TrashQualityDefinitionQuality[]) {
    return calculateQualityDefinitionDiffCore(serverQDs, qualityDefinitions, (clonedQuality, serverQuality, newData, changes) => {
      if (clonedQuality.preferred && serverQuality.preferredSize !== clonedQuality.preferred) {
        changes.push({ field: "preferredSize", from: serverQuality.preferredSize, to: clonedQuality.preferred });
        newData.preferredSize = clonedQuality.preferred;
      }
    });
  }
}
