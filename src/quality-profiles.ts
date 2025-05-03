import path from "node:path";
import {
  MergedCustomFormatResource,
  MergedProfileFormatItemResource,
  MergedQualityDefinitionResource,
  MergedQualityProfileQualityItemResource,
  MergedQualityProfileResource,
} from "./__generated__/mergedTypes";
import { ServerCache } from "./cache";
import { ArrClientLanguageResource, getUnifiedClient } from "./clients/unified-client";
import { getEnvs } from "./env";
import { logger } from "./logger";
import { ArrType, CFProcessing } from "./types/common.types";
import { ConfigQualityProfile, ConfigQualityProfileItem, MergedConfigInstance } from "./types/config.types";
import { cloneWithJSON, loadJsonFile, notEmpty, zip } from "./util";

// merge CFs of templates and custom CFs into one mapping of QualityProfile -> CFs + Score
export const mapQualityProfiles = ({ carrIdMapping }: CFProcessing, { custom_formats, quality_profiles }: MergedConfigInstance) => {
  // QualityProfile -> (CF Name -> Scoring)
  const profileScores = new Map<string, Map<string, MergedProfileFormatItemResource>>();

  const defaultScoringMap = new Map(quality_profiles.map((obj) => [obj.name, obj]));

  for (const { trash_ids, assign_scores_to } of custom_formats) {
    if (!trash_ids) {
      continue;
    }

    for (const profile of assign_scores_to) {
      for (const trashId of trash_ids) {
        const carr = carrIdMapping.get(trashId);

        if (!carr) {
          logger.warn(`Unknown ID for CF. ${trashId}`);
          continue;
        }

        let selectedProfileMap = profileScores.get(profile.name);

        if (!selectedProfileMap) {
          const newMap = new Map();
          profileScores.set(profile.name, newMap);
          selectedProfileMap = newMap;
        }

        let cfScore = selectedProfileMap.get(carr.carrConfig.name!);

        if (!cfScore) {
          const newScore = {};
          selectedProfileMap.set(carr.carrConfig.name!, newScore);
          cfScore = newScore;
        }

        cfScore.name = carr.carrConfig.name;

        const profileScoreConfig = defaultScoringMap.get(profile.name);

        let score_set: number | undefined;

        if (profileScoreConfig && profileScoreConfig.score_set) {
          score_set = carr.carrConfig.configarr_scores?.[profileScoreConfig.score_set];
        }

        // TODO (1): Don't set to 0. If undefined will be handled by reset_unmatched_score. Or should we directly handle this here?
        cfScore.score = profile.score ?? score_set ?? carr.carrConfig.configarr_scores?.default;
      }
    }
  }

  return profileScores;
};

export const loadQualityProfilesFromServer = async (): Promise<MergedQualityProfileResource[]> => {
  if (getEnvs().LOAD_LOCAL_SAMPLES) {
    return loadJsonFile(path.resolve(__dirname, `../tests/samples/quality_profiles.json`));
  }
  const api = getUnifiedClient();

  const qualityProfiles = await api.getQualityProfiles();
  // TODO type hack
  return qualityProfiles as MergedQualityDefinitionResource[];
};

