import { readFileSync } from "fs";
import path from "path";
import yaml from "yaml";
import { YamlConfig } from "./types";

let config: YamlConfig;
let secrets: any;

const secretsTag = {
  identify: (value) => value instanceof String,
  tag: "!secret",
  resolve(str) {
    return getSecrets()[str];
  },
};

export const getConfig = (): YamlConfig => {
  if (config) {
    return config;
  }

  const BASE_PATH = path.resolve(process.cwd(), ".");
  const file = readFileSync(`${BASE_PATH}/config.yml`, "utf8");
  config = yaml.parse(file, { customTags: [secretsTag] }) as YamlConfig;
  return config;
};

export const getSecrets = () => {
  if (secrets) {
    return secrets;
  }

  const BASE_PATH = path.resolve(process.cwd(), ".");
  const file = readFileSync(`${BASE_PATH}/secrets.yml`, "utf8");
  config = yaml.parse(file);
  return config;
};
