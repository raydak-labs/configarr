import path from "path";
import {
  ProfileFormatItemResource,
  QualityDefinitionResource,
  QualityProfileQualityItemResource,
  QualityProfileResource,
} from "./__generated__/MySuperbApi";
import { getSonarrApi } from "./api";
import { loadServerCustomFormats } from "./customFormats";
import { loadQualityDefinitionFromSonarr } from "./qualityDefinition";
import {
  CFProcessing,
  RecyclarrMergedTemplates,
  YamlConfigQualityProfile,
  YamlConfigQualityProfileItems,
  YamlList,
} from "./types";
import { notEmpty } from "./util";

export const mapQualityProfiles = (
  { carrIdMapping }: CFProcessing,
  customFormats: YamlList[],
  config: RecyclarrMergedTemplates
) => {
  // QualityProfile -> (CF Name -> Scoring)
  const profileScores = new Map<
    string,
    Map<string, ProfileFormatItemResource>
  >();

  const defaultScoringMap = new Map(
    config.quality_profiles.map((obj) => [obj.name, obj])
  );

  for (const { trash_ids, quality_profiles } of customFormats) {
    if (!trash_ids) {
      continue;
    }

    for (const profile of quality_profiles) {
      for (const trashId of trash_ids) {
        const carr = carrIdMapping.get(trashId);

        if (!carr) {
          console.log(`Unknown ID for CF. ${trashId}`);
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
          score_set =
            carr.carrConfig.configarr_scores?.[profileScoreConfig.score_set];
        }

        cfScore.score =
          profile.score ??
          score_set ??
          carr.carrConfig.configarr_scores?.default;
      }
    }
  }

  return profileScores;
};

export const loadQualityProfilesSonarr = async (): Promise<
  QualityProfileResource[]
> => {
  // TODO mock
  return (await import(path.resolve(`./tests/samples/quality_profiles.json`)))
    .default;

  const api = getSonarrApi();

  const qualityProfiles = await api.v3QualityprofileList();
  return qualityProfiles.data;
};

