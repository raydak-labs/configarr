import path from "node:path";
import { MergedQualityDefinitionResource } from "./__generated__/mergedTypes";
import { getUnifiedClient } from "./clients/unified-client";
import { getEnvs } from "./env";
import { logger } from "./logger";
import { TrashQualityDefintion, TrashQualityDefintionQuality } from "./types/trashguide.types";
import { cloneWithJSON, loadJsonFile, roundToDecimal } from "./util";

export const loadQualityDefinitionFromServer = async (): Promise<MergedQualityDefinitionResource[]> => {
  if (getEnvs().LOAD_LOCAL_SAMPLES) {
    return loadJsonFile(path.resolve(__dirname, "../tests/samples/qualityDefinition.json"));
  }
  return await getUnifiedClient().getQualityDefinitions();
};

export const calculateQualityDefinitionDiff = (
  serverQDs: MergedQualityDefinitionResource[],
  trashQD: TrashQualityDefintion,
  preferedRatio?: number,
) => {
  const serverMap = serverQDs.reduce((p, c) => {
    p.set(c.title!, c);
    return p;
  }, new Map<string, MergedQualityDefinitionResource>());

  const changeMap = new Map<string, string[]>();
  const create: TrashQualityDefintionQuality[] = [];

  const restData: MergedQualityDefinitionResource[] = [];

  for (const trashQuality of trashQD.qualities) {
    const clonedQuality = cloneWithJSON(trashQuality);
    const serverQuality = serverMap.get(trashQuality.quality);

    // Adjust preffered size if preferedRatio is set
    if (preferedRatio != null) {
      if (preferedRatio < 0 || preferedRatio > 1) {
        logger.warn(`QualityDefinition: PreferredRatio must be between 0 and 1. Ignoring`);
      } else {
        const adjustedPreferred = interpolateSize(trashQuality.min, trashQuality.max, trashQuality.preferred, preferedRatio);
        clonedQuality.preferred = adjustedPreferred;
        logger.debug(
          `QualityDefinition "${trashQuality.quality} adjusting preferred by ratio ${preferedRatio} to value "${adjustedPreferred}"`,
        );
      }
    }

    if (serverQuality) {
      const changes: string[] = [];

      if (serverQuality.minSize !== trashQuality.min) {
        changes.push(`MinSize diff: Server ${serverQuality.minSize} - Config ${trashQuality.min}`);
      }
      if (serverQuality.maxSize !== trashQuality.max) {
        changes.push(`MaxSize diff: Server ${serverQuality.maxSize} - Config ${trashQuality.max}`);
      }

      if (serverQuality.preferredSize !== clonedQuality.preferred) {
        changes.push(`PreferredSize diff: Server ${serverQuality.preferredSize} - Config ${clonedQuality.preferred}`);
      }

      if (changes.length > 0) {
        changeMap.set(serverQuality.title!, changes);
        restData.push({
          ...serverQuality,
          maxSize: clonedQuality.max,
          minSize: clonedQuality.min,
          preferredSize: clonedQuality.preferred,
        });
      } else {
        restData.push(serverQuality);
      }
    } else {
      // TODO create probably never happens?
      create.push(clonedQuality);
    }
  }

  return { changeMap, restData, create };
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
