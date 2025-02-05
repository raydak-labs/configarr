// those must be run first!
import "dotenv/config";
import { getEnvs, initEnvs } from "./env";
initEnvs();

import fs from "node:fs";
import { MergedCustomFormatResource } from "./__generated__/mergedTypes";
import { ServerCache } from "./cache";
import { configureApi, getUnifiedClient, unsetApi } from "./clients/unified-client";
import { getConfig, mergeConfigsAndTemplates } from "./config";
import { calculateCFsToManage, loadCustomFormatDefinitions, loadServerCustomFormats, manageCf } from "./custom-formats";
import { logHeading, logInstanceHeading, logger } from "./logger";
import { calculateMediamanagementDiff, calculateNamingDiff } from "./media-management";
import { calculateQualityDefinitionDiff, loadQualityDefinitionFromServer } from "./quality-definitions";
import { calculateQualityProfilesDiff, loadQualityProfilesFromServer } from "./quality-profiles";
import { cloneRecyclarrTemplateRepo } from "./recyclarr-importer";
import { cloneTrashRepo, loadQualityDefinitionFromTrash, transformTrashQDs } from "./trash-guide";
import { ArrType } from "./types/common.types";
import { InputConfigArrInstance, InputConfigSchema } from "./types/config.types";
import { TrashQualityDefintion, TrashQualityDefintionQuality } from "./types/trashguide.types";

const pipeline = async (globalConfig: InputConfigSchema, instanceConfig: InputConfigArrInstance, arrType: ArrType) => {
  const api = getUnifiedClient();

  const serverCFs = await loadServerCustomFormats();
  const serverQD = await loadQualityDefinitionFromServer();
  const languages = await api.getLanguages();

  const serverCache = new ServerCache(serverQD, [], serverCFs, languages);

  logger.info(`Server objects: CustomFormats ${serverCFs.length}}`);

  const { config } = await mergeConfigsAndTemplates(globalConfig, instanceConfig, arrType);

  const idsToManage = calculateCFsToManage(config);
  logger.debug(Array.from(idsToManage), `CustomFormats to manage`);

  const mergedCFs = await loadCustomFormatDefinitions(idsToManage, arrType, config.customFormatDefinitions || []);

  const serverCFMapping = serverCache.cf.reduce((p, c) => {
    p.set(c.name!, c);
    return p;
  }, new Map<string, MergedCustomFormatResource>());

  const cfUpdateResult = await manageCf(mergedCFs, serverCFMapping, idsToManage);

  // add missing CFs to list because we need it for further steps
  // serverCFs.push(...cfUpdateResult.createCFs);
  if (cfUpdateResult.createCFs.length > 0 || cfUpdateResult.updatedCFs.length > 0) {
    // refresh cfs
    serverCache.cf = await loadServerCustomFormats();
  }

  logger.info(`CustomFormats synchronized`);

  const qualityDefinition = config.quality_definition?.type;

  if (config.quality_definition != null) {
    const trashQDFileName = config.quality_definition.type;
    const mergedQDs: TrashQualityDefintionQuality[] = [];

    // TODO: maybe add id reference as usage
    if (trashQDFileName != null) {
      let qdTrash: TrashQualityDefintion;
      // TODO: this could be improved
      switch (qualityDefinition) {
        case "anime":
          qdTrash = await loadQualityDefinitionFromTrash("anime", "SONARR");
          break;
        case "series":
          qdTrash = await loadQualityDefinitionFromTrash("series", "SONARR");
          break;
        case "movie":
          qdTrash = await loadQualityDefinitionFromTrash("movie", "RADARR");
          break;
        default:
          throw new Error(`Unsupported quality defintion ${qualityDefinition}`);
      }

      const transformed = transformTrashQDs(qdTrash, config.quality_definition?.preferred_ratio);

      mergedQDs.push(...transformed);
    } else {
      logger.debug(`QualityDefinition: No TRaSH-Guide filename defined (type).`);
    }

    if (config.quality_definition.qualities) {
      mergedQDs.push(...config.quality_definition.qualities);
    }

    const { changeMap, restData } = calculateQualityDefinitionDiff(serverCache.qd, mergedQDs);

    if (changeMap.size > 0) {
      if (getEnvs().DRY_RUN) {
        logger.info("DryRun: Would update QualityDefinitions.");
      } else {
        logger.info(`Diffs in quality definitions found`, changeMap.values());
        await api.updateQualityDefinitions(restData);
        // refresh QDs
        serverCache.qd = await loadQualityDefinitionFromServer();
        logger.info(`Updated QualityDefinitions`);
      }
    } else {
      logger.info(`QualityDefinitions do not need update!`);
    }
  } else {
    logger.debug(`No QualityDefinition configured.`);
  }

  const namingDiff = await calculateNamingDiff(config.media_naming_api);

  if (namingDiff) {
    if (getEnvs().DRY_RUN) {
      logger.info("DryRun: Would update MediaNaming.");
    } else {
      // TODO this will need a radarr/sonarr separation for sure to have good and correct typings
      await api.updateNaming(namingDiff.updatedData.id! + "", namingDiff.updatedData as any); // Ignore types
      logger.info(`Updated MediaNaming`);
    }
  }

  const managementDiff = await calculateMediamanagementDiff(config.media_management);

  if (managementDiff) {
    if (getEnvs().DRY_RUN) {
      logger.info("DryRun: Would update MediaManagement.");
    } else {
      // TODO this will need a radarr/sonarr separation for sure to have good and correct typings
      await api.updateMediamanagement(managementDiff.updatedData.id! + "", managementDiff.updatedData as any); // Ignore types
      logger.info(`Updated MediaManagement`);
    }
  }

  const serverQP = await loadQualityProfilesFromServer();
  serverCache.qp = serverQP;

  logger.info(`Server objects: QualityProfiles ${serverQP.length}`);

  // calculate diff from server <-> what we want to be there
  const { changedQPs, create, noChanges } = await calculateQualityProfilesDiff(arrType, mergedCFs, config, serverCache);

  if (getEnvs().DEBUG_CREATE_FILES) {
    create.concat(changedQPs).forEach((e, i) => {
      fs.writeFileSync(`debug/test${i}.json`, JSON.stringify(e, null, 2), "utf-8");
    });
  }

  logger.info(`QualityProfiles: Create: ${create.length}, Update: ${changedQPs.length}, Unchanged: ${noChanges.length}`);

  if (!getEnvs().DRY_RUN) {
    for (const element of create) {
      try {
        const newProfile = await api.createQualityProfile(element);
        logger.info(`Created QualityProfile: ${newProfile.name}`);
      } catch (error: any) {
        logger.error(`Failed creating QualityProfile (${element.name})`);
        throw error;
      }
    }

    for (const element of changedQPs) {
      try {
        const newProfile = await api.updateQualityProfile("" + element.id, element);
        logger.info(`Updated QualityProfile: ${newProfile.name}`);
      } catch (error: any) {
        logger.error(`Failed updating QualityProfile (${element.name})`);
        throw error;
      }
    }
  } else if (create.length > 0 || changedQPs.length > 0) {
    logger.info("DryRun: Would create/update QualityProfiles.");
  }
};

