import type { ReleaseProfilesApi } from "../clients/capabilities";
import { BaseReleaseProfileSync } from "./releaseProfileBase";
import type { SonarrReleaseProfileResource } from "./releaseProfile.types";

export class ReleaseProfileSonarrSync extends BaseReleaseProfileSync<SonarrReleaseProfileResource> {
  constructor(api: ReleaseProfilesApi<SonarrReleaseProfileResource>) {
    super(api, true);
  }
}
