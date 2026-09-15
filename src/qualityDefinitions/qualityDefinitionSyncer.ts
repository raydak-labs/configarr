import path from "node:path";
import { getEnvs } from "../env";
import { MediaArrType } from "../types/common.types";
import { TrashQualityDefinitionQuality } from "../types/trashguide.types";
import { loadJsonFile } from "../util";
import { QualityDefinitionGenericSync } from "./qualityDefinitionGeneric";
import { QualityDefinitionReadarrSync } from "./qualityDefinitionReadarr";
import { QualityDefinitionPayload, QualityDefinitionPreferredResource } from "./qualityDefinition.types";

export function createQualityDefinitionSync(arrType: MediaArrType): QualityDefinitionGenericSync | QualityDefinitionReadarrSync {
  if (arrType === "READARR") {
    return new QualityDefinitionReadarrSync();
  }
  return new QualityDefinitionGenericSync(arrType);
}

export const loadQualityDefinitionFromServer = async (arrType: MediaArrType): Promise<QualityDefinitionPayload[]> => {
  if (getEnvs().LOAD_LOCAL_SAMPLES) {
    return loadJsonFile(path.resolve(__dirname, "../../tests/samples/qualityDefinition.json"));
  }
  return createQualityDefinitionSync(arrType).loadFromServer();
};

export const updateQualityDefinitionsOnServer = async (arrType: MediaArrType, restData: QualityDefinitionPayload[]) => {
  if (arrType === "READARR") {
    return new QualityDefinitionReadarrSync().updateOnServer(restData);
  }
  return new QualityDefinitionGenericSync(arrType).updateOnServer(restData as QualityDefinitionPreferredResource[]);
};

export const calculateQualityDefinitionDiff = (
  arrType: MediaArrType,
  serverQDs: QualityDefinitionPayload[],
  qualityDefinitions: TrashQualityDefinitionQuality[],
) => {
  if (arrType === "READARR") {
    return new QualityDefinitionReadarrSync().calculateDiff(serverQDs, qualityDefinitions);
  }
  return new QualityDefinitionGenericSync(arrType).calculateDiff(serverQDs as QualityDefinitionPreferredResource[], qualityDefinitions);
};
