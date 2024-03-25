import fs from "fs";
import path from "path";
import {
  ProfileFormatItemResource,
  QualityProfileQualityItemResource,
  QualityProfileResource,
} from "./__generated__/MySuperbApi";
import { getSonarrApi } from "./api";
import { loadQualityDefinitionFromSonarr } from "./qualityDefinition";
import {
  CFProcessing,
  YamlConfigQualityProfile,
  YamlConfigQualityProfileItems,
  YamlList,
} from "./types";
import { notEmpty } from "./util";

export const mapQualityProfiles = (
  { carrIdMapping }: CFProcessing,
  customFormats: YamlList[]
) => {
  // QualityProfile -> (CF Name -> Scoring)
  const profileScores = new Map<
    string,
    Map<string, ProfileFormatItemResource>
  >();

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
        cfScore.score =
          profile.score || carr.carrConfig.configarr_scores?.default;
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

export const calculateQualityProfilesDiff = async (
  qpMerged: Map<string, YamlConfigQualityProfile>,
  scoring: Map<string, Map<string, ProfileFormatItemResource>>,
  serverQP: QualityProfileResource[]
): Promise<{
  changes: string[];
  create: [];
  noChanges: [];
}> => {
  const mappedServerQP = serverQP.reduce((p, c) => {
    p.set(c.name!, c);
    return p;
  }, new Map<string, QualityProfileResource>());

  const changes = new Map<string, string[]>();

  for (const [name, value] of qpMerged.entries()) {
    const serverMatch = mappedServerQP.get(name);

    if (!serverMatch) {
      console.log(`QualityProfile not found in server. Ignoring: ${name}`);
      // TODO create needed
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

      const qd = await loadQualityDefinitionFromSonarr();

      const qdMap = new Map(qd.map((obj) => [obj.title, obj]));

      // Ordering of items in the array matters of how they will be displayed. First is last.
      // Need to double check if always works as expected also regarding of templates etc.

      const allowedQualies: QualityProfileQualityItemResource[] =
        value.qualities.map((obj, i) => {
          return {
            allowed: true,
            id: 1000 + i,
            name: obj.name,
            items: obj.qualities?.map<QualityProfileQualityItemResource>(
              (obj2) => {
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
              }
            ),
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

      updatedServerObject.items = [
        ...missingQualities,
        ...allowedQualies.reverse(),
      ];
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

    // TODO reset_unmatched_score check recyclarr

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

    const scoringForQP = scoring.get(serverMatch.name!);

    if (scoringForQP) {
      const newCFFormats: ProfileFormatItemResource[] = [];

      for (const [key, value] of scoringForQP.entries()) {
        const serverCF = serverCFMap.get(key);

        if (value.score != null && serverCF?.score !== value.score) {
          scoringDiff = true;
          changeList.push(
            `CF diff ${value.name}: server: ${serverCF?.score} - expected: ${value.score}`
          );
          newCFFormats.push({ ...serverCF, score: value.score });
        } else {
          newCFFormats.push({ ...serverCF });
        }
      }

      updatedServerObject.formatItems = newCFFormats;
    } else {
      console.log(`No scoring for QualityProfile ${serverMatch.name!} found`);
    }

    updatedServerObject.id = 24;
    updatedServerObject.name = "TEST";
    fs.writeFileSync("test.json", JSON.stringify(updatedServerObject, null, 2));

    console.log(`CF Changes: ${scoringDiff}, Some other diff: ${diffExist}`);
    console.log(changeList);
  }

  throw new Error("STOP HERE");
};
