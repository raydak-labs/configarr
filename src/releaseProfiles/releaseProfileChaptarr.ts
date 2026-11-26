import type { ReleaseProfileResource } from "../__generated__/chaptarr/data-contracts";
import type { ReleaseProfilesApi } from "../clients/capabilities";
import { BaseReleaseProfileSync, sharedReleaseProfileAdapter } from "./releaseProfileBase";

export class ReleaseProfileChaptarrSync extends BaseReleaseProfileSync<ReleaseProfileResource> {
  constructor(api: ReleaseProfilesApi<ReleaseProfileResource>) {
    super(api, false, sharedReleaseProfileAdapter<ReleaseProfileResource>());
  }
}
