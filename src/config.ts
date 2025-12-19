import { existsSync, readFileSync } from "node:fs";
import yaml from "yaml";
import { NamingConfigResource as RadarrNamingConfigResource } from "./__generated__/radarr/data-contracts";
import { NamingConfigResource as SonarrNamingConfigResource } from "./__generated__/sonarr/data-contracts";
import { getHelpers } from "./env";
import { loadLocalRecyclarrTemplate } from "./local-importer";
import { logger } from "./logger";
import { filterInvalidQualityProfiles } from "./quality-profiles";
import { loadRecyclarrTemplates } from "./recyclarr-importer";
import {
  loadNamingFromTrashRadarr,
  loadNamingFromTrashSonarr,
  loadQPFromTrash,
  loadTrashCustomFormatGroups,
  transformTrashCFGroups,
  transformTrashQPCFGroups,
  transformTrashQPCFs,
  transformTrashQPToTemplate,
} from "./trash-guide";
import { ArrType, MappedMergedTemplates, MappedTemplates } from "./types/common.types";
import {
  ConfigArrInstance,
  ConfigCustomFormat,
  ConfigIncludeItem,
  ConfigQualityProfile,
  ConfigSchema,
  InputConfigArrInstance,
  InputConfigCustomFormat,
  InputConfigCustomFormatGroup,
  InputConfigIncludeItem,
  InputConfigInstance,
  InputConfigMetadataProfile,
  InputConfigSchema,
  MediaNamingType,
  MergedConfigInstance,
} from "./types/config.types";
import { TrashCFGroupMapping, TrashQP } from "./types/trashguide.types";
import { isUrl, loadTemplateFromUrl } from "./url-template-importer";
import { cloneWithJSON } from "./util";

let config: ConfigSchema;
let secrets: any;

const secretsTag = {
  identify: (value: any) => value instanceof String,
  tag: "!secret",
  resolve(str: string) {
    return getSecrets()[str];
  },
};

const envTag = {
  identify: (value: any) => value instanceof String,
  tag: "!env",
  resolve(str: string) {
    const envValue = process.env[str];

    if (!envValue) {
      const message = `Environment variables '${str}' is not set.`;
      logger.error(message);
      throw new Error(message);
    }

    return envValue;
  },
};

const fileTag = {
  identify: (value: any) => value instanceof String,
  tag: "!file",
  resolve(path: string) {
    if (!existsSync(path)) {
      logger.error(`File "${path}" specified in the config does not exist.`);
      throw new Error("File needed by the config not found.");
    }
    return readFileSync(path, "utf8");
  }
};

// TODO some schema validation. For now only check if something can be imported
export const getConfig = (): ConfigSchema => {
  if (config) {
    return config;
  }

  const configLocation = getHelpers().configLocation;

  if (!existsSync(configLocation)) {
    logger.error(`Config file in location "${configLocation}" does not exists.`);
    throw new Error("Config file not found.");
  }

  const file = readFileSync(configLocation, "utf8");

  const inputConfig = yaml.parse(file, { customTags: [secretsTag, envTag, fileTag] }) as InputConfigSchema;

  config = transformConfig(inputConfig);

  return config;
};

export const readConfigRaw = (): object => {
  const configLocation = getHelpers().configLocation;

  if (!existsSync(configLocation)) {
    logger.error(`Config file in location "${configLocation}" does not exists.`);
    throw new Error("Config file not found.");
  }

  const file = readFileSync(configLocation, "utf8");

  const inputConfig = yaml.parse(file, { customTags: [secretsTag, envTag, fileTag] });

  return inputConfig;
};

export const getSecrets = () => {
  if (secrets) {
    return secrets;
  }

  const secretLocation = getHelpers().secretLocation;

  if (!existsSync(secretLocation)) {
    logger.error(`Secret file in location "${secretLocation}" does not exists.`);
    throw new Error("Secret file not found.");
  }

  const file = readFileSync(secretLocation, "utf8");
  config = yaml.parse(file);
  return config;
};

