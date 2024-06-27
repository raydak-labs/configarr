import fs from "fs";
import path from "path";
import simpleGit, { CheckRepoActions } from "simple-git";
import { CustomFormatResource } from "./__generated__/generated-sonarr-api";
import { getConfig } from "./config";
import { logger } from "./logger";
import {
  ArrType,
  CFProcessing,
  ConfigarrCF,
  DynamicImportType,
  QualityDefintionsRadarr,
  QualityDefintionsSonarr,
  TrashCF,
  TrashQP,
  TrashQualityDefintion,
  YamlConfigQualityProfile,
  YamlConfigQualityProfileItems,
  YamlList,
} from "./types";
import { importJson, mapImportCfToRequestCf, notEmpty, toCarrCF, trashRepoPaths } from "./util";

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
  let trashPath = arrType === "RADARR" ? trashRepoPaths.radarrQualitySize : trashRepoPaths.sonarrQualitySize;

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

export const loadQPFromTrash = async (arrType: ArrType) => {
  let trashPath = arrType === "RADARR" ? trashRepoPaths.radarrQP : trashRepoPaths.sonarrQP;
  const map = new Map<string, TrashQP>();

  try {
    const files = fs.readdirSync(`${trashPath}`).filter((fn) => fn.endsWith("json"));

    if (files.length <= 0) {
      logger.info(`Not found any TrashGuide QualityProfiles. Skipping.`);
    }

    for (const item of files) {
      const importTrashQP = await importJson<TrashQP>(`${trashPath}/${item}`);

      map.set(importTrashQP.trash_id, importTrashQP);
    }
  } catch (err: any) {
    logger.warn("Failed loading TrashGuide QualityProfiles. Continue without ...", err?.message);
  }

  // const localPath = getLocalTemplatePath();

  // if (localPath) {
  //   fillMap(localPath);
  // }

  return map;
};

export const transformTrashQPToTemplate = (data: TrashQP): YamlConfigQualityProfile => {
  return {
    min_format_score: data.minFormatScore,
    score_set: data.trash_score_set,
    upgrade: { allowed: data.upgradeAllowed, until_quality: data.cutoff, until_score: data.cutoffFormatScore },
    name: data.name,
    qualities: data.items
      .map((e): YamlConfigQualityProfileItems | null => {
        if (!e.allowed) {
          return null;
        }
        return { name: e.name, qualities: e.items };
      })
      .filter(notEmpty)
      .toReversed(),
    quality_sort: "top", // default
  };
};

export const transformTrashQPCFs = (data: TrashQP): YamlList => {
  return { quality_profiles: [{ name: data.name }], trash_ids: Object.values(data.formatItems) };
};
