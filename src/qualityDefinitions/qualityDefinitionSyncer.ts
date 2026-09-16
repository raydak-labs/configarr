import { getClient } from "../clients/client";
import { MediaArrType } from "../types/common.types";
import { TrashQualityDefinitionQuality } from "../types/trashguide.types";
import {
  applyPreferredSizeDiff,
  calculateQualityDefinitionDiffCore,
  QualityDefinitionPreferredSync,
  QualityDefinitionSync,
} from "./qualityDefinitionBase";
import { QualityDefinitionShared } from "./qualityDefinition.types";

export function createQualityDefinitionSync(arrType: MediaArrType) {
  switch (arrType) {
    case "SONARR":
      return new QualityDefinitionPreferredSync(getClient("SONARR"));
    case "RADARR":
      return new QualityDefinitionPreferredSync(getClient("RADARR"));
    case "LIDARR":
      return new QualityDefinitionPreferredSync(getClient("LIDARR"));
    case "WHISPARR":
      return new QualityDefinitionPreferredSync(getClient("WHISPARR"));
    case "READARR":
      return new QualityDefinitionSync(getClient("READARR"));
  }
}

export const loadQualityDefinitionFromServer = async (arrType: MediaArrType): Promise<QualityDefinitionShared[]> => {
  return createQualityDefinitionSync(arrType).loadFromServer();
};

export const calculateQualityDefinitionDiff = (
  arrType: MediaArrType,
  serverQDs: QualityDefinitionShared[],
  qualityDefinitions: TrashQualityDefinitionQuality[],
) => {
  return calculateQualityDefinitionDiffCore(serverQDs, qualityDefinitions, arrType === "READARR" ? () => {} : applyPreferredSizeDiff);
};
