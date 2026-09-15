import path from "node:path";
import { getEnvs } from "../env";
import { MediaArrType } from "../types/common.types";
import { TrashQualityDefinitionQuality } from "../types/trashguide.types";
import { loadJsonFile } from "../util";
import { QualityDefinitionLidarrSync } from "./qualityDefinitionLidarr";
import { QualityDefinitionRadarrSync } from "./qualityDefinitionRadarr";
import { QualityDefinitionReadarrSync } from "./qualityDefinitionReadarr";
import { QualityDefinitionSonarrSync } from "./qualityDefinitionSonarr";
import { QualityDefinitionWhisparrSync } from "./qualityDefinitionWhisparr";
import { QualityDefinitionShared } from "./qualityDefinition.types";

export function createQualityDefinitionSync(arrType: MediaArrType) {
  switch (arrType) {
    case "SONARR":
      return new QualityDefinitionSonarrSync();
    case "RADARR":
      return new QualityDefinitionRadarrSync();
    case "LIDARR":
      return new QualityDefinitionLidarrSync();
    case "WHISPARR":
      return new QualityDefinitionWhisparrSync();
    case "READARR":
      return new QualityDefinitionReadarrSync();
  }
}

export const loadQualityDefinitionFromServer = async (arrType: MediaArrType): Promise<QualityDefinitionShared[]> => {
  if (getEnvs().LOAD_LOCAL_SAMPLES) {
    return loadJsonFile(path.resolve(__dirname, "../../tests/samples/qualityDefinition.json"));
  }
  return createQualityDefinitionSync(arrType).loadFromServer();
};

export const calculateQualityDefinitionDiff = (
  arrType: MediaArrType,
  serverQDs: QualityDefinitionShared[],
  qualityDefinitions: TrashQualityDefinitionQuality[],
) => {
  return createQualityDefinitionSync(arrType).calculateDiff(serverQDs, qualityDefinitions);
};
