import { existsSync, readFileSync } from "node:fs";
import yaml from "yaml";
import { getHelpers } from "./env";
import { loadLocalRecyclarrTemplate } from "./local-importer";
import { logger } from "./logger";
import { filterInvalidQualityProfiles } from "./quality-profiles";
import { loadRecyclarrTemplates } from "./recyclarr-importer";
import { loadQPFromTrash, transformTrashQPCFs, transformTrashQPToTemplate } from "./trash-guide";
import { ArrType, MappedMergedTemplates } from "./types/common.types";
import {
  ConfigArrInstance,
  ConfigCustomFormat,
  ConfigIncludeItem,
  ConfigQualityProfile,
  ConfigSchema,
  InputConfigArrInstance,
  InputConfigIncludeItem,
  InputConfigInstance,
  InputConfigSchema,
  MergedConfigInstance,
} from "./types/config.types";

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

  const inputConfig = yaml.parse(file, { customTags: [secretsTag, envTag] }) as InputConfigSchema;

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

  const inputConfig = yaml.parse(file, { customTags: [secretsTag, envTag] });

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
            throw new Error(
              `Mapping failed for profile ${key} -> custom format mapping (assign_scores_to or quality_profiles is missing. Use assign_scores_to)`,
            );
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
  };
};

export const parseIncludes = (input: InputConfigIncludeItem): ConfigIncludeItem => ({
  template: input.template,
  source: input.source ?? "RECYCLARR",
});

export const validateConfig = (input: InputConfigInstance): MergedConfigInstance => {
  // TODO add validation and warnings like assign_scores. Setting default values not always the best
  return {
    ...input,
    custom_formats: (input.custom_formats || []).map((e) => ({
      trash_ids: e.trash_ids,
      assign_scores_to: e.assign_scores_to ?? e.quality_profiles ?? [],
    })),
  };
};

/**
 * Load data from trash, recyclarr, custom configs and merge.
 * Afterwards do sanitize and check against required configuration.
 * @param value
 * @param arrType
 */
export const mergeConfigsAndTemplates = async (
  value: InputConfigArrInstance,
  arrType: ArrType,
): Promise<{ config: MergedConfigInstance }> => {
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
