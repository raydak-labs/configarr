import type { NamingConfigResource } from "../__generated__/radarr/data-contracts";
import { logger } from "../logger";
import { loadNamingFromTrashRadarr } from "../trash-guide";
import type { MediaNamingType } from "../types/config.types";
import { resolveMediaNaming } from "./mediaNamingBase";

export const mapRadarrMediaNamingToApi = async (mediaNaming: MediaNamingType): Promise<NamingConfigResource | null> => {
  const trashNaming = await loadNamingFromTrashRadarr();
  if (trashNaming == null) {
    return null;
  }

  const folderFormat = resolveMediaNaming("RADARR", mediaNaming.folder, trashNaming.folder, "mediaNaming.folder");
  const standardFormat = resolveMediaNaming("RADARR", mediaNaming.movie?.standard, trashNaming.file, "mediaNaming.movie.standard");
  const apiObject: NamingConfigResource = {
    ...(folderFormat && { movieFolderFormat: folderFormat }),
    ...(standardFormat && { standardMovieFormat: standardFormat }),
    ...(mediaNaming.movie?.rename != null && { renameMovies: mediaNaming.movie.rename }),
  };

  logger.debug(apiObject, "Mapped mediaNaming to API:");
  return apiObject;
};
