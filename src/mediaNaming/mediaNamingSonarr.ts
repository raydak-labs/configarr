import type { NamingConfigResource } from "../__generated__/sonarr/data-contracts";
import { logger } from "../logger";
import { loadNamingFromTrashSonarr } from "../trash-guide";
import type { MediaNamingType } from "../types/config.types";
import { resolveMediaNaming } from "./mediaNamingBase";

export const mapSonarrMediaNamingToApi = async (mediaNaming: MediaNamingType): Promise<NamingConfigResource | null> => {
  const trashNaming = await loadNamingFromTrashSonarr();
  if (trashNaming == null) {
    return null;
  }

  const seriesFormat = resolveMediaNaming("SONARR", mediaNaming.series, trashNaming.series, "mediaNaming.series");
  const seasonsFormat = resolveMediaNaming("SONARR", mediaNaming.season, trashNaming.season, "mediaNaming.season");
  const standardFormat = resolveMediaNaming(
    "SONARR",
    mediaNaming.episodes?.standard,
    trashNaming.episodes.standard,
    "mediaNaming.episodes.standard",
  );
  const dailyFormat = resolveMediaNaming("SONARR", mediaNaming.episodes?.daily, trashNaming.episodes.daily, "mediaNaming.episodes.daily");
  const animeFormat = resolveMediaNaming("SONARR", mediaNaming.episodes?.anime, trashNaming.episodes.anime, "mediaNaming.episodes.anime");
  const apiObject: NamingConfigResource = {
    ...(seriesFormat && { seriesFolderFormat: seriesFormat }),
    ...(seasonsFormat && { seasonFolderFormat: seasonsFormat }),
    ...(standardFormat && { standardEpisodeFormat: standardFormat }),
    ...(dailyFormat && { dailyEpisodeFormat: dailyFormat }),
    ...(animeFormat && { animeEpisodeFormat: animeFormat }),
    ...(mediaNaming.episodes?.rename != null && { renameEpisodes: mediaNaming.episodes.rename }),
  };

  logger.debug(apiObject, "Mapped mediaNaming to API:");
  return apiObject;
};
