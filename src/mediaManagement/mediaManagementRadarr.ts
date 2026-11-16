import type { MediaManagementConfigResource, NamingConfigResource } from "../__generated__/radarr/data-contracts";
import { loadNamingFromTrashRadarr } from "../trash-guide";
import type { MediaNamingType } from "../types/config.types";
import { MediaManagementSync } from "./mediaManagement";

export class RadarrMediaManagementSync extends MediaManagementSync<NamingConfigResource, MediaManagementConfigResource> {
  async mapNaming(mediaNaming: MediaNamingType): Promise<NamingConfigResource | null> {
    const trashNaming = await loadNamingFromTrashRadarr();
    if (trashNaming == null) {
      return null;
    }

    const folderFormat = this.resolveMediaNaming("RADARR", mediaNaming.folder, trashNaming.folder);
    const standardFormat = this.resolveMediaNaming("RADARR", mediaNaming.movie?.standard, trashNaming.file);
    const apiObject: NamingConfigResource = {
      ...(folderFormat && { movieFolderFormat: folderFormat }),
      ...(standardFormat && { standardMovieFormat: standardFormat }),
      ...(mediaNaming.movie?.rename != null && { renameMovies: mediaNaming.movie.rename }),
    };

    this.logMappedNaming(apiObject);
    return apiObject;
  }
}
