import type { SonarrClient } from "../clients/sonarr-client";
import type { SonarrMediaManagementResource } from "../clients/sonarr-resource-mapper";
import type { NamingConfigResource } from "../__generated__/sonarr/data-contracts";
import { loadNamingFromTrashSonarr } from "../trash-guide";
import type { MediaManagementType, MediaNamingType } from "../types/config.types";
import { MediaManagementSync } from "./mediaManagement";

export class SonarrMediaManagementSync extends MediaManagementSync<NamingConfigResource, SonarrMediaManagementResource> {
  constructor(private readonly sonarrClient: SonarrClient) {
    super(sonarrClient);
  }

  async validateConfig(mediaManagement?: MediaManagementType): Promise<void> {
    if (!this.hasSonarrV5OnlyControls(mediaManagement) || (await this.sonarrClient.supportsMediaManagementControls())) {
      return;
    }

    await super.validateConfig(mediaManagement);
  }

  async mapNaming(mediaNaming: MediaNamingType): Promise<NamingConfigResource | null> {
    const trashNaming = await loadNamingFromTrashSonarr();
    if (trashNaming == null) {
      return null;
    }

    const seriesFormat = this.resolveMediaNaming("SONARR", mediaNaming.series, trashNaming.series);
    const seasonsFormat = this.resolveMediaNaming("SONARR", mediaNaming.season, trashNaming.season);
    const standardFormat = this.resolveMediaNaming("SONARR", mediaNaming.episodes?.standard, trashNaming.episodes.standard);
    const dailyFormat = this.resolveMediaNaming("SONARR", mediaNaming.episodes?.daily, trashNaming.episodes.daily);
    const animeFormat = this.resolveMediaNaming("SONARR", mediaNaming.episodes?.anime, trashNaming.episodes.anime);
    const apiObject: NamingConfigResource = {
      ...(seriesFormat && { seriesFolderFormat: seriesFormat }),
      ...(seasonsFormat && { seasonFolderFormat: seasonsFormat }),
      ...(standardFormat && { standardEpisodeFormat: standardFormat }),
      ...(dailyFormat && { dailyEpisodeFormat: dailyFormat }),
      ...(animeFormat && { animeEpisodeFormat: animeFormat }),
      ...(mediaNaming.episodes?.rename != null && { renameEpisodes: mediaNaming.episodes.rename }),
    };

    this.logMappedNaming(apiObject);
    return apiObject;
  }
}
