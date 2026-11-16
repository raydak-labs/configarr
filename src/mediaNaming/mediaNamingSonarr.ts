import type { NamingConfigResource } from "../__generated__/sonarr/data-contracts";
import { loadNamingFromTrashSonarr } from "../trash-guide";
import type { MediaNamingType } from "../types/config.types";
import { MediaNamingBase } from "./mediaNamingBase";

export class MediaNamingSonarr extends MediaNamingBase<NamingConfigResource> {
  constructor() {
    super("SONARR");
  }

  async map(mediaNaming: MediaNamingType): Promise<NamingConfigResource | null> {
    const trashNaming = await loadNamingFromTrashSonarr();
    if (trashNaming == null) {
      return null;
    }

    const seriesFormat = this.resolveMediaNaming(mediaNaming.series, trashNaming.series, "mediaNaming.series");
    const seasonsFormat = this.resolveMediaNaming(mediaNaming.season, trashNaming.season, "mediaNaming.season");
    const standardFormat = this.resolveMediaNaming(
      mediaNaming.episodes?.standard,
      trashNaming.episodes.standard,
      "mediaNaming.episodes.standard",
    );
    const dailyFormat = this.resolveMediaNaming(mediaNaming.episodes?.daily, trashNaming.episodes.daily, "mediaNaming.episodes.daily");
    const animeFormat = this.resolveMediaNaming(mediaNaming.episodes?.anime, trashNaming.episodes.anime, "mediaNaming.episodes.anime");
    const apiObject: NamingConfigResource = {
      ...(seriesFormat && { seriesFolderFormat: seriesFormat }),
      ...(seasonsFormat && { seasonFolderFormat: seasonsFormat }),
      ...(standardFormat && { standardEpisodeFormat: standardFormat }),
      ...(dailyFormat && { dailyEpisodeFormat: dailyFormat }),
      ...(animeFormat && { animeEpisodeFormat: animeFormat }),
      ...(mediaNaming.episodes?.rename != null && { renameEpisodes: mediaNaming.episodes.rename }),
    };

    this.logMapped(apiObject);
    return apiObject;
  }
}
