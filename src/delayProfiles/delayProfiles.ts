import { asGenerated } from "../arr/cast";
import { Tag } from "../clients/capabilities";
import { getClient } from "../clients/client";
import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import { logger } from "../logger";
import { MediaArrType } from "../types/common.types";
import { InputConfigDelayProfile } from "../types/config.types";
import { DelayProfilePayload, DelayProfileProtocolItem } from "./delayProfile.types";

export const deleteAdditionalDelayProfiles = async (arrType: MediaArrType) => {
  const serverData = await getClient(arrType).getDelayProfiles();
  const { additional: serverAdditional = [] } = splitServerDelayProfiles(serverData);

  for (const p of serverAdditional) {
    await getClient(arrType).deleteDelayProfile(p.id + "");
    logger.info(`Deleted Delay Profile: '${p.id}'`);
  }
};

export const createDelayProfileOnServer = async (arrType: MediaArrType, profile: DelayProfilePayload) => {
  switch (arrType) {
    case "SONARR":
      return getClient("SONARR").createDelayProfile(asGenerated(profile));
    case "RADARR":
      return getClient("RADARR").createDelayProfile(asGenerated(profile));
    case "LIDARR":
      return getClient("LIDARR").createDelayProfile(asGenerated(profile));
    case "READARR":
      return getClient("READARR").createDelayProfile(asGenerated(profile));
    case "WHISPARR":
      return getClient("WHISPARR").createDelayProfile(asGenerated(profile));
  }
};

export const updateDelayProfileOnServer = async (arrType: MediaArrType, id: string, profile: DelayProfilePayload) => {
  switch (arrType) {
    case "SONARR":
      return getClient("SONARR").updateDelayProfile(id, asGenerated(profile));
    case "RADARR":
      return getClient("RADARR").updateDelayProfile(id, asGenerated(profile));
    case "LIDARR":
      return getClient("LIDARR").updateDelayProfile(id, asGenerated(profile));
    case "READARR":
      return getClient("READARR").updateDelayProfile(id, asGenerated(profile));
    case "WHISPARR":
      return getClient("WHISPARR").updateDelayProfile(id, asGenerated(profile));
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
export function splitServerDelayProfiles(serverProfiles: DelayProfilePayload[]): {
  default?: DelayProfilePayload;
  additional?: DelayProfilePayload[];
} {
  let defaultProfile: DelayProfilePayload | undefined = undefined;
  const additional: DelayProfilePayload[] = [];
  for (const p of serverProfiles) {
    if (!Array.isArray(p.tags) || p.tags.length === 0) {
      defaultProfile = p;
    } else {
      additional.push(p);
    }
  }
  return { default: defaultProfile, additional: additional.length > 0 ? additional : undefined };
}

export const mapToServerDelayProfile = (profile: InputConfigDelayProfile, serverTags: Tag[]): DelayProfilePayload => {
  const mappedTags = profile.tags?.map((tagName) => serverTags.find((t) => t.label === tagName)?.id).filter((t) => t !== undefined) || [];
  const shared = {
    bypassIfHighestQuality: profile.bypassIfHighestQuality,
    bypassIfAboveCustomFormatScore: profile.bypassIfAboveCustomFormatScore,
    minimumCustomFormatScore: profile.minimumCustomFormatScore,
    order: profile.order,
    tags: mappedTags,
  };

  // Lidarr nightly: items[] required. Prefer items when configured.
  if (profile.items?.length) {
    return {
      ...shared,
      items: profile.items.map((item) => ({
        name: item.name,
        protocol: item.protocol,
        allowed: item.allowed,
        delay: item.delay,
      })),
    };
  }

  return {
    ...shared,
    enableUsenet: profile.enableUsenet,
    enableTorrent: profile.enableTorrent,
    preferredProtocol: (profile.preferredProtocol ?? "usenet") as any, // Default to usenet if not specified
    usenetDelay: profile.usenetDelay,
    torrentDelay: profile.torrentDelay,
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
  arrType: MediaArrType,
  delayProfilesObj: { default?: InputConfigDelayProfile; additional?: InputConfigDelayProfile[] },
  tags: Tag[],
): Promise<DelayProfilesDiff | null> => {
  const { default: configDefault, additional: configAdditional = [] } = delayProfilesObj;

  if (!configDefault && configAdditional.length === 0) {
    logger.debug(`Config 'delay_profiles' not specified. Ignoring.`);
    return null;
  }

  const serverData = await getClient(arrType).getDelayProfiles();
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

const getProfileTags = (profile: DelayProfilePayload): number[] => {
  return "tags" in profile && Array.isArray(profile.tags) ? profile.tags : [];
};

const normalizeDelayProfileItems = (items: DelayProfileProtocolItem[] | null | undefined) =>
  (items ?? []).map((item) => ({
    name: item.name ?? undefined,
    protocol: item.protocol ?? undefined,
    allowed: item.allowed,
    delay: item.delay,
  }));

const areDelayProfileItemsEqual = (configItems: InputConfigDelayProfile["items"], serverItems: DelayProfilePayload["items"]): boolean => {
  return JSON.stringify(normalizeDelayProfileItems(configItems)) === JSON.stringify(normalizeDelayProfileItems(serverItems));
};

const compareProfileFields = (config: InputConfigDelayProfile, server: DelayProfilePayload): FieldChange[] => {
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

  if (config.items !== undefined && !areDelayProfileItemsEqual(config.items, server.items)) {
    changes.push({ field: "items", from: server.items ?? [], to: config.items });
  }

  return changes;
};

// Default profile: no tag comparison
const compareDefaultProfile = (
  config: InputConfigDelayProfile,
  server: DelayProfilePayload,
): { equal: boolean; changes: FieldChange[] } => {
  const changes = compareProfileFields(config, server);
  return { equal: changes.length === 0, changes };
};

// Additional profiles: includes tag comparison
const compareAdditionalProfile = (
  config: InputConfigDelayProfile,
  server: DelayProfilePayload,
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
