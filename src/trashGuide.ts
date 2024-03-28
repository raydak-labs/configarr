import fs from "fs";
import path from "path";
import simpleGit, { CheckRepoActions } from "simple-git";
import { CustomFormatResource } from "./__generated__/GeneratedSonarrApi";
import { getConfig } from "./config";
import {
  ArrType,
  CFProcessing,
  ConfigarrCF,
  DynamicImportType,
  QualityDefintionsRadarr,
  QualityDefintionsSonarr,
  TrashCF,
  TrashQualityDefintion,
} from "./types";
import { carrCfToValidCf, toCarrCF, trashRepoPaths } from "./util";

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

export const loadSonarrTrashCFs = async (arrType: ArrType): Promise<CFProcessing> => {
  const trashRepoPath = "./repos/trash-guides";
  const trashJsonDir = "docs/json";
  const trashRadarrPath = `${trashJsonDir}/radarr`;
  const trashRadarrCfPath = `${trashRadarrPath}/cf`;

  const trashSonarrPath = `${trashJsonDir}/sonarr`;
  const trashSonarrCfPath = `${trashSonarrPath}/cf`;

  const trashIdToObject = new Map<string, { trashConfig: TrashCF; requestConfig: CustomFormatResource }>();
  const carrIdToObject = new Map<string, { carrConfig: ConfigarrCF; requestConfig: CustomFormatResource }>();
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

export const loadQualityDefinitionSonarrFromTrash = async (
  qdType: QualityDefintionsSonarr | QualityDefintionsRadarr,
  arrType: ArrType,
): Promise<TrashQualityDefintion> => {
  let trashPath = arrType === "RADARR" ? trashRepoPaths.radarrQuality : trashRepoPaths.sonarrQuality;

  switch (qdType) {
    case "anime":
      return (await import(path.resolve(`${trashPath}/anime.json`))).default;
    case "series":
      return (await import(path.resolve(`${trashPath}/series.json`))).default;
    case "movie":
      return (await import(path.resolve(`${trashPath}/movie.json`))).default;
    case "custom":
      throw new Error("Not implemented yet");
    default:
      throw new Error(`Unknown QualityDefintion type: ${qdType}`);
  }
};
