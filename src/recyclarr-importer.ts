import { default as fs } from "node:fs";
import path from "node:path";
import { CheckRepoActions, simpleGit } from "simple-git";
import yaml from "yaml";
import { getConfig } from "./config";
import { logger } from "./logger";
import { ArrType, MappedTemplates, RecyclarrTemplates } from "./types";
import { recyclarrRepoPaths } from "./util";

const DEFAULT_RECYCLARR_GIT_URL = "https://github.com/recyclarr/config-templates";

export const cloneRecyclarrTemplateRepo = async () => {
  const rootPath = recyclarrRepoPaths.root;
  logger.info(`Checking Recyclarr repo (${rootPath})`);

  if (!fs.existsSync(rootPath)) {
    fs.mkdirSync(rootPath, { recursive: true });
  }

  const gitClient = simpleGit({ baseDir: rootPath });
  const r = await gitClient.checkIsRepo(CheckRepoActions.IS_REPO_ROOT);

  const applicationConfig = getConfig();

  if (!r) {
    await simpleGit().clone(applicationConfig.recyclarrConfigUrl ?? DEFAULT_RECYCLARR_GIT_URL, rootPath);
  }

  await gitClient.checkout(applicationConfig.recyclarrRevision ?? "master", ["-f"]);
  const result = await gitClient.status();

  if (!result.detached) {
    const res = await gitClient.pull();
    if (res.files.length > 0) {
      logger.info(`Updated Recyclarr repo.`);
    }
  }

  logger.info(`Recyclarr repo on '${result.current}'`);
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
