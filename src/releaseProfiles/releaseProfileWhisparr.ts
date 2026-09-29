import { ReleaseProfileResource } from "../__generated__/whisparr/data-contracts";
import type { ReleaseProfilesApi } from "../clients/capabilities";
import { BaseReleaseProfileSync } from "./releaseProfileBase";

export class ReleaseProfileWhisparrSync extends BaseReleaseProfileSync<ReleaseProfileResource> {
  constructor(api: ReleaseProfilesApi<ReleaseProfileResource>) {
    super(api, true);
  }
}
