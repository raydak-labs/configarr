import fs from "node:fs";
import path from "node:path";
import { MergedCustomFormatResource } from "./__generated__/mergedTypes";
import { getConfig } from "./config";
import { logger } from "./logger";
import { ArrType, CFProcessing, ConfigarrCF, QualityDefintionsRadarr, QualityDefintionsSonarr } from "./types/common.types";
import { ConfigCustomFormat, ConfigQualityProfile, ConfigQualityProfileItem } from "./types/config.types";
import { TrashCF, TrashQP, TrashQualityDefintion } from "./types/trashguide.types";
import { cloneGitRepo, loadJsonFile, mapImportCfToRequestCf, notEmpty, toCarrCF, trashRepoPaths } from "./util";

const DEFAULT_TRASH_GIT_URL = "https://github.com/TRaSH-Guides/Guides";

export const cloneTrashRepo = async () => {
  logger.info(`Checking TrashGuide repo ...`);

  const rootPath = trashRepoPaths.root;
  const applicationConfig = getConfig();
  const gitUrl = getConfig().trashGuideUrl ?? DEFAULT_TRASH_GIT_URL;
  const revision = applicationConfig.trashRevision ?? "master";

  const cloneResult = await cloneGitRepo(rootPath, gitUrl, revision);
  logger.info(`TrashGuide repo: ref[${cloneResult.ref}], hash[${cloneResult.hash}], path[${cloneResult.localPath}]`);
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
  let trashPath = arrType === "RADARR" ? trashRepoPaths.radarrQualitySize : trashRepoPaths.sonarrQualitySize;

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

export const loadQPFromTrash = async (arrType: ArrType) => {
  let trashPath = arrType === "RADARR" ? trashRepoPaths.radarrQP : trashRepoPaths.sonarrQP;
  const map = new Map<string, TrashQP>();

  try {
    const files = fs.readdirSync(`${trashPath}`).filter((fn) => fn.endsWith("json"));

    if (files.length <= 0) {
      logger.info(`Not found any TrashGuide QualityProfiles. Skipping.`);
    }

    for (const item of files) {
      const importTrashQP = loadJsonFile<TrashQP>(`${trashPath}/${item}`);

      map.set(importTrashQP.trash_id, importTrashQP);
    }
  } catch (err: any) {
    logger.warn("Failed loading TrashGuide QualityProfiles. Continue without ...", err?.message);
  }

  // const localPath = getLocalTemplatePath();

  // if (localPath) {
  //   fillMap(localPath);
  // }

  logger.debug(`Found ${map.size} TrashGuide QualityProfiles.`);
  return map;
};

// TODO merge two methods?
export const transformTrashQPToTemplate = (data: TrashQP): ConfigQualityProfile => {
  return {
    min_format_score: data.minFormatScore,
    score_set: data.trash_score_set,
    upgrade: { allowed: data.upgradeAllowed, until_quality: data.cutoff, until_score: data.cutoffFormatScore },
    name: data.name,
    qualities: data.items
      .map((e): ConfigQualityProfileItem | null => {
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

export const transformTrashQPCFs = (data: TrashQP): ConfigCustomFormat => {
  return { assign_scores_to: [{ name: data.name }], trash_ids: Object.values(data.formatItems) };
};
