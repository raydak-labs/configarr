// those must be run first!
import "dotenv/config";
import { getEnvs, initEnvs } from "./env";
initEnvs();

import fs from "node:fs";
import { MergedCustomFormatResource } from "./__generated__/mergedTypes";
import { configureApi, getUnifiedClient, unsetApi } from "./clients/unified-client";
import { getConfig, validateConfig } from "./config";
import { calculateCFsToManage, loadCustomFormatDefinitions, loadServerCustomFormats, manageCf } from "./custom-formats";
import { loadLocalRecyclarrTemplate } from "./local-importer";
import { logHeading, logger } from "./logger";
import { calculateMediamanagementDiff, calculateNamingDiff } from "./media-management";
import { calculateQualityDefinitionDiff, loadQualityDefinitionFromServer } from "./quality-definitions";
import { calculateQualityProfilesDiff, filterInvalidQualityProfiles, loadQualityProfilesFromServer } from "./quality-profiles";
import { cloneRecyclarrTemplateRepo, loadRecyclarrTemplates } from "./recyclarr-importer";
import {
  cloneTrashRepo,
  loadQPFromTrash,
  loadQualityDefinitionFromTrash,
  transformTrashQPCFs,
  transformTrashQPToTemplate,
} from "./trash-guide";
import { ArrType, MappedMergedTemplates } from "./types/common.types";
import { ConfigQualityProfile, InputConfigArrInstance, InputConfigIncludeItem, MergedConfigInstance } from "./types/config.types";
import { TrashQualityDefintion } from "./types/trashguide.types";

/**
 * Load data from trash, recyclarr, custom configs and merge.
 * Afterwards do sanitize and check against required configuration.
 * TODO: probably move to config.ts and write tests for it for different merge scenarios
 * @param value
 * @param arrType
 */
