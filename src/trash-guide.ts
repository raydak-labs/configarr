import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { MergedCustomFormatResource } from "./types/merged.types";
import { getConfig } from "./config";
import { logger } from "./logger";
import { interpolateSize } from "./quality-definitions";
import { CFIDToConfigGroup, ConfigarrCF, QualityDefinitionsRadarr, QualityDefinitionsSonarr } from "./types/common.types";
import { ConfigCustomFormat, ConfigQualityProfile, ConfigQualityProfileItem, InputConfigCustomFormatGroup } from "./types/config.types";
import { validateExternal } from "./validation";
import {
  TrashArrSupported,
  TrashCache,
  TrashCF,
  TrashCFConflict,
  TrashCFGroupMapping,
  TrashCFSchema,
  TrashCustomFormatGroups,
  TrashCustomFormatGroupsSchema,
  TrashQP,
  TrashQPSchema,
  TrashQualityDefinition,
  TrashQualityDefinitionQuality,
  TrashQualityDefinitionSchema,
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

  const radarrConflicts = await loadTrashCFConflicts("RADARR");
  const sonarrConflicts = await loadTrashCFConflicts("SONARR");

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
      conflicts: sonarrConflicts,
    },
    RADARR: {
      qualityProfiles: radarrQP,
      customFormats: radarrCF,
      customFormatsGroups: radarrCFGroups,
      qualityDefinition: {
        movie: radarrQDMovie,
      },
      naming: radarrNaming,
      conflicts: radarrConflicts,
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

  const cloneResult = await cloneGitRepo(rootPath, gitUrl, revision, {
    disabled: sparseDisabled,
    sparseDirs: ["docs/json"],
  });
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

    const rawCf = loadJsonFile(path.resolve(name));
    const cf = validateExternal(TrashCFSchema, rawCf, `trash-cf/${arrType}/${file}`) as TrashCF;

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

    const rawGroup = loadJsonFile(path.resolve(name));
    const cfGroup = validateExternal(TrashCustomFormatGroupsSchema, rawGroup, `trash-cf-group/${arrType}/${file}`) as TrashCustomFormatGroups;

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

  const rawQd = loadJsonFile(filePath);
  return validateExternal(TrashQualityDefinitionSchema, rawQd, `trash-qd/${arrType}/${qdType}`) as TrashQualityDefinition;
};

