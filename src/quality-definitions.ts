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
    // TODO: validate if title is the correct attribute
    p.set(c.title!, c);
    return p;
  }, new Map<string, MergedQualityDefinitionResource>());

  const changeMap = new Map<string, string[]>();
  const restData: MergedQualityDefinitionResource[] = [];

  const missingServerQualities = new Map(serverMap);

  const mergedQualities = Object.values(
    qualityDefinitions.toReversed().reduce<{ [k: string]: TrashQualityDefintionQuality }>((p, c) => {
      if (p[c.quality] != null) {
        logger.warn(`QualityDefinition: Found duplicate for '${c.quality}'. Using '${JSON.stringify(p[c.quality])}'`);
      } else {
        p[c.quality] = c;
        missingServerQualities.delete(c.quality);
      }

      return p;
    }, {}),
  );

  for (const trashQuality of mergedQualities) {
    const clonedQuality = cloneWithJSON(trashQuality);
    const serverQuality = serverMap.get(trashQuality.quality);

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
      logger.warn(`QualityDefinition: Found definition which is not available in server '${clonedQuality.quality}'. Ignoring.`);
    }
  }

  if (missingServerQualities.size > 0) {
    logger.debug(
      `QualityDefinition: Found missing qualities: '${JSON.stringify(missingServerQualities.values().map((e) => e.quality?.name || e.title))}'`,
    );
    restData.push(...missingServerQualities.values());
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
