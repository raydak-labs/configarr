import { logger } from "../logger";
import { ConfigQualityProfile, ConfigQualityProfileItem } from "../types/config.types";
import { cloneWithJSON, zip } from "../util";
import { ConfigValidationError } from "../validation";
import { QualityItem } from "./qualityProfile.types";
import type { QualityDefinitionShared } from "../qualityDefinitions/qualityDefinition.types";

const itemName = (item: QualityItem): string | undefined => item.name ?? item.quality?.name ?? undefined;

/**
 * Identity of an item inside a profile. Groups carry a top-level `name`, plain qualities only
 * `quality.name`, and both may share the same user-facing name, so the kind is part of the key.
 */
const itemKey = (item: QualityItem): string | undefined => {
  const name = itemName(item);

  return name == null ? undefined : `${item.name != null ? "group" : "quality"}:${name}`;
};

/**
 * Places qualities that the config does not declare back where the server has them, instead of
 * moving all of them to the top or bottom of the list. Each undeclared item is inserted after the
 * closest declared item that precedes it on the server, so declaring a subset no longer reorders
 * the rest of the profile. Items the server does not have yet still go to the top or bottom,
 * according to `quality_sort`.
 */
const mergeUndeclaredQualities = (
  declared: QualityItem[],
  undeclared: QualityItem[],
  serverItems: QualityItem[],
  atBottom: boolean,
): QualityItem[] => {
  const serverIndex = new Map<string, number>();

  serverItems.forEach((item, index) => {
    const key = itemKey(item);

    if (key != null) {
      serverIndex.set(key, index);
    }
  });

  const declaredKeys = new Set(declared.map(itemKey).filter((key): key is string => key != null));
  const leading: QualityItem[] = [];
  const trailing: QualityItem[] = [];
  const after = new Map<string, QualityItem[]>();

  // Place server items in their own order first; `undeclared` arrives in quality-definition order,
  // which differs from the ranking the server stores.
  const onServer: Array<{ item: QualityItem; index: number }> = [];
  const missingFromServer: QualityItem[] = [];

  for (const item of undeclared) {
    const index = serverIndex.get(itemKey(item) ?? "");

    if (index == null) {
      missingFromServer.push(item);
    } else {
      onServer.push({ item, index });
    }
  }

  onServer.sort((a, b) => a.index - b.index);

  for (const { item, index } of onServer) {
    let anchor: string | undefined;

    for (let i = index - 1; i >= 0; i--) {
      const previousKey = itemKey(serverItems[i]!);

      if (previousKey != null && declaredKeys.has(previousKey)) {
        anchor = previousKey;
        break;
      }
    }

    if (anchor == null) {
      leading.push(item);
    } else {
      after.set(anchor, [...(after.get(anchor) ?? []), item]);
    }
  }

  // Qualities the server does not have yet are the only ones quality_sort still positions.
  for (const item of missingFromServer) {
    (atBottom ? trailing : leading).push(item);
  }

  const merged: QualityItem[] = [...leading];

  for (const item of declared) {
    merged.push(item);
    const key = itemKey(item);

    if (key != null) {
      merged.push(...(after.get(key) ?? []));
    }
  }

  merged.push(...trailing);

  return merged;
};

