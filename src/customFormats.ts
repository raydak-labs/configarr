import { readdirSync } from "fs";
import path from "path";
import { CustomFormatResource } from "./__generated__/GeneratedSonarrApi";
import { getArrApi } from "./api";
import { CFProcessing, ConfigarrCF, DynamicImportType, TrashCF, YamlInput } from "./types";
import { IS_DRY_RUN, IS_LOCAL_SAMPLE_MODE, ROOT_PATH, carrCfToValidCf, compareObjectsCarr, toCarrCF } from "./util";

export const deleteAllCustomFormats = async () => {
  const api = getArrApi();
  const cfOnServer = await api.v3CustomformatList();

  for (const cf of cfOnServer.data) {
    await api.v3CustomformatDelete(cf.id!);
    console.log(`Deleted CF: '${cf.name}'`);
  }
};

export const loadServerCustomFormats = async (): Promise<CustomFormatResource[]> => {
  if (IS_LOCAL_SAMPLE_MODE) {
    return (await import(path.resolve("./tests/samples/cfs.json"))).default as unknown as Promise<CustomFormatResource[]>;
  }
  const api = getArrApi();
  const cfOnServer = await api.v3CustomformatList();
  return cfOnServer.data;
};

export const manageCf = async (cfProcessing: CFProcessing, serverCfs: Map<string, CustomFormatResource>, cfsToManage: Set<string>) => {
  const { carrIdMapping: trashIdToObject, cfNameToCarrConfig: existingCfToObject } = cfProcessing;

  const api = getArrApi();

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

  for (const cf of cfsToManage) {
    await manageSingle(cf);
  }
};
export const loadLocalCfs = async (): Promise<CFProcessing | null> => {
  const sonarrLocalPath = process.env.SONARR_LOCAL_PATH;
  if (!sonarrLocalPath) {
    console.log("Ignoring local cfs.");
    return null;
  }

  const files = readdirSync(`${sonarrLocalPath}`).filter((fn) => fn.endsWith("json"));

  const carrIdToObject = new Map<string, { carrConfig: ConfigarrCF; requestConfig: CustomFormatResource }>();

  const cfNameToCarrObject = new Map<string, ConfigarrCF>();

  for (const file of files) {
    const name = `${sonarrLocalPath}/${file}`;
    const cf: DynamicImportType<TrashCF | ConfigarrCF> = await import(`${ROOT_PATH}/${name}`);

    const cfD = toCarrCF(cf.default);

    carrIdToObject.set(cfD.configarr_id, {
      carrConfig: cfD,
      requestConfig: carrCfToValidCf(cfD),
    });

    if (cfD.name) {
      cfNameToCarrObject.set(cfD.name, cfD);
    }
  }

  return {
    carrIdMapping: carrIdToObject,
    cfNameToCarrConfig: cfNameToCarrObject,
  };
};
export const calculateCFsToManage = (yaml: YamlInput) => {
  const cfTrashToManage: Set<string> = new Set();

  yaml.custom_formats.map((cf) => {
    if (cf.trash_ids) {
      cf.trash_ids.forEach((tid) => cfTrashToManage.add(tid));
    }
  });

  return cfTrashToManage;
};
export const mergeCfSources = (listOfCfs: (CFProcessing | null)[]): CFProcessing => {
  return listOfCfs.reduce<CFProcessing>(
    (p, c) => {
      if (!c) {
        return p;
      }

      for (const [key, value] of c.carrIdMapping.entries()) {
        if (p.carrIdMapping.has(key)) {
          console.log(`Overwriting ${key} during CF merge`);
        }
        p.carrIdMapping.set(key, value);
      }

      for (const [key, value] of c.cfNameToCarrConfig.entries()) {
        if (p.cfNameToCarrConfig.has(key)) {
          console.log(`Overwriting ${key} during CF merge`);
        }
        p.cfNameToCarrConfig.set(key, value);
      }

      return p;
    },
    {
      carrIdMapping: new Map(),
      cfNameToCarrConfig: new Map(),
    },
  );
};
