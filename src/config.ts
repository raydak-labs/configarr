import { existsSync, readFileSync } from "fs";
import yaml from "yaml";
import { logger } from "./logger";
import { YamlConfig } from "./types";
import { ROOT_PATH } from "./util";

const CONFIG_LOCATION = process.env.CONFIG_LOCATION ?? `${ROOT_PATH}/config.yml`;
const SECRETS_LOCATION = process.env.SECRETS_LOCATION ?? `${ROOT_PATH}/secrets.yml`;
export const LOG_LEVEL = process.env.LOG_LEVEL ?? `info`;

let config: YamlConfig;
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
export const getConfig = (): YamlConfig => {
  if (config) {
    return config;
  }

  if (!existsSync(CONFIG_LOCATION)) {
    logger.error(`Config file in location "${CONFIG_LOCATION}" does not exists.`);
    throw new Error("Config file not found.");
  }

  const file = readFileSync(CONFIG_LOCATION, "utf8");
  config = yaml.parse(file, { customTags: [secretsTag, envTag] }) as YamlConfig;
  return config;
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
