import fs from "node:fs";
import path from "node:path";
import { MergedCustomFormatResource } from "./types/merged.types";
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

export const manageCf = async (cfProcessing: CFProcessing, serverCfs: Map<string, MergedCustomFormatResource>) => {
  const { cfNameToCarrConfig } = cfProcessing;
  const api = getUnifiedClient();

  let updatedCFs: MergedCustomFormatResource[] = [];
  let errorCFs: string[] = [];
  const validCFs: ConfigarrCF[] = [];
  let createCFs: MergedCustomFormatResource[] = [];

  const manageSingle = async (cfName: string, carrConfig: ConfigarrCF) => {
    const requestConfig = mapImportCfToRequestCf(carrConfig);
    const existingCf = serverCfs.get(cfName);

    if (existingCf) {
      // Update if necessary
      const comparison = compareCustomFormats(existingCf, requestConfig);

      if (!comparison.equal) {
        logger.debug(`Found mismatch for ${requestConfig.name}: ${comparison.changes}`);

        try {
          if (getEnvs().DRY_RUN) {
            logger.info(`DryRun: Would update CF: ${existingCf.id} - ${existingCf.name}`);
            updatedCFs.push(existingCf);
          } else {
            const updatedCf = await api.updateCustomFormat(existingCf.id + "", {
              id: existingCf.id,
              ...requestConfig,
            });
            logger.debug(`Updated CF ${requestConfig.name}`);
            updatedCFs.push(updatedCf);
          }
        } catch (err: any) {
          const data = err?.response?.data;
          const dataMessage = typeof data === "object" ? (data?.message ?? data?.errorMessage) : data;
          const errorMessage = dataMessage ?? err?.message ?? String(err);
          logger.error(errorMessage, `Failed updating CF ${requestConfig.name}`);
          errorCFs.push(carrConfig.configarr_id ?? requestConfig.name ?? "unknown");
          throw new Error(`Failed updating CF '${requestConfig.name}'. Message: ${errorMessage}`, { cause: err });
        }
      } else {
        validCFs.push(carrConfig);
      }
    } else {
      // Create
      try {
        if (getEnvs().DRY_RUN) {
          logger.info(`Would create CF: ${requestConfig.name}`);
        } else {
          const createResult = await api.createCustomFormat(requestConfig);
          logger.info(`Created CF ${requestConfig.name}`);
          createCFs.push(createResult);
          serverCfs.set(createResult.name!, createResult);
        }
      } catch (err: any) {
        const data = err?.response?.data;
        const dataMessage = typeof data === "object" ? (data?.message ?? data?.errorMessage) : data;
        const errorMessage = dataMessage ?? err?.message ?? String(err);
        logger.error(errorMessage, `Failed creating CF ${requestConfig.name}`);
        errorCFs.push(carrConfig.configarr_id ?? requestConfig.name ?? "unknown");
        throw new Error(`Failed creating CF '${requestConfig.name}'. Message: ${errorMessage}`, { cause: err });
      }
    }
  };

  for (const [cfName, carrConfig] of cfNameToCarrConfig) {
    await manageSingle(cfName, carrConfig);
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
  const lastTrashIdByCfName = new Map<string, string>();

  return listOfCfs.reduce<CFProcessing>(
    (p, c) => {
      if (c == null) {
        return p;
      }

      for (const test of idsToManage) {
        const value = c.get(test);

        if (value) {
          const cfName = value.carrConfig.name!;
          if (p.carrIdMapping.has(test)) {
            logger.warn(`Overwriting CF with id '${test}' during merge.`);
          }

          if (p.cfNameToCarrConfig.has(cfName)) {
            const prevCarr = p.cfNameToCarrConfig.get(cfName)!;
            const prevTid = lastTrashIdByCfName.get(cfName)!;
            const specsDiffer = !compareCustomFormats(mapImportCfToRequestCf(prevCarr), value.requestConfig).equal;
            const specNote = specsDiffer ? " Definitions for those ids are not identical;" : "";
            logger.warn(
              `Overwriting CF with name '${cfName}': trash_id '${test}' wins over '${prevTid}' (later merge order).${specNote} Sync uses '${test}'.`,
            );
          }

          p.carrIdMapping.set(test, value);
          p.cfNameToCarrConfig.set(cfName, value.carrConfig);
          lastTrashIdByCfName.set(cfName, test);
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
