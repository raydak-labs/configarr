import { default as fs } from "fs";
import simpleGit, { CheckRepoActions } from "simple-git";
import yaml from "yaml";
import { getConfig } from "./config";
import { RecyclarrTemplates } from "./types";
import { recyclarrRepoPaths } from "./util";

export const cloneRecyclarrTemplateRepo = async () => {
  const rootPath = recyclarrRepoPaths.root;

  if (!fs.existsSync(rootPath)) {
    fs.mkdirSync(rootPath, { recursive: true });
  }

  const gitClient = simpleGit({ baseDir: rootPath });
  const r = await gitClient.checkIsRepo(CheckRepoActions.IS_REPO_ROOT);

  const applicationConfig = getConfig();

  if (!r) {
    await simpleGit().clone(applicationConfig.recyclarrConfigUrl, rootPath);
  }

  await gitClient.checkout(applicationConfig.trashRevision ?? "master");

  console.log(`Recyclarr Git Check`, r);
};

export const loadRecyclarrTemplates = () => {
  const map = new Map<string, RecyclarrTemplates>();

  const fillMap = (path: string) => {
    const files = fs.readdirSync(`${path}`).filter((fn) => fn.endsWith("yml"));

    files.forEach((f) => map.set(f.substring(0, f.lastIndexOf(".")), yaml.parse(fs.readFileSync(`${path}/${f}`, "utf8"))));
  };

  fillMap(recyclarrRepoPaths.sonarrCF);
  fillMap(recyclarrRepoPaths.sonarrQD);
  fillMap(recyclarrRepoPaths.sonarrQP);

  return map;
};
