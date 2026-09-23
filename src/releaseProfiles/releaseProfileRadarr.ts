import { ReleaseProfileResource } from "../__generated__/radarr/data-contracts";
import type { ReleaseProfilesApi } from "../clients/capabilities";
import { BaseReleaseProfileSync } from "./releaseProfileBase";

export class ReleaseProfileRadarrSync extends BaseReleaseProfileSync<ReleaseProfileResource> {
  constructor(api: ReleaseProfilesApi<ReleaseProfileResource>) {
    super(api, true);
  }
}