const mergeConfigsAndTemplates = async (value: InputConfigArrInstance, arrType: ArrType): Promise<{ config: MergedConfigInstance }> => {
  const recyclarrTemplateMap = loadRecyclarrTemplates(arrType);
  const localTemplateMap = loadLocalRecyclarrTemplate(arrType);
  const trashTemplates = await loadQPFromTrash(arrType);

  logger.debug(
    `Loaded ${recyclarrTemplateMap.size} Recyclarr templates, ${localTemplateMap.size} local templates and ${trashTemplates.size} trash templates.`,
  );

  const recyclarrMergedTemplates: MappedMergedTemplates = {
    custom_formats: [],
    quality_profiles: [],
  };

  // HINT: we assume customFormatDefinitions only exist in RECYCLARR
  if (value.include) {
    const mappedIncludes = value.include.reduce<{ recyclarr: InputConfigIncludeItem[]; trash: InputConfigIncludeItem[] }>(
      (previous, current) => {
        switch (current.source) {
          case "TRASH":
            previous.trash.push(current);
            break;
          case "RECYCLARR":
            previous.recyclarr.push(current);
            break;
          default:
            logger.warn(`Unknown type for template requested: ${(current as any).type}. Ignoring.`);
        }

        return previous;
      },
      { recyclarr: [], trash: [] },
    );

    logger.info(
      `Found ${value.include.length} templates to include. Mapped to [recyclarr]=${mappedIncludes.recyclarr.length}, [trash]=${mappedIncludes.trash.length} ...`,
    );

    mappedIncludes.recyclarr.forEach((e) => {
      const template = recyclarrTemplateMap.get(e.template) ?? localTemplateMap.get(e.template);

      if (!template) {
        logger.warn(`Unknown recyclarr template requested: ${e.template}`);
        return;
      }

      if (template.custom_formats) {
        recyclarrMergedTemplates.custom_formats?.push(...template.custom_formats);
      }

      if (template.quality_definition) {
        recyclarrMergedTemplates.quality_definition = template.quality_definition;
      }

      if (template.quality_profiles) {
        for (const qp of template.quality_profiles) {
          recyclarrMergedTemplates.quality_profiles.push(qp);
        }
      }

      if (template.media_management) {
        recyclarrMergedTemplates.media_management = { ...recyclarrMergedTemplates.media_management, ...template.media_management };
      }

      if (template.media_naming) {
        recyclarrMergedTemplates.media_naming = { ...recyclarrMergedTemplates.media_naming, ...template.media_naming };
      }

      if (template.customFormatDefinitions) {
        if (Array.isArray(template.customFormatDefinitions)) {
          recyclarrMergedTemplates.customFormatDefinitions = [
            ...(recyclarrMergedTemplates.customFormatDefinitions || []),
            ...template.customFormatDefinitions,
          ];
        } else {
          logger.warn(`CustomFormatDefinitions in template must be an array. Ignoring.`);
        }
      }

      // TODO Ignore recursive include for now
      if (template.include) {
        logger.warn(`Recursive includes not supported at the moment. Ignoring.`);
      }
    });

    // TODO: local TRaSH-Guides QP templates do not work yet
    mappedIncludes.trash.forEach((e) => {
      const template = trashTemplates.get(e.template);

      if (!template) {
        logger.warn(`Unknown trash template requested: ${e.template}`);
        return;
      }

      recyclarrMergedTemplates.quality_profiles.push(transformTrashQPToTemplate(template));
      recyclarrMergedTemplates.custom_formats.push(transformTrashQPCFs(template));
    });
  }

  // Config values overwrite template values
  if (value.custom_formats) {
    recyclarrMergedTemplates.custom_formats.push(...value.custom_formats);
  }

  if (value.quality_profiles) {
    recyclarrMergedTemplates.quality_profiles.push(...value.quality_profiles);
  }

  if (value.media_management) {
    recyclarrMergedTemplates.media_management = { ...recyclarrMergedTemplates.media_management, ...value.media_management };
  }

  if (value.media_naming) {
    recyclarrMergedTemplates.media_naming = { ...recyclarrMergedTemplates.media_naming, ...value.media_naming };
  }

  if (value.quality_definition) {
    recyclarrMergedTemplates.quality_definition = { ...recyclarrMergedTemplates.quality_definition, ...value.quality_definition };
  }

  if (value.customFormatDefinitions) {
    if (Array.isArray(value.customFormatDefinitions)) {
      recyclarrMergedTemplates.customFormatDefinitions = [
        ...(recyclarrMergedTemplates.customFormatDefinitions || []),
        ...value.customFormatDefinitions,
      ];
    } else {
      logger.warn(`CustomFormatDefinitions in config file must be an array. Ignoring.`);
    }
  }

  const recyclarrProfilesMerged = recyclarrMergedTemplates.quality_profiles.reduce<Map<string, ConfigQualityProfile>>((p, c) => {
    const profile = p.get(c.name);

    if (profile == null) {
      p.set(c.name, c);
    } else {
      p.set(c.name, {
        ...profile,
        ...c,
        reset_unmatched_scores: {
          enabled: c.reset_unmatched_scores?.enabled ?? profile.reset_unmatched_scores?.enabled ?? true,
          except: c.reset_unmatched_scores?.except ?? profile.reset_unmatched_scores?.except,
        },
        upgrade: {
          ...profile.upgrade,
          ...c.upgrade,
        },
      });
    }

    return p;
  }, new Map());

  recyclarrMergedTemplates.quality_profiles = Array.from(recyclarrProfilesMerged.values());

  recyclarrMergedTemplates.quality_profiles = filterInvalidQualityProfiles(recyclarrMergedTemplates.quality_profiles);

  // merge profiles from recyclarr templates into one
  const qualityProfilesMerged = recyclarrMergedTemplates.quality_profiles.reduce((p, c) => {
    let existingQp = p.get(c.name);

    if (!existingQp) {
      p.set(c.name, { ...c });
    } else {
      existingQp = {
        ...existingQp,
        ...c,
        // Overwriting qualities array for now
        upgrade: { ...existingQp.upgrade, ...c.upgrade },
        reset_unmatched_scores: {
          ...existingQp.reset_unmatched_scores,
          ...c.reset_unmatched_scores,
          enabled: (c.reset_unmatched_scores?.enabled ?? existingQp.reset_unmatched_scores?.enabled) || false,
        },
      };
      p.set(c.name, existingQp);
    }

    return p;
  }, new Map<string, ConfigQualityProfile>());

  recyclarrMergedTemplates.quality_profiles = Array.from(qualityProfilesMerged.values());

  const validatedConfig = validateConfig(recyclarrMergedTemplates);
  logger.debug(`Merged config: '${JSON.stringify(validatedConfig)}'`);

  /* 
  TODO: do we want to load all available local templates or only the included ones in the instance?
  Example: we have a local template folder which we can always traverse. So we could load every CF defined there.
  But then we could also have in theory conflicted CF IDs if user want to define same CF in different templates.
  How to handle overwrite? Maybe also support overriding CFs defined in Trash or something?
  */
  // const localTemplateCFDs = Array.from(localTemplateMap.values()).reduce((p, c) => {
  //   if (c.customFormatDefinitions) {
  //     p.push(...c.customFormatDefinitions);
  //   }
  //   return p;
  // }, [] as CustomFormatDefinitions);

  return { config: validatedConfig };
};

