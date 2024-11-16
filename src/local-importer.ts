import { default as fs } from "node:fs";
import path from "node:path";
import yaml from "yaml";
import { getConfig } from "./config";
import { logger } from "./logger";
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
    logger.info(`Provided local templates path '${config.localCustomFormatsPath}' does not exist.`);
    return null;
  }

  return customPath;
};

export const loadLocalRecyclarrTemplate = (arrType: ArrType): Map<string, MappedTemplates> => {
  const map = new Map<string, RecyclarrTemplates>();

  const fillMap = (path: string) => {
    const files = fs.readdirSync(`${path}`).filter((fn) => fn.endsWith("yaml") || fn.endsWith("yml"));

    files.forEach((f) => map.set(f.substring(0, f.lastIndexOf(".")), yaml.parse(fs.readFileSync(`${path}/${f}`, "utf8"))));
  };

  const localPath = getLocalTemplatePath();

  if (localPath) {
    fillMap(localPath);
  }

  logger.debug(`Found ${map.size} local templates.`);

  return new Map(
    Array.from(map, ([k, v]) => {
      const customFormats = v.custom_formats?.map((cf) => {
        // Changes from Recyclarr 7.2.0: https://github.com/recyclarr/recyclarr/releases/tag/v7.2.0
        if (cf.assign_scores_to == null && cf.quality_profiles == null) {
          logger.warn(`Local Template "${k}" does not provide correct profile for custom format. Ignoring.`);
        }

        if (cf.quality_profiles) {
          logger.warn(
            `Deprecated: (Local Template '${k}') For custom_formats please rename 'quality_profiles' to 'assign_scores_to'. See recyclarr v7.2.0`,
          );
        }
        return { ...cf, assign_scores_to: cf.assign_scores_to ?? cf.quality_profiles ?? [] };
      });

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
