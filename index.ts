import "dotenv/config";

import fs from "fs";
import { CustomFormatResource } from "./src/__generated__/generated-sonarr-api";
import { configureRadarrApi, configureSonarrApi, getArrApi, unsetApi } from "./src/api";
import { getConfig } from "./src/config";
import { calculateCFsToManage, loadLocalCfs, loadServerCustomFormats, manageCf, mergeCfSources } from "./src/custom-formats";
import { logHeading, logger } from "./src/logger";
import { calculateQualityDefinitionDiff, loadQualityDefinitionFromServer } from "./src/quality-definitions";
import {
  calculateQualityProfilesDiff,
  filterInvalidQualityProfiles,
  loadQualityProfilesFromServer,
  mapQualityProfiles,
} from "./src/quality-profiles";
import { cloneRecyclarrTemplateRepo, loadRecyclarrTemplates } from "./src/recyclarr-importer";
import { cloneTrashRepo, loadQualityDefinitionSonarrFromTrash, loadSonarrTrashCFs } from "./src/trash-guide";
import { ArrType, RecyclarrMergedTemplates, TrashQualityDefintion, YamlConfigInstance, YamlConfigQualityProfile } from "./src/types";
import { DEBUG_CREATE_FILES, IS_DRY_RUN } from "./src/util";

const pipeline = async (value: YamlConfigInstance, arrType: ArrType) => {
  const api = getArrApi();
  const recyclarrTemplateMap = loadRecyclarrTemplates(arrType);

  const recylarrMergedTemplates: RecyclarrMergedTemplates = {
    custom_formats: [],
    quality_profiles: [],
  };

  if (value.include) {
    logger.info(`Recyclarr includes ${value.include.length} templates`);
    logger.debug(
      value.include.map((e) => e.template),
      "Included templates",
    );

    value.include.forEach((e) => {
      const template = recyclarrTemplateMap.get(e.template);

      if (!template) {
        logger.info(`Unknown recyclarr template requested: ${e.template}`);
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
  }

  if (value.custom_formats) {
    recylarrMergedTemplates.custom_formats.push(...value.custom_formats);
  }

  if (value.quality_profiles) {
    recylarrMergedTemplates.quality_profiles.push(...value.quality_profiles);
  }

  // TODO "real" merge missing of profiles?

  recylarrMergedTemplates.quality_profiles = filterInvalidQualityProfiles(recylarrMergedTemplates.quality_profiles);

  const result = await loadLocalCfs();
  const trashCFs = await loadSonarrTrashCFs(arrType);
  const mergedCFs = mergeCfSources([trashCFs, result]);

  const idsToManage = calculateCFsToManage(recylarrMergedTemplates);

  logger.debug(Array.from(idsToManage), `CustomFormats to manage`);

  const serverCFs = await loadServerCustomFormats();
  logger.info(`CustomFormats on server: ${serverCFs.length}`);

  const serverCFMapping = serverCFs.reduce((p, c) => {
    p.set(c.name!, c);
    return p;
  }, new Map<string, CustomFormatResource>());

  await manageCf(mergedCFs, serverCFMapping, idsToManage);
  logger.info(`CustomFormats synchronized`);

  const qualityDefinition = recylarrMergedTemplates.quality_definition?.type;

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
  const cfToQualityProfiles = mapQualityProfiles(mergedCFs, recylarrMergedTemplates.custom_formats, recylarrMergedTemplates);

  // merge profiles from recyclarr templates into one
  const qualityProfilesMerged = recylarrMergedTemplates.quality_profiles.reduce((p, c) => {
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
  }, new Map<string, YamlConfigQualityProfile>());

  // calculate diff from server <-> what we want to be there

  const qpServer = await loadQualityProfilesFromServer();

  const { changedQPs, create, noChanges } = await calculateQualityProfilesDiff(
    mergedCFs,
    qualityProfilesMerged,
    cfToQualityProfiles,
    qpServer,
  );

  if (DEBUG_CREATE_FILES) {
    create.concat(changedQPs).forEach((e, i) => {
      fs.writeFileSync(`test${i}.json`, JSON.stringify(e, null, 2), "utf-8");
    });
  }

  logger.info(`QualityProfiles: Create: ${create.length}, Update: ${changedQPs.length}, Unchanged: ${noChanges.length}`);

  if (!IS_DRY_RUN) {
    for (const element of create) {
      try {
        const newProfile = await api.v3QualityprofileCreate(element as any); // Ignore types
        logger.info(`Created QualityProfile: ${newProfile.data.name}`);
      } catch (error: any) {
        let message;

        if (error.response) {
          logger.info(error.response);
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          message = `Failed creating QualityProfile (${element.name}): Data ${JSON.stringify(error.response.data)}`;
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          logger.info(error.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          logger.info("Error", error.message);
        }

        throw new Error(message);
      }
    }

    for (const element of changedQPs) {
      try {
        const newProfile = await api.v3QualityprofileUpdate("" + element.id, element as any); // Ignore types
        logger.info(`Updated QualityProfile: ${newProfile.data.name}`);
      } catch (error: any) {
        let message;

        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          message = `Failed updating QualityProfile (${element.name}): Data ${JSON.stringify(error.response.data)}`;
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          logger.info(error.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          logger.info("Error", error.message);
        }

        throw new Error(message);
      }
    }
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
  const applicationConfig = getConfig();

  await cloneRecyclarrTemplateRepo();
  await cloneTrashRepo();

  // TODO currently this has to be run sequentially because of the centrally configured api

  logHeading(`Processing Sonarr ...`);

  for (const instanceName in applicationConfig.sonarr) {
    const instance = applicationConfig.sonarr[instanceName];
    logger.info(`Processing Sonarr Instance: ${instanceName}`);
    await configureSonarrApi(instance.base_url, instance.api_key);
    await pipeline(instance, "SONARR");
    unsetApi();
  }

  if (
    typeof applicationConfig.sonarr === "object" &&
    !Array.isArray(applicationConfig.sonarr) &&
    applicationConfig.sonarr !== null &&
    Object.keys(applicationConfig.sonarr).length <= 0
  ) {
    logger.info(`No sonarr instances defined.`);
  }

  logHeading(`Processing Radarr ...`);

  for (const instanceName in applicationConfig.radarr) {
    logger.info(`Processing Radarr instance: ${instanceName}`);
    const instance = applicationConfig.radarr[instanceName];
    await configureRadarrApi(instance.base_url, instance.api_key);
    await pipeline(instance, "RADARR");
    unsetApi();
  }

  if (
    typeof applicationConfig.radarr === "object" &&
    !Array.isArray(applicationConfig.radarr) &&
    applicationConfig.radarr !== null &&
    Object.keys(applicationConfig.radarr).length <= 0
  ) {
    logger.info(`No radarr instances defined.`);
  }
};

run();
