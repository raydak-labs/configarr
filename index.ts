import "dotenv/config";

import fs from "node:fs";
import { MergedCustomFormatResource } from "./src/__generated__/mergedTypes";
import { configureRadarrApi, configureSonarrApi, getArrApi, unsetApi } from "./src/api";
import { getConfig } from "./src/config";
import {
  calculateCFsToManage,
  loadCFFromConfig,
  loadLocalCfs,
  loadServerCustomFormats,
  manageCf,
  mergeCfSources,
} from "./src/custom-formats";
import { logHeading, logger } from "./src/logger";
import { calculateQualityDefinitionDiff, loadQualityDefinitionFromServer } from "./src/quality-definitions";
import {
  calculateQualityProfilesDiff,
  filterInvalidQualityProfiles,
  loadQualityProfilesFromServer,
  mapQualityProfiles,
} from "./src/quality-profiles";
import { cloneRecyclarrTemplateRepo, loadRecyclarrTemplates } from "./src/recyclarr-importer";
import {
  cloneTrashRepo,
  loadQPFromTrash,
  loadQualityDefinitionSonarrFromTrash,
  loadSonarrTrashCFs,
  transformTrashQPCFs,
  transformTrashQPToTemplate,
} from "./src/trash-guide";
import {
  ArrType,
  ConfigArrInstance,
  ConfigQualityProfile,
  MappedMergedTemplates,
  TrashQualityDefintion,
  YamlConfigIncludeRecyclarr,
  YamlConfigIncludeTrash,
} from "./src/types";
import { DEBUG_CREATE_FILES, IS_DRY_RUN } from "./src/util";

const pipeline = async (value: ConfigArrInstance, arrType: ArrType) => {
  const api = getArrApi();
  const recyclarrTemplateMap = loadRecyclarrTemplates(arrType);
  const trashTemplates = await loadQPFromTrash(arrType);

  const recylarrMergedTemplates: MappedMergedTemplates = {
    custom_formats: [],
    quality_profiles: [],
  };

  if (value.include) {
    logger.info(`Found ${value.include.length} templates to include ...`);

    const mappedIncludes = value.include.reduce<{ recyclarr: YamlConfigIncludeRecyclarr[]; trash: YamlConfigIncludeTrash[] }>(
      (previous, current) => {
        if (current.type == null) {
          previous.recyclarr.push(current as YamlConfigIncludeRecyclarr);
        } else {
          switch (current.type) {
            case "TRASH":
              previous.trash.push(current);
              break;
            case "RECYCLARR":
              previous.recyclarr.push(current as YamlConfigIncludeRecyclarr);
              break;
            default:
              logger.warn(`Unknown type for template requested: ${(current as any).type}. Ignoring.`);
          }
        }

        return previous;
      },
      { recyclarr: [], trash: [] },
    );

    logger.debug(mappedIncludes.recyclarr, `Included ${mappedIncludes.recyclarr.length} templates [recyclarr]`);
    logger.debug(mappedIncludes.trash, `Included ${mappedIncludes.trash.length} templates [trash]`);

    mappedIncludes.recyclarr.forEach((e) => {
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

    mappedIncludes.trash.forEach((e) => {
      const template = trashTemplates.get(e.id);

      if (!template) {
        logger.info(`Unknown trash template requested: ${e.id}`);
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

  const idsToManage = calculateCFsToManage(recylarrMergedTemplates);

  logger.debug(Array.from(idsToManage), `CustomFormats to manage`);

  const serverCFs = await loadServerCustomFormats();
  logger.info(`CustomFormats on server: ${serverCFs.length}`);

  const serverCFMapping = serverCFs.reduce((p, c) => {
    p.set(c.name!, c);
    return p;
  }, new Map<string, MergedCustomFormatResource>());

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
