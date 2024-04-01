import path from "path";
import { QualityDefinitionResource } from "./__generated__/generated-sonarr-api";
import { getArrApi } from "./api";
import { TrashQualityDefintion, TrashQualityDefintionQuality } from "./types";
import { IS_LOCAL_SAMPLE_MODE } from "./util";

export const loadQualityDefinitionFromServer = async (): Promise<QualityDefinitionResource[]> => {
  if (IS_LOCAL_SAMPLE_MODE) {
    return (await import(path.resolve("./tests/samples/qualityDefinition.json"))).default;
  }
  return (await getArrApi().v3QualitydefinitionList()).data as QualityDefinitionResource[];
};

export const calculateQualityDefinitionDiff = (serverQDs: QualityDefinitionResource[], trashQD: TrashQualityDefintion) => {
  const serverMap = serverQDs.reduce((p, c) => {
    p.set(c.title!, c);
    return p;
  }, new Map<string, QualityDefinitionResource>());

  const changeMap = new Map<string, string[]>();
  const create: TrashQualityDefintionQuality[] = [];

  const restData: QualityDefinitionResource[] = [];

  for (const tq of trashQD.qualities) {
    const element = serverMap.get(tq.quality);

    if (element) {
      const changes: string[] = [];

      if (!element.maxSize) {
        console.log(`No maxSize defined: ${element.title}`);
      }

      if (element.minSize !== tq.min) {
        changes.push(`MinSize diff: ${element.minSize} - ${tq.min}`);
      }
      if (element.maxSize !== tq.max) {
        changes.push(`MaxSize diff: ${element.maxSize} - ${tq.max}`);
      }
      if (element.preferredSize !== tq.preferred) {
        changes.push(`PreferredSize diff: ${element.preferredSize} - ${tq.preferred}`);
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
