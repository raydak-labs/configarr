import fs from "node:fs";
import path from "node:path";
import { MergedCustomFormatResource } from "./__generated__/mergedTypes";
import { getConfig } from "./config";
import { logger } from "./logger";
import { interpolateSize } from "./quality-definitions";
import { CFIDToConfigGroup, ConfigarrCF, QualityDefinitionsRadarr, QualityDefinitionsSonarr } from "./types/common.types";
import { ConfigCustomFormat, ConfigQualityProfile, ConfigQualityProfileItem, InputConfigCustomFormatGroup } from "./types/config.types";
import {
  TrashArrSupported,
  TrashCache,
  TrashCF,
  TrashCFGroupMapping,
  TrashCustomFormatGroups,
  TrashQP,
  TrashQualityDefinition,
  TrashQualityDefinitionQuality,
  TrashRadarrNaming,
  TrashSonarrNaming,
} from "./types/trashguide.types";
import { cloneGitRepo, loadJsonFile, mapImportCfToRequestCf, notEmpty, toCarrCF, trashRepoPaths } from "./util";

const DEFAULT_TRASH_GIT_URL = "https://github.com/TRaSH-Guides/Guides";

let cache: TrashCache;
let cacheReady = false;

const createCache = async () => {
  logger.debug(`Creating TRaSH-Guides cache ...`);

  const radarrCF = await loadTrashCFs("RADARR");
  const sonarrCF = await loadTrashCFs("SONARR");

  const radarrCFGroups = await loadTrashCustomFormatGroups("RADARR");
  const sonarrCFGroups = await loadTrashCustomFormatGroups("SONARR");

  const radarrNaming = await loadNamingFromTrashRadarr();
  const sonarrNaming = await loadNamingFromTrashSonarr();

  const radarrQP = await loadQPFromTrash("RADARR");
  const sonarrQP = await loadQPFromTrash("SONARR");

  const radarrQDMovie = await loadQualityDefinitionFromTrash("movie", "RADARR");
  const sonarrQDSeries = await loadQualityDefinitionFromTrash("series", "SONARR");
  const sonarrQDAnime = await loadQualityDefinitionFromTrash("anime", "SONARR");

  cache = {
    SONARR: {
      qualityProfiles: sonarrQP,
      customFormats: sonarrCF,
      customFormatsGroups: sonarrCFGroups,
      qualityDefinition: {
        anime: sonarrQDAnime,
        series: sonarrQDSeries,
      },
      naming: sonarrNaming,
    },
    RADARR: {
      qualityProfiles: radarrQP,
      customFormats: radarrCF,
      customFormatsGroups: radarrCFGroups,
      qualityDefinition: {
        movie: radarrQDMovie,
      },
      naming: radarrNaming,
    },
  };

  cacheReady = true;
};

