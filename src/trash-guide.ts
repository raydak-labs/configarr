import fs from "node:fs";
import path from "node:path";
import { MergedCustomFormatResource } from "./__generated__/mergedTypes";
import { getConfig } from "./config";
import { logger } from "./logger";
import { CFIDToConfigGroup, ConfigarrCF, QualityDefintionsRadarr, QualityDefintionsSonarr } from "./types/common.types";
import { ConfigCustomFormat, ConfigQualityProfile, ConfigQualityProfileItem } from "./types/config.types";
import { TrashArrSupported, TrashCache, TrashCF, TrashQP, TrashQualityDefintion } from "./types/trashguide.types";
import { cloneGitRepo, loadJsonFile, mapImportCfToRequestCf, notEmpty, toCarrCF, trashRepoPaths } from "./util";

const DEFAULT_TRASH_GIT_URL = "https://github.com/TRaSH-Guides/Guides";

let cache: TrashCache;
let cacheReady = false;

const createCache = async () => {
  logger.debug(`Creating TRaSH-Guides cache ...`);

  const radarrCF = await loadTrashCFs("RADARR");
  const sonarrCF = await loadTrashCFs("SONARR");

  const radarrQP = await loadQPFromTrash("RADARR");
  const sonarrQP = await loadQPFromTrash("SONARR");

  const radarrQDMovie = await loadQualityDefinitionFromTrash("movie", "RADARR");
  const sonarrQDSeries = await loadQualityDefinitionFromTrash("series", "SONARR");
  const sonarrQDAnime = await loadQualityDefinitionFromTrash("anime", "SONARR");

  cache = {
    SONARR: {
      qualityProfiles: sonarrQP,
      customFormats: sonarrCF,
      qualityDefinition: {
        anime: sonarrQDAnime,
        series: sonarrQDSeries,
      },
    },
    RADARR: {
      qualityProfiles: radarrQP,
      customFormats: radarrCF,
      qualityDefinition: {
        movie: radarrQDMovie,
      },
    },
  };

  cacheReady = true;
};

export const cloneTrashRepo = async () => {
  logger.info(`Checking TRaSH-Guides repo ...`);

  const rootPath = trashRepoPaths.root;
  const applicationConfig = getConfig();
  const gitUrl = getConfig().trashGuideUrl ?? DEFAULT_TRASH_GIT_URL;
  const revision = applicationConfig.trashRevision ?? "master";

  const cloneResult = await cloneGitRepo(rootPath, gitUrl, revision);
  logger.info(`TRaSH-Guides repo: ref[${cloneResult.ref}], hash[${cloneResult.hash}], path[${cloneResult.localPath}]`);
  await createCache();
};

export const loadTrashCFs = async (arrType: TrashArrSupported): Promise<CFIDToConfigGroup> => {
  if (arrType !== "RADARR" && arrType !== "SONARR") {
    logger.debug(`Unsupported arrType: ${arrType}. Skipping TrashCFs.`);

    return new Map();
  }

  if (cacheReady) {
    return cache[arrType].customFormats;
  }

  const carrIdToObject = new Map<string, { carrConfig: ConfigarrCF; requestConfig: MergedCustomFormatResource }>();

  let pathForFiles: string;

  if (arrType === "RADARR") {
    pathForFiles = trashRepoPaths.radarrCF;
  } else {
    pathForFiles = trashRepoPaths.sonarrCF;
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
  }

  logger.debug(`(${arrType}) Trash CFs: ${carrIdToObject.size}`);

  return carrIdToObject;
};

export const loadQualityDefinitionFromTrash = async (
  qdType: QualityDefintionsSonarr | QualityDefintionsRadarr,
  arrType: TrashArrSupported,
): Promise<TrashQualityDefintion> => {
  let trashPath = arrType === "RADARR" ? trashRepoPaths.radarrQualitySize : trashRepoPaths.sonarrQualitySize;

  if (cacheReady) {
    const cacheObject = cache[arrType].qualityDefinition as any;
    if (qdType in cacheObject) {
      return cacheObject[qdType];
    }
  }

  switch (qdType) {
    case "anime":
      return loadJsonFile(path.resolve(`${trashPath}/anime.json`));
    case "series":
      return loadJsonFile(path.resolve(`${trashPath}/series.json`));
    case "movie":
      return loadJsonFile(path.resolve(`${trashPath}/movie.json`));
    case "custom":
      throw new Error(`(${arrType}) Not implemented yet`);
    default:
      throw new Error(`(${arrType}) Unknown QualityDefintion type: ${qdType}`);
  }
};

export const loadQPFromTrash = async (arrType: TrashArrSupported) => {
  let trashPath = arrType === "RADARR" ? trashRepoPaths.radarrQP : trashRepoPaths.sonarrQP;

  if (cacheReady) {
    return cache[arrType].qualityProfiles;
  }

  const map = new Map<string, TrashQP>();

  try {
    const files = fs.readdirSync(`${trashPath}`).filter((fn) => fn.endsWith("json"));

    if (files.length <= 0) {
      logger.info(`(${arrType}) Not found any TRaSH-Guides QualityProfiles. Skipping.`);
    }

    for (const item of files) {
      const importTrashQP = loadJsonFile<TrashQP>(`${trashPath}/${item}`);

      map.set(importTrashQP.trash_id, importTrashQP);
    }
  } catch (err: any) {
    logger.warn(`(${arrType}) Failed loading TRaSH-Guides QualityProfiles. Continue without ...`, err?.message);
  }

  // const localPath = getLocalTemplatePath();

  // if (localPath) {
  //   fillMap(localPath);
  // }

  logger.debug(`(${arrType}) Found ${map.size} TRaSH-Guides QualityProfiles.`);
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