const mapQualities = (
  qd: QualityDefinitionResource[],
  value: YamlConfigQualityProfile
) => {
  const qdMap = new Map(qd.map((obj) => [obj.title, obj]));

  const allowedQualies: QualityProfileQualityItemResource[] =
    value.qualities.map((obj, i) => {
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
  return [...missingQualities, ...allowedQualies.reverse()];
};

export const calculateQualityProfilesDiff = async (
  cfManaged: CFProcessing,
  qpMerged: Map<string, YamlConfigQualityProfile>,
  scoring: Map<string, Map<string, ProfileFormatItemResource>>,
  serverQP: QualityProfileResource[]
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
  const qd = await loadQualityDefinitionFromSonarr();
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
      console.log(`QualityProfile not found in server. Ignoring: ${name}`);
      // TODO create needed
      const mappedQ = mapQualities(qd, value);
      const tmpMap = new Map(mappedQ.map((obj) => [obj.name!, obj]));

      const cfs: Map<string, ProfileFormatItemResource> = new Map(
        JSON.parse(JSON.stringify(Array.from(cfsServerMap)))
      );

      if (scoringForQP) {
        for (const [scoreKey, scoreValue] of scoringForQP.entries()) {
          const currentCf = cfs.get(scoreKey);
          if (currentCf) {
            currentCf.score =
              scoreValue.score ??
              cfManaged.cfNameToCarrConfig.get(scoreKey)?.configarr_scores
                ?.default;
          }
        }
      }

      createQPs.push({
        name: value.name,
        items: mappedQ,
        cutoff: tmpMap.get(value.upgrade.until_quality)?.id,
        cutoffFormatScore: value.upgrade.until_score,
        minFormatScore: value.min_format_score,
        upgradeAllowed: value.upgrade.allowed,
        formatItems: Array.from(cfs.values()),
      });
      continue;
    }

    const changeList: string[] = [];
    changes.set(serverMatch.name!, changeList);

    const updatedServerObject: QualityProfileResource = JSON.parse(
      JSON.stringify(serverMatch)
    );

    let diffExist = false;

    const valueQualityMap = new Map(
      value.qualities.map((obj) => [obj.name, obj])
    );

    const resut: YamlConfigQualityProfileItems[] = (serverMatch.items || [])
      .map((obj) => {
        if (!valueQualityMap.has(obj.name!)) {
          return null;
        }

        return {
          name: obj.name!,
          qualitites: (obj.items || [])?.map((qObj) => {
            return qObj.quality!.name;
          }),
        } as YamlConfigQualityProfileItems;
      })
      .filter(notEmpty);

    if (JSON.stringify(value.qualities) !== JSON.stringify(resut)) {
      console.log(`QualityProfile Items mismatch will update whole array`);
      diffExist = true;

      changeList.push(`QualityProfile items do not match`);
      updatedServerObject.items = mapQualities(qd, value);
    }

    if (value.min_format_score) {
      if (serverMatch.minFormatScore !== value.min_format_score) {
        updatedServerObject.minFormatScore = value.min_format_score;
        diffExist = true;
        changeList.push(
          `MinFormatScore diff: server: ${serverMatch.minFormatScore} - expected: ${value.min_format_score}`
        );
      }
    }

    // TODO quality_sort,reset_unmatched_score, score_set . check recyclarr
    if (value.quality_sort) {
    }

    if (value.upgrade) {
      if (serverMatch.upgradeAllowed !== value.upgrade.allowed) {
        updatedServerObject.upgradeAllowed = value.upgrade.allowed;
        diffExist = true;

        changeList.push(
          `UpgradeAllowed diff: server: ${serverMatch.upgradeAllowed} - expected: ${value.upgrade.allowed}`
        );
      }

      const upgradeUntil = updatedServerObject.items?.find(
        (e) => e.name === value.upgrade.until_quality
      );

      if (serverMatch.cutoff !== upgradeUntil?.id) {
        updatedServerObject.cutoff = upgradeUntil?.id;
        diffExist = true;
        changeList.push(
          `Upgrade until quality diff: server: ${serverMatch.cutoff} - expected: ${upgradeUntil?.id}`
        );
      }

      if (serverMatch.cutoffFormatScore !== value.upgrade.until_score) {
        updatedServerObject.cutoffFormatScore = value.upgrade.until_score;
        diffExist = true;

        changeList.push(
          `Upgrade until score diff: server: ${serverMatch.cutoffFormatScore} - expected: ${value.upgrade.until_score}`
        );
      }
    }

    // CFs matching
    const serverCFMap = new Map(
      serverMatch.formatItems!.map((obj) => [obj.name!, obj])
    );

    let scoringDiff = false;

    if (scoringForQP) {
      const newCFFormats: ProfileFormatItemResource[] = [];

      for (const [scoreKey, scoreValue] of scoringForQP.entries()) {
        const serverCF = serverCFMap.get(scoreKey);

        if (scoreValue.score == null) {
          console.log(
            serverCF?.score,
            value.reset_unmatched_scores?.enabled,
            !resetScoreExceptions.has(scoreKey)
          );
          if (
            value.reset_unmatched_scores?.enabled &&
            !resetScoreExceptions.has(scoreKey) &&
            serverCF?.score !== 0
          ) {
            scoringDiff = true;
            changeList.push(
              `CF resetting score '${scoreValue.name}': server ${serverCF?.score} - client: 0`
            );
            newCFFormats.push({ ...serverCF, score: 0 });
          } else {
            newCFFormats.push({ ...serverCF });
          }
        } else {
          if (serverCF?.score !== scoreValue.score) {
            scoringDiff = true;
            changeList.push(
              `CF diff ${scoreValue.name}: server: ${serverCF?.score} - expected: ${scoreValue.score}`
            );
            newCFFormats.push({ ...serverCF, score: scoreValue.score });
          } else {
            newCFFormats.push({ ...serverCF });
          }
        }
      }

      updatedServerObject.formatItems = newCFFormats;
    } else {
      console.log(`No scoring for QualityProfile ${serverMatch.name!} found`);
    }

    console.log(
      `QualityProfile (${value.name}) - CF Changes: ${scoringDiff}, Some other diff: ${diffExist}`
    );

    if (scoringDiff || diffExist) {
      changedQPs.push(updatedServerObject);
    } else {
      noChangedQPs.push(value.name);
    }

    console.log(changeList);
  }

  return { create: createQPs, changedQPs: changedQPs, noChanges: noChangedQPs };
};