export const cloneTrashRepo = async () => {
  logger.info(`Checking TRaSH-Guides repo ...`);

  const rootPath = trashRepoPaths.root;
  const applicationConfig = getConfig();
  const gitUrl = applicationConfig.trashGuideUrl ?? DEFAULT_TRASH_GIT_URL;
  const revision = applicationConfig.trashRevision ?? "master";
  const sparseDisabled = applicationConfig.enableFullGitClone === true;

  const cloneResult = await cloneGitRepo(rootPath, gitUrl, revision, { disabled: sparseDisabled, sparseDirs: ["docs/json"] });
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

export const loadTrashCustomFormatGroups = async (arrType: TrashArrSupported): Promise<TrashCFGroupMapping> => {
  if (arrType !== "RADARR" && arrType !== "SONARR") {
    logger.debug(`Unsupported arrType: ${arrType}. Skipping TrashCustomFormatGroups.`);

    return new Map();
  }

  if (cacheReady) {
    return cache[arrType].customFormatsGroups;
  }

  const cfGroupMapping: TrashCFGroupMapping = new Map();

  let pathForFiles: string;

  if (arrType === "RADARR") {
    pathForFiles = trashRepoPaths.radarrCFGroups;
  } else {
    pathForFiles = trashRepoPaths.sonarrCFGroups;
  }

  const files = fs.readdirSync(pathForFiles).filter((fn) => fn.endsWith("json"));

  for (const file of files) {
    const name = `${pathForFiles}/${file}`;

    const cfGroup = loadJsonFile<TrashCustomFormatGroups>(path.resolve(name));

    cfGroupMapping.set(cfGroup.trash_id, cfGroup);
  }

  logger.debug(`(${arrType}) Trash CustomFormatGroups: ${cfGroupMapping.size}`);

  return cfGroupMapping;
};

export const loadQualityDefinitionFromTrash = async (
  qdType: string, // QualityDefinitionsSonarr | QualityDefinitionsRadarr,
  arrType: TrashArrSupported,
): Promise<TrashQualityDefinition> => {
  let trashPath = arrType === "RADARR" ? trashRepoPaths.radarrQualitySize : trashRepoPaths.sonarrQualitySize;

  if (cacheReady) {
    const cacheObject = cache[arrType].qualityDefinition as any;
    if (qdType in cacheObject) {
      return cacheObject[qdType];
    }
  }

  // TODO: custom quality definition not implemented yet. Not sure if we need to implement this. Qualities can already be defined separately.
  const filePath = path.resolve(`${trashPath}/${qdType}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`(${arrType}) QualityDefinition type not found: '${qdType}' for '${arrType}'`);
  }

  return loadJsonFile(filePath);
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

/**
 * HINT: for now we only support one naming file per arrType
 */
const loadNamingFromTrash = async <T>(arrType: TrashArrSupported): Promise<T | null> => {
  let trashPath = arrType === "RADARR" ? trashRepoPaths.radarrNaming : trashRepoPaths.sonarrNaming;

  const map = new Map<string, T>();

  try {
    const files = fs.readdirSync(`${trashPath}`).filter((fn) => fn.endsWith("json"));

    if (files.length <= 0) {
      logger.info(`(${arrType}) Not found any TRaSH-Guides Naming files. Skipping.`);
    }

    for (const item of files) {
      const importTrashQP = loadJsonFile<T>(`${trashPath}/${item}`);

      map.set(item, importTrashQP);
    }
  } catch (err: any) {
    logger.warn(`(${arrType}) Failed loading TRaSH-Guides QualityProfiles. Continue without ...`, err?.message);
  }

  logger.debug(`(${arrType}) Found ${map.size} TRaSH-Guides Naming files.`);

  if (map.size <= 0) {
    return null;
  }

  if (map.size > 1) {
    logger.warn(`(${arrType}) Found more than one TRaSH-Guides Naming file. Using the first one.`);
  }

  const firstValue = map.values().next().value!;

  return firstValue;
};

export const loadNamingFromTrashSonarr = async (): Promise<TrashSonarrNaming | null> => {
  if (cacheReady) {
    return cache["SONARR"].naming;
  }

  const firstValue = await loadNamingFromTrash<TrashSonarrNaming>("SONARR");

  if (firstValue == null) {
    return firstValue;
  }

  logger.debug(`(SONARR) Available TRaSH-Guide season keys: ${Object.keys(firstValue.season)}`);
  logger.debug(`(SONARR) Available TRaSH-Guide series keys: ${Object.keys(firstValue.series)}`);
  logger.debug(`(SONARR) Available TRaSH-Guide standard episode keys: ${Object.keys(firstValue.episodes.standard)}`);
  logger.debug(`(SONARR) Available TRaSH-Guide daily episode keys: ${Object.keys(firstValue.episodes.daily)}`);
  logger.debug(`(SONARR) Available TRaSH-Guide anime episode keys: ${Object.keys(firstValue.episodes.anime)}`);

  return firstValue;
};

export const loadNamingFromTrashRadarr = async (): Promise<TrashRadarrNaming | null> => {
  if (cacheReady) {
    return cache["RADARR"].naming;
  }

  const firstValue = await loadNamingFromTrash<TrashRadarrNaming>("RADARR");

  if (firstValue == null) {
    return firstValue;
  }

  logger.debug(`(RADARR) Available TRaSH-Guide folder keys: ${Object.keys(firstValue.folder)}`);
  logger.debug(`(RADARR) Available TRaSH-Guide file keys: ${Object.keys(firstValue.file)}`);

  return firstValue;
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
        return { name: e.name, qualities: e.items?.reverse() };
      })
      .filter(notEmpty)
      .toReversed(),
    quality_sort: "top", // default
    language: data.language,
  };
};

export const transformTrashQPCFs = (data: TrashQP): ConfigCustomFormat => {
  return { assign_scores_to: [{ name: data.name }], trash_ids: Object.values(data.formatItems) };
};

export const transformTrashQDs = (data: TrashQualityDefinition, ratio: number | undefined): TrashQualityDefinitionQuality[] => {
  if (ratio == null || ratio < 0 || ratio > 1) {
    return data.qualities;
  }

  // TODO: maybe add check for duplicates?
  const transformQualities = data.qualities.map((trashQuality) => {
    // Adjust preffered size if preferedRatio is set
    const adjustedPreferred = interpolateSize(trashQuality.min, trashQuality.max, trashQuality.preferred, ratio);
    logger.debug(`QualityDefinition "${trashQuality.quality} adjusting preferred by ratio ${ratio} to value "${adjustedPreferred}"`);

    return { ...trashQuality, preferred: adjustedPreferred };
  });

  return transformQualities;
};

export const transformTrashCFGroups = (trashCFGroupMapping: TrashCFGroupMapping, groups: InputConfigCustomFormatGroup[]) => {
  return groups.reduce<ConfigCustomFormat[]>((p, c) => {
    c.trash_guide?.forEach(({ id: trashId, include_unrequired }) => {
      const mapping = trashCFGroupMapping.get(trashId);

      if (mapping == null) {
        logger.warn(`Trash CustomFormat Group: ${trashId} is unknown.`);
      } else {
        const groupCfs = mapping.custom_formats.filter((e) => e.required || include_unrequired === true).map((e) => e.trash_id);

        const customFormatEntry = { trash_ids: groupCfs, assign_scores_to: c.assign_scores_to?.map((v) => ({ name: v.name })) || [] };

        if (customFormatEntry.assign_scores_to.length <= 0) {
          logger.warn(`TRaSH CustomFormatGroup mapping ${trashId} would not be applied to any profile. Ignoring.`);
        } else {
          p.push(customFormatEntry);
        }
      }
    });
    return p;
  }, []);
};
