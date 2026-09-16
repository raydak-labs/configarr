import { Tag } from "../tags/tag.types";
import type { DelayProfilesClient } from "../clients/capabilities";
import { FieldChange } from "../diffReport/diffReport.types";
import { InputConfigDelayProfile } from "../types/config.types";
import { DelayProfileResource, DownloadProtocol } from "../__generated__/lidarr/data-contracts";
import { DelayProfileProtocolItem } from "./delayProfile.types";
import {
  areDelayProfileItemsEqual,
  BaseDelayProfileSync,
  compareGenericDelayProfileFields,
  delayProfileSharedFields,
  mapDelayProfileTags,
  mapStandardDelayProfile,
  toDownloadProtocol,
} from "./delayProfileBase";

export type LidarrDelayProfile = DelayProfileResource & { items?: DelayProfileProtocolItem[] };

function hasLidarrItems(profile: DelayProfileResource): profile is DelayProfileResource & { items: DelayProfileProtocolItem[] } {
  return "items" in profile && Array.isArray(profile.items);
}

const LIDARR_PLUGIN_COMPARE_KEYS = [
  "bypassIfHighestQuality",
  "bypassIfAboveCustomFormatScore",
  "minimumCustomFormatScore",
  "order",
] as const;

function compareLidarrDelayProfileFields(config: InputConfigDelayProfile, server: LidarrDelayProfile): FieldChange[] {
  if (config.items === undefined) {
    return compareGenericDelayProfileFields(config, server);
  }

  const changes: FieldChange[] = [];
  for (const key of LIDARR_PLUGIN_COMPARE_KEYS) {
    if (config[key] !== undefined && config[key] !== server[key]) {
      changes.push({ field: key, from: server[key], to: config[key] });
    }
  }

  if (!areDelayProfileItemsEqual(config.items, server.items)) {
    changes.push({ field: "items", from: server.items ?? [], to: config.items });
  }

  return changes;
}

export class DelayProfileLidarrSync extends BaseDelayProfileSync<LidarrDelayProfile> {
  constructor(api: DelayProfilesClient<LidarrDelayProfile>) {
    super(api);
  }

  async loadFromServer(): Promise<LidarrDelayProfile[]> {
    const profiles = await this.api.getDelayProfiles();
    return profiles.map((profile) => {
      if (hasLidarrItems(profile)) {
        return { ...profile, items: profile.items };
      }
      return profile;
    });
  }

  mapToServer(profile: InputConfigDelayProfile, serverTags: Tag[]): LidarrDelayProfile {
    if (profile.items !== undefined) {
      return {
        ...delayProfileSharedFields(profile, mapDelayProfileTags(profile, serverTags)),
        items: profile.items.map((item) => ({
          name: item.name,
          protocol: item.protocol,
          allowed: item.allowed,
          delay: item.delay,
        })),
      };
    }

    return mapStandardDelayProfile(profile, serverTags, toDownloadProtocol(DownloadProtocol, profile.preferredProtocol));
  }

  protected compareFields(config: InputConfigDelayProfile, server: LidarrDelayProfile) {
    return compareLidarrDelayProfileFields(config, server);
  }
}