// 2024-09-30: Recyclarr assign_scores_to adjustments
export const transformConfig = (input: InputConfigSchema): ConfigSchema => {
  const mappedCustomFormats = (arrInput: Record<string, InputConfigArrInstance> = {}): Record<string, ConfigArrInstance> => {
    return Object.entries(arrInput).reduce(
      (p, [key, value]) => {
        const mappedCustomFormats = (value.custom_formats || []).map<ConfigCustomFormat>((cf) => {
          const { assign_scores_to, quality_profiles, ...rest } = cf;

          if (quality_profiles) {
            logger.warn(
              `Deprecated: (Instance '${key}') For custom_formats please rename 'quality_profiles' to 'assign_scores_to'. See recyclarr v7.2.0`,
            );
          }

          const mapped_assign_scores = quality_profiles ?? assign_scores_to;

          if (!mapped_assign_scores) {
            logger.debug(`No assign_scores_to or quality_profiles defined for CF entry '${cf.trash_ids}' in instance '${key}'`);
          }

          return { ...rest, assign_scores_to: mapped_assign_scores };
        });

        p[key] = { ...value, include: value.include?.map(parseIncludes), custom_formats: mappedCustomFormats };
        return p;
      },
      {} as Record<string, ConfigArrInstance>,
    );
  };

  return {
    ...input,
    radarr: mappedCustomFormats(input.radarr),
    sonarr: mappedCustomFormats(input.sonarr),
    whisparr: mappedCustomFormats(input.whisparr),
    readarr: mappedCustomFormats(input.readarr),
    lidarr: mappedCustomFormats(input.lidarr),
  };
};

export const parseIncludes = (input: InputConfigIncludeItem): ConfigIncludeItem => ({
  template: input.template,
  source: input.source ?? "RECYCLARR",
});

export const validateConfig = (input: InputConfigInstance): MergedConfigInstance => {
  // TODO add validation and warnings like assign_scores. Setting default values not always the best

  const preferredRatio = input.quality_definition?.preferred_ratio;

  if (preferredRatio != null && (preferredRatio < 0 || preferredRatio > 1)) {
    logger.warn(`QualityDefinition: PreferredRatio must be between 0 and 1. Ignoring`);
    delete input.quality_definition!["preferred_ratio"];
  }

  return {
    ...input,
    custom_formats: (input.custom_formats || []).map((e) => ({
      trash_ids: e.trash_ids,
      assign_scores_to: e.assign_scores_to ?? e.quality_profiles ?? [],
    })),
  };
};

const expandAndAppendCustomFormatGroups = (
  customFormatGroups: InputConfigCustomFormatGroup[] | undefined,
  trashCFGroupMapping: TrashCFGroupMapping,
  mergedTemplates: MappedMergedTemplates,
) => {
  if (!customFormatGroups || customFormatGroups.length === 0) return;
  const expanded = transformTrashCFGroups(trashCFGroupMapping, customFormatGroups);
  if (expanded.length > 0) {
    logger.debug(`Expanded and appended ${expanded.length} custom formats from customFormatGroups`);
    mergedTemplates.custom_formats.push(...expanded);
  }
};