// TODO should we use clones or not?
export const mapQualities = (qd_source: MergedQualityDefinitionResource[], value_source: ConfigQualityProfile) => {
  const qd = cloneWithJSON(qd_source);
  const value = cloneWithJSON(value_source);

  const qdMap = new Map(qd.map((obj) => [obj.title, obj]));

  const allowedQualities = value.qualities.map<MergedQualityProfileQualityItemResource>((obj, i) => {
    if (obj.qualities?.length && obj.qualities.length > 0) {
      return {
        allowed: obj.enabled ?? true,
        id: 1000 + i,
        name: obj.name,
        items:
          obj.qualities
            ?.map<MergedQualityProfileQualityItemResource>((obj2) => {
              const qd = qdMap.get(obj2);

              const returnObject: MergedQualityProfileQualityItemResource = {
                quality: {
                  id: qd?.quality?.id,
                  name: obj2,
                  resolution: qd?.quality?.resolution,
                  source: qd?.quality?.source,
                },
                allowed: obj.enabled ?? true,
                items: [],
              };

              qdMap.delete(obj2);

              return returnObject;
            })
            .reverse() || [],
      };
    } else {
      const serverQD = qdMap.get(obj.name);

      if (serverQD == null) {
        logger.warn(`Unknown requested quality "${obj.name}" for quality profile ${value.name}`);
        throw new Error(`Please correct your config.`);
      }

      qdMap.delete(obj.name);

      const item: MergedQualityProfileQualityItemResource = {
        allowed: obj.enabled ?? true,
        items: [],
        quality: {
          ...serverQD?.quality,
        },
      };
      return item;
    }
  });

  const missingQualities: MergedQualityProfileQualityItemResource[] = [];

  for (const [key, value] of qdMap.entries()) {
    missingQualities.push({
      allowed: false,
      items: [],
      //id: qualIndex++, // ID not allowed if not enabled
      quality: {
        id: value.quality?.id,
        name: key,
        resolution: value.quality?.resolution,
        source: value?.quality?.source,
      },
    });
  }

  // Ordering of items in the array matters of how they will be displayed. First is last.
  // Need to double check if always works as expected also regarding of templates etc.

  // TODO no sure if a useful feature
  if (value.quality_sort === "bottom") {
    return [...allowedQualities.reverse(), ...missingQualities];
  } else {
    // default = top
    return [...missingQualities, ...allowedQualities.reverse()];
  }
};

export const isOrderOfQualitiesEqual = (
  arr1: MergedQualityProfileQualityItemResource[],
  arr2: MergedQualityProfileQualityItemResource[],
) => {
  if (arr1.length !== arr2.length) {
    return false;
  }

  for (const [element1, element2] of zip(arr1, arr2)) {
    if (element1.name !== element2.name) {
      return false;
    }

    if (element1.quality?.name !== element2.quality?.name) {
      return false;
    }

    const items1 = element1.items ?? [];
    const item2s = element2.items ?? [];

    if (!(items1.length === 0 && items1.length === item2s.length)) {
      if (!isOrderOfQualitiesEqual(element1.items ?? [], element2.items ?? [])) {
        return false;
      }
    }
  }

  return true;
};

/**
 * Method to check if the order of qualities in the configuration syntax is equals.
 * Does not check nested qualities!
 * @deprecated
 * @param obj1
 * @param obj2
 * @returns
 */
export const isOrderOfConfigQualitiesEqual = (obj1: ConfigQualityProfileItem[], obj2: ConfigQualityProfileItem[]) => {
  if (obj1.length !== obj2.length) {
    return false;
  }

  for (const [element1, element2] of zip(obj1, obj2)) {
    if (element1.name !== element2.name) {
      return false;
    }
  }

  return true;
};

/**
 * TODO: time to split into arr specifc executions
 * Idea probably to have a common method which will be called by arr specific methods or do generic and call afterwards the specific.
 * Like: doGeneric -> if sonarr doSonarr
 *
 * @param arrType
 * @param cfMap
 * @param config
 * @param serverCache
 * @returns
 */
