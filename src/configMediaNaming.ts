import { NamingConfigResource as RadarrNamingConfigResource } from "./__generated__/radarr/data-contracts";
import { NamingConfigResource as SonarrNamingConfigResource } from "./__generated__/sonarr/data-contracts";
import { logger } from "./logger";
import { loadNamingFromTrashRadarr, loadNamingFromTrashSonarr } from "./trash-guide";
import { ArrType } from "./types/common.types";
import { MediaNamingType } from "./types/config.types";

export const mapConfigMediaNamingToApi = async (arrType: ArrType, mediaNaming: MediaNamingType): Promise<any | null> => {
  if (arrType === "RADARR") {
    const trashNaming = await loadNamingFromTrashRadarr();

    if (trashNaming == null) {
      return null;
    }

    const folderFormat = mediaNamingToApiWithLog("RADARR", mediaNaming.folder, trashNaming.folder, "mediaNaming.folder");
    const standardFormat = mediaNamingToApiWithLog("RADARR", mediaNaming.movie?.standard, trashNaming.file, "mediaNaming.movie.standard");

    const apiObject: RadarrNamingConfigResource = {
      ...(folderFormat && { movieFolderFormat: folderFormat }),
      ...(standardFormat && { standardMovieFormat: standardFormat }),
      ...(mediaNaming.movie?.rename != null && { renameMovies: mediaNaming.movie?.rename === true }),
    };

    logger.debug(apiObject, `Mapped mediaNaming to API:`);
    return apiObject;
  }

  if (arrType === "SONARR") {
    const trashNaming = await loadNamingFromTrashSonarr();

    if (trashNaming == null) {
      return null;
    }

    const seriesFormat = mediaNamingToApiWithLog("SONARR", mediaNaming.series, trashNaming.series, "mediaNaming.series");
    const seasonsFormat = mediaNamingToApiWithLog("SONARR", mediaNaming.season, trashNaming.season, "mediaNaming.season");
    const standardFormat = mediaNamingToApiWithLog(
      "SONARR",
      mediaNaming.episodes?.standard,
      trashNaming.episodes.standard,
      "mediaNaming.episodes.standard",
    );
    const dailyFormat = mediaNamingToApiWithLog(
      "SONARR",
      mediaNaming.episodes?.daily,
      trashNaming.episodes.daily,
      "mediaNaming.episodes.daily",
    );
    const animeFormat = mediaNamingToApiWithLog(
      "SONARR",
      mediaNaming.episodes?.anime,
      trashNaming.episodes.anime,
      "mediaNaming.episodes.anime",
    );

    const apiObject: SonarrNamingConfigResource = {
      ...(seriesFormat && { seriesFolderFormat: seriesFormat }),
      ...(seasonsFormat && { seasonFolderFormat: seasonsFormat }),
      ...(standardFormat && { standardEpisodeFormat: standardFormat }),
      ...(dailyFormat && { dailyEpisodeFormat: dailyFormat }),
      ...(animeFormat && { animeEpisodeFormat: animeFormat }),
      ...(mediaNaming.episodes?.rename != null && { renameEpisodes: mediaNaming.episodes?.rename === true }),
    };

    logger.debug(apiObject, `Mapped mediaNaming to API:`);

    return apiObject;
  }

  logger.warn(`MediaNaming not supported for ${arrType}`);
};

const mediaNamingToApiWithLog = (arrType: ArrType, key: string | undefined, trashObject: any, label: string) => {
  if (key) {
    if (trashObject[key] == null) {
      logger.warn(`(${arrType}) Specified ${label} '${key}' could not be found in TRaSH-Guide. Check debug logs for available keys.`);
    } else {
      return trashObject[key];
    }
  }

  return null;
};