const includeRecyclarrTemplate = (
  template: MappedTemplates,
  {
    mergedTemplates,
    trashCFGroupMapping,
  }: {
    mergedTemplates: MappedMergedTemplates;
    trashCFGroupMapping: TrashCFGroupMapping;
  },
) => {
  // First expand and append group custom formats
  if (template.custom_format_groups) {
    expandAndAppendCustomFormatGroups(template.custom_format_groups, trashCFGroupMapping, mergedTemplates);
  }
  // Then push direct custom formats after, so they always win
  if (template.custom_formats) {
    mergedTemplates.custom_formats.push(...template.custom_formats);
  }

  if (template.quality_definition) {
    mergedTemplates.quality_definition = {
      ...mergedTemplates.quality_definition,
      ...template.quality_definition,
      qualities: [...(mergedTemplates.quality_definition?.qualities || []), ...(template.quality_definition.qualities || [])],
    };
  }

  if (template.quality_profiles) {
    for (const qp of template.quality_profiles) {
      mergedTemplates.quality_profiles.push(qp);
    }
  }

  if (template.metadata_profiles) {
    mergedTemplates.metadata_profiles = [...(mergedTemplates.metadata_profiles || []), ...template.metadata_profiles];
  }

  if (template.delete_unmanaged_metadata_profiles) {
    mergedTemplates.delete_unmanaged_metadata_profiles = template.delete_unmanaged_metadata_profiles;
  }

  if (template.media_management) {
    mergedTemplates.media_management = { ...mergedTemplates.media_management, ...template.media_management };
  }

  if (template.media_naming) {
    mergedTemplates.media_naming = { ...mergedTemplates.media_naming, ...template.media_naming };
  }

  if (template.media_naming_api) {
    mergedTemplates.media_naming_api = { ...mergedTemplates.media_naming_api, ...template.media_naming_api };
  }

  if (template.customFormatDefinitions) {
    if (Array.isArray(template.customFormatDefinitions)) {
      mergedTemplates.customFormatDefinitions = [...(mergedTemplates.customFormatDefinitions || []), ...template.customFormatDefinitions];
    } else {
      logger.warn(`CustomFormatDefinitions in template must be an array. Ignoring.`);
    }
  }

  if (template.root_folders) {
    if (Array.isArray(template.root_folders)) {
      mergedTemplates.root_folders = [...(mergedTemplates.root_folders || []), ...template.root_folders];
    } else {
      logger.warn(`Root folders in template must be an array. Ignoring.`);
    }
  }

  if (template.delay_profiles) {
    mergedTemplates.delay_profiles = template.delay_profiles;
  }

  // TODO Ignore recursive include for now
  if (template.include) {
    logger.warn(`Recursive includes not supported at the moment. Ignoring.`);
  }
};

// TODO: local TRaSH-Guides QP templates do not work yet
const includeTrashTemplate = (
  template: TrashQP,
  {
    mergedTemplates,
    trashCFGroupMapping,
    customFormatGroups,
  }: {
    mergedTemplates: MappedMergedTemplates;
    trashCFGroupMapping: TrashCFGroupMapping;
    customFormatGroups: InputConfigCustomFormatGroup[];
  },
) => {
  mergedTemplates.quality_profiles.push(transformTrashQPToTemplate(template));
  mergedTemplates.custom_formats.push(transformTrashQPCFs(template));

  // For TrashGuide profiles, check and include default CF groups
  const requiredCFsFromCFGroups = transformTrashQPCFGroups(template, trashCFGroupMapping);

  const numberOfCfsLoaded = requiredCFsFromCFGroups.reduce((p, c) => {
    (c.trash_ids || []).forEach((id) => p.add(id));
    return p;
  }, new Set<string>());

  // Log how many CFs were loaded from groups
  logger.info(`Loaded ${numberOfCfsLoaded.size} default CFs from CF-Groups for TRaSH-Guide profile '${template.name}'`);
  mergedTemplates.custom_formats.push(...requiredCFsFromCFGroups);
};

