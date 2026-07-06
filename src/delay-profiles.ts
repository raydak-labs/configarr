import { getUnifiedClient } from "./clients/unified-client";
import { DiffEntry, FieldChange } from "./diffReport/diffReport.types";
import { logger } from "./logger";
import { InputConfigDelayProfile } from "./types/config.types";
import { MergedDelayProfileResource, MergedTagResource } from "./types/merged.types";

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

export interface DelayProfilesDiff {
  defaultProfileChanged: boolean;
  additionalProfilesChanged: boolean;
  missingTags: string[];
  defaultProfile?: InputConfigDelayProfile;
  additionalProfiles?: InputConfigDelayProfile[];
  defaultProfileFieldChanges: FieldChange[];
  additionalProfilesFieldChanges: FieldChange[][];
}

export const calculateDelayProfilesDiff = async (
  delayProfilesObj: { default?: InputConfigDelayProfile; additional?: InputConfigDelayProfile[] },
  tags: MergedTagResource[],
): Promise<DelayProfilesDiff | null> => {
  const { default: configDefault, additional: configAdditional = [] } = delayProfilesObj;

  if (!configDefault && configAdditional.length === 0) {
    logger.debug(`Config 'delay_profiles' not specified. Ignoring.`);
    return null;
  }

  const api = getUnifiedClient();
  const serverData: MergedDelayProfileResource[] = await api.getDelayProfiles();
  const { default: serverDefault, additional: serverAdditional = [] } = splitServerDelayProfiles(serverData);

  // Check default profile (no tag comparison for default)
  const defaultComparison: { equal: boolean; changes: FieldChange[] } =
    configDefault && serverDefault ? compareDefaultProfile(configDefault, serverDefault) : { equal: true, changes: [] };
  const defaultProfileChanged = !defaultComparison.equal;

  let additionalProfilesChanged = configAdditional.length !== serverAdditional.length;

  const additionalComparisons: Array<{ equal: boolean; changes: FieldChange[] }> = configAdditional.map((config, i) => {
    const mappedTags = config.tags?.map((tagName) => tags.find((t) => t.label === tagName)?.id).filter((t) => t !== undefined);
    const serverProfile = serverAdditional[i];

    if (!serverProfile) {
      logger.debug(`Server profile at index ${i} does not exist.`);
      return { equal: false, changes: [] };
    }

    return compareAdditionalProfile(config, serverProfile, mappedTags || []);
  });

  if (!additionalProfilesChanged) {
    additionalProfilesChanged = additionalComparisons.some((c) => !c.equal);
  }

  const additionalProfilesFieldChanges = additionalComparisons.map((c) => c.changes);

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
    defaultProfileFieldChanges: defaultComparison.changes,
    additionalProfilesFieldChanges,
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

const compareProfileFields = (config: InputConfigDelayProfile, server: MergedDelayProfileResource): FieldChange[] => {
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

  const changes: FieldChange[] = [];
  for (const key of keys) {
    if (config[key] !== undefined && config[key] !== server[key]) {
      changes.push({ field: key, from: server[key], to: config[key] });
    }
  }
  return changes;
};

// Default profile: no tag comparison
const compareDefaultProfile = (
  config: InputConfigDelayProfile,
  server: MergedDelayProfileResource,
): { equal: boolean; changes: FieldChange[] } => {
  const changes = compareProfileFields(config, server);
  return { equal: changes.length === 0, changes };
};

// Additional profiles: includes tag comparison
const compareAdditionalProfile = (
  config: InputConfigDelayProfile,
  server: MergedDelayProfileResource,
  mappedTags: Array<number>,
): { equal: boolean; changes: FieldChange[] } => {
  const changes = compareProfileFields(config, server);

  if (!areTagsEqual(mappedTags, getProfileTags(server))) {
    changes.push({ field: "tags", from: getProfileTags(server), to: mappedTags });
  }

  return { equal: changes.length === 0, changes };
};

const areTagsEqual = (tags1: number[], tags2: number[]): boolean => {
  return tags1.length === tags2.length && tags1.sort().join(",") === tags2.sort().join(",");
};

export function delayProfilesToDiffEntries(diff: DelayProfilesDiff): DiffEntry[] {
  const entries: DiffEntry[] = [];

  if (diff.defaultProfileChanged) {
    entries.push({ resourceType: "DelayProfile", name: "default", action: "update", fieldChanges: diff.defaultProfileFieldChanges });
  }

  if (diff.additionalProfilesChanged && diff.additionalProfiles) {
    diff.additionalProfiles.forEach((profile, i) => {
      const name = profile.tags && profile.tags.length > 0 ? profile.tags.join(",") : `profile-${i + 1}`;
      entries.push({
        resourceType: "DelayProfile",
        name,
        action: "update",
        fieldChanges: diff.additionalProfilesFieldChanges[i] ?? [],
      });
    });
  }

  return entries;
}
