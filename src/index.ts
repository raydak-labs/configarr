import "dotenv/config";

import fs from "node:fs";
import { MergedCustomFormatResource } from "./__generated__/mergedTypes";
import { configureRadarrApi, configureSonarrApi, getArrApi, unsetApi } from "./api";
import { getConfig, validateConfig } from "./config";
import { calculateCFsToManage, loadCFFromConfig, loadLocalCfs, loadServerCustomFormats, manageCf, mergeCfSources } from "./custom-formats";
import { logHeading, logger } from "./logger";
import { calculateQualityDefinitionDiff, loadQualityDefinitionFromServer } from "./quality-definitions";
import {
  calculateQualityProfilesDiff,
  filterInvalidQualityProfiles,
  loadQualityProfilesFromServer,
  mapQualityProfiles,
} from "./quality-profiles";
import { cloneRecyclarrTemplateRepo, loadRecyclarrTemplates } from "./recyclarr-importer";
import {
  cloneTrashRepo,
  loadQPFromTrash,
  loadQualityDefinitionSonarrFromTrash,
  loadSonarrTrashCFs,
  transformTrashQPCFs,
  transformTrashQPToTemplate,
} from "./trash-guide";
import { ArrType, CFProcessing, MappedMergedTemplates } from "./types/common.types";
import { ConfigQualityProfile, InputConfigArrInstance, InputConfigIncludeItem, MergedConfigInstance } from "./types/config.types";
import { TrashQualityDefintion } from "./types/trashguide.types";
import { DEBUG_CREATE_FILES, IS_DRY_RUN } from "./util";

/**
 * Load data from trash, recyclarr, custom configs and merge.
 * Afterwards do sanitize and check against required configuration.
 * @param value
 * @param arrType
 */