// TODO should we use clones or not?
export const mapQualities = (
  qd_source: QualityDefinitionShared[],
  value_source: ConfigQualityProfile,
  existingItems?: QualityItem[] | null,
) => {
  const qd = cloneWithJSON(qd_source);
  const value = cloneWithJSON(value_source);

  const qdMap = new Map(qd.map((obj) => [obj.quality?.name, obj]));
  const qdLookupWithTitle = new Map(qdMap);

  // Add title names to map and overwrite existing ones if they exist. This acts as fallback if someone used the title we do not want to keep it user friendly.
  qdLookupWithTitle.forEach((element) => {
    if (element.title) {
      qdLookupWithTitle.set(element.title, element);
    }
  });

  // Group identity. Prefer an explicit config `id`, then the id the server already uses for a group with the
  // same name, and only then a fresh id. Deriving group ids from the config array index (1000 + i) meant that
  // inserting or reordering a group renumbered every group that followed it and silently moved any cutoff
  // pointing at one of them. Server items with a `name` are groups; plain qualities only have `quality.name`.
  const existingGroupIdByName = new Map<string, number>();

  for (const item of existingItems ?? []) {
    if (item.name != null && item.id != null) {
      existingGroupIdByName.set(item.name, item.id);
    }
  }

  // ids claimed by explicit config `id`s or reused from the server, so freshly allocated ids never collide
  const claimedIdToGroupName = new Map<number, string>();
  const groupIdByName = new Map<string, number>();
  const groupNames = new Set<string>();

  // First pass: explicit ids are reserved before any server id is reused by name, so an explicit id
  // wins over name matching even when the group it collides with is declared earlier in the config.
  for (const obj of value.qualities) {
    const isGroup = (obj.qualities?.length ?? 0) > 0;

    if (obj.id != null && !isGroup) {
      throw new ConfigValidationError(
        `QualityProfile '${value.name}': item '${obj.name}' sets 'id', which is only supported for quality groups (items with a 'qualities' list)`,
      );
    }

    if (!isGroup) {
      continue;
    }

    if (groupNames.has(obj.name)) {
      throw new ConfigValidationError(`QualityProfile '${value.name}': quality group '${obj.name}' is defined more than once`);
    }

    groupNames.add(obj.name);

    if (obj.id == null) {
      continue;
    }

    // Lenient config validation keeps the raw value, so this range check has to exist at runtime too.
    // The id shares its number space with the plain quality ids used by `cutoff`, which are small
    // (1..N); a group id below 1000 could match a quality and make `cutoff` ambiguous on the server.
    if (typeof obj.id !== "number" || !Number.isInteger(obj.id) || obj.id < 1000) {
      throw new ConfigValidationError(`QualityProfile '${value.name}': quality group '${obj.name}' id must be an integer >= 1000`);
    }

    const owner = claimedIdToGroupName.get(obj.id);

    if (owner != null && owner !== obj.name) {
      throw new ConfigValidationError(
        `QualityProfile '${value.name}': quality group id ${obj.id} is used by both '${owner}' and '${obj.name}'`,
      );
    }

    claimedIdToGroupName.set(obj.id, obj.name);
    groupIdByName.set(obj.name, obj.id);
  }

  // Second pass: reuse the id the server already uses for a group with the same name, unless an
  // explicit id claimed it already.
  for (const obj of value.qualities) {
    if ((obj.qualities?.length ?? 0) === 0 || obj.id != null) {
      continue;
    }

    const id = existingGroupIdByName.get(obj.name);

    if (id == null || claimedIdToGroupName.has(id)) {
      continue;
    }

    claimedIdToGroupName.set(id, obj.name);
    groupIdByName.set(obj.name, id);
  }

  const allocateGroupId = (index: number): number => {
    let id = 1000 + index;

    while (claimedIdToGroupName.has(id)) {
      id++;
    }

    claimedIdToGroupName.set(id, "");

    return id;
  };

  const allowedQualities = value.qualities.map<QualityItem>((obj, i) => {
    if (obj.qualities?.length && obj.qualities.length > 0) {
      return {
        allowed: obj.enabled ?? true,
        id: groupIdByName.get(obj.name) ?? allocateGroupId(i),
        name: obj.name,
        items:
          obj.qualities
            ?.map<QualityItem>((obj2) => {
              const qd = qdLookupWithTitle.get(obj2);

              if (qd == null) {
                logger.warn(`Unknown requested quality "${obj2}" for quality profile ${value.name}`);
                throw new ConfigValidationError(`QualityProfile '${value.name}': unknown requested quality '${obj2}'`);
              }

              const returnObject: QualityItem = {
                quality: {
                  id: qd.quality?.id,
                  name: obj2,
                  resolution: qd.quality?.resolution,
                },
                allowed: obj.enabled ?? true,
                items: [],
              };

              qdMap.delete(qd.quality?.name);

              return returnObject;
            })
            .reverse() || [],
      };
    } else {
      const serverQD = qdLookupWithTitle.get(obj.name);

      if (serverQD == null) {
        logger.warn(`Unknown requested quality "${obj.name}" for quality profile ${value.name}`);
        throw new ConfigValidationError(`QualityProfile '${value.name}': unknown requested quality '${obj.name}'`);
      }

      qdMap.delete(serverQD.quality?.name);

      const item: QualityItem = {
        allowed: obj.enabled ?? true,
        items: [],
        quality: {
          id: serverQD?.quality?.id,
          name: serverQD?.quality?.name,
          resolution: serverQD?.quality?.resolution,
        },
      };
      return item;
    }
  });

  const missingQualities: QualityItem[] = [];

  for (const [key, value] of qdMap.entries()) {
    missingQualities.push({
      allowed: false,
      items: [],
      //id: qualIndex++, // ID not allowed if not enabled
      quality: {
        id: value.quality?.id,
        name: key,
        resolution: value.quality?.resolution,
      },
    });
  }

  // Ordering of items in the array matters of how they will be displayed. First is last.
  // Need to double check if always works as expected also regarding of templates etc.

  const orderedQualities = allowedQualities.reverse();

  // With an existing profile, keep undeclared qualities where the server has them. Moving them all
  // to the top or bottom reordered the preference ranking even when the config only changed a
  // single group.
  if (existingItems?.length && missingQualities.length > 0) {
    return mergeUndeclaredQualities(orderedQualities, missingQualities, existingItems, value.quality_sort === "bottom");
  }

  // TODO no sure if a useful feature
  if (value.quality_sort === "bottom") {
    return [...orderedQualities, ...missingQualities];
  } else {
    // default = top
    return [...missingQualities, ...orderedQualities];
  }
};

