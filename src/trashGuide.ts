import fs from "fs";
import path from "path";
import simpleGit, { CheckRepoActions } from "simple-git";
import { CustomFormatResource } from "./__generated__/MySuperbApi";
import { getConfig } from "./config";
import { CFProcessing, ConfigarrCF, DynamicImportType, TrashCF } from "./types";
import { carrCfToValidCf, toCarrCF, trashRepoPaths } from "./util";

const gitStuff = async () => {
  const trashRepoPath = "./repos/trash-guides";

  const gitClient = simpleGit({ baseDir: trashRepoPath });
  const r = await gitClient.checkIsRepo();

  if (r) {
    await gitClient.pull();
  } else {
    await simpleGit().clone("https://github.com/BlackDark/fork-TRASH-Guides", ".");
  }

  console.log(`Git Check`, r);
};

export const cloneTrashRepo = async () => {
  const rootPath = trashRepoPaths.root;

  if (!fs.existsSync(rootPath)) {
    fs.mkdirSync(rootPath, { recursive: true });
  }

  const gitClient = simpleGit({ baseDir: rootPath });
  const r = await gitClient.checkIsRepo(CheckRepoActions.IS_REPO_ROOT);

  const applicationConfig = getConfig();

  if (!r) {
    await simpleGit().clone(applicationConfig.trashGuideUrl, rootPath);
  }

  await gitClient.checkout(applicationConfig.trashRevision ?? "master");

  console.log(`TrashGuide Git Check`, r);
};

export const loadSonarrTrashCFs = async (): Promise<CFProcessing> => {
  const trashRepoPath = "./repos/trash-guides";
  const trashJsonDir = "docs/json";
  const trashRadarrPath = `${trashJsonDir}/radarr`;
  const trashRadarrCfPath = `${trashRadarrPath}/cf`;

  const trashSonarrPath = `${trashJsonDir}/sonarr`;
  const trashSonarrCfPath = `${trashSonarrPath}/cf`;

  const files = fs.readdirSync(`${trashRepoPath}/${trashSonarrCfPath}`).filter((fn) => fn.endsWith("json"));

  const trashIdToObject = new Map<string, { trashConfig: TrashCF; requestConfig: CustomFormatResource }>();

  const cfNameToTrashId = new Map<string, string>();

  const carrIdToObject = new Map<string, { carrConfig: ConfigarrCF; requestConfig: CustomFormatResource }>();

  const cfNameToCarrObject = new Map<string, ConfigarrCF>();

  for (const file of files) {
    const name = `${trashRepoPath}/${trashSonarrCfPath}/${file}`;

    const cf: DynamicImportType<TrashCF> = await import(path.resolve(name));

    const carrConfig = toCarrCF(cf.default);

    carrIdToObject.set(carrConfig.configarr_id, {
      carrConfig: carrConfig,
      requestConfig: carrCfToValidCf(carrConfig),
    });

    if (carrConfig.name) {
      cfNameToCarrObject.set(carrConfig.name, carrConfig);
    }
  }

  console.log(`Trash CFs: ${trashIdToObject.size}`);

  return {
    carrIdMapping: carrIdToObject,
    cfNameToCarrConfig: cfNameToCarrObject,
  };
};
