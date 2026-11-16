import type { NamingConfigResource } from "../__generated__/radarr/data-contracts";
import { loadNamingFromTrashRadarr } from "../trash-guide";
import type { MediaNamingType } from "../types/config.types";
import { MediaNamingBase } from "./mediaNamingBase";

export class MediaNamingRadarr extends MediaNamingBase<NamingConfigResource> {
  constructor() {
    super("RADARR");
  }

  async map(mediaNaming: MediaNamingType): Promise<NamingConfigResource | null> {
    const trashNaming = await loadNamingFromTrashRadarr();
    if (trashNaming == null) {
      return null;
    }

    const folderFormat = this.resolveMediaNaming(mediaNaming.folder, trashNaming.folder, "mediaNaming.folder");
    const standardFormat = this.resolveMediaNaming(mediaNaming.movie?.standard, trashNaming.file, "mediaNaming.movie.standard");
    const apiObject: NamingConfigResource = {
      ...(folderFormat && { movieFolderFormat: folderFormat }),
      ...(standardFormat && { standardMovieFormat: standardFormat }),
      ...(mediaNaming.movie?.rename != null && { renameMovies: mediaNaming.movie.rename }),
    };

    this.logMapped(apiObject);
    return apiObject;
  }
}
