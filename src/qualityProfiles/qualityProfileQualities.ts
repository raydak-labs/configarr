import { logger } from "../logger";
import { ConfigQualityProfile, ConfigQualityProfileItem } from "../types/config.types";
import { cloneWithJSON, zip } from "../util";
import { ConfigValidationError } from "../validation";
import { QualityItem } from "./qualityProfile.types";
import type { QualityDefinitionShared } from "../qualityDefinitions/qualityDefinition.types";

const itemName = (item: QualityItem): string | undefined => item.name ?? item.quality?.name ?? undefined;

/** Distinguish same-named groups and qualities by kind. */
const itemKey = (item: QualityItem): string | undefined => {
  const name = itemName(item);

  return name == null ? undefined : `${item.name != null ? "group" : "quality"}:${name}`;
};

/** Keep undeclared qualities near their server positions; sort only new items. */
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

  // Undeclared input uses definition order, not server rank.
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

  // Only new qualities use quality_sort positioning.
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

export const mapQualities = (
  qd_source: QualityDefinitionShared[],
  value_source: ConfigQualityProfile,
  existingItems?: QualityItem[] | null,
) => {
  const qd = cloneWithJSON(qd_source);
  const value = cloneWithJSON(value_source);

  const qdMap = new Map(qd.map((obj) => [obj.quality?.name, obj]));
  const qdLookupWithTitle = new Map(qdMap);

  qdLookupWithTitle.forEach((element) => {
    if (element.title) {
      qdLookupWithTitle.set(element.title, element);
    }
  });

  // Prefer explicit ids, then server ids; allocate fresh ids last.
  const existingGroupIdByName = new Map<string, number>();

  for (const item of existingItems ?? []) {
    if (item.name != null && item.id != null) {
      existingGroupIdByName.set(item.name, item.id);
    }
  }

  // Track claimed ids to prevent collisions.
  const claimedIdToGroupName = new Map<number, string>();
  const groupIdByName = new Map<string, number>();
  const groupNames = new Set<string>();

  // Reserve explicit ids before reusing server ids.
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

    // Lenient input needs a runtime range check; low ids can collide with cutoffs.
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

  // Reuse unclaimed server group ids.
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
      quality: {
        id: value.quality?.id,
        name: key,
        resolution: value.quality?.resolution,
      },
    });
  }

  // API arrays use reverse display order.

  const orderedQualities = allowedQualities.reverse();

  // Preserve server positions for undeclared qualities.
  if (existingItems?.length && missingQualities.length > 0) {
    return mergeUndeclaredQualities(orderedQualities, missingQualities, existingItems, value.quality_sort === "bottom");
  }

  if (value.quality_sort === "bottom") {
    return [...orderedQualities, ...missingQualities];
  } else {
    // quality_sort defaults to top.
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

    // Ids distinguish otherwise identical groups.
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

/** @deprecated Compares top-level config quality names only. */
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

/** Resolve disabled-upgrade cutoff from untilQuality or the highest allowed quality. */
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

  // API order is reversed; the last allowed item has highest priority.
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

/** Remap cutoff by item identity; invalid targets return undefined. */
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

  // Match kind so same-named groups and qualities stay distinct.
  const next = nextItems.find((item) => itemKey(item) === previousKey);

  if (next == null || next.allowed === false) {
    return undefined;
  }

  return next.id ?? next.quality?.id;
};
