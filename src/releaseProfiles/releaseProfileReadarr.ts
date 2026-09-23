import { ReleaseProfileResource } from "../__generated__/readarr/data-contracts";
import type { ReleaseProfilesApi } from "../clients/capabilities";
import { BaseReleaseProfileSync } from "./releaseProfileBase";

export class ReleaseProfileReadarrSync extends BaseReleaseProfileSync<ReleaseProfileResource> {
  constructor(api: ReleaseProfilesApi<ReleaseProfileResource>) {
    super(api, false);
  }
}