const includeTemplateOrderDefault = async (
  include: InputConfigIncludeItem[],
  {
    recyclarr,
    local,
    trash,
    trashCFGroupMapping,
  }: {
    recyclarr: Map<string, MappedTemplates>;
    local: Map<string, MappedTemplates>;
    trash: Map<string, TrashQP>;
    trashCFGroupMapping: TrashCFGroupMapping;
  },
  { mergedTemplates }: { mergedTemplates: MappedMergedTemplates },
) => {
  const mappedIncludes = include.reduce<{
    local: InputConfigIncludeItem[];
    recyclarr: InputConfigIncludeItem[];
    trash: InputConfigIncludeItem[];
    url: InputConfigIncludeItem[];
  }>(
    (previous, current) => {
      // Check if template is a URL - all URLs go to url array, source is passed to loader
      if (isUrl(current.template)) {
        previous.url.push(current);
        return previous;
      }

      switch (current.source) {
        case "TRASH":
          if (trash.has(current.template)) {
            previous.trash.push(current);
          } else {
            logger.warn(`Included 'TRASH' template: ${current.template} not found.`);
          }
          break;
        case "RECYCLARR":
        // HINT: hard separation would break current default functionality.
        // if (recyclarr.has(current.template)) {
        //   previous.recyclarr.push(current);
        // } else {
        //   logger.warn(`Included 'RECYCLARR' template: ${current.template} not found.`);
        // }
        // break;
        case undefined:
          let recyclarrFound = false;
          let localFound = false;

          if (recyclarr.has(current.template)) {
            recyclarrFound = true;
          }

          if (local.has(current.template)) {
            localFound = true;
          }

          if (recyclarrFound === true && localFound === true) {
            logger.warn(`Found matching 'RECYCLARR' and 'LOCAL' template for '${current.template}. Using 'LOCAL'.`);
            previous.local.push(current);
          } else if (recyclarrFound === true) {
            previous.recyclarr.push(current);
          } else if (localFound === true) {
            previous.local.push(current);
          } else {
            logger.warn(`No matching 'RECYCLARR' or 'LOCAL' template for '${current.template}'`);
          }

          break;
        default:
          logger.warn(`Unknown source type for template requested: '${current.source}'. Ignoring.`);
      }

      return previous;
    },
    { recyclarr: [], trash: [], local: [], url: [] },
  );

  logger.info(
    `Found ${include.length} templates to include. Mapped to [recyclarr]=${mappedIncludes.recyclarr.length}, [local]=${mappedIncludes.local.length}, [trash]=${mappedIncludes.trash.length}, [url]=${mappedIncludes.url.length} ...`,
  );

  // Process URL templates
  for (const e of mappedIncludes.url) {
    const resolvedTemplate = await loadTemplateFromUrl(e.template, e.source);
    if (resolvedTemplate == null) {
      logger.warn(`Failed to load template from URL: '${e.template}'`);
      continue;
    }

    // Route to appropriate handler based on source
    if (e.source === "TRASH") {
      includeTrashTemplate(resolvedTemplate as TrashQP, { mergedTemplates, trashCFGroupMapping, customFormatGroups: [] });
    } else {
      includeRecyclarrTemplate(resolvedTemplate as MappedTemplates, { mergedTemplates, trashCFGroupMapping });
    }
  }

  mappedIncludes.trash.forEach((e) => {
    const resolvedTemplate = trash.get(e.template);
    if (resolvedTemplate == null) {
      logger.warn(`Unknown 'trash' template requested: '${e.template}'`);
      return;
    }
    includeTrashTemplate(resolvedTemplate, { mergedTemplates, trashCFGroupMapping, customFormatGroups: [] });
  });
  mappedIncludes.recyclarr.forEach((e) => {
    const resolvedTemplate = recyclarr.get(e.template);
    if (resolvedTemplate == null) {
      logger.warn(`Unknown 'recyclarr' template requested: '${e.template}'`);
      return;
    }
    includeRecyclarrTemplate(resolvedTemplate, { mergedTemplates, trashCFGroupMapping });
  });
  mappedIncludes.local.forEach((e) => {
    const resolvedTemplate = local.get(e.template);
    if (resolvedTemplate == null) {
      logger.warn(`Unknown 'local' template requested: '${e.template}'`);
      return;
    }
    includeRecyclarrTemplate(resolvedTemplate, { mergedTemplates, trashCFGroupMapping });
  });
};