const runArrType = async (
  arrType: ArrType,
  globalConfig: InputConfigSchema,
  arrEntry: Record<string, InputConfigArrInstance> | undefined,
) => {
  if (arrEntry == null || Array.isArray(arrEntry) || typeof arrEntry !== "object" || Object.keys(arrEntry).length <= 0) {
    logHeading(`No ${arrType} instances defined.`);
  } else {
    logHeading(`Processing ${arrType} ...`);

    for (const [instanceName, instance] of Object.entries(arrEntry)) {
      logInstanceHeading(`Processing ${arrType} Instance: ${instanceName} ...`);

      if (instance.enabled === false) {
        logger.info(`Instance ${arrType} - ${instanceName} is disabled!`);
        continue;
      }

      try {
        await configureApi(arrType, instance.base_url, instance.api_key);
        await pipeline(globalConfig, instance, arrType);
      } catch (err: unknown) {
        logger.error(`Failure during configuring: ${arrType} - ${instanceName}`);
        if (getEnvs().LOG_STACKTRACE) {
          logger.error(err);
        }
        if (getEnvs().STOP_ON_ERROR) {
          throw new Error(`Stopping further execution because 'STOP_ON_ERROR' is enabled.`);
        }
      } finally {
        unsetApi();
      }

      logger.info("");
    }
  }
};

const run = async () => {
  if (getEnvs().DRY_RUN) {
    logger.info("DryRun: Running in dry-run mode!");
  }

  const globalConfig = getConfig();

  await cloneRecyclarrTemplateRepo();
  await cloneTrashRepo();

  // TODO currently this has to be run sequentially because of the centrally configured api

  // Sonarr
  if (globalConfig.sonarrEnabled == null || globalConfig.sonarrEnabled) {
    await runArrType("SONARR", globalConfig, globalConfig.sonarr);
  } else {
    logger.debug(`Sonarr disabled in config`);
  }

  // Radarr
  if (globalConfig.radarrEnabled == null || globalConfig.radarrEnabled) {
    await runArrType("RADARR", globalConfig, globalConfig.radarr);
  } else {
    logger.debug(`Radarr disabled in config`);
  }

  // Whisparr
  if (globalConfig.whisparrEnabled == null || globalConfig.whisparrEnabled) {
    await runArrType("WHISPARR", globalConfig, globalConfig.whisparr);
  } else {
    logger.debug(`Whisparr disabled in config`);
  }

  // Readarr
  if (globalConfig.readarrEnabled == null || globalConfig.readarrEnabled) {
    await runArrType("READARR", globalConfig, globalConfig.readarr);
  } else {
    logger.debug(`Readarr disabled in config`);
  }

  // Lidarr
  if (globalConfig.lidarrEnabled == null || globalConfig.lidarrEnabled) {
    await runArrType("LIDARR", globalConfig, globalConfig.lidarr);
  } else {
    logger.debug(`Lidarr disabled in config`);
  }
};

run();
