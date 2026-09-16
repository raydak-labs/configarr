import { getClient } from "../clients/client";
import { logger } from "../logger";
import { CFProcessing } from "../customFormats/customFormat.types";
import { MediaArrType } from "../types/common.types";
import { MergedConfigInstance } from "../types/config.types";
import { ServerCache } from "../cache";
import { QualityProfileLidarrSync } from "./qualityProfileLidarr";
import { QualityProfileRadarrSync } from "./qualityProfileRadarr";
import { QualityProfileReadarrSync } from "./qualityProfileReadarr";
import { QualityProfileSonarrSync } from "./qualityProfileSonarr";
import { QualityProfileWhisparrSync } from "./qualityProfileWhisparr";
import { QualityProfileShared } from "./qualityProfile.types";

export function createQualityProfileSync(arrType: MediaArrType) {
  switch (arrType) {
    case "SONARR":
      return new QualityProfileSonarrSync(getClient("SONARR"));
    case "RADARR":
      return new QualityProfileRadarrSync(getClient("RADARR"));
    case "WHISPARR":
      return new QualityProfileWhisparrSync(getClient("WHISPARR"));
    case "LIDARR":
      return new QualityProfileLidarrSync(getClient("LIDARR"));
    case "READARR":
      return new QualityProfileReadarrSync(getClient("READARR"));
  }
}

export const calculateQualityProfilesDiff = async (
  arrType: MediaArrType,
  cfMap: CFProcessing,
  config: MergedConfigInstance,
  serverCache: ServerCache,
) => {
  switch (arrType) {
    case "SONARR":
      return new QualityProfileSonarrSync().calculateQualityProfilesDiff(cfMap, config, serverCache);
    case "RADARR":
      return new QualityProfileRadarrSync().calculateQualityProfilesDiff(cfMap, config, serverCache);
    case "WHISPARR":
      return new QualityProfileWhisparrSync().calculateQualityProfilesDiff(cfMap, config, serverCache);
    case "LIDARR":
      return new QualityProfileLidarrSync().calculateQualityProfilesDiff(cfMap, config, serverCache);
    case "READARR":
      return new QualityProfileReadarrSync().calculateQualityProfilesDiff(cfMap, config, serverCache);
  }
};

export const loadQualityProfilesFromServer = async (arrType: MediaArrType): Promise<QualityProfileShared[]> => {
  return createQualityProfileSync(arrType).loadFromServer();
};

export const deleteAllQualityProfiles = async (arrType: MediaArrType) => {
  await createQualityProfileSync(arrType).deleteAll();
};

export const deleteQualityProfile = async (arrType: MediaArrType, qualityProfile: QualityProfileShared) => {
  await createQualityProfileSync(arrType).deleteOnServer(qualityProfile);
  logger.info(`Deleted QP: '${qualityProfile.name || qualityProfile.id}'`);
};