export const calculateQualityProfilesDiff = async (
  arrType: ArrType,
  cfMap: CFProcessing,
  config: MergedConfigInstance,
  serverCache: ServerCache,
): Promise<{
  changedQPs: MergedQualityProfileResource[];
  create: MergedQualityProfileResource[];
  noChanges: string[];
}> => {
  // TODO maybe improve?
  const scoring = mapQualityProfiles(cfMap, config);
  const qpMerged = new Map(config.quality_profiles.map((obj) => [obj.name, obj]));
  const qpServerMap = new Map(serverCache.qp.map((obj) => [obj.name!, obj]));
  const cfServerMap = new Map(serverCache.cf.map((obj) => [obj.name!, obj]));
  const languageMap = new Map(serverCache.languages.map((obj) => [obj.name!, obj]));

  const createQPs: MergedQualityProfileResource[] = [];
  const changedQPs: MergedQualityProfileResource[] = [];
  const noChangedQPs: string[] = [];

  const changes = new Map<string, string[]>();

  for (const [name, value] of qpMerged.entries()) {
    const serverMatch = qpServerMap.get(name);
    const scoringForQP = scoring.get(name);
    const mappedQualities = mapQualities(serverCache.qd, value);

    let profileLanguage: ArrClientLanguageResource | undefined;

    if (value.language) {
      profileLanguage = languageMap.get(value.language);

      if (profileLanguage == null) {
        logger.warn(`Profile language '${value.language}' not found in server. Ignoring.`);
        // profileLanguage = languageMap.get("Any");
      }
    }

    const resetScoreExceptions: Map<string, boolean> =
      value.reset_unmatched_scores?.except?.reduce((p, c) => {
        p.set(c, true);
        return p;
      }, new Map()) ?? new Map();

    if (serverMatch == null) {
      logger.info(`QualityProfile '${name}' not found in server. Will be created.`);

      const qualityToId = mappedQualities.reduce<Map<string, number>>((p, c) => {
        const id = c.id ?? c.quality?.id;
        const qName = c.name ?? c.quality?.name;

        if (id == null || qName == null) {
          throw new Error(`No ID (${id}) or name ${qName} found for quality? QP: ${name}`);
        }

        p.set(qName, id);

        return p;
      }, new Map());

      const cfs: Map<string, MergedCustomFormatResource> = new Map(JSON.parse(JSON.stringify(Array.from(cfServerMap))));

      const customFormatsMapped = Array.from(cfs.values()).map<MergedProfileFormatItemResource>((e) => {
        let score = 0;

        if (scoringForQP) {
          const providedScore = scoringForQP.get(e.name!);
          score = providedScore?.score || 0;
        }

        return {
          name: e.name,
          score: score,
          format: e.id,
        };
      });

      const newProfile = Object.assign<MergedQualityProfileResource, MergedQualityProfileResource | null | undefined>(
        {
          name: value.name,
          items: mappedQualities,
          cutoff: qualityToId.get(value.upgrade.until_quality),
          cutoffFormatScore: value.upgrade.until_score,
          minFormatScore: value.min_format_score,
          upgradeAllowed: value.upgrade.allowed,
          formatItems: customFormatsMapped,
          // required since sonarr 4.0.10 (radarr also)
          minUpgradeFormatScore: value.upgrade.min_format_score ?? 1,
        },
        profileLanguage && { language: profileLanguage }, // TODO split out. Not exists for sonarr
      );
      createQPs.push(newProfile);
      continue;
    }

    const changeList: string[] = [];
    changes.set(serverMatch.name!, changeList);

    const updatedServerObject: MergedQualityProfileResource = JSON.parse(JSON.stringify(serverMatch));

    let diffExist = false;

    // TODO do we want to enforce the whole structure or only match those which are enabled by us?
    if (!isOrderOfQualitiesEqual(mappedQualities, serverMatch.items || [])) {
      logger.debug(`QualityProfile quality order mismatch.`);
      diffExist = true;

      changeList.push(`QualityProfile quality order does not match`);
      updatedServerObject.items = mappedQualities;
    }

    const qualityToId = updatedServerObject.items!.reduce<Map<string, number>>((p, c) => {
      const id = c.id ?? c.quality?.id;
      const qName = c.name ?? c.quality?.name;

      if (id == null || qName == null) {
        throw new Error(`No ID (${id}) or name ${qName} found for quality? QP: ${name}`);
      }

      p.set(qName, id);

      return p;
    }, new Map());

    if (value.min_format_score != null) {
      if (serverMatch.minFormatScore !== value.min_format_score) {
        updatedServerObject.minFormatScore = value.min_format_score;
        diffExist = true;
        changeList.push(`MinFormatScore diff: server: ${serverMatch.minFormatScore} - expected: ${value.min_format_score}`);
      }
    }

    if (value.upgrade != null) {
      if (serverMatch.upgradeAllowed !== value.upgrade.allowed) {
        updatedServerObject.upgradeAllowed = value.upgrade.allowed;
        diffExist = true;

        changeList.push(`UpgradeAllowed diff: server: ${serverMatch.upgradeAllowed} - expected: ${value.upgrade.allowed}`);
      }

      const upgradeUntil = qualityToId.get(value.upgrade.until_quality);

      if (upgradeUntil == null) {
        throw new Error(`Did not find expected Quality to upgrade until: ${value.upgrade.until_quality}`);
      }

      if (serverMatch.cutoff !== upgradeUntil) {
        updatedServerObject.cutoff = upgradeUntil;
        diffExist = true;
        changeList.push(`Upgrade until quality diff: server: ${serverMatch.cutoff} - expected: ${upgradeUntil}`);
      }

      if (serverMatch.cutoffFormatScore !== value.upgrade.until_score) {
        updatedServerObject.cutoffFormatScore = value.upgrade.until_score;
        diffExist = true;

        changeList.push(`Upgrade until score diff: server: ${serverMatch.cutoffFormatScore} - expected: ${value.upgrade.until_score}`);
      }

      const configMinUpgradeFormatScore = value.upgrade.min_format_score ?? 1;

      // if not configured ignore
      if (value.upgrade.min_format_score != null && serverMatch.minUpgradeFormatScore !== configMinUpgradeFormatScore) {
        updatedServerObject.minUpgradeFormatScore = configMinUpgradeFormatScore;
        diffExist = true;

        changeList.push(
          `Min upgrade format score diff: server: ${serverMatch.cutoffFormatScore} - expected: ${configMinUpgradeFormatScore}`,
        );
      }
    }

    if (profileLanguage != null && serverMatch.language?.name !== profileLanguage.name) {
      updatedServerObject.language = profileLanguage;
      diffExist = true;
      changeList.push(`Language diff: server: ${serverMatch.language?.name} - expected: ${profileLanguage?.name}`);
    }

    // CFs matching. Hint: make sure to execute the method with updated CFs. Otherwise if we create CFs and update existing profiles those could be missing.
    const serverProfileCFMap = new Map(serverMatch.formatItems!.map((obj) => [obj.name!, obj]));

    let scoringDiff = false;

    if (scoringForQP != null) {
      const newCFFormats: MergedProfileFormatItemResource[] = [];

      for (const [scoreKey, scoreValue] of scoringForQP.entries()) {
        const serverCF = serverProfileCFMap.get(scoreKey);
        serverProfileCFMap.delete(scoreKey);

        // TODO (1): check where best handled
        if (scoreValue.score == null) {
          if (value.reset_unmatched_scores?.enabled && !resetScoreExceptions.has(scoreKey) && serverCF?.score !== 0) {
            scoringDiff = true;
            changeList.push(`CF resetting score '${scoreValue.name}': server ${serverCF?.score} - client: 0`);
            newCFFormats.push({ ...serverCF, score: 0 });
          } else {
            newCFFormats.push({ ...serverCF });
          }
        } else {
          if (serverCF?.score !== scoreValue.score) {
            scoringDiff = true;
            changeList.push(`CF diff ${scoreValue.name}: server: ${serverCF?.score} - expected: ${scoreValue.score}`);
            newCFFormats.push({ ...serverCF, score: scoreValue.score });
          } else {
            newCFFormats.push({ ...serverCF });
          }
        }
      }

      const missingCfs = Array.from(serverProfileCFMap.values()).reduce<MergedProfileFormatItemResource[]>((p, c) => {
        const cfName = c.name!;
        const cfScore = c.score;

        if (value.reset_unmatched_scores?.enabled && !resetScoreExceptions.has(c.name!) && cfScore !== 0) {
          scoringDiff = true;
          changeList.push(`CF resetting score '${cfName}': server ${cfScore} - client: 0`);
          p.push({ ...c, score: 0 });
        } else {
          p.push(c);
        }

        return p;
      }, []);

      newCFFormats.push(...missingCfs);

      updatedServerObject.formatItems = newCFFormats;
    } else {
      logger.info(`No scoring for QualityProfile '${serverMatch.name!}' found`);
    }

    logger.debug(
      `QualityProfile (${value.name}) - In Sync: ${changeList.length <= 0}, CF Changes: ${scoringDiff}, Some other diff: ${diffExist}`,
    );

    if (scoringDiff || diffExist) {
      changedQPs.push(updatedServerObject);
    } else {
      noChangedQPs.push(value.name);
    }

    if (changeList.length > 0) {
      logger.debug(changeList, `ChangeList for QualityProfile '${value.name}'`);
    }
  }

  const serverQpsUnmanaged = getUnmanagedQualityProfiles(serverCache.qp, config.quality_profiles);

  if (serverQpsUnmanaged.length > 0) {
    logger.debug(
      `Found existing ${serverQpsUnmanaged.length} QualityProfiles on server which are not managed. Names: '${serverQpsUnmanaged.map((e) => e.name)}'`,
    );
  }

  for (const unmanagedServerQp of serverQpsUnmanaged) {
    // CFs matching. Hint: make sure to execute the method with updated CFs. Otherwise if we create CFs and update existing profiles those could be missing.
    const serverProfileCFMap = new Map(unmanagedServerQp.formatItems!.map((obj) => [obj.name!, obj]));
    const scoringForQP = scoring.get(unmanagedServerQp.name!);
    let scoringDiff = false;
    const changeList: string[] = [];

    if (scoringForQP != null) {
      const newCFFormats: MergedProfileFormatItemResource[] = [];

      for (const [scoreKey, scoreValue] of scoringForQP.entries()) {
        const serverCF = serverProfileCFMap.get(scoreKey);
        serverProfileCFMap.delete(scoreKey);

        // TODO (1): check where best handled
        if (scoreValue.score == null) {
          newCFFormats.push({ ...serverCF });
        } else {
          if (serverCF?.score !== scoreValue.score) {
            scoringDiff = true;
            changeList.push(`CF diff '${scoreValue.name}': server: '${serverCF?.score}' - expected: '${scoreValue.score}'`);
            newCFFormats.push({ ...serverCF, score: scoreValue.score });
          } else {
            newCFFormats.push({ ...serverCF });
          }
        }
      }

      const missingCfs = Array.from(serverProfileCFMap.values());

      newCFFormats.push(...missingCfs);

      unmanagedServerQp.formatItems = newCFFormats;
    } else {
      logger.debug(`No custom format scoring for unmanaged QualityProfile '${unmanagedServerQp.name!}' found`);
    }

    logger.debug(`Unmanaged QualityProfile (${unmanagedServerQp.name}) - In Sync: ${changeList.length <= 0}, CF Changes: ${scoringDiff}}`);

    if (scoringDiff) {
      changedQPs.push(unmanagedServerQp);
    } else {
      noChangedQPs.push(unmanagedServerQp.name!);
    }

    if (changeList.length > 0) {
      logger.debug(changeList, `ChangeList for unmanaged QualityProfile '${unmanagedServerQp.name}'`);
    }
  }

  return { create: createQPs, changedQPs: changedQPs, noChanges: noChangedQPs };
};

export const filterInvalidQualityProfiles = (profiles: ConfigQualityProfile[]): ConfigQualityProfile[] => {
  return profiles.filter((p) => {
    if (p.name == null) {
      logger.warn(p, `QualityProfile filtered because no name provided`);
      return false;
    }
    if (p.qualities == null) {
      logger.warn(`QualityProfile: '${p.name}' filtered because no qualities provided`);
      return false;
    }
    if (p.upgrade == null) {
      logger.warn(`QualityProfile: '${p.name}' filtered because no upgrade definition provided`);
      return false;
    }

    return true;
  });
};

export const getUnmanagedQualityProfiles = (
  serverQP: MergedQualityProfileResource[],
  configQp: ConfigQualityProfile[],
): MergedQualityProfileResource[] => {
  const managedProfileNames = new Set(configQp.map((profile) => profile.name));

  return serverQP.filter((profile) => profile.name && !managedProfileNames.has(profile.name));
};
