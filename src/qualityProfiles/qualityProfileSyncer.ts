import path from "node:path";
import { ServerCache } from "../cache";
import { getEnvs } from "../env";
import { logger } from "../logger";
import { CFProcessing } from "../customFormats/customFormat.types";
import { MediaArrType } from "../types/common.types";
import { MergedConfigInstance } from "../types/config.types";
import { loadJsonFile } from "../util";
import { BaseQualityProfileSync } from "./qualityProfileBase";
import { QualityProfileLidarrReadarrSync } from "./qualityProfileLidarrReadarr";
import { QualityProfileRadarrWhisparrSync } from "./qualityProfileRadarrWhisparr";
import { QualityProfileSonarrSync } from "./qualityProfileSonarr";
import { QualityProfilePayload } from "./qualityProfile.types";

export function createQualityProfileSync(arrType: MediaArrType) {
  switch (arrType) {
    case "SONARR":
      return new QualityProfileSonarrSync();
    case "RADARR":
    case "WHISPARR":
      return new QualityProfileRadarrWhisparrSync(arrType);
    case "LIDARR":
    case "READARR":
      return new QualityProfileLidarrReadarrSync(arrType);
  }
}

function qualityProfileSync(arrType: MediaArrType): BaseQualityProfileSync<QualityProfilePayload> {
  return createQualityProfileSync(arrType) as BaseQualityProfileSync<QualityProfilePayload>;
}

export const calculateQualityProfilesDiff = async (
  arrType: MediaArrType,
  cfMap: CFProcessing,
  config: MergedConfigInstance,
  serverCache: ServerCache,
) => {
  return createQualityProfileSync(arrType).calculateQualityProfilesDiff(cfMap, config, serverCache);
};

export const loadQualityProfilesFromServer = async (arrType: MediaArrType): Promise<QualityProfilePayload[]> => {
  if (getEnvs().LOAD_LOCAL_SAMPLES) {
    return loadJsonFile(path.resolve(__dirname, `../../tests/samples/quality_profiles.json`));
  }
  return createQualityProfileSync(arrType).loadFromServer();
};

export const createQualityProfileOnServer = async (arrType: MediaArrType, profile: QualityProfilePayload) => {
  return qualityProfileSync(arrType).createOnServer(profile);
};

export const updateQualityProfileOnServer = async (arrType: MediaArrType, id: string, profile: QualityProfilePayload) => {
  return qualityProfileSync(arrType).updateOnServer(id, profile);
};

export const deleteAllQualityProfiles = async (arrType: MediaArrType) => {
  await createQualityProfileSync(arrType).deleteAll();
};

export const deleteQualityProfile = async (arrType: MediaArrType, qualityProfile: QualityProfilePayload) => {
  await qualityProfileSync(arrType).deleteOnServer(qualityProfile);
  logger.info(`Deleted QP: '${qualityProfile.name || qualityProfile.id}'`);
};
