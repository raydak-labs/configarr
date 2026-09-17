import path from "node:path";
import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import { getEnvs } from "../env";
import { logger } from "../logger";
import type { QualityDefinitionsClient } from "../clients/capabilities";
import { MediaArrType } from "../types/common.types";
import { TrashQualityDefinitionQuality } from "../types/trashguide.types";
import { cloneWithJSON, loadJsonFile, roundToDecimal } from "../util";
import { ConfigValidationError, warnOrThrowConfig } from "../validation";
import { QualityDefinitionShared } from "./qualityDefinition.types";

export function applyPreferredSizeDiff(
  clonedQuality: TrashQualityDefinitionQuality,
  serverQuality: QualityDefinitionShared,
  newData: QualityDefinitionShared,
  changes: FieldChange[],
) {
  if (clonedQuality.preferred && serverQuality.preferredSize !== clonedQuality.preferred) {
    changes.push({ field: "preferredSize", from: serverQuality.preferredSize, to: clonedQuality.preferred });
    newData.preferredSize = clonedQuality.preferred;
  }
}

export class QualityDefinitionSync<T extends QualityDefinitionShared> {
  constructor(protected readonly api: QualityDefinitionsClient<T>) {}

  protected getApi() {
    return this.api;
  }

  loadFromServer() {
    if (getEnvs().LOAD_LOCAL_SAMPLES) {
      return loadJsonFile<QualityDefinitionShared[]>(path.resolve(__dirname, "../../tests/samples/qualityDefinition.json"));
    }
    return this.getApi().getQualityDefinitions();
  }

  updateOnServer(restData: T[]) {
    return this.getApi().updateQualityDefinitions(restData);
  }

  protected diffPreferredSize(
    _clonedQuality: TrashQualityDefinitionQuality,
    _serverQuality: T,
    _newData: T,
    _changes: FieldChange[],
  ): void {}

  calculateDiff(serverQDs: T[], qualityDefinitions: TrashQualityDefinitionQuality[]) {
    return calculateQualityDefinitionDiffCore(serverQDs, qualityDefinitions, (cloned, server, next, changes) =>
      this.diffPreferredSize(cloned, server, next, changes),
    );
  }

  async persist(serverQDs: T[], qualityDefinitions: TrashQualityDefinitionQuality[], write: boolean) {
    const { changeMap, restData } = this.calculateDiff(serverQDs, qualityDefinitions);
    if (changeMap.size > 0 && write) {
      const updated = await this.updateOnServer(restData);
      return { changeMap, restData: updated };
    }
    return { changeMap, restData };
  }
}

export class QualityDefinitionPreferredSync<T extends QualityDefinitionShared> extends QualityDefinitionSync<T> {
  protected diffPreferredSize(clonedQuality: TrashQualityDefinitionQuality, serverQuality: T, newData: T, changes: FieldChange[]): void {
    applyPreferredSizeDiff(clonedQuality, serverQuality, newData, changes);
  }
}

export function interpolateSize(min: number, max: number, pref: number, ratio: number): number {
  if (ratio < 0 || ratio > 1) {
    throw new Error(`Unexpected ratio range. Should be between 0 <= ratio <= 1`);
  }
  if (ratio <= 0.5) {
    return roundToDecimal(min + (pref - min) * (ratio / 0.5), 1);
  } else {
    return roundToDecimal(pref + (max - pref) * ((ratio - 0.5) / 0.5), 1);
  }
}

export function calculateQualityDefinitionDiffCore<T extends QualityDefinitionShared>(
  serverQDs: T[],
  qualityDefinitions: TrashQualityDefinitionQuality[],
  diffPreferredSize: (clonedQuality: TrashQualityDefinitionQuality, serverQuality: T, newData: T, changes: FieldChange[]) => void,
): { changeMap: Map<string, FieldChange[]>; restData: T[] } {
  const serverMap = serverQDs.reduce((p, c) => {
    p.set(c.quality!.name!, c);
    return p;
  }, new Map<string, T>());

  const changeMap = new Map<string, FieldChange[]>();
  const restData: T[] = [];

  const missingServerQualities = new Map(serverMap);

  const mergedQualities = Object.values(
    qualityDefinitions.toReversed().reduce<{ [k: string]: TrashQualityDefinitionQuality }>((p, c) => {
      if (p[c.quality] != null) {
        logger.debug(`QualityDefinition: Found duplicate for '${c.quality}'.`);
      } else {
        p[c.quality] = c;
        missingServerQualities.delete(c.quality);
      }

      return p;
    }, {}),
  );

  for (const quality of mergedQualities) {
    const clonedQuality = cloneWithJSON(quality);
    const serverQuality = serverMap.get(clonedQuality.quality);

    if (serverQuality) {
      const newData = cloneWithJSON(serverQuality);

      const changes: FieldChange[] = [];

      if (clonedQuality.min != null && serverQuality.minSize !== clonedQuality.min) {
        changes.push({ field: "minSize", from: serverQuality.minSize, to: clonedQuality.min });
        newData.minSize = clonedQuality.min;
      }
      if (clonedQuality.max != null && serverQuality.maxSize !== clonedQuality.max) {
        changes.push({ field: "maxSize", from: serverQuality.maxSize, to: clonedQuality.max });
        newData.maxSize = clonedQuality.max;
      }

      diffPreferredSize(clonedQuality, serverQuality, newData, changes);

      if (clonedQuality.title && serverQuality.title !== clonedQuality.title) {
        changes.push({ field: "title", from: serverQuality.title, to: clonedQuality.title });
        newData.title = clonedQuality.title;
      }

      if (changes.length > 0) {
        changeMap.set(serverQuality.quality!.name!, changes);
        restData.push(newData);
      } else {
        restData.push(serverQuality);
      }
    } else {
      warnOrThrowConfig(`QualityDefinition: Found definition which is not available in server '${clonedQuality.quality}'. Ignoring.`);
    }
  }

  if (missingServerQualities.size > 0) {
    logger.debug(
      `QualityDefinition: Found missing qualities will reuse server data: '${Array.from(missingServerQualities.values().map((e) => e.quality?.name || e.title))}'`,
    );
    restData.push(...missingServerQualities.values());
  }

  if (changeMap.size > 0) {
    logger.debug(Object.fromEntries(changeMap.entries()), `QualityDefinition diffs:`);
  }

  return { changeMap, restData };
}

export function qualityDefinitionsToDiffEntries(changeMap: Map<string, FieldChange[]>): DiffEntry[] {
  return Array.from(changeMap.entries()).map(([name, fieldChanges]) => ({
    resourceType: "QualityDefinition",
    name,
    action: "update" as const,
    fieldChanges,
  }));
}

export const calculateQualityDefinitionDiff = (
  arrType: MediaArrType,
  serverQDs: QualityDefinitionShared[],
  qualityDefinitions: TrashQualityDefinitionQuality[],
) => {
  return calculateQualityDefinitionDiffCore(serverQDs, qualityDefinitions, arrType === "READARR" ? () => {} : applyPreferredSizeDiff);
};
