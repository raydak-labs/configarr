import fs from "node:fs";
import path from "node:path";
import { CheckRepoActions, simpleGit } from "simple-git";
import { MergedCustomFormatResource } from "./__generated__/mergedTypes";
import { getConfig } from "./config";
import { logger } from "./logger";
import {
  ArrType,
  CFProcessing,
  ConfigarrCF,
  QualityDefintionsRadarr,
  QualityDefintionsSonarr,
  TrashCF,
  TrashQualityDefintion,
} from "./types";
import { loadJsonFile, mapImportCfToRequestCf, toCarrCF, trashRepoPaths } from "./util";

const DEFAULT_TRASH_GIT_URL = "https://github.com/TRaSH-Guides/Guides";

export const cloneTrashRepo = async () => {
  const rootPath = trashRepoPaths.root;
  logger.info(`Checking TrashGuide repo (${rootPath})`);

  if (!fs.existsSync(rootPath)) {
    fs.mkdirSync(rootPath, { recursive: true });
  }

  const gitClient = simpleGit({ baseDir: rootPath });
  const r = await gitClient.checkIsRepo(CheckRepoActions.IS_REPO_ROOT);

  const applicationConfig = getConfig();

  if (!r) {
    await simpleGit().clone(applicationConfig.trashGuideUrl ?? DEFAULT_TRASH_GIT_URL, rootPath);
  }

  await gitClient.checkout(applicationConfig.trashRevision ?? "master", ["-f"]);
  const result = await gitClient.status();

  if (!result.detached) {
    const res = await gitClient.pull();
    if (res.files.length > 0) {
      logger.info(`Updated TrashGuide repo.`);
    }
  }

  logger.info(`TrashGuide repo on '${result.current}'`);
};

export const loadSonarrTrashCFs = async (arrType: ArrType): Promise<CFProcessing> => {
  const trashRepoPath = "./repos/trash-guides";
  const trashJsonDir = "docs/json";
  const trashRadarrPath = `${trashJsonDir}/radarr`;
  const trashRadarrCfPath = `${trashRadarrPath}/cf`;

  const trashSonarrPath = `${trashJsonDir}/sonarr`;
  const trashSonarrCfPath = `${trashSonarrPath}/cf`;

  const carrIdToObject = new Map<string, { carrConfig: ConfigarrCF; requestConfig: MergedCustomFormatResource }>();
  const cfNameToCarrObject = new Map<string, ConfigarrCF>();

  let pathForFiles: string;

  if (arrType === "RADARR") {
    pathForFiles = `${trashRepoPath}/${trashRadarrCfPath}`;
  } else {
    pathForFiles = `${trashRepoPath}/${trashSonarrCfPath}`;
  }

  const files = fs.readdirSync(pathForFiles).filter((fn) => fn.endsWith("json"));

  for (const file of files) {
    const name = `${pathForFiles}/${file}`;

    const cf = loadJsonFile<TrashCF>(path.resolve(name));

    const carrConfig = toCarrCF(cf);

    carrIdToObject.set(carrConfig.configarr_id, {
      carrConfig: carrConfig,
      requestConfig: mapImportCfToRequestCf(carrConfig),
    });

    if (carrConfig.name) {
      cfNameToCarrObject.set(carrConfig.name, carrConfig);
    }
  }

  logger.info(`Trash CFs: ${carrIdToObject.size}`);

  return {
    carrIdMapping: carrIdToObject,
    cfNameToCarrConfig: cfNameToCarrObject,
  };
};

export const loadQualityDefinitionSonarrFromTrash = async (
  qdType: QualityDefintionsSonarr | QualityDefintionsRadarr,
  arrType: ArrType,
): Promise<TrashQualityDefintion> => {
  let trashPath = arrType === "RADARR" ? trashRepoPaths.radarrQuality : trashRepoPaths.sonarrQuality;

  switch (qdType) {
    case "anime":
      return loadJsonFile(path.resolve(`${trashPath}/anime.json`));
    case "series":
      return loadJsonFile(path.resolve(`${trashPath}/series.json`));
    case "movie":
      return loadJsonFile(path.resolve(`${trashPath}/movie.json`));
    case "custom":
      throw new Error("Not implemented yet");
    default:
      throw new Error(`Unknown QualityDefintion type: ${qdType}`);
  }
};
