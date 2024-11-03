import { default as fs } from "node:fs";
import path from "node:path";
import yaml from "yaml";
import { getConfig } from "./config";
import { logger } from "./logger";
import { ArrType, MappedTemplates } from "./types/common.types";
import { RecyclarrTemplates } from "./types/recyclarr.types";
import { cloneGitRepo, recyclarrRepoPaths } from "./util";

const DEFAULT_RECYCLARR_GIT_URL = "https://github.com/recyclarr/config-templates";

export const cloneRecyclarrTemplateRepo = async () => {
  logger.info(`Checking Recyclarr repo ...`);

  const rootPath = recyclarrRepoPaths.root;
  const applicationConfig = getConfig();
  const gitUrl = getConfig().recyclarrConfigUrl ?? DEFAULT_RECYCLARR_GIT_URL;
  const revision = applicationConfig.recyclarrRevision ?? "master";

  const cloneResult = await cloneGitRepo(rootPath, gitUrl, revision);
  logger.info(`Recyclarr repo: ref[${cloneResult.ref}], hash[${cloneResult.hash}], path[${cloneResult.localPath}]`);
};

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

export const loadRecyclarrTemplates = (arrType: ArrType): Map<string, MappedTemplates> => {
  const map = new Map<string, RecyclarrTemplates>();

  const fillMap = (path: string) => {
    const files = fs.readdirSync(`${path}`).filter((fn) => fn.endsWith("yaml") || fn.endsWith("yml"));

    files.forEach((f) => map.set(f.substring(0, f.lastIndexOf(".")), yaml.parse(fs.readFileSync(`${path}/${f}`, "utf8"))));
  };

  if (arrType === "RADARR") {
    fillMap(recyclarrRepoPaths.radarrCF);
    fillMap(recyclarrRepoPaths.radarrQD);
    fillMap(recyclarrRepoPaths.radarrQP);
  } else {
    fillMap(recyclarrRepoPaths.sonarrCF);
    fillMap(recyclarrRepoPaths.sonarrQD);
    fillMap(recyclarrRepoPaths.sonarrQP);
  }

  const localPath = getLocalTemplatePath();

  if (localPath) {
    fillMap(localPath);
  }

  logger.debug(`Found ${map.size} Recyclarr templates.`);

  return new Map(
    Array.from(map, ([k, v]) => {
      const customFormats = v.custom_formats?.map((cf) => {
        // Changes from Recyclarr 7.2.0: https://github.com/recyclarr/recyclarr/releases/tag/v7.2.0
        if (cf.assign_scores_to == null && cf.quality_profiles == null) {
          logger.warn(`Recyclarr Template "${k}" does not provide correct profile for custom format. Ignoring.`);
        }

        if (cf.quality_profiles) {
          logger.warn(
            `Deprecated: (Recyclarr Template '${k}') For custom_formats please rename 'quality_profiles' to 'assign_scores_to'. See recyclarr v7.2.0`,
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
