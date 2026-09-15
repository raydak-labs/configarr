import { MediaArrType } from "../types/common.types";
import { LidarrMediaManagementSync } from "./mediaManagementLidarr";
import { RadarrMediaManagementSync } from "./mediaManagementRadarr";
import { ReadarrMediaManagementSync } from "./mediaManagementReadarr";
import { SonarrMediaManagementSync } from "./mediaManagementSonarr";
import { WhisparrMediaManagementSync } from "./mediaManagementWhisparr";

export function createMediaManagementSync(arrType: MediaArrType) {
  switch (arrType) {
    case "SONARR":
      return new SonarrMediaManagementSync();
    case "RADARR":
      return new RadarrMediaManagementSync();
    case "LIDARR":
      return new LidarrMediaManagementSync();
    case "READARR":
      return new ReadarrMediaManagementSync();
    case "WHISPARR":
      return new WhisparrMediaManagementSync();
  }
}
