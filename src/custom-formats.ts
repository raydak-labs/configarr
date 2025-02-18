import fs from "node:fs";
import path from "node:path";
import { MergedCustomFormatResource } from "./__generated__/mergedTypes";
import { getUnifiedClient } from "./clients/unified-client";
import { getConfig } from "./config";
import { getEnvs } from "./env";
import { logger } from "./logger";
import { loadTrashCFs } from "./trash-guide";
import { ArrType, CFIDToConfigGroup, CFProcessing, ConfigarrCF } from "./types/common.types";
import { ConfigCustomFormatList, CustomFormatDefinitions } from "./types/config.types";
import { TrashCF } from "./types/trashguide.types";
import { compareCustomFormats, loadJsonFile, mapImportCfToRequestCf, toCarrCF } from "./util";

export const deleteAllCustomFormats = async () => {
  const api = getUnifiedClient();
  const cfOnServer = await api.getCustomFormats();

  for (const cf of cfOnServer) {
    await api.deleteCustomFormat(cf.id + "");
    logger.info(`Deleted CF: '${cf.name}'`);
  }
};

export const deleteCustomFormat = async (customFormat: MergedCustomFormatResource) => {
  const api = getUnifiedClient();

  await api.deleteCustomFormat(customFormat.id + "");
  logger.info(`Deleted CF: '${customFormat.name}'`);
};

export const loadServerCustomFormats = async (): Promise<MergedCustomFormatResource[]> => {
  if (getEnvs().LOAD_LOCAL_SAMPLES) {
    return loadJsonFile<MergedCustomFormatResource[]>(path.resolve(__dirname, "../tests/samples/cfs.json"));
  }
  const api = getUnifiedClient();
  const cfOnServer = await api.getCustomFormats();
  return cfOnServer;
};

export const manageCf = async (
  cfProcessing: CFProcessing,
  serverCfs: Map<string, MergedCustomFormatResource>,
  cfsToManage: Set<string>,
) => {
  const { carrIdMapping: trashIdToObject } = cfProcessing;
  const api = getUnifiedClient();

  let updatedCFs: MergedCustomFormatResource[] = [];
  let errorCFs: string[] = [];
  const validCFs: ConfigarrCF[] = [];
  let createCFs: MergedCustomFormatResource[] = [];

  const manageSingle = async (carrId: string) => {
    const tr = trashIdToObject.get(carrId);

    if (!tr) {
      logger.warn(`TrashID to manage ${carrId} does not exists`);
      errorCFs.push(carrId);
      return;
    }

    const existingCf = serverCfs.get(tr.carrConfig.name!);

    if (existingCf) {
      // Update if necessary
      const comparison = compareCustomFormats(existingCf, tr.requestConfig);

      if (!comparison.equal) {
        logger.debug(`Found mismatch for ${tr.requestConfig.name}: ${comparison.changes}`);

        try {
          if (getEnvs().DRY_RUN) {
            logger.info(`DryRun: Would update CF: ${existingCf.id} - ${existingCf.name}`);
            updatedCFs.push(existingCf);
          } else {
            const updatedCf = await api.updateCustomFormat(existingCf.id + "", {
              id: existingCf.id,
              ...tr.requestConfig,
            });
            logger.debug(`Updated CF ${tr.requestConfig.name}`);
            updatedCFs.push(updatedCf);
          }
        } catch (err: any) {
          logger.error(err.response.data, `Failed updating CF ${tr.requestConfig.name}`);
          errorCFs.push(tr.carrConfig.configarr_id ?? tr.requestConfig.name ?? "unknown");
          throw new Error(`Failed updating CF ${tr.requestConfig.name}`);
        }
      } else {
        validCFs.push(tr.carrConfig);
      }
    } else {
      // Create
      try {
        if (getEnvs().DRY_RUN) {
          logger.info(`Would create CF: ${tr.requestConfig.name}`);
        } else {
          const createResult = await api.createCustomFormat(tr.requestConfig);
          logger.info(`Created CF ${tr.requestConfig.name}`);
          createCFs.push(createResult);
        }
      } catch (err: any) {
        logger.error(err.response.data, `Failed updating CF ${tr.requestConfig.name}`);
        errorCFs.push(tr.carrConfig.configarr_id ?? tr.requestConfig.name ?? "unknown");
        throw new Error(`Failed creating CF '${tr.requestConfig.name}'. Message: ${err.response.data?.message}`);
      }
    }
  };

  for (const cf of cfsToManage) {
    await manageSingle(cf);
  }

  if (validCFs.length > 0) {
    logger.debug(
      validCFs.map((e) => `${e.name}`),
      `CFs with no update:`,
    );
  }
  logger.info(
    `Created CFs: ${createCFs.length}, Updated CFs: ${updatedCFs.length}, Untouched CFs: ${validCFs.length}, Error CFs: ${errorCFs.length}`,
  );

  return { createCFs, updatedCFs, validCFs, errorCFs };
};

