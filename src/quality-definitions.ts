import path from "node:path";
import { MergedQualityDefinitionResource } from "./__generated__/mergedTypes";
import { getUnifiedClient } from "./clients/unified-client";
import { logger } from "./logger";
import { TrashQualityDefintion, TrashQualityDefintionQuality } from "./types/trashguide.types";
import { IS_LOCAL_SAMPLE_MODE, loadJsonFile } from "./util";

export const loadQualityDefinitionFromServer = async (): Promise<MergedQualityDefinitionResource[]> => {
  if (IS_LOCAL_SAMPLE_MODE) {
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

  for (const tq of trashQD.qualities) {
    const element = serverMap.get(tq.quality);

    if (element) {
      const changes: string[] = [];

      if (element.minSize !== tq.min) {
        changes.push(`MinSize diff: Server ${element.minSize} - Config ${tq.min}`);
      }
      if (element.maxSize !== tq.max) {
        changes.push(`MaxSize diff: Server ${element.maxSize} - Config ${tq.max}`);
      }

      let preferred = tq.preferred;

      if (preferedRatio != null) {
        if (preferedRatio < 0 || preferedRatio > 1) {
          logger.warn(`QualityDefinition: PreferredRatio must be between 0 and 1. Ignoring`);
        } else {
          preferred = interpolateSize(tq.min, tq.max, tq.preferred, preferedRatio);
          console.log(tq, preferred, preferedRatio);
          logger.debug(`QualityDefinition adjusting preferred by ratio ${preferedRatio}`);
        }
      }

      if (element.preferredSize !== preferred) {
        changes.push(`PreferredSize diff: Server ${element.preferredSize} - Config ${preferred}`);
      }

      if (changes.length > 0) {
        changeMap.set(element.title!, changes);
        restData.push({
          ...element,
          maxSize: tq.max,
          minSize: tq.min,
          preferredSize: tq.preferred,
        });
      } else {
        restData.push(element);
      }
    } else {
      // TODO create probably never happens?
      create.push(tq);
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
    return min + (pref - min) * (ratio / 0.5);
  } else {
    // Interpolate between pref and max
    return pref + (max - pref) * ((ratio - 0.5) / 0.5);
  }
}
