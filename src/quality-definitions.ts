import path from "node:path";
import { MergedQualityDefinitionResource } from "./__generated__/mergedTypes";
import { getArrApi } from "./api";
import { TrashQualityDefintion, TrashQualityDefintionQuality } from "./types/trashguide.types";
import { IS_LOCAL_SAMPLE_MODE, loadJsonFile } from "./util";

export const loadQualityDefinitionFromServer = async (): Promise<MergedQualityDefinitionResource[]> => {
  if (IS_LOCAL_SAMPLE_MODE) {
    return loadJsonFile(path.resolve(__dirname, "../tests/samples/qualityDefinition.json"));
  }
  return await getArrApi().v3QualitydefinitionList();
};

export const calculateQualityDefinitionDiff = (serverQDs: MergedQualityDefinitionResource[], trashQD: TrashQualityDefintion) => {
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
      if (element.preferredSize !== tq.preferred) {
        changes.push(`PreferredSize diff: Server ${element.preferredSize} - Config ${tq.preferred}`);
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