export const loadLocalCfs = async (): Promise<CFIDToConfigGroup> => {
  const config = getConfig();
  const carrIdToObject = new Map<string, { carrConfig: ConfigarrCF; requestConfig: MergedCustomFormatResource }>();

  if (config.localCustomFormatsPath == null) {
    logger.debug(`No local custom formats specified. Skipping.`);
    return carrIdToObject;
  }

  const cfPath = path.resolve(config.localCustomFormatsPath);

  if (!fs.existsSync(cfPath)) {
    logger.info(`Provided local custom formats path '${config.localCustomFormatsPath}' does not exist.`);
    return carrIdToObject;
  }

  const files = fs.readdirSync(`${cfPath}`).filter((fn) => fn.endsWith("json"));

  for (const file of files) {
    const name = `${cfPath}/${file}`;
    const cf = loadJsonFile<TrashCF | ConfigarrCF>(path.resolve(name));

    const cfD = toCarrCF(cf);

    carrIdToObject.set(cfD.configarr_id, {
      carrConfig: cfD,
      requestConfig: mapImportCfToRequestCf(cfD),
    });
  }

  return carrIdToObject;
};

export const loadCFFromConfig = (): CFIDToConfigGroup | null => {
  const defs = getConfig().customFormatDefinitions;

  if (defs == null) {
    logger.debug(`No local config CustomFormat definitions defined.`);
    return null;
  }

  return mapCustomFormatDefinitions(defs);
};

export const mapCustomFormatDefinitions = (customFormatDefinitions: CustomFormatDefinitions): CFIDToConfigGroup | null => {
  if (customFormatDefinitions == null) {
    return null;
  }

  const carrIdToObject = new Map<string, { carrConfig: ConfigarrCF; requestConfig: MergedCustomFormatResource }>();

  for (const def of customFormatDefinitions) {
    const cfD = toCarrCF(def);

    if (carrIdToObject.has(cfD.configarr_id)) {
      logger.warn(`Duplicate ConfigCF ID found: '${cfD.configarr_id}'. Overwriting with name '${cfD.name}'`);
    }

    carrIdToObject.set(cfD.configarr_id, {
      carrConfig: cfD,
      requestConfig: mapImportCfToRequestCf(cfD),
    });
  }

  return carrIdToObject;
};

export const loadCustomFormatDefinitions = async (idsToMange: Set<string>, arrType: ArrType, additionalCFDs: CustomFormatDefinitions) => {
  let trashCFs: CFIDToConfigGroup = new Map();

  if (arrType === "RADARR" || arrType === "SONARR") {
    trashCFs = await loadTrashCFs(arrType);
  }

  const localFileCFs = await loadLocalCfs();

  logger.debug(`Total loaded CF definitions: ${trashCFs.size} TrashCFs, ${localFileCFs.size} LocalCFs, ${additionalCFDs.length} ConfigCFs`);

  return mergeCfSources(idsToMange, [trashCFs, localFileCFs, mapCustomFormatDefinitions(additionalCFDs)]);
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

export const mergeCfSources = (idsToManage: Set<string>, listOfCfs: (CFIDToConfigGroup | null)[]): CFProcessing => {
  return listOfCfs.reduce<CFProcessing>(
    (p, c) => {
      if (c == null) {
        return p;
      }

      for (const test of idsToManage) {
        const value = c.get(test);
        const cfName = value?.carrConfig.name!;

        if (value) {
          if (p.carrIdMapping.has(test)) {
            logger.warn(`Overwriting CF with id '${test}' during merge.`);
          }

          if (p.cfNameToCarrConfig.has(cfName)) {
            logger.warn(`Overwriting CF with name '${cfName}' (ID: ${test}) during merge.`);
          }

          p.carrIdMapping.set(test, value);
          p.cfNameToCarrConfig.set(value.carrConfig.name!, value.carrConfig);
        }
      }

      return p;
    },
    {
      carrIdMapping: new Map(),
      cfNameToCarrConfig: new Map(),
    },
  );
};
