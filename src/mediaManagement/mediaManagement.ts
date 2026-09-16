import { getClient } from "../clients/client";
import { MediaArrType } from "../types/common.types";
import { BaseMediaManagementSync } from "./mediaManagementBase";

export function createMediaManagementSync(arrType: MediaArrType) {
  switch (arrType) {
    case "SONARR":
      return new BaseMediaManagementSync(getClient("SONARR"));
    case "RADARR":
      return new BaseMediaManagementSync(getClient("RADARR"));
    case "LIDARR":
      return new BaseMediaManagementSync(getClient("LIDARR"));
    case "READARR":
      return new BaseMediaManagementSync(getClient("READARR"));
    case "WHISPARR":
      return new BaseMediaManagementSync(getClient("WHISPARR"));
  }
}