export const isOrderOfQualitiesEqual = (arr1: QualityItem[], arr2: QualityItem[]) => {
  if (arr1.length !== arr2.length) {
    return false;
  }

  for (const [element1, element2] of zip(arr1, arr2)) {
    if (element1.name !== element2.name) {
      return false;
    }

    if (element1.quality?.name !== element2.quality?.name) {
      return false;
    }

    // Group ids are stable now (see mapQualities), so a differing id means the config asks for another id.
    if (element1.id !== element2.id) {
      return false;
    }

    const items1 = element1.items ?? [];
    const items2 = element2.items ?? [];

    if (items1.length !== items2.length) {
      return false;
    }

    if (items1.length > 0 && !isOrderOfQualitiesEqual(items1, items2)) {
      return false;
    }
  }

  return true;
};

/**
 * Method to check if the order of qualities in the configuration syntax is equals.
 * Does not check nested qualities!
 * @deprecated
 * @param obj1
 * @param obj2
 * @returns
 */
export const isOrderOfConfigQualitiesEqual = (obj1: ConfigQualityProfileItem[], obj2: ConfigQualityProfileItem[]) => {
  if (obj1.length !== obj2.length) {
    return false;
  }

  for (const [element1, element2] of zip(obj1, obj2)) {
    if (element1.name !== element2.name) {
      return false;
    }
  }

  return true;
};

/**
 * Resolves the cutoff ID to use when upgrades are disabled.
 * Prefers `untilQuality` when provided; falls back to the highest-priority
 * allowed quality in the mapped list. Throws when no allowed quality exists.
 */
export const getDisabledUpgradeCutoff = (
  mappedQualities: QualityItem[],
  qualityToId: Map<string, number>,
  untilQuality: string | undefined,
  profileName: string,
): number => {
  if (untilQuality != null) {
    const id = qualityToId.get(untilQuality);
    if (id != null) return id;
  }

  // mappedQualities is in API order (reversed from config), so the last item is
  // the highest-priority quality in user config.
  const fallback = mappedQualities
    .slice()
    .reverse()
    .find((e) => e.allowed);
  const fallbackId = fallback?.id ?? fallback?.quality?.id;

  if (fallbackId == null) {
    throw new ConfigValidationError(`QualityProfile '${profileName}': no allowed quality found to use as cutoff when upgrade is disabled`);
  }

  if (untilQuality == null) {
    logger.debug(
      `QualityProfile '${profileName}': upgrade.until_quality not specified; using highest-priority allowed quality as cutoff (id=${fallbackId})`,
    );
  }

  return fallbackId;
};

/**
 * Moves a cutoff the server already stores onto the id namespace of the profile about to be written.
 *
 * Group ids are profile-local tags: when an explicit id forces a group onto a new number, the cutoff
 * has to follow the item's name rather than its old number, or it would point at another group. The
 * server also requires the cutoff item to be allowed, so return undefined when it is not, letting the
 * caller fall back to a deterministic choice.
 */
export const translateServerCutoff = (
  serverCutoff: number | undefined,
  serverItems: QualityItem[] | null | undefined,
  nextItems: QualityItem[],
): number | undefined => {
  if (serverCutoff == null) {
    return undefined;
  }

  const previous = (serverItems ?? []).find((item) => item.id === serverCutoff || item.quality?.id === serverCutoff);
  const previousKey = previous == null ? undefined : itemKey(previous);

  if (previousKey == null) {
    return undefined;
  }

  // Match the kind as well: a plain quality may share its name with a group, and only the same
  // item should keep the cutoff.
  const next = nextItems.find((item) => itemKey(item) === previousKey);

  if (next == null || next.allowed === false) {
    return undefined;
  }

  return next.id ?? next.quality?.id;
};