const mergeAndReduceCustomFormats = (cfs: InputConfigCustomFormat[]) => {
  const idToQualityProfileToScore = new Map<string, Map<string, number | undefined>>();

  cfs.forEach((cf) => {
    if (!cf.trash_ids || cf.trash_ids.length === 0) {
      logger.info(
        `Custom format entry does not have trash_ids defined (empty trash_ids or not defined at all. Cleanup your config to remove this log). Entry: ${JSON.stringify(cf)}`,
      );
      return;
    }

    cf.trash_ids.forEach((id) => {
      if (!idToQualityProfileToScore.has(id)) {
        idToQualityProfileToScore.set(id, new Map());
      }

      const existing = idToQualityProfileToScore.get(id)!;

      [...(cf.quality_profiles || []), ...(cf.assign_scores_to || [])].forEach((qp) => {
        if (!existing.has(qp.name)) {
          existing.set(qp.name, qp.score);
        } else {
          const currentScore = existing.get(qp.name);

          if (qp.score != null && qp.score != currentScore) {
            existing.set(qp.name, qp.score);
          }
        }
      });
    });
  });

  return Array.from(idToQualityProfileToScore.entries()).map(([trashId, qualityProfiles]) => {
    const assign_scores_to = Array.from(qualityProfiles.entries()).map(([name, score]) => ({ name, score }));

    const result: InputConfigCustomFormat = {
      trash_ids: [trashId],
      assign_scores_to,
    };

    return result;
  });
};

/**
 * Load data from trash, recyclarr, custom configs and merge.
 * Afterwards do sanitize and check against required configuration.
 * @param instanceConfig
 * @param arrType
 */