const mergeConfigsAndTemplates = async (
  value: InputConfigArrInstance,
  arrType: ArrType,
): Promise<{ mergedCFs: CFProcessing; config: MergedConfigInstance }> => {
  const recyclarrTemplateMap = loadRecyclarrTemplates(arrType);
  const trashTemplates = await loadQPFromTrash(arrType);

  const recylarrMergedTemplates: MappedMergedTemplates = {
    custom_formats: [],
    quality_profiles: [],
  };

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
      `Found ${value.include.length} templates to include: [recyclarr]=${mappedIncludes.recyclarr.length}, [trash]=${mappedIncludes.trash.length} ...`,
    );

    mappedIncludes.recyclarr.forEach((e) => {
      const template = recyclarrTemplateMap.get(e.template);

      if (!template) {
        logger.warn(`Unknown recyclarr template requested: ${e.template}`);
        return;
      }

      if (template.custom_formats) {
        recylarrMergedTemplates.custom_formats?.push(...template.custom_formats);
      }

      if (template.quality_definition) {
        recylarrMergedTemplates.quality_definition = template.quality_definition;
      }

      if (template.quality_profiles) {
        for (const qp of template.quality_profiles) {
          recylarrMergedTemplates.quality_profiles.push(qp);
        }
      }

      // TODO Ignore recursive include for now
    });

    mappedIncludes.trash.forEach((e) => {
      const template = trashTemplates.get(e.template);

      if (!template) {
        logger.warn(`Unknown trash template requested: ${e.template}`);
        return;
      }

      recylarrMergedTemplates.quality_profiles.push(transformTrashQPToTemplate(template));
      recylarrMergedTemplates.custom_formats.push(transformTrashQPCFs(template));
    });
  }

  if (value.custom_formats) {
    recylarrMergedTemplates.custom_formats.push(...value.custom_formats);
  }

  if (value.quality_profiles) {
    recylarrMergedTemplates.quality_profiles.push(...value.quality_profiles);
  }

  const recyclarrProfilesMerged = recylarrMergedTemplates.quality_profiles.reduce<Map<string, ConfigQualityProfile>>((p, c) => {
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

  recylarrMergedTemplates.quality_profiles = Array.from(recyclarrProfilesMerged.values());

  recylarrMergedTemplates.quality_profiles = filterInvalidQualityProfiles(recylarrMergedTemplates.quality_profiles);

  const trashCFs = await loadSonarrTrashCFs(arrType);

  const localFileCFs = await loadLocalCfs();
  const configCFDefinition = loadCFFromConfig();
  const mergedCFs = mergeCfSources([trashCFs, localFileCFs, configCFDefinition]);

  const validatedConfig = validateConfig(recylarrMergedTemplates);
  return { mergedCFs: mergedCFs, config: validatedConfig };
};

const pipeline = async (value: InputConfigArrInstance, arrType: ArrType) => {
  const api = getArrApi();

  const { config, mergedCFs } = await mergeConfigsAndTemplates(value, arrType);

  const idsToManage = calculateCFsToManage(config);

  logger.debug(Array.from(idsToManage), `CustomFormats to manage`);

  // TODO here the configs should be merged -> sanitize + check

  const serverCFs = await loadServerCustomFormats();
  logger.info(`CustomFormats on server: ${serverCFs.length}`);

  const serverCFMapping = serverCFs.reduce((p, c) => {
    p.set(c.name!, c);
    return p;
  }, new Map<string, MergedCustomFormatResource>());

  await manageCf(mergedCFs, serverCFMapping, idsToManage);
  logger.info(`CustomFormats synchronized`);

  const qualityDefinition = config.quality_definition?.type;

  if (qualityDefinition) {
    const qdSonarr = await loadQualityDefinitionFromServer();
    let qdTrash: TrashQualityDefintion;

    switch (qualityDefinition) {
      case "anime":
        qdTrash = await loadQualityDefinitionSonarrFromTrash("anime", "SONARR");
        break;
      case "series":
        qdTrash = await loadQualityDefinitionSonarrFromTrash("series", "SONARR");
        break;
      case "movie":
        qdTrash = await loadQualityDefinitionSonarrFromTrash("movie", "RADARR");
        break;
      default:
        throw new Error(`Unsupported quality defintion ${qualityDefinition}`);
    }

    const { changeMap, create, restData } = calculateQualityDefinitionDiff(qdSonarr, qdTrash);

    if (changeMap.size > 0) {
      if (IS_DRY_RUN) {
        logger.info("DryRun: Would update QualityDefinitions.");
      } else {
        logger.info(`Diffs in quality definitions found`, changeMap.values());
        await api.v3QualitydefinitionUpdateUpdate(restData as any); // Ignore types
        logger.info(`Updated QualityDefinitions`);
      }
    } else {
      logger.info(`QualityDefinitions do not need update!`);
    }

    if (create.length > 0) {
      logger.info(`Currently not implemented this case for quality definitions.`);
    }
  }

  // merge CFs of templates and custom CFs into one mapping of QualityProfile -> CFs + Score
  // TODO traversing the merged templates probably to often once should be enough. Loop once and extract a couple of different maps, arrays as needed. Future optimization.
  // TODO double config
  const cfToQualityProfiles = mapQualityProfiles(mergedCFs, config.custom_formats, config);

  // merge profiles from recyclarr templates into one
  const qualityProfilesMerged = config.quality_profiles.reduce((p, c) => {
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

  // calculate diff from server <-> what we want to be there

  const qpServer = await loadQualityProfilesFromServer();

  const { changedQPs, create, noChanges } = await calculateQualityProfilesDiff(qualityProfilesMerged, cfToQualityProfiles, qpServer);

  if (DEBUG_CREATE_FILES) {
    create.concat(changedQPs).forEach((e, i) => {
      fs.writeFileSync(`debug/test${i}.json`, JSON.stringify(e, null, 2), "utf-8");
    });
  }

  logger.info(`QualityProfiles: Create: ${create.length}, Update: ${changedQPs.length}, Unchanged: ${noChanges.length}`);

  if (!IS_DRY_RUN) {
    for (const element of create) {
      try {
        const newProfile = await api.v3QualityprofileCreate(element as any); // Ignore types
        logger.info(`Created QualityProfile: ${newProfile.name}`);
      } catch (error: any) {
        logger.error(`Failed creating QualityProfile (${element.name})`);
        throw error;
      }
    }

    for (const element of changedQPs) {
      try {
        const newProfile = await api.v3QualityprofileUpdate("" + element.id, element as any); // Ignore types
        logger.info(`Updated QualityProfile: ${newProfile.name}`);
      } catch (error: any) {
        logger.error(`Failed updating QualityProfile (${element.name})`);
        throw error;
      }
    }
  } else if (create.length > 0 || changedQPs.length > 0) {
    logger.info("DryRun: Would create/update QualityProfiles.");
  }
  /*
  - load trash
  - load custom resources
  - merge stuff together to see what actually needs to be done
  - create/update CFs
  - future: somehow track managed CFs?
  - create/update quality profiles
  - future: quality definitions
  */
};

const run = async () => {
  if (IS_DRY_RUN) {
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
      await configureSonarrApi(instance.base_url, instance.api_key);
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
      await configureRadarrApi(instance.base_url, instance.api_key);
      await pipeline(instance, "RADARR");
      unsetApi();
    }
  }
};

run();
