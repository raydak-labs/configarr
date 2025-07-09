import { getUnifiedClient } from "./clients/unified-client";
import { logger } from "./logger";
import { InputConfigDelayProfile } from "./types/config.types";
import { MergedDelayProfileResource, MergedTagResource } from "./__generated__/mergedTypes";

export const deleteAdditionalDelayProfiles = async () => {
  const api = getUnifiedClient();

  const serverData: MergedDelayProfileResource[] = await api.getDelayProfiles();
  const { additional: serverAdditional = [] } = splitServerDelayProfiles(serverData);

  for (const p of serverAdditional) {
    await api.deleteDelayProfile(p.id + "");
    logger.info(`Deleted Delay Profile: '${p.id}'`);
  }
};

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

export const mapToServerDelayProfile = (profile: InputConfigDelayProfile, serverTags: MergedTagResource[]): MergedDelayProfileResource => {
  const mappedTags = profile.tags?.map((tagName) => serverTags.find((t) => t.label === tagName)?.id).filter((t) => t !== undefined) || [];
  return {
    enableUsenet: profile.enableUsenet,
    enableTorrent: profile.enableTorrent,
    preferredProtocol: (profile.preferredProtocol ?? "usenet") as any, // Default to usenet if not specified
    usenetDelay: profile.usenetDelay,
    torrentDelay: profile.torrentDelay,
    bypassIfHighestQuality: profile.bypassIfHighestQuality,
    bypassIfAboveCustomFormatScore: profile.bypassIfAboveCustomFormatScore,
    minimumCustomFormatScore: profile.minimumCustomFormatScore,
    order: profile.order,
    tags: mappedTags,
  };
};

export const calculateDelayProfilesDiff = async (
  delayProfilesObj: { default?: InputConfigDelayProfile; additional?: InputConfigDelayProfile[] },
  tags: MergedTagResource[],
): Promise<{
  defaultProfileChanged: boolean;
  additionalProfilesChanged: boolean;
  missingTags: string[];
  defaultProfile?: InputConfigDelayProfile;
  additionalProfiles?: InputConfigDelayProfile[];
} | null> => {
  const { default: configDefault, additional: configAdditional = [] } = delayProfilesObj;

  if (!configDefault && configAdditional.length === 0) {
    logger.debug(`Config 'delay_profiles' not specified. Ignoring.`);
    return null;
  }

  const api = getUnifiedClient();
  const serverData: MergedDelayProfileResource[] = await api.getDelayProfiles();
  const { default: serverDefault, additional: serverAdditional = [] } = splitServerDelayProfiles(serverData);

  // Check default profile (no tag comparison for default)
  const defaultProfileChanged = configDefault && serverDefault ? isDefaultProfileDifferent(configDefault, serverDefault) : false;

  let additionalProfilesChanged = configAdditional.length !== serverAdditional.length;

  if (!additionalProfilesChanged && configAdditional.length > 0) {
    additionalProfilesChanged = configAdditional.some((config, i) => {
      const mappedTags = config.tags?.map((tagName) => tags.find((t) => t.label === tagName)?.id).filter((t) => t !== undefined);
      const serverProfile = serverAdditional[i];

      if (!serverProfile) {
        logger.debug(`Server profile at index ${i} does not exist.`);
        return true; // Mark as changed
      }

      return isProfileDifferent(config, serverProfile, mappedTags || []);
    });
  }

  if (!defaultProfileChanged && !additionalProfilesChanged) {
    logger.debug(`Delay profiles are in sync`);
    return null;
  }

  logger.info(`DelayProfiles changes detected - default: ${defaultProfileChanged}, additional: ${additionalProfilesChanged}`);

  const missingTags = configAdditional.flatMap((profile) => {
    return profile.tags?.filter((tagName) => !tags.some((t) => t.label === tagName)) || [];
  });

  return {
    defaultProfileChanged,
    additionalProfilesChanged,
    missingTags,
    defaultProfile: configDefault,
    additionalProfiles: configAdditional,
  };
};

// Helper functions
type ComparisonKeys = keyof Pick<
  InputConfigDelayProfile,
  | "enableUsenet"
  | "enableTorrent"
  | "preferredProtocol"
  | "usenetDelay"
  | "torrentDelay"
  | "bypassIfHighestQuality"
  | "bypassIfAboveCustomFormatScore"
  | "minimumCustomFormatScore"
  | "order"
>;

const getProfileTags = (profile: MergedDelayProfileResource): number[] => {
  return "tags" in profile && Array.isArray(profile.tags) ? profile.tags : [];
};

// Separate function for default profile (no tag comparison)
const isDefaultProfileDifferent = (config: InputConfigDelayProfile, server: MergedDelayProfileResource): boolean => {
  const keys: ComparisonKeys[] = [
    "enableUsenet",
    "enableTorrent",
    "preferredProtocol",
    "usenetDelay",
    "torrentDelay",
    "bypassIfHighestQuality",
    "bypassIfAboveCustomFormatScore",
    "minimumCustomFormatScore",
    "order",
  ];

  for (const key of keys) {
    if (config[key] !== undefined && config[key] !== server[key]) {
      return true;
    }
  }
  return false;
};

// For additional profiles (includes tag comparison)
const isProfileDifferent = (config: InputConfigDelayProfile, server: MergedDelayProfileResource, mappedTags: Array<number>): boolean => {
  const keys: ComparisonKeys[] = [
    "enableUsenet",
    "enableTorrent",
    "preferredProtocol",
    "usenetDelay",
    "torrentDelay",
    "bypassIfHighestQuality",
    "bypassIfAboveCustomFormatScore",
    "minimumCustomFormatScore",
    "order",
  ];

  for (const key of keys) {
    if (config[key] !== undefined && config[key] !== server[key]) {
      return true;
    }
  }
  if (!areTagsEqual(mappedTags, getProfileTags(server))) {
    return true;
  }
  return false;
};

const areTagsEqual = (tags1: number[], tags2: number[]): boolean => {
  return tags1.length === tags2.length && tags1.sort().join(",") === tags2.sort().join(",");
};
