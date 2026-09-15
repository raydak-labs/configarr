import { Tag } from "../tags/tag.types";
import { getClient } from "../clients/client";
import { FieldChange } from "../diffReport/diffReport.types";
import { InputConfigDelayProfile } from "../types/config.types";
import { DelayProfileResource } from "../__generated__/lidarr/data-contracts";
import { DelayProfileProtocolItem } from "./delayProfile.types";
import { areDelayProfileItemsEqual, BaseDelayProfileSync, delayProfileSharedFields, mapDelayProfileTags } from "./delayProfileBase";

export type LidarrDelayProfile = DelayProfileResource & { items: DelayProfileProtocolItem[] };

function hasLidarrItems(profile: DelayProfileResource): profile is LidarrDelayProfile {
  return "items" in profile && Array.isArray((profile as LidarrDelayProfile).items);
}

const LIDARR_COMPARE_KEYS = ["bypassIfHighestQuality", "bypassIfAboveCustomFormatScore", "minimumCustomFormatScore", "order"] as const;

function compareLidarrDelayProfileFields(config: InputConfigDelayProfile, server: LidarrDelayProfile): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const key of LIDARR_COMPARE_KEYS) {
    if (config[key] !== undefined && config[key] !== server[key]) {
      changes.push({ field: key, from: server[key], to: config[key] });
    }
  }

  if (config.items !== undefined && !areDelayProfileItemsEqual(config.items, server.items)) {
    changes.push({ field: "items", from: server.items ?? [], to: config.items });
  }

  return changes;
}

export class DelayProfileLidarrSync extends BaseDelayProfileSync<LidarrDelayProfile> {
  protected getApi() {
    return getClient("LIDARR");
  }

  async loadFromServer(): Promise<LidarrDelayProfile[]> {
    const profiles = await this.getApi().getDelayProfiles();
    return profiles.map((profile) => {
      if (hasLidarrItems(profile)) {
        return { ...profile, items: profile.items };
      }
      return { ...profile, items: [] };
    });
  }

  mapToServer(profile: InputConfigDelayProfile, serverTags: Tag[]): LidarrDelayProfile {
    return {
      ...delayProfileSharedFields(profile, mapDelayProfileTags(profile, serverTags)),
      items: (profile.items ?? []).map((item) => ({
        name: item.name,
        protocol: item.protocol,
        allowed: item.allowed,
        delay: item.delay,
      })),
    };
  }

  protected compareFields(config: InputConfigDelayProfile, server: LidarrDelayProfile) {
    return compareLidarrDelayProfileFields(config, server);
  }
}
