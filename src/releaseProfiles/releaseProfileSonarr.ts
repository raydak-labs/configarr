import { ReleaseProfileResource } from "../__generated__/sonarr/data-contracts";
import type { ReleaseProfilesApi } from "../clients/capabilities";
import { BaseReleaseProfileSync } from "./releaseProfileBase";

export class ReleaseProfileSonarrSync extends BaseReleaseProfileSync<ReleaseProfileResource> {
  constructor(api: ReleaseProfilesApi<ReleaseProfileResource>) {
    super(api, true);
  }
}
