import { default as fs } from "node:fs";
import path from "node:path";
import yaml from "yaml";
import { getConfig } from "./config";
import { logger } from "./logger";
import { normalizeTemplateCustomFormats } from "./templateCustomFormats";
import { ArrType, MappedTemplates } from "./types/common.types";
import { RecyclarrTemplates } from "./types/recyclarr.types";

export const getLocalTemplatePath = () => {
  const config = getConfig();

  if (config.localConfigTemplatesPath == null) {
    logger.debug(`No local templates specified. Skipping.`);
    return null;
  }

  const customPath = path.resolve(config.localConfigTemplatesPath);

  if (!fs.existsSync(customPath)) {
    logger.info(`Provided local templates path '${config.localConfigTemplatesPath}' does not exist.`);
    return null;
  }

  return customPath;
};

export const loadLocalRecyclarrTemplate = (arrType: ArrType): Map<string, MappedTemplates> => {
  const map = new Map<string, RecyclarrTemplates>();

  const fillMap = (path: string) => {
    const files = fs.readdirSync(`${path}`).filter((fn) => fn.endsWith("yaml") || fn.endsWith("yml"));

    files.forEach((f) => {
      const fileContent = yaml.parse(fs.readFileSync(`${path}/${f}`, "utf8"));

      if (fileContent == null) {
        logger.warn(`Local template content of '${f}' is empty. Ignoring.`);
      } else {
        map.set(f.substring(0, f.lastIndexOf(".")), fileContent);
      }
    });
  };

  const localPath = getLocalTemplatePath();

  if (localPath) {
    fillMap(localPath);
  }

  logger.debug(`Found ${map.size} local templates.`);

  return new Map(
    Array.from(map, ([k, v]) => {
      const customFormats = normalizeTemplateCustomFormats(v.custom_formats, "Local Template", k);

      return [
        k,
        {
          ...v,
          custom_formats: customFormats,
        },
      ];
    }),
  );
};
