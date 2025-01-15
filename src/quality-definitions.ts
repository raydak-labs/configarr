import path from "node:path";
import { MergedQualityDefinitionResource } from "./__generated__/mergedTypes";
import { getUnifiedClient } from "./clients/unified-client";
import { getEnvs } from "./env";
import { logger } from "./logger";
import { TrashQualityDefintionQuality } from "./types/trashguide.types";
import { cloneWithJSON, loadJsonFile, roundToDecimal } from "./util";

export const loadQualityDefinitionFromServer = async (): Promise<MergedQualityDefinitionResource[]> => {
  if (getEnvs().LOAD_LOCAL_SAMPLES) {
    return loadJsonFile(path.resolve(__dirname, "../tests/samples/qualityDefinition.json"));
  }
  return await getUnifiedClient().getQualityDefinitions();
};

export const calculateQualityDefinitionDiff = (
  serverQDs: MergedQualityDefinitionResource[],
  // TODO: this does not has to include all QDs right?
  qualityDefinitions: TrashQualityDefintionQuality[],
  // TODO add config defined qualities
) => {
  const serverMap = serverQDs.reduce((p, c) => {
    p.set(c.quality!.name!, c);
    return p;
  }, new Map<string, MergedQualityDefinitionResource>());

  const changeMap = new Map<string, string[]>();
  const restData: MergedQualityDefinitionResource[] = [];

  const missingServerQualities = new Map(serverMap);

  const mergedQualities = Object.values(
    qualityDefinitions.toReversed().reduce<{ [k: string]: TrashQualityDefintionQuality }>((p, c) => {
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

      const changes: string[] = [];

      if (clonedQuality.min != null && serverQuality.minSize !== clonedQuality.min) {
        changes.push(`MinSize diff: Server ${serverQuality.minSize} - Config ${clonedQuality.min}`);
        newData.minSize = clonedQuality.min;
      }
      if (clonedQuality.max != null && serverQuality.maxSize !== clonedQuality.max) {
        changes.push(`MaxSize diff: Server ${serverQuality.maxSize} - Config ${clonedQuality.max}`);
        newData.maxSize = clonedQuality.max;
      }

      if (clonedQuality.preferred && serverQuality.preferredSize !== clonedQuality.preferred) {
        changes.push(`PreferredSize diff: Server ${serverQuality.preferredSize} - Config ${clonedQuality.preferred}`);
        newData.preferredSize = clonedQuality.preferred;
      }

      if (clonedQuality.title && serverQuality.title !== clonedQuality.title) {
        changes.push(`Title diff: Server '${serverQuality.title}' - Config '${clonedQuality.title}'`);
        newData.title = clonedQuality.title;
      }

      if (changes.length > 0) {
        changeMap.set(serverQuality.quality!.name!, changes);
        restData.push(newData);
      } else {
        restData.push(serverQuality);
      }
    } else {
      logger.warn(`QualityDefinition: Found definition which is not available in server '${clonedQuality.quality}'. Ignoring.`);
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
};

export function interpolateSize(min: number, max: number, pref: number, ratio: number): number {
  if (ratio < 0 || ratio > 1) {
    throw new Error(`Unexpected ratio range. Should be between 0 <= ratio <= 1`);
  }
  if (ratio <= 0.5) {
    // Interpolate between min and pref
    return roundToDecimal(min + (pref - min) * (ratio / 0.5), 1);
  } else {
    // Interpolate between pref and max
    return roundToDecimal(pref + (max - pref) * ((ratio - 0.5) / 0.5), 1);
  }
}
