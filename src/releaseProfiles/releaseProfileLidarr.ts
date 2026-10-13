import { ReleaseProfileResource } from "../__generated__/lidarr/data-contracts";
import type { ReleaseProfilesApi } from "../clients/capabilities";
import { BaseReleaseProfileSync, sharedReleaseProfileAdapter } from "./releaseProfileBase";

export class ReleaseProfileLidarrSync extends BaseReleaseProfileSync<ReleaseProfileResource> {
  constructor(api: ReleaseProfilesApi<ReleaseProfileResource>) {
    super(api, false, sharedReleaseProfileAdapter<ReleaseProfileResource>());
  }
}
