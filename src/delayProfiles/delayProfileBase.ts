import { Tag } from "../tags/tag.types";
import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import { logger } from "../logger";
import { InputConfigDelayProfile } from "../types/config.types";
import {
  DelayProfileGenericResource,
  DelayProfileLidarrResource,
  DelayProfileShared,
  DelayProfileProtocolItem,
} from "./delayProfile.types";

export interface DelayProfilesDiff {
  defaultProfileChanged: boolean;
  additionalProfilesChanged: boolean;
  missingTags: string[];
  defaultProfile?: InputConfigDelayProfile;
  additionalProfiles?: InputConfigDelayProfile[];
  defaultProfileFieldChanges: FieldChange[];
  additionalProfilesFieldChanges: FieldChange[][];
}

export function flattenDelayProfiles<T extends { tags?: number[] | null }>(delayProfilesObj: { default?: T; additional?: T[] }): T[] {
  const arr: T[] = [];
  if (delayProfilesObj.default) arr.push(delayProfilesObj.default);
  if (Array.isArray(delayProfilesObj.additional)) arr.push(...delayProfilesObj.additional);
  return arr;
}

export function splitServerDelayProfiles<T extends { tags?: number[] | null }>(
  serverProfiles: T[],
): {
  default?: T;
  additional?: T[];
} {
  let defaultProfile: T | undefined = undefined;
  const additional: T[] = [];
  for (const p of serverProfiles) {
    if (!Array.isArray(p.tags) || p.tags.length === 0) {
      defaultProfile = p;
    } else {
      additional.push(p);
    }
  }
  return { default: defaultProfile, additional: additional.length > 0 ? additional : undefined };
}

export function mapDelayProfileTags(profile: InputConfigDelayProfile, serverTags: Tag[]): number[] {
  return profile.tags?.map((tagName) => serverTags.find((t) => t.label === tagName)?.id).filter((t) => t !== undefined) || [];
}

export function delayProfileSharedFields(profile: InputConfigDelayProfile, mappedTags: number[]) {
  return {
    bypassIfHighestQuality: profile.bypassIfHighestQuality,
    bypassIfAboveCustomFormatScore: profile.bypassIfAboveCustomFormatScore,
    minimumCustomFormatScore: profile.minimumCustomFormatScore,
    order: profile.order,
    tags: mappedTags,
  };
}

type SharedComparisonKeys = keyof Pick<
  InputConfigDelayProfile,
  "bypassIfHighestQuality" | "bypassIfAboveCustomFormatScore" | "minimumCustomFormatScore" | "order"
>;

type GenericComparisonKeys = SharedComparisonKeys | "enableUsenet" | "enableTorrent" | "preferredProtocol" | "usenetDelay" | "torrentDelay";

const GENERIC_COMPARE_KEYS: GenericComparisonKeys[] = [
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

export function compareGenericDelayProfileFields(config: InputConfigDelayProfile, server: DelayProfileGenericResource): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const key of GENERIC_COMPARE_KEYS) {
    if (config[key] !== undefined && config[key] !== server[key]) {
      changes.push({ field: key, from: server[key], to: config[key] });
    }
  }
  return changes;
}

const normalizeDelayProfileItems = (items: DelayProfileProtocolItem[] | null | undefined) =>
  (items ?? []).map((item) => ({
    name: item.name ?? undefined,
    protocol: item.protocol ?? undefined,
    allowed: item.allowed,
    delay: item.delay,
  }));

export function areDelayProfileItemsEqual(
  configItems: InputConfigDelayProfile["items"],
  serverItems: DelayProfileProtocolItem[] | null | undefined,
): boolean {
  return JSON.stringify(normalizeDelayProfileItems(configItems)) === JSON.stringify(normalizeDelayProfileItems(serverItems));
}

const LIDARR_COMPARE_KEYS: SharedComparisonKeys[] = [
  "bypassIfHighestQuality",
  "bypassIfAboveCustomFormatScore",
  "minimumCustomFormatScore",
  "order",
];

export function compareLidarrDelayProfileFields(config: InputConfigDelayProfile, server: DelayProfileLidarrResource): FieldChange[] {
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

export function areTagsEqual(tags1: number[], tags2: number[]): boolean {
  return tags1.length === tags2.length && tags1.sort().join(",") === tags2.sort().join(",");
}

export function getProfileTags(profile: { tags?: number[] | null }): number[] {
  return Array.isArray(profile.tags) ? profile.tags : [];
}

export async function calculateDelayProfilesDiffFor<T extends DelayProfileShared>(
  delayProfilesObj: { default?: InputConfigDelayProfile; additional?: InputConfigDelayProfile[] },
  tags: Tag[],
  serverData: T[],
  compareProfileFields: (config: InputConfigDelayProfile, server: T) => FieldChange[],
): Promise<DelayProfilesDiff | null> {
  const { default: configDefault, additional: configAdditional = [] } = delayProfilesObj;

  if (!configDefault && configAdditional.length === 0) {
    logger.debug(`Config 'delay_profiles' not specified. Ignoring.`);
    return null;
  }

  const { default: serverDefault, additional: serverAdditional = [] } = splitServerDelayProfiles(serverData);

  const defaultChanges = configDefault && serverDefault ? compareProfileFields(configDefault, serverDefault) : [];
  const defaultComparison = { equal: defaultChanges.length === 0, changes: defaultChanges };
  const defaultProfileChanged = !defaultComparison.equal;

  let additionalProfilesChanged = configAdditional.length !== serverAdditional.length;

  const additionalComparisons: Array<{ equal: boolean; changes: FieldChange[] }> = configAdditional.map((config, i) => {
    const mappedTags = config.tags?.map((tagName) => tags.find((t) => t.label === tagName)?.id).filter((t) => t !== undefined);
    const serverProfile = serverAdditional[i];

    if (!serverProfile) {
      logger.debug(`Server profile at index ${i} does not exist.`);
      return { equal: false, changes: [] };
    }

    const changes = compareProfileFields(config, serverProfile);

    if (!areTagsEqual(mappedTags || [], getProfileTags(serverProfile))) {
      changes.push({ field: "tags", from: getProfileTags(serverProfile), to: mappedTags || [] });
    }

    return { equal: changes.length === 0, changes };
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
}

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
