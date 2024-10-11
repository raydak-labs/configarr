import fs from "node:fs";
import path from "node:path";
import { MergedCustomFormatResource } from "./__generated__/mergedTypes";
import { getArrApi } from "./api";
import { getConfig } from "./config";
import { logger } from "./logger";
import { CFProcessing, ConfigCustomFormatList, ConfigarrCF, TrashCF } from "./types";
import { IS_DRY_RUN, IS_LOCAL_SAMPLE_MODE, compareObjectsCarr, loadJsonFile, mapImportCfToRequestCf, toCarrCF } from "./util";

export const deleteAllCustomFormats = async () => {
  const api = getArrApi();
  const cfOnServer = await api.v3CustomformatList().json();

  for (const cf of cfOnServer) {
    await api.v3CustomformatDelete(cf.id!);
    logger.info(`Deleted CF: '${cf.name}'`);
  }
};

export const loadServerCustomFormats = async (): Promise<MergedCustomFormatResource[]> => {
  if (IS_LOCAL_SAMPLE_MODE) {
    return loadJsonFile<MergedCustomFormatResource[]>(path.resolve(__dirname, "../tests/samples/cfs.json"));
  }
  const api = getArrApi();
  const cfOnServer = await api.v3CustomformatList().json();
  return cfOnServer;
};

export const manageCf = async (
  cfProcessing: CFProcessing,
  serverCfs: Map<string, MergedCustomFormatResource>,
  cfsToManage: Set<string>,
) => {
  const { carrIdMapping: trashIdToObject } = cfProcessing;
  const api = getArrApi();

  let updatedCFs = 0;
  let errorCFs = 0;
  let validCFs = 0;
  let createCFs = 0;

  const manageSingle = async (carrId: string) => {
    const tr = trashIdToObject.get(carrId);

    if (!tr) {
      logger.info(`TrashID to manage ${carrId} does not exists`);
      errorCFs++;
      return;
    }

    const existingCf = serverCfs.get(tr.carrConfig.name!);

    if (existingCf) {
      // Update if necessary
      const comparison = compareObjectsCarr(existingCf, tr.requestConfig);

      if (!comparison.equal) {
        logger.info(`Found mismatch for ${tr.requestConfig.name}: ${comparison.changes}`);

        try {
          if (IS_DRY_RUN) {
            logger.info(`DryRun: Would update CF: ${existingCf.id} - ${existingCf.name}`);
            updatedCFs++;
          } else {
            await api.v3CustomformatUpdate(existingCf.id + "", {
              id: existingCf.id,
              ...tr.requestConfig,
            });
            logger.debug(`Updated CF ${tr.requestConfig.name}`);
            updatedCFs++;
          }
        } catch (err: any) {
          logger.error(err.response.data, `Failed updating CF ${tr.requestConfig.name}`);
          errorCFs++;
          throw new Error(`Failed updating CF ${tr.requestConfig.name}`);
        }
      } else {
        logger.debug(`CF ${tr.requestConfig.name} does not need update.`);
        validCFs++;
      }
    } else {
      // Create
      try {
        if (IS_DRY_RUN) {
          logger.info(`Would create CF: ${tr.requestConfig.name}`);
        } else {
          const createResult = await api.v3CustomformatCreate(tr.requestConfig);
          logger.info(`Created CF ${tr.requestConfig.name}`);
          createCFs++;
        }
      } catch (err: any) {
        logger.error(err.response.data?.message, `Failed updating CF ${tr.requestConfig.name}`);
        throw new Error(`Failed creating CF '${tr.requestConfig.name}'. Message: ${err.response.data?.message}`);
      }
    }
  };

  for (const cf of cfsToManage) {
    await manageSingle(cf);
  }

  logger.info(`Created CFs: ${createCFs}, Updated CFs: ${updatedCFs}, Untouched CFs: ${validCFs}, Error CFs: ${errorCFs}`);
};
export const loadLocalCfs = async (): Promise<CFProcessing | null> => {
  const config = getConfig();

  if (config.localCustomFormatsPath == null) {
    logger.debug(`No local custom formats specified. Skipping.`);
    return null;
  }

  const cfPath = path.resolve(config.localCustomFormatsPath);

  if (!fs.existsSync(cfPath)) {
    logger.info(`Provided local custom formats path '${config.localCustomFormatsPath}' does not exist.`);
    return null;
  }

  const files = fs.readdirSync(`${cfPath}`).filter((fn) => fn.endsWith("json"));
  const carrIdToObject = new Map<string, { carrConfig: ConfigarrCF; requestConfig: MergedCustomFormatResource }>();
  const cfNameToCarrObject = new Map<string, ConfigarrCF>();

  for (const file of files) {
    const name = `${cfPath}/${file}`;
    const cf = loadJsonFile<TrashCF | ConfigarrCF>(path.resolve(name));

    const cfD = toCarrCF(cf);

    carrIdToObject.set(cfD.configarr_id, {
      carrConfig: cfD,
      requestConfig: mapImportCfToRequestCf(cfD),
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

export const loadCFFromConfig = (): CFProcessing | null => {
  // TODO typings
  const defs = getConfig().customFormatDefinitions;

  if (defs == null) {
    logger.debug(`No CustomFormat definitions defined.`);
    return null;
  }

  const carrIdToObject = new Map<string, { carrConfig: ConfigarrCF; requestConfig: MergedCustomFormatResource }>();
  const cfNameToCarrObject = new Map<string, ConfigarrCF>();

  for (const def of defs) {
    const cfD = toCarrCF(def);

    carrIdToObject.set(cfD.configarr_id, {
      carrConfig: cfD,
      requestConfig: mapImportCfToRequestCf(cfD),
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

export const calculateCFsToManage = (yaml: ConfigCustomFormatList) => {
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
          logger.info(`Overwriting ${key} during CF merge`);
        }
        p.carrIdMapping.set(key, value);
      }

      for (const [key, value] of c.cfNameToCarrConfig.entries()) {
        if (p.cfNameToCarrConfig.has(key)) {
          logger.info(`Overwriting ${key} during CF merge`);
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
