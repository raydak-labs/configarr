import path from "path";
import { QualityDefinitionResource } from "./__generated__/MySuperbApi";
import { getSonarrApi } from "./api";
import { TrashQualityDefintion, TrashQualityDefintionQuality } from "./types";
import { trashRepoPaths } from "./util";

// anime and series exists in trash guide
export type QualityDefintionsSonarr = "anime" | "series" | "custom";

export const loadQualityDefinitionSonarrFromTrash = async (qdType: QualityDefintionsSonarr): Promise<TrashQualityDefintion> => {
  switch (qdType) {
    case "anime":
      return (await import(path.resolve(`${trashRepoPaths.sonarrQuality}/anime.json`))).default;
    case "series":
      return (await import(path.resolve(`${trashRepoPaths.sonarrQuality}/series.json`))).default;
    case "custom":
      throw new Error("Not implemented yet");
    default:
      throw new Error(`Unknown QualityDefintion type: ${qdType}`);
  }
};

export const loadQualityDefinitionFromSonarr = async (): Promise<QualityDefinitionResource[]> => {
  // TODO mock
  return (await import(path.resolve("./tests/samples/qualityDefinition.json"))).default;
  return (await getSonarrApi().v3QualitydefinitionList()).data;
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