export const mergeConfigsAndTemplates = async (
  globalConfig: InputConfigSchema,
  instanceConfig: InputConfigArrInstance,
  arrType: ArrType,
): Promise<{ config: MergedConfigInstance }> => {
  const localTemplateMap = loadLocalRecyclarrTemplate(arrType);
  let recyclarrTemplateMap: Map<string, MappedTemplates> = new Map();
  let trashTemplates: Map<string, TrashQP> = new Map();
  let trashCFGroupMapping: TrashCFGroupMapping = new Map();
  if (arrType === "RADARR" || arrType === "SONARR") {
    // TODO: separation maybe not the best. Maybe time to split up processing for each arrType
    recyclarrTemplateMap = loadRecyclarrTemplates(arrType);
    trashTemplates = await loadQPFromTrash(arrType);
    trashCFGroupMapping = await loadTrashCustomFormatGroups(arrType);
  }
  logger.debug(
    `Loaded ${recyclarrTemplateMap.size} Recyclarr templates, ${localTemplateMap.size} local templates and ${trashTemplates.size} trash templates.`,
  );
  const mergedTemplates: MappedMergedTemplates = {
    custom_formats: [],
    quality_profiles: [],
  };
  if (instanceConfig.include) {
    await includeTemplateOrderDefault(
      instanceConfig.include,
      {
        recyclarr: recyclarrTemplateMap,
        local: localTemplateMap,
        trash: trashTemplates,
        trashCFGroupMapping,
      },
      {
        mergedTemplates,
      },
    );
  }

  // Now handle instanceConfig custom_format_groups before direct custom_formats
  if (instanceConfig.custom_format_groups) {
    expandAndAppendCustomFormatGroups(instanceConfig.custom_format_groups, trashCFGroupMapping, mergedTemplates);
  }
  if (instanceConfig.custom_formats) {
    mergedTemplates.custom_formats.push(...instanceConfig.custom_formats);
  }

  if (instanceConfig.delete_unmanaged_custom_formats) {
    mergedTemplates.delete_unmanaged_custom_formats = instanceConfig.delete_unmanaged_custom_formats;
  }

  if (instanceConfig.delete_unmanaged_quality_profiles) {
    mergedTemplates.delete_unmanaged_quality_profiles = instanceConfig.delete_unmanaged_quality_profiles;
  }

  if (instanceConfig.quality_profiles) {
    mergedTemplates.quality_profiles.push(...instanceConfig.quality_profiles);
  }

  if (instanceConfig.media_management && Object.keys(instanceConfig.media_management).length > 0) {
    mergedTemplates.media_management = { ...mergedTemplates.media_management, ...instanceConfig.media_management };
  }

  if (instanceConfig.media_naming && Object.keys(instanceConfig.media_naming).length > 0) {
    mergedTemplates.media_naming_api = {
      ...mergedTemplates.media_naming_api,
      ...(await mapConfigMediaNamingToApi(arrType, instanceConfig.media_naming)),
    };
  }

  if (instanceConfig.media_naming_api && Object.keys(instanceConfig.media_naming_api).length > 0) {
    mergedTemplates.media_naming_api = { ...mergedTemplates.media_naming_api, ...instanceConfig.media_naming_api };
  }

  if (instanceConfig.quality_definition) {
    mergedTemplates.quality_definition = {
      ...mergedTemplates.quality_definition,
      ...instanceConfig.quality_definition,
      qualities: [...(mergedTemplates.quality_definition?.qualities || []), ...(instanceConfig.quality_definition.qualities || [])],
    };
  }

  if (globalConfig.customFormatDefinitions) {
    if (Array.isArray(globalConfig.customFormatDefinitions)) {
      mergedTemplates.customFormatDefinitions = [
        ...(mergedTemplates.customFormatDefinitions || []),
        ...globalConfig.customFormatDefinitions,
      ];
    } else {
      logger.warn(`CustomFormatDefinitions in global config file must be an array. Ignoring.`);
    }
  }

  if (instanceConfig.customFormatDefinitions) {
    if (Array.isArray(instanceConfig.customFormatDefinitions)) {
      mergedTemplates.customFormatDefinitions = [
        ...(mergedTemplates.customFormatDefinitions || []),
        ...instanceConfig.customFormatDefinitions,
      ];
    } else {
      logger.warn(`CustomFormatDefinitions in instance config file must be an array. Ignoring.`);
    }
  }

  // Rename quality profiles
  if (instanceConfig.renameQualityProfiles && instanceConfig.renameQualityProfiles.length > 0) {
    const renameOrder: string[] = [];

    instanceConfig.renameQualityProfiles.forEach((e) => {
      const renameFrom = e.from;
      const renameTo = e.to;

      renameOrder.push(`'${renameFrom}' -> '${renameTo}'`);

      let renamedQPReferences = 0;
      let renamedCFAssignments = 0;

      mergedTemplates.quality_profiles.forEach((p) => {
        if (p.name === renameFrom) {
          p.name = renameTo;
          renamedQPReferences += 1;
        }
      });

      mergedTemplates.custom_formats.forEach((p) => {
        p.assign_scores_to?.some((cf) => {
          if (cf.name === renameFrom) {
            cf.name = renameTo;
            renamedCFAssignments += 1;
            return true;
          }
          return false;
        });
      });

      if (renamedQPReferences + renamedCFAssignments > 0) {
        logger.debug(
          `Renamed profile from '${renameFrom}' to '${renameTo}'. Found QP references ${renamedQPReferences}, CF references ${renamedCFAssignments}`,
        );
      }
    });

    if (renameOrder.length > 0) {
      logger.debug(`Will rename quality profiles in this order: ${renameOrder}`);
    }
  }

  // Cloning quality profiles
  if (instanceConfig.cloneQualityProfiles && instanceConfig.cloneQualityProfiles.length > 0) {
    const cloneOrder: string[] = [];

    const clonedReorderedProfiles: ConfigQualityProfile[] = [];

    instanceConfig.cloneQualityProfiles.forEach((e) => {
      const cloneSource = e.from;
      const cloneTarget = e.to;

      cloneOrder.push(`'${cloneSource}' -> '${cloneTarget}'`);

      let cloneQPReferences = 0;
      let cloneCFAssignments = 0;

      mergedTemplates.quality_profiles.forEach((p) => {
        clonedReorderedProfiles.push(p);

        if (p.name === cloneSource) {
          const clonedQP = cloneWithJSON(p);
          clonedQP.name = cloneTarget;
          clonedReorderedProfiles.push(clonedQP);
          cloneQPReferences++;
        }
      });

      mergedTemplates.custom_formats.forEach((p) => {
        const cf = p.assign_scores_to?.find((cf) => {
          if (cf.name === cloneSource) {
            cloneCFAssignments++;
            return true;
          }
          return false;
        });

        if (cf) {
          p.assign_scores_to?.push({ name: cloneTarget, score: cf.score });
        }
      });

      if (cloneQPReferences + cloneCFAssignments > 0) {
        logger.debug(
          `Cloning profile: source '${cloneSource}' - target '${cloneTarget}'. Found QP references ${cloneQPReferences}, CF references ${cloneCFAssignments}`,
        );
      }
    });

    mergedTemplates.quality_profiles = clonedReorderedProfiles;

    if (cloneOrder.length > 0) {
      logger.debug(`Will clone quality profiles in this order: ${cloneOrder}`);
    }
  }

  const recyclarrProfilesMerged = mergedTemplates.quality_profiles.reduce<Map<string, ConfigQualityProfile>>((p, c) => {
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

  mergedTemplates.quality_profiles = Array.from(recyclarrProfilesMerged.values());

  mergedTemplates.quality_profiles = filterInvalidQualityProfiles(mergedTemplates.quality_profiles);

  // merge profiles from recyclarr templates into one
  const qualityProfilesMerged = mergedTemplates.quality_profiles.reduce((p, c) => {
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

  mergedTemplates.quality_profiles = Array.from(qualityProfilesMerged.values());

  if (instanceConfig.metadata_profiles) {
    mergedTemplates.metadata_profiles = [...(mergedTemplates.metadata_profiles || []), ...instanceConfig.metadata_profiles];

    // Merge by name: if a profile with the same name exists in both template and instance,
    // instance config takes precedence (overwrites)
    const metadataProfilesByName = new Map<string, InputConfigMetadataProfile>();

    for (const profile of mergedTemplates.metadata_profiles) {
      metadataProfilesByName.set(profile.name, profile);
    }

    mergedTemplates.metadata_profiles = Array.from(metadataProfilesByName.values());
  }

  if (instanceConfig.delete_unmanaged_metadata_profiles) {
    const templateIgnore = mergedTemplates.delete_unmanaged_metadata_profiles?.ignore ?? [];
    const instanceIgnore = instanceConfig.delete_unmanaged_metadata_profiles.ignore ?? [];
    const mergedIgnore = [...new Set([...templateIgnore, ...instanceIgnore])];

    mergedTemplates.delete_unmanaged_metadata_profiles = {
      enabled: instanceConfig.delete_unmanaged_metadata_profiles.enabled,
      ignore: mergedIgnore,
    };
  }

  if (instanceConfig.root_folders) {
    mergedTemplates.root_folders = [...(mergedTemplates.root_folders || []), ...instanceConfig.root_folders];
  }

  if (mergedTemplates.root_folders) {
    // cleanup duplicates by path
    const seenPaths = new Set<string>();
    mergedTemplates.root_folders = mergedTemplates.root_folders.filter((folder) => {
      const path = typeof folder === "string" ? folder : folder.path;
      if (seenPaths.has(path)) {
        return false;
      }
      seenPaths.add(path);
      return true;
    });
  }

  // Overwrite delay_profiles if defined in instanceConfig
  if (instanceConfig.delay_profiles) {
    mergedTemplates.delay_profiles = instanceConfig.delay_profiles;
  }

  // Merge download_clients if defined in instanceConfig
  if (instanceConfig.download_clients) {
    const existingData = mergedTemplates.download_clients?.data || [];
    const instanceData = instanceConfig.download_clients.data || [];
    const existingDeleteManaged = mergedTemplates.download_clients?.delete_unmanaged;
    const instanceDeleteManaged = instanceConfig.download_clients.delete_unmanaged;
    const existingConfig = mergedTemplates.download_clients?.config;
    const instanceConfig_ = instanceConfig.download_clients.config;

    mergedTemplates.download_clients = {
      data: [...existingData, ...instanceData],
      update_password: instanceConfig.download_clients.update_password,
      delete_unmanaged: instanceDeleteManaged ? instanceDeleteManaged : existingDeleteManaged,
      config: instanceConfig_ ? { ...existingConfig, ...instanceConfig_ } : existingConfig,
    };
  }

  if (mergedTemplates.custom_formats && mergedTemplates.custom_formats.length > 0) {
    // Merge custom formats with same trash_ids
    mergedTemplates.custom_formats = mergeAndReduceCustomFormats(mergedTemplates.custom_formats);
  }

  const validatedConfig = validateConfig(mergedTemplates);
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

const mapConfigMediaNamingToApi = async (arrType: ArrType, mediaNaming: MediaNamingType): Promise<any | null> => {
  if (arrType === "RADARR") {
    const trashNaming = await loadNamingFromTrashRadarr();

    if (trashNaming == null) {
      return null;
    }

    const folderFormat = mediaNamingToApiWithLog("RADARR", mediaNaming.folder, trashNaming.folder, "mediaNaming.folder");
    const standardFormat = mediaNamingToApiWithLog("RADARR", mediaNaming.movie?.standard, trashNaming.file, "mediaNaming.movie.standard");

    const apiObject: RadarrNamingConfigResource = {
      ...(folderFormat && { movieFolderFormat: folderFormat }),
      ...(standardFormat && { standardMovieFormat: standardFormat }),
      ...(mediaNaming.movie?.rename != null && { renameMovies: mediaNaming.movie?.rename === true }),
    };

    logger.debug(apiObject, `Mapped mediaNaming to API:`);
    return apiObject;
  }

  if (arrType === "SONARR") {
    const trashNaming = await loadNamingFromTrashSonarr();

    if (trashNaming == null) {
      return null;
    }

    const seriesFormat = mediaNamingToApiWithLog("SONARR", mediaNaming.series, trashNaming.series, "mediaNaming.series");
    const seasonsFormat = mediaNamingToApiWithLog("SONARR", mediaNaming.season, trashNaming.season, "mediaNaming.season");
    const standardFormat = mediaNamingToApiWithLog(
      "SONARR",
      mediaNaming.episodes?.standard,
      trashNaming.episodes.standard,
      "mediaNaming.episodes.standard",
    );
    const dailyFormat = mediaNamingToApiWithLog(
      "SONARR",
      mediaNaming.episodes?.daily,
      trashNaming.episodes.daily,
      "mediaNaming.episodes.daily",
    );
    const animeFormat = mediaNamingToApiWithLog(
      "SONARR",
      mediaNaming.episodes?.anime,
      trashNaming.episodes.anime,
      "mediaNaming.episodes.anime",
    );

    const apiObject: SonarrNamingConfigResource = {
      ...(seriesFormat && { seriesFolderFormat: seriesFormat }),
      ...(seasonsFormat && { seasonFolderFormat: seasonsFormat }),
      ...(standardFormat && { standardEpisodeFormat: standardFormat }),
      ...(dailyFormat && { dailyEpisodeFormat: dailyFormat }),
      ...(animeFormat && { animeEpisodeFormat: animeFormat }),
      ...(mediaNaming.episodes?.rename != null && { renameEpisodes: mediaNaming.episodes?.rename === true }),
    };

    logger.debug(apiObject, `Mapped mediaNaming to API:`);

    return apiObject;
  }

  logger.warn(`MediaNaming not supported for ${arrType}`);
};

const mediaNamingToApiWithLog = (arrType: ArrType, key: string | undefined, trashObject: any, label: string) => {
  if (key) {
    if (trashObject[key] == null) {
      logger.warn(`(${arrType}) Specified ${label} '${key}' could not be found in TRaSH-Guide. Check debug logs for available keys.`);
    } else {
      return trashObject[key];
    }
  }

  return null;
};
