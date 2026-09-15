import { Tag } from "../tags/tag.types";
import { getClient } from "../clients/client";
import { DelayProfileResource, DownloadProtocol } from "../__generated__/readarr/data-contracts";
import { InputConfigDelayProfile } from "../types/config.types";
import {
  compareGenericDelayProfileFields,
  mapStandardDelayProfile,
  StandardDelayProfileSync,
  toDownloadProtocol,
} from "./delayProfileBase";

export class DelayProfileReadarrSync extends StandardDelayProfileSync<DelayProfileResource> {
  protected getApi() {
    return getClient("READARR");
  }

  mapToServer(profile: InputConfigDelayProfile, serverTags: Tag[]): DelayProfileResource {
    return mapStandardDelayProfile(profile, serverTags, toDownloadProtocol(DownloadProtocol, profile.preferredProtocol));
  }

  protected compareFields(config: InputConfigDelayProfile, server: DelayProfileResource) {
    return compareGenericDelayProfileFields(config, server);
  }
}
