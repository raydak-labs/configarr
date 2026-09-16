import fs from "node:fs";
import path from "node:path";
import type { CustomFormatsClient } from "../clients/capabilities";
import { getConfig } from "../config";
import { DiffEntry } from "../diffReport/diffReport.types";
import { getEnvs } from "../env";
import { logger } from "../logger";
import { ConfigCustomFormatList, CustomFormatDefinitions } from "../types/config.types";
import { TrashCF } from "../types/trashguide.types";
import { compareCustomFormats, loadJsonFile, mapImportCfToRequestCf, toCarrCF } from "../util";
import { CFIDToConfigGroup, CFProcessing, ConfigarrCF, CustomFormatRequest } from "./customFormat.types";

export const deleteAllCustomFormats = async (client: CustomFormatsClient) => {
  const cfOnServer = await client.getCustomFormats();

  for (const cf of cfOnServer) {
    await client.deleteCustomFormat(cf.id + "");
    logger.info(`Deleted CF: '${cf.name}'`);
  }
};

export const deleteCustomFormat = async (client: CustomFormatsClient, customFormat: CustomFormatRequest) => {
  await client.deleteCustomFormat(customFormat.id + "");
  logger.info(`Deleted CF: '${customFormat.name}'`);
};

export const loadServerCustomFormats = async (client: CustomFormatsClient): Promise<CustomFormatRequest[]> => {
  if (getEnvs().LOAD_LOCAL_SAMPLES) {
    return loadJsonFile<CustomFormatRequest[]>(path.resolve(__dirname, "../../tests/samples/cfs.json"));
  }
  return client.getCustomFormats();
};

export const manageCf = async (client: CustomFormatsClient, cfProcessing: CFProcessing, serverCfs: Map<string, CustomFormatRequest>) => {
  const { cfNameToCarrConfig } = cfProcessing;

  let updatedCFs: CustomFormatRequest[] = [];
  let errorCFs: string[] = [];
  const validCFs: ConfigarrCF[] = [];
  let createCFs: CustomFormatRequest[] = [];
  const diffEntries: DiffEntry[] = [];

  const manageSingle = async (cfName: string, carrConfig: ConfigarrCF) => {
    const requestConfig = mapImportCfToRequestCf(carrConfig);
    const existingCf = serverCfs.get(cfName);

    if (existingCf) {
      // Update if necessary
      const comparison = compareCustomFormats(existingCf, requestConfig);

      if (!comparison.equal) {
        logger.debug(comparison.changes, `Found mismatch for ${requestConfig.name}`);
        diffEntries.push({ resourceType: "CustomFormat", name: requestConfig.name!, action: "update", fieldChanges: comparison.changes });

        try {
          if (getEnvs().DRY_RUN) {
            logger.info(`DryRun: Would update CF: ${existingCf.id} - ${existingCf.name}`);
            updatedCFs.push(existingCf);
          } else {
            const updatedCf = await client.updateCustomFormat(existingCf.id + "", {
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
      diffEntries.push({ resourceType: "CustomFormat", name: requestConfig.name!, action: "create" });

      try {
        if (getEnvs().DRY_RUN) {
          logger.info(`Would create CF: ${requestConfig.name}`);
        } else {
          const createResult = await client.createCustomFormat(requestConfig);
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

  return { createCFs, updatedCFs, validCFs, errorCFs, diffEntries };
};

export const loadLocalCfs = async (): Promise<CFIDToConfigGroup> => {
  const config = getConfig();
  const carrIdToObject = new Map<string, { carrConfig: ConfigarrCF; requestConfig: CustomFormatRequest }>();

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

  const carrIdToObject = new Map<string, { carrConfig: ConfigarrCF; requestConfig: CustomFormatRequest }>();

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

export const loadCustomFormatDefinitions = async (
  idsToMange: Set<string>,
  additionalCFDs: CustomFormatDefinitions,
  trashCFs: CFIDToConfigGroup = new Map(),
) => {
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
