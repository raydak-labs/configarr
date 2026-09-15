import { MediaArrType } from "../types/common.types";

export const qualityProfileHasLanguage = (arrType: MediaArrType): arrType is "RADARR" | "WHISPARR" =>
  arrType === "RADARR" || arrType === "WHISPARR";

export const qualityProfileHasMinUpgradeFormatScore = (arrType: MediaArrType): boolean =>
  arrType === "SONARR" || arrType === "RADARR" || arrType === "WHISPARR";

export const qualityDefinitionHasPreferredSize = (arrType: MediaArrType): boolean => arrType !== "READARR";
