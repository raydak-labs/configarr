import path from "path";
import { compareObjectsCarr } from "..";
import { CustomFormatResource } from "./__generated__/MySuperbApi";
import { getSonarrApi } from "./api";
import { CFProcessing } from "./types";
import { IS_DRY_RUN, IS_LOCAL_SAMPLE_MODE } from "./util";

export const deleteAllCustomFormats = async () => {
  const api = getSonarrApi();
  const cfOnServer = await api.v3CustomformatList();

  for (const cf of cfOnServer.data) {
    await api.v3CustomfilterDelete(cf.id!);
    console.log(`Deleted CF: '${cf.name}'`);
  }
};

export const loadServerCustomFormats = async (): Promise<CustomFormatResource[]> => {
  if (IS_LOCAL_SAMPLE_MODE) {
    return (await import(path.resolve("./tests/samples/cfs.json"))).default as unknown as Promise<CustomFormatResource[]>;
  }
  const api = getSonarrApi();
  const cfOnServer = await api.v3CustomformatList();
  return cfOnServer.data;
};

export const manageCf = async (cfProcessing: CFProcessing, serverCfs: Map<string, CustomFormatResource>, cfsToManage: Set<string>) => {
  const { carrIdMapping: trashIdToObject, cfNameToCarrConfig: existingCfToObject } = cfProcessing;

  const api = getSonarrApi();

  const manageSingle = async (carrId: string) => {
    const tr = trashIdToObject.get(carrId);

    if (!tr) {
      console.log(`TrashID to manage ${carrId} does not exists`);
      return;
    }

    const existingCf = serverCfs.get(tr.carrConfig.name!);

    if (existingCf) {
      // Update if necessary
      const comparison = compareObjectsCarr(existingCf, tr.requestConfig);

      if (!comparison.equal) {
        console.log(`Found mismatch for ${tr.requestConfig.name}.`, comparison.changes);

        try {
          if (IS_DRY_RUN) {
            console.log(`DryRun: Would update CF: ${existingCf.id} - ${existingCf.name}`);
          } else {
            const updateResult = await api.v3CustomformatUpdate(existingCf.id + "", {
              id: existingCf.id,
              ...tr.requestConfig,
            });
            console.log(`Updated CF ${tr.requestConfig.name}`);
          }
        } catch (err) {
          console.log(`Failed updating CF ${tr.requestConfig.name}`, err.response.data);
        }
      } else {
        console.log(`CF ${tr.requestConfig.name} does not need update.`);
      }
    } else {
      // Create
      try {
        if (IS_DRY_RUN) {
          console.log(`Would create CF: ${tr.requestConfig.name}`);
        } else {
          const createResult = await api.v3CustomformatCreate(tr.requestConfig);
          console.log(`Created CF ${tr.requestConfig.name}`);
        }
      } catch (err) {
        throw new Error(`Failed creating CF '${tr.requestConfig.name}'. Message: ${err.response.data?.message}`);
      }
    }
  };
  cfsToManage.forEach((cf) => manageSingle(cf));
};