const pipeline = async (value: InputConfigArrInstance, arrType: ArrType) => {
  const api = getUnifiedClient();

  const { config } = await mergeConfigsAndTemplates(value, arrType);

  const idsToManage = calculateCFsToManage(config);
  logger.debug(Array.from(idsToManage), `CustomFormats to manage`);

  const mergedCFs = await loadCustomFormatDefinitions(idsToManage, arrType, config.customFormatDefinitions || []);

  let serverCFs = await loadServerCustomFormats();
  logger.info(`CustomFormats on server: ${serverCFs.length}`);

  const serverCFMapping = serverCFs.reduce((p, c) => {
    p.set(c.name!, c);
    return p;
  }, new Map<string, MergedCustomFormatResource>());

  const cfUpdateResult = await manageCf(mergedCFs, serverCFMapping, idsToManage);

  // add missing CFs to list because we need it for further steps
  // serverCFs.push(...cfUpdateResult.createCFs);
  if (cfUpdateResult.createCFs.length > 0 || cfUpdateResult.updatedCFs.length > 0) {
    // refresh cfs
    serverCFs = await loadServerCustomFormats();
  }

  logger.info(`CustomFormats synchronized`);

  const qualityDefinition = config.quality_definition?.type;

  let serverQD = await loadQualityDefinitionFromServer();

  if (qualityDefinition) {
    let qdTrash: TrashQualityDefintion;

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

    const { changeMap, create, restData } = calculateQualityDefinitionDiff(serverQD, qdTrash, config.quality_definition?.preferred_ratio);

    if (changeMap.size > 0) {
      if (getEnvs().DRY_RUN) {
        logger.info("DryRun: Would update QualityDefinitions.");
      } else {
        logger.info(`Diffs in quality definitions found`, changeMap.values());
        await api.updateQualityDefinitions(restData);
        // refresh QDs
        serverQD = await loadQualityDefinitionFromServer();
        logger.info(`Updated QualityDefinitions`);
      }
    } else {
      logger.info(`QualityDefinitions do not need update!`);
    }

    if (create.length > 0) {
      logger.info(`Currently not implemented this case for quality definitions.`);
    }
  } else {
    logger.info(`No QualityDefinition configured.`);
  }

  const namingDiff = await calculateNamingDiff(config.media_naming);

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

  // calculate diff from server <-> what we want to be there
  const serverQP = await loadQualityProfilesFromServer();
  const { changedQPs, create, noChanges } = await calculateQualityProfilesDiff(mergedCFs, config, serverQP, serverQD, serverCFs);

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

const run = async () => {
  if (getEnvs().DRY_RUN) {
    logger.info("DryRun: Running in dry-run mode!");
  }

  const applicationConfig = getConfig();

  await cloneRecyclarrTemplateRepo();
  await cloneTrashRepo();

  // TODO currently this has to be run sequentially because of the centrally configured api

  const sonarrConfig = applicationConfig.sonarr;

  if (sonarrConfig == null || Array.isArray(sonarrConfig) || typeof sonarrConfig !== "object" || Object.keys(sonarrConfig).length <= 0) {
    logHeading(`No Sonarr instances defined.`);
  } else {
    logHeading(`Processing Sonarr ...`);

    for (const [instanceName, instance] of Object.entries(sonarrConfig)) {
      logger.info(`Processing Sonarr Instance: ${instanceName}`);
      await configureApi("SONARR", instance.base_url, instance.api_key);
      await pipeline(instance, "SONARR");
      unsetApi();
    }
  }

  const radarrConfig = applicationConfig.radarr;

  if (radarrConfig == null || Array.isArray(radarrConfig) || typeof radarrConfig !== "object" || Object.keys(radarrConfig).length <= 0) {
    logHeading(`No Radarr instances defined.`);
  } else {
    logHeading(`Processing Radarr ...`);

    for (const [instanceName, instance] of Object.entries(radarrConfig)) {
      logger.info(`Processing Radarr Instance: ${instanceName}`);
      await configureApi("RADARR", instance.base_url, instance.api_key);
      await pipeline(instance, "RADARR");
      unsetApi();
    }
  }

  const whisparrConfig = applicationConfig.whisparr;

  if (
    whisparrConfig == null ||
    Array.isArray(whisparrConfig) ||
    typeof whisparrConfig !== "object" ||
    Object.keys(whisparrConfig).length <= 0
  ) {
    logHeading(`No Whisparr instances defined.`);
  } else {
    logHeading(`Processing Whisparr ...`);

    for (const [instanceName, instance] of Object.entries(whisparrConfig)) {
      logger.info(`Processing Whisparr Instance: ${instanceName}`);
      await configureApi("WHISPARR", instance.base_url, instance.api_key);
      await pipeline(instance, "WHISPARR");
      unsetApi();
    }
  }

  const readarrConfig = applicationConfig.readarr;

  if (
    readarrConfig == null ||
    Array.isArray(readarrConfig) ||
    typeof readarrConfig !== "object" ||
    Object.keys(readarrConfig).length <= 0
  ) {
    logHeading(`No Readarr instances defined.`);
  } else {
    logHeading(`Processing Readarr ...`);

    for (const [instanceName, instance] of Object.entries(readarrConfig)) {
      logger.info(`Processing Readarr Instance: ${instanceName}`);
      await configureApi("READARR", instance.base_url, instance.api_key);
      await pipeline(instance, "READARR");
      unsetApi();
    }
  }
};

run();
