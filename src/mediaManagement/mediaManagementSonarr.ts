import type { SonarrClient } from "../clients/sonarr-client";
import type { SonarrMediaManagementResource } from "../clients/sonarr-client";
import type { NamingConfigResource } from "../__generated__/sonarr/data-contracts";
import type { MediaManagementType } from "../types/config.types";
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
}
