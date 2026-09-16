import { CFProcessing } from "../customFormats/customFormat.types";
import { MediaArrType } from "../types/common.types";
import { MergedConfigInstance } from "../types/config.types";
import { ServerCache } from "../cache";
import { QualityProfileLidarrSync } from "./qualityProfileLidarr";
import { QualityProfileRadarrSync } from "./qualityProfileRadarr";
import { QualityProfileReadarrSync } from "./qualityProfileReadarr";
import { QualityProfileSonarrSync } from "./qualityProfileSonarr";
import { QualityProfileWhisparrSync } from "./qualityProfileWhisparr";

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
