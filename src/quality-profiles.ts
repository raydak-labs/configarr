import path from "path";
import {
  CustomFormatResource,
  ProfileFormatItemResource,
  QualityDefinitionResource,
  QualityProfileQualityItemResource,
  QualityProfileResource,
} from "./__generated__/generated-sonarr-api";
import { getArrApi } from "./api";
import { loadServerCustomFormats } from "./custom-formats";
import { logger } from "./logger";
import { loadQualityDefinitionFromServer } from "./quality-definitions";
import { CFProcessing, RecyclarrMergedTemplates, YamlConfigQualityProfile, YamlConfigQualityProfileItems, YamlList } from "./types";
import { IS_LOCAL_SAMPLE_MODE, cloneWithJSON, notEmpty } from "./util";

export const mapQualityProfiles = ({ carrIdMapping }: CFProcessing, customFormats: YamlList[], config: RecyclarrMergedTemplates) => {
  // QualityProfile -> (CF Name -> Scoring)
  const profileScores = new Map<string, Map<string, ProfileFormatItemResource>>();

  const defaultScoringMap = new Map(config.quality_profiles.map((obj) => [obj.name, obj]));

  for (const { trash_ids, quality_profiles } of customFormats) {
    if (!trash_ids) {
      continue;
    }

    //logger.info(customFormats);
    //logger.info(quality_profiles);
    for (const profile of quality_profiles) {
      for (const trashId of trash_ids) {
        const carr = carrIdMapping.get(trashId);

        if (!carr) {
          logger.info(`Unknown ID for CF. ${trashId}`);
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

export const loadQualityProfilesFromServer = async (): Promise<QualityProfileResource[]> => {
  if (IS_LOCAL_SAMPLE_MODE) {
    return (await import(path.resolve(`./tests/samples/quality_profiles.json`))).default;
  }
  const api = getArrApi();

  const qualityProfiles = await api.v3QualityprofileList();
  return qualityProfiles.data as QualityProfileResource[];
};

// TODO should we use clones or not?
const mapQualities = (qd_source: QualityDefinitionResource[], value_source: YamlConfigQualityProfile) => {
  const qd = cloneWithJSON(qd_source);
  const value = cloneWithJSON(value_source);

  const qdMap = new Map(qd.map((obj) => [obj.title, obj]));

  const allowedQualities: QualityProfileQualityItemResource[] = value.qualities.map((obj, i) => {
    if (obj.qualities?.length && obj.qualities.length > 0) {
      return {
        allowed: true,
        id: 1000 + i,
        name: obj.name,
        items: obj.qualities?.map<QualityProfileQualityItemResource>((obj2) => {
          const qd = qdMap.get(obj2);

          const returnObject: QualityProfileQualityItemResource = {
            quality: {
              id: qd?.quality?.id,
              name: obj2,
              resolution: qd?.quality?.resolution,
              source: qd?.quality?.source,
            },
          };

          qdMap.delete(obj2);

          return returnObject;
        }),
      };
    } else {
      const serverQD = qdMap.get(obj.name);

      if (serverQD == null) {
        logger.warn(`Unknown requested quality "${obj.name}" for quality profile ${value.name}`);
        throw new Error(`Please correct your config.`);
      }

      qdMap.delete(obj.name);

      return {
        allowed: true,
        items: [],
        quality: {
          ...serverQD?.quality,
        },
      };
    }
  });

  const missingQualities: QualityProfileQualityItemResource[] = [];

  for (const [key, value] of qdMap.entries()) {
    missingQualities.push({
      allowed: false,
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

export const doAllQualitiesExist = (obj1_source: YamlConfigQualityProfileItems[], obj2_source: YamlConfigQualityProfileItems[]) => {
  const obj1 = cloneWithJSON(obj1_source);
  const obj2 = cloneWithJSON(obj2_source);

  function arraysEqual(arr1: string[], arr2: string[]): boolean {
    if (arr1.length !== arr2.length) {
      return false;
    }

    const sortedArr1 = arr1.slice().sort();
    const sortedArr2 = arr2.slice().sort();

    for (let i = 0; i < sortedArr1.length; i++) {
      if (sortedArr1[i] !== sortedArr2[i]) {
        return false;
      }
    }

    return true;
  }

  if (obj1.length !== obj2.length) {
    return false;
  }

  const sorted1 = obj1.sort((a, b) => (a.name < b.name ? -1 : 1));
  const sorted2 = obj2.sort((a, b) => (a.name < b.name ? -1 : 1));

  for (let index = 0; index < sorted1.length; index++) {
    const element1 = sorted1[index];
    const element2 = sorted2[index];

    if (element1.name !== element2.name) {
      return false;
    }

    if (!arraysEqual(element1.qualities ?? [], element2.qualities ?? [])) {
      return false;
    }
  }

  return true;
};

export const isOrderOfQualitiesEqual = (obj1: YamlConfigQualityProfileItems[], obj2: YamlConfigQualityProfileItems[]) => {
  if (obj1.length !== obj2.length) {
    return false;
  }

  return obj1.every((value, index) => {
    return value.name === obj2[index].name;
  });
};

export const calculateQualityProfilesDiff = async (
  cfManaged: CFProcessing,
  qpMerged: Map<string, YamlConfigQualityProfile>,
  scoring: Map<string, Map<string, ProfileFormatItemResource>>,
  serverQP: QualityProfileResource[],
): Promise<{
  changedQPs: QualityProfileResource[];
  create: QualityProfileResource[];
  noChanges: string[];
}> => {
  const mappedServerQP = serverQP.reduce((p, c) => {
    p.set(c.name!, c);
    return p;
  }, new Map<string, QualityProfileResource>());

  // TODO can be optimized
  const qd = await loadQualityDefinitionFromServer();
  const cfsFromServer = await loadServerCustomFormats();
  const cfsServerMap = new Map(cfsFromServer.map((obj) => [obj.name!, obj]));

  const createQPs: QualityProfileResource[] = [];
  const changedQPs: QualityProfileResource[] = [];
  const noChangedQPs: string[] = [];

  const changes = new Map<string, string[]>();

  for (const [name, value] of qpMerged.entries()) {
    const serverMatch = mappedServerQP.get(name);
    const scoringForQP = scoring.get(name);

    const resetScoreExceptions: Map<string, boolean> =
      value.reset_unmatched_scores?.except?.reduce((p, c) => {
        p.set(c, true);
        return p;
      }, new Map()) ?? new Map();

    if (!serverMatch) {
      logger.info(`QualityProfile '${name}' not found in server. Will be created.`);
      const mappedQ = mapQualities(qd, value);

      const qualityToId = mappedQ.reduce<Map<string, number>>((p, c) => {
        const id = c.id ?? c.quality?.id;
        const qName = c.name ?? c.quality?.name;

        if (id == null || qName == null) {
          throw new Error(`No ID (${id}) or name ${qName} found for quality? QP: ${name}`);
        }

        p.set(qName, id);

        return p;
      }, new Map());

      const cfs: Map<string, CustomFormatResource> = new Map(JSON.parse(JSON.stringify(Array.from(cfsServerMap))));

      const customFormatsMapped = Array.from(cfs.values()).map<ProfileFormatItemResource>((e) => {
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

      createQPs.push({
        name: value.name,
        items: mappedQ,
        cutoff: qualityToId.get(value.upgrade.until_quality),
        cutoffFormatScore: value.upgrade.until_score,
        minFormatScore: value.min_format_score,
        upgradeAllowed: value.upgrade.allowed,
        formatItems: customFormatsMapped,
      });
      continue;
    }

    const changeList: string[] = [];
    changes.set(serverMatch.name!, changeList);

    const updatedServerObject: QualityProfileResource = JSON.parse(JSON.stringify(serverMatch));

    let diffExist = false;

    const valueQualityMap = new Map(value.qualities.map((obj) => [obj.name, obj]));

    // TODO need to better validate if this quality transforming works as expected in different cases
    const serverQualitiesMapped: YamlConfigQualityProfileItems[] = (serverMatch.items || [])
      .map((obj): YamlConfigQualityProfileItems | null => {
        let qualityName: string;

        if (obj.id) {
          qualityName = obj.name!;
        } else {
          qualityName = obj.quality?.name!;
        }

        if (!valueQualityMap.has(qualityName) && !obj.allowed) {
          // Only return null if quality not specified and not enabled in arr. If enabled we need to disable it.
          return null;
        }

        // if ID it is a grouping
        if (obj.id) {
          return {
            name: qualityName,
            qualities: (obj.items || []).map((qObj) => {
              return qObj.quality!.name!;
            }),
          };
        } else {
          return {
            name: qualityName,
            qualities: [],
          };
        }
      })
      .filter(notEmpty);

    // TODO do we want to enforce the whole structure or only match those which are enabled by us?
    if (!doAllQualitiesExist(value.qualities, serverQualitiesMapped)) {
      logger.info(`QualityProfile items mismatch will update whole array`);
      diffExist = true;

      changeList.push(`QualityProfile items do not match`);
      updatedServerObject.items = mapQualities(qd, value);
    } else {
      if (!isOrderOfQualitiesEqual(value.qualities, serverQualitiesMapped.toReversed())) {
        logger.info(`QualityProfile quality order mismatch.`);
        diffExist = true;

        changeList.push(`QualityProfile quality order does not match`);
        updatedServerObject.items = mapQualities(qd, value);
      }
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

    if (value.min_format_score) {
      if (serverMatch.minFormatScore !== value.min_format_score) {
        updatedServerObject.minFormatScore = value.min_format_score;
        diffExist = true;
        changeList.push(`MinFormatScore diff: server: ${serverMatch.minFormatScore} - expected: ${value.min_format_score}`);
      }
    }

    if (value.upgrade) {
      if (serverMatch.upgradeAllowed !== value.upgrade.allowed) {
        updatedServerObject.upgradeAllowed = value.upgrade.allowed;
        diffExist = true;

        changeList.push(`UpgradeAllowed diff: server: ${serverMatch.upgradeAllowed} - expected: ${value.upgrade.allowed}`);
      }

      const upgradeUntil = qualityToId.get(value.upgrade.until_quality);

      if (!upgradeUntil) {
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
    }

    // CFs matching
    const serverCFMap = new Map(serverMatch.formatItems!.map((obj) => [obj.name!, obj]));

    let scoringDiff = false;

    if (scoringForQP) {
      const newCFFormats: ProfileFormatItemResource[] = [];

      for (const [scoreKey, scoreValue] of scoringForQP.entries()) {
        const serverCF = serverCFMap.get(scoreKey);
        serverCFMap.delete(scoreKey);

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

      const missingCfs = Array.from(serverCFMap.values()).reduce<ProfileFormatItemResource[]>((p, c) => {
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
      logger.info(`No scoring for QualityProfile ${serverMatch.name!} found`);
    }

    logger.debug(`QualityProfile (${value.name}) - CF Changes: ${scoringDiff}, Some other diff: ${diffExist}`);

    if (scoringDiff || diffExist) {
      changedQPs.push(updatedServerObject);
    } else {
      noChangedQPs.push(value.name);
    }

    if (changeList.length > 0) {
      logger.debug(`QualityProfile '${value.name}' is not in sync. Will be updated.`);
      logger.debug(changeList, `ChangeList for QualityProfile`);
    } else {
      logger.debug(`QualityProfile '${value.name}' is in sync.`);
    }
  }

  return { create: createQPs, changedQPs: changedQPs, noChanges: noChangedQPs };
};

export const filterInvalidQualityProfiles = (profiles: YamlConfigQualityProfile[]): YamlConfigQualityProfile[] => {
  return profiles.filter((p) => {
    if (p.name == null) {
      logger.info(p, `QualityProfile filtered because no name provided`);
      return false;
    }
    if (p.qualities == null) {
      logger.info(`QualityProfile: '${p.name}' filtered because no qualities provided`);
      return false;
    }
    if (p.upgrade == null) {
      logger.info(`QualityProfile: '${p.name}' filtered because no upgrade definition provided`);
      return false;
    }

    return true;
  });
};