export const loadAllQDsFromTrash = async (arrType: TrashArrSupported): Promise<Map<string, TrashQualityDefinition>> => {
  const trashPath = arrType === "RADARR" ? trashRepoPaths.radarrQualitySize : trashRepoPaths.sonarrQualitySize;
  const map = new Map<string, TrashQualityDefinition>();

  // Note: intentionally bypasses module-level cache — the pre-warmed cache only contains
  // a subset of QD types (movie, series, anime). This function must load ALL files from
  // the quality-size directory, including types not pre-cached (e.g. sqp-streaming, sqp-uhd).
  try {
    const files = fs.readdirSync(trashPath).filter((fn) => fn.endsWith(".json"));
    for (const item of files) {
      try {
        const rawQd = loadJsonFile(`${trashPath}/${item}`);
        const qd = validateExternal(TrashQualityDefinitionSchema, rawQd, `trash-qd/${arrType}/${item}`) as TrashQualityDefinition;
        map.set(qd.trash_id, qd);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn(`(${arrType}) Failed loading TRaSH-Guides QualityDefinition from '${item}'. Skipping. ${message}`);
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`(${arrType}) Failed loading TRaSH-Guides QualityDefinitions from quality-size. Continue without ... ${message}`);
  }

  return map;
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
      const rawQP = loadJsonFile(`${trashPath}/${item}`);
      const importTrashQP = validateExternal(TrashQPSchema, rawQP, `trash-qp/${arrType}/${item}`) as TrashQP;

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

/** Matches TRaSH conflicts.schema.json (object values: name required, desc optional, no extra keys). */
const trashConflictCfEntrySchema = z
  .object({
    name: z.string(),
    desc: z.string().optional(),
  })
  .strict();

const trashConflictGroupRecordSchema = z.record(z.string(), trashConflictCfEntrySchema);

const trashConflictsFileSchema = z
  .object({
    $schema: z.string().optional(),
    custom_formats: z.array(z.unknown()),
  })
  .strict();

const normalizeTrashConflictGroup = (group: z.infer<typeof trashConflictGroupRecordSchema>): TrashCFConflict => {
  const entries = Object.entries(group).map(([trash_id, rec]) => ({
    trash_id,
    name: rec.name,
    desc: rec.desc,
  }));
  entries.sort((a, b) => a.trash_id.localeCompare(b.trash_id));
  const custom_formats = entries.map(({ trash_id, name }) => ({ trash_id, name }));
  const descriptions = entries.map((e) => e.desc).filter((d): d is string => typeof d === "string" && d.length > 0);

  return {
    trash_id: custom_formats.map((cf) => cf.trash_id).join("+"),
    name: custom_formats.map((cf) => cf.name).join(" vs "),
    trash_description: descriptions.length > 0 ? descriptions.join(" ") : undefined,
    custom_formats,
  };
};

export const loadTrashCFConflicts = async (arrType: TrashArrSupported): Promise<TrashCFConflict[]> => {
  if (arrType !== "RADARR" && arrType !== "SONARR") {
    logger.debug(`Unsupported arrType: ${arrType}. Skipping TrashCFConflicts.`);
    return [];
  }

  if (cacheReady) {
    return cache[arrType].conflicts;
  }

  const conflicts: TrashCFConflict[] = [];

  let conflictsPath: string;

  if (arrType === "RADARR") {
    conflictsPath = trashRepoPaths.radarrConflicts;
  } else {
    conflictsPath = trashRepoPaths.sonarrConflicts;
  }

  try {
    const raw = loadJsonFile<unknown>(conflictsPath);
    const fileParsed = trashConflictsFileSchema.safeParse(raw);

    if (!fileParsed.success) {
      logger.warn(`(${arrType}) Invalid conflicts.json: ${fileParsed.error.issues.map((i) => i.message).join("; ")}. Skipping conflicts.`);
      return [];
    }

    for (const group of fileParsed.data.custom_formats) {
      if (group === null || typeof group !== "object" || Array.isArray(group)) {
        continue;
      }

      const g = trashConflictGroupRecordSchema.safeParse(group);
      if (!g.success) {
        logger.warn(`(${arrType}) Skipping invalid conflict group: ${g.error.issues.map((i) => i.message).join("; ")}`);
        continue;
      }

      const keyCount = Object.keys(g.data).length;
      if (keyCount < 2) {
        if (keyCount === 0) {
          logger.debug(`(${arrType}) Skipping empty conflict group`);
        } else {
          logger.warn(`(${arrType}) Skipping invalid conflict group: need at least 2 entries (string key -> { name, desc? })`);
        }
        continue;
      }

      conflicts.push(normalizeTrashConflictGroup(g.data));
    }

    logger.debug(`(${arrType}) Loaded ${conflicts.length} TRaSH CF conflict groups`);
    return conflicts;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      logger.debug(`(${arrType}) conflicts.json not found. Skipping conflicts.`);
    } else {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`(${arrType}) Failed loading conflicts.json. Skipping conflicts: ${message}`);
    }
    return [];
  }
};

