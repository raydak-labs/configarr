import { existsSync, readFileSync } from "node:fs";
import yaml from "yaml";
import { logger } from "./logger";
import {
  ConfigArrInstance,
  ConfigCustomFormat,
  ConfigIncludeItem,
  ConfigSchema,
  InputConfigArrInstance,
  InputConfigIncludeItem,
  InputConfigInstance,
  InputConfigSchema,
  MergedConfigInstance,
} from "./types/config.types";
import { ROOT_PATH } from "./util";

const CONFIG_LOCATION = process.env.CONFIG_LOCATION ?? `${ROOT_PATH}/config.yml`;
const SECRETS_LOCATION = process.env.SECRETS_LOCATION ?? `${ROOT_PATH}/secrets.yml`;

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

  if (!existsSync(CONFIG_LOCATION)) {
    logger.error(`Config file in location "${CONFIG_LOCATION}" does not exists.`);
    throw new Error("Config file not found.");
  }

  const file = readFileSync(CONFIG_LOCATION, "utf8");

  const inputConfig = yaml.parse(file, { customTags: [secretsTag, envTag] }) as InputConfigSchema;

  config = transformConfig(inputConfig);

  return config;
};

export const readConfigRaw = (): object => {
  if (!existsSync(CONFIG_LOCATION)) {
    logger.error(`Config file in location "${CONFIG_LOCATION}" does not exists.`);
    throw new Error("Config file not found.");
  }

  const file = readFileSync(CONFIG_LOCATION, "utf8");

  const inputConfig = yaml.parse(file, { customTags: [secretsTag, envTag] });

  return inputConfig;
};

export const getSecrets = () => {
  if (secrets) {
    return secrets;
  }

  if (!existsSync(SECRETS_LOCATION)) {
    logger.error(`Secret file in location "${SECRETS_LOCATION}" does not exists.`);
    throw new Error("Secret file not found.");
  }

  const file = readFileSync(SECRETS_LOCATION, "utf8");
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
