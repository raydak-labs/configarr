import { getUnifiedClient } from "./clients/unified-client";
import { logger } from "./logger";
import { InputConfigDelayProfile } from "./types/config.types";
import { MergedDelayProfileResource } from "./__generated__/mergedTypes";

// Helper to flatten delay profiles (default + additional) to a single array
export function flattenDelayProfiles<T extends { tags?: number[] | null }>(delayProfilesObj: { default?: T; additional?: T[] }): T[] {
  const arr: T[] = [];
  if (delayProfilesObj.default) arr.push(delayProfilesObj.default);
  if (Array.isArray(delayProfilesObj.additional)) arr.push(...delayProfilesObj.additional);
  return arr;
}

// Helper to split server delay profiles into default/additional
export function splitServerDelayProfiles(serverProfiles: MergedDelayProfileResource[]): {
  default?: MergedDelayProfileResource;
  additional?: MergedDelayProfileResource[];
} {
  let defaultProfile: MergedDelayProfileResource | undefined = undefined;
  const additional: MergedDelayProfileResource[] = [];
  for (const p of serverProfiles) {
    if (!Array.isArray(p.tags) || p.tags.length === 0) {
      defaultProfile = p;
    } else {
      additional.push(p);
    }
  }
  return { default: defaultProfile, additional: additional.length > 0 ? additional : undefined };
}

export const calculateDelayProfilesDiff = async (
  delayProfilesObj: { default?: InputConfigDelayProfile; additional?: InputConfigDelayProfile[] } = {},
) => {
  const delayProfiles = flattenDelayProfiles<InputConfigDelayProfile>(delayProfilesObj);
  if (!delayProfiles.length) {
    logger.debug(`Config 'delay_profiles' not specified. Ignoring.`);
    return null;
  }

  const api = getUnifiedClient();
  const serverData: MergedDelayProfileResource[] = await api.getDelayProfiles();
  const serverProfilesSplit = splitServerDelayProfiles(serverData);
  const serverProfilesFlat = flattenDelayProfiles<MergedDelayProfileResource>(serverProfilesSplit);

  // Compare by order and main fields (id, protocol, delays, etc.)
  const missingOnServer: InputConfigDelayProfile[] = [];
  const notAvailableAnymore: MergedDelayProfileResource[] = [];
  const changed: { server: MergedDelayProfileResource; config: InputConfigDelayProfile }[] = [];
  const matching: MergedDelayProfileResource[] = [];

  // Find missing and changed
  delayProfiles.forEach((profile) => {
    const match = serverProfilesFlat.find(
      (s) =>
        s.preferredProtocol === profile.preferredProtocol &&
        s.usenetDelay === profile.usenetDelay &&
        s.torrentDelay === profile.torrentDelay,
    );
    if (!match) {
      missingOnServer.push(profile);
    } else {
      // Check for changes
      const keys = [
        "enableUsenet",
        "enableTorrent",
        "preferredProtocol",
        "usenetDelay",
        "torrentDelay",
        "bypassIfHighestQuality",
        "bypassIfAboveCustomFormatScore",
        "minimumCustomFormatScore",
        "order",
        "tags",
      ];
      let isChanged = false;
      for (const key of keys) {
        if ((profile as any)[key] !== (match as any)[key]) {
          isChanged = true;
          break;
        }
      }
      if (isChanged) {
        changed.push({ server: match, config: profile });
      } else {
        matching.push(match);
      }
    }
  });

  // Find not available anymore
  serverProfilesFlat.forEach((serverProfile) => {
    // Never delete the default profile (no tags or empty tags)
    const isDefault = !serverProfile.tags || serverProfile.tags.length === 0;
    if (isDefault) {
      return; // skip deletion for default
    }
    // Try to match by all fields except tags (for additional profiles)
    const match = delayProfiles.find((p) => {
      if (!Array.isArray(serverProfile.tags) || serverProfile.tags.length === 0) {
        return !Array.isArray(p.tags) || p.tags.length === 0;
      }
      if (!Array.isArray(p.tags) || p.tags.length === 0) return false;
      const tagsEqual =
        serverProfile.tags.length === p.tags.length &&
        serverProfile.tags.every((tag) => p.tags && p.tags.includes(tag)) &&
        p.tags.every((tag) => serverProfile.tags && serverProfile.tags.includes(tag));
      return (
        p.preferredProtocol === serverProfile.preferredProtocol &&
        p.usenetDelay === serverProfile.usenetDelay &&
        p.torrentDelay === serverProfile.torrentDelay &&
        tagsEqual
      );
    });
    if (!match) {
      notAvailableAnymore.push(serverProfile);
    }
  });

  // Filter out the default profile from notAvailableAnymore (should never be deleted)
  const filteredNotAvailableAnymore = notAvailableAnymore.filter(
    (profile) => Array.isArray(profile.tags) && profile.tags.length > 0 && profile.tags.some((t) => t != null),
  );

  logger.debug({ missingOnServer, notAvailableAnymore: filteredNotAvailableAnymore, changed, matching }, "Delay profile comparison");

  if (!missingOnServer.length && !filteredNotAvailableAnymore.length && !changed.length) {
    logger.debug(`Delay profiles are in sync`);
    return null;
  }

  logger.info(`Found ${missingOnServer.length + filteredNotAvailableAnymore.length + changed.length} differences for delay profiles.`);

  return {
    missingOnServer,
    notAvailableAnymore: filteredNotAvailableAnymore,
    changed,
  };
};
