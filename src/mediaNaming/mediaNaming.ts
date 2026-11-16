import { logger } from "../logger";
import type { ArrType } from "../types/common.types";
import type { MediaNamingType } from "../types/config.types";
import { mapRadarrMediaNamingToApi } from "./mediaNamingRadarr";
import { mapSonarrMediaNamingToApi } from "./mediaNamingSonarr";

export const mapConfigMediaNamingToApi = async (arrType: ArrType, mediaNaming: MediaNamingType) => {
  if (arrType === "RADARR") {
    return mapRadarrMediaNamingToApi(mediaNaming);
  }
  if (arrType === "SONARR") {
    return mapSonarrMediaNamingToApi(mediaNaming);
  }

  logger.warn(`MediaNaming not supported for ${arrType}`);
};
