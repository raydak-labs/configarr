import { readFileSync } from "fs";
import yaml from "yaml";
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

// TODO some schema validation. For now only check if something can be imported
export const getConfig = (): YamlConfig => {
  if (config) {
    return config;
  }

  const file = readFileSync(CONFIG_LOCATION, "utf8");
  config = yaml.parse(file, { customTags: [secretsTag] }) as YamlConfig;
  return config;
};

export const getSecrets = () => {
  if (secrets) {
    return secrets;
  }

  const file = readFileSync(SECRETS_LOCATION, "utf8");
  config = yaml.parse(file);
  return config;
};
