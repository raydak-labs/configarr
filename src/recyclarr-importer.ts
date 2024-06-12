import { default as fs } from "fs";
import path from "path";
import simpleGit, { CheckRepoActions } from "simple-git";
import yaml from "yaml";
import { getConfig } from "./config";
import { logger } from "./logger";
import { ArrType, RecyclarrTemplates } from "./types";
import { recyclarrRepoPaths } from "./util";

const DEFAULT_RECYCLARR_GIT_URL = "https://github.com/recyclarr/config-templates";

export const cloneRecyclarrTemplateRepo = async () => {
  const rootPath = recyclarrRepoPaths.root;

  if (!fs.existsSync(rootPath)) {
    fs.mkdirSync(rootPath, { recursive: true });
  }

  const gitClient = simpleGit({ baseDir: rootPath });
  const r = await gitClient.checkIsRepo(CheckRepoActions.IS_REPO_ROOT);

  const applicationConfig = getConfig();

  if (!r) {
    await simpleGit().clone(applicationConfig.recyclarrConfigUrl ?? DEFAULT_RECYCLARR_GIT_URL, rootPath);
  }

  await gitClient.checkout(applicationConfig.recyclarrRevision ?? "master");

  logger.info(`Updating Recyclarr repo`);
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

export const loadRecyclarrTemplates = (arrType: ArrType) => {
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

  return map;
};