// TODO merge two methods?
export const transformTrashQPToTemplate = (data: TrashQP, useOldQualityOrder: boolean = false): ConfigQualityProfile => {
  const items = data.items
    .map((e): ConfigQualityProfileItem | null => {
      if (!e.allowed) {
        return null;
      }
      // TRaSH-Guides now provides qualities in display order (highest-to-lowest)
      // Old behavior (useOldQualityOrder=true): reverse nested items to convert from API order
      // New behavior (useOldQualityOrder=false): use items as-is since they're already in display order
      // Use a non-mutating reverse to avoid side effects on the original TrashQP data
      return {
        name: e.name,
        qualities: useOldQualityOrder ? (e.items ? [...e.items].reverse() : undefined) : e.items,
      };
    })
    .filter(notEmpty);

  // Old behavior: reverse the entire array to convert from API order to display order
  // New behavior: use items as-is since TRaSH-Guides now provides them in display order
  const qualities = useOldQualityOrder ? items.toReversed() : items;

  return {
    min_format_score: data.minFormatScore,
    score_set: data.trash_score_set,
    upgrade: { allowed: data.upgradeAllowed, until_quality: data.cutoff, until_score: data.cutoffFormatScore },
    name: data.name,
    qualities,
    quality_sort: "top", // default
    language: data.language,
  };
};

export const transformTrashQPCFs = (data: TrashQP): ConfigCustomFormat => {
  return { assign_scores_to: [{ name: data.name }], trash_ids: Object.values(data.formatItems) };
};

export const transformTrashQPCFGroups = (
  template: TrashQP,
  trashCFGroupMapping: TrashCFGroupMapping,
  useExcludeSemantics: boolean = false,
): ConfigCustomFormat[] => {
  const profileName = template.name;
  const results: ConfigCustomFormat[] = [];

  // Traverse each CF group and check for default=true
  for (const [_, cfGroup] of trashCFGroupMapping) {
    // Check if the default prop is truthy (string "true")
    if (cfGroup.default === "true") {
      if (useExcludeSemantics) {
        // OLD BEHAVIOR: Check if template is excluded via exclude field
        const isExcluded = cfGroup.quality_profiles?.exclude?.[profileName] != null;

        if (!isExcluded) {
          // Include all required and default CFs from this group
          const cfsToInclude = cfGroup.custom_formats.filter((cf) => cf.required || cf.default === true);

          if (cfsToInclude.length > 0) {
            logger.debug(
              `Including ${cfsToInclude.length} [${cfsToInclude.map((cf) => cf.name).join(", ")}] CFs from default group '${cfGroup.name}' for TrashGuide profile '${profileName}'`,
            );

            results.push({
              trash_ids: cfsToInclude.map((cf) => cf.trash_id),
              assign_scores_to: [{ name: profileName }],
            });
          }
        } else {
          logger.debug(`Excluding default CF group '${cfGroup.name}' for TrashGuide profile '${profileName}' due to exclude field`);
        }
      } else {
        // NEW BEHAVIOR: Check if template is included via include field
        const isIncluded = cfGroup.quality_profiles?.include?.[profileName] != null;

        if (isIncluded) {
          // Include all required and default CFs from this group
          const cfsToInclude = cfGroup.custom_formats.filter((cf) => cf.required || cf.default === true);

          if (cfsToInclude.length > 0) {
            logger.debug(
              `Including ${cfsToInclude.length} [${cfsToInclude.map((cf) => cf.name).join(", ")}] CFs from default group '${cfGroup.name}' for TrashGuide profile '${profileName}'`,
            );

            results.push({
              trash_ids: cfsToInclude.map((cf) => cf.trash_id),
              assign_scores_to: [{ name: profileName }],
            });
          }
        } else {
          const hasIncludeList = cfGroup.quality_profiles?.include != null;
          const reason = hasIncludeList ? "(profile not in include list)" : "(no include list defined for this group)";
          logger.debug(`Skipping default CF group '${cfGroup.name}' for TrashGuide profile '${profileName}' ${reason}`);
        }
      }
    }
  }

  return results;
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

        const customFormatEntry = {
          trash_ids: groupCfs,
          assign_scores_to: c.assign_scores_to?.map((v) => ({ name: v.name, score: v.score })) || [],
        };

        p.push(customFormatEntry);
      }
    });
    return p;
  }, []);
};
