import type { CFProcessing } from "../customFormats/customFormat.types";
import type { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import { getEnvs } from "../env";
import { logger } from "../logger";
import type { MediaArrType } from "../types/common.types";
import type { ConfigQualityProfile, MergedConfigInstance } from "../types/config.types";
import type { TrashCFConflict } from "../types/trashguide.types";
import { ANY_LANGUAGE_NAME } from "../util";
import { ConfigValidationError, warnOrThrowConfig } from "../validation";
import type { FormatItem, QualityProfileLanguage, QualityProfileShared } from "./qualityProfile.types";

type MinUpgradeProfile = { minUpgradeFormatScore?: number };
type LanguageProfile = { language?: QualityProfileLanguage };

export const warnUnsupportedQualityProfileLanguage = (
  profileName: string,
  arrType: MediaArrType,
  configLanguage: string | undefined,
): void => {
  if (configLanguage) {
    logger.warn(`QualityProfile '${profileName}': language is not supported for ${arrType}. Ignoring.`);
  }
};

export const resolveQualityProfileLanguage = (
  configLanguage: string | undefined,
  languageMap: Map<string, QualityProfileLanguage>,
): QualityProfileLanguage | undefined => {
  if (configLanguage) {
    const profileLanguage = languageMap.get(configLanguage);

    if (profileLanguage == null) {
      logger.warn(`Profile language '${configLanguage}' not found in server. Ignoring.`);
    }

    return profileLanguage;
  }

  const profileLanguage = languageMap.get(ANY_LANGUAGE_NAME);

  if (profileLanguage == null) {
    logger.warn(`Default language '${ANY_LANGUAGE_NAME}' not found in server. Ignoring.`);
  }

  return profileLanguage;
};

export const attachLanguageOnCreate = (profile: LanguageProfile, language: QualityProfileLanguage | undefined): void => {
  if (language) {
    profile.language = language;
  }
};

export const diffLanguageOnUpdate = (
  updated: LanguageProfile,
  serverMatch: LanguageProfile,
  language: QualityProfileLanguage | undefined,
  fieldChanges: FieldChange[],
): boolean => {
  if (language != null && serverMatch.language?.name !== language.name) {
    updated.language = language;
    fieldChanges.push({ field: "language", from: serverMatch.language?.name, to: language.name });
    return true;
  }

  return false;
};

export const attachMinUpgradeOnCreate = (profile: MinUpgradeProfile, minUpgradeFormatScore: number): void => {
  profile.minUpgradeFormatScore = minUpgradeFormatScore;
};

export const diffMinUpgradeOnUpdate = (
  updated: MinUpgradeProfile,
  serverMatch: MinUpgradeProfile,
  upgradeAllowed: boolean,
  configMinUpgrade: number | undefined,
  fieldChanges: FieldChange[],
): boolean => {
  if (upgradeAllowed) {
    const configMinUpgradeFormatScore = configMinUpgrade ?? 1;

    if (configMinUpgrade != null && serverMatch.minUpgradeFormatScore !== configMinUpgradeFormatScore) {
      updated.minUpgradeFormatScore = configMinUpgradeFormatScore;
      fieldChanges.push({
        field: "minUpgradeFormatScore",
        from: serverMatch.minUpgradeFormatScore,
        to: configMinUpgradeFormatScore,
      });
      return true;
    }

    return false;
  }

  if (serverMatch.minUpgradeFormatScore !== 1) {
    updated.minUpgradeFormatScore = 1;
    fieldChanges.push({ field: "minUpgradeFormatScore", from: serverMatch.minUpgradeFormatScore, to: 1 });
    return true;
  }

  return false;
};

// merge CFs of templates and custom CFs into one mapping of QualityProfile -> CFs + Score
export const mapQualityProfiles = ({ carrIdMapping }: CFProcessing, { custom_formats, quality_profiles }: MergedConfigInstance) => {
  // QualityProfile -> (CF Name -> Scoring)
  const profileScores = new Map<string, Map<string, FormatItem>>();

  const defaultScoringMap = new Map(quality_profiles.map((obj) => [obj.name, obj]));

  for (const { trash_ids, assign_scores_to } of custom_formats) {
    if (!trash_ids || !assign_scores_to) {
      continue;
    }

    for (const profile of assign_scores_to) {
      for (const trashId of trash_ids) {
        const carr = carrIdMapping.get(trashId);

        if (!carr) {
          warnOrThrowConfig(`Unknown ID for CF. ${trashId}`);
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

        // If use_default_score is explicitly set to true, use the TRaSH Guide default score
        // This overrides any explicit score set by groups or templates
        if (profile.use_default_score === true) {
          cfScore.score = carr.carrConfig.configarr_scores?.default;
        } else {
          // Normal score resolution: explicit score > score_set > default
          cfScore.score = profile.score ?? score_set ?? carr.carrConfig.configarr_scores?.default;
        }
      }
    }
  }

  return profileScores;
};

export function qualityProfilesToDiffEntries<T extends QualityProfileShared>(
  create: T[],
  changedQPs: T[],
  changes: Map<string, FieldChange[]>,
): DiffEntry[] {
  const entries: DiffEntry[] = create.map((qp) => ({
    resourceType: "QualityProfile",
    name: qp.name!,
    action: "create" as const,
  }));

  for (const qp of changedQPs) {
    entries.push({
      resourceType: "QualityProfile",
      name: qp.name!,
      action: "update",
      fieldChanges: changes.get(qp.name!) ?? [],
    });
  }

  return entries;
}

export const filterInvalidQualityProfiles = (profiles: ConfigQualityProfile[]): ConfigQualityProfile[] => {
  return profiles.filter((p) => {
    if (p.name == null) {
      if (getEnvs().CONFIGARR_ENFORCE_CONFIG_VALIDATION) {
        throw new ConfigValidationError("QualityProfile filtered because no name provided");
      }
      logger.warn(p, `QualityProfile filtered because no name provided`);
      return false;
    }
    if (p.qualities == null) {
      warnOrThrowConfig(`QualityProfile: '${p.name}' filtered because no qualities provided`);
      return false;
    }
    if (p.upgrade == null) {
      warnOrThrowConfig(`QualityProfile: '${p.name}' filtered because no upgrade definition provided`);
      return false;
    }

    return true;
  });
};

export const getUnmanagedQualityProfiles = <T extends QualityProfileShared>(serverQP: T[], configQp: ConfigQualityProfile[]): T[] => {
  const managedProfileNames = new Set(configQp.map((profile) => profile.name));

  return serverQP.filter((profile) => profile.name && !managedProfileNames.has(profile.name));
};

/**
 * Detects and warns about mutually exclusive custom formats in quality profiles.
 *
 * @param cfMap - The CF mapping containing carrIdMapping for name resolution
 * @param config - Merged config instance with custom_formats and quality_profiles
 * @param conflicts - List of TRaSH conflict groups to check
 */
export const checkForConflictingCFs = (
  cfMap: CFProcessing,
  config: MergedConfigInstance,
  conflicts: TrashCFConflict[] | undefined,
): void => {
  if (!conflicts || conflicts.length === 0) {
    return;
  }

  // Build quality profile -> Set<trash_id> mapping from merged config
  const profileToTrashIds = new Map<string, Set<string>>();

  for (const { trash_ids, assign_scores_to } of config.custom_formats) {
    if (!trash_ids || !assign_scores_to) {
      continue;
    }

    for (const profile of assign_scores_to) {
      let profileSet = profileToTrashIds.get(profile.name);

      if (!profileSet) {
        profileSet = new Set();
        profileToTrashIds.set(profile.name, profileSet);
      }

      for (const trashId of trash_ids) {
        profileSet.add(trashId);
      }
    }
  }

  // For each conflict group, find profiles containing 2+ conflicting CFs
  for (const conflict of conflicts) {
    const { trash_id: conflictId, name: conflictName, custom_formats: conflictingCFs } = conflict;

    for (const [profileName, profileTrashIds] of profileToTrashIds.entries()) {
      // Find how many CFs from this conflict group are in the profile
      const matchedCFs = conflictingCFs.filter((cf) => profileTrashIds.has(cf.trash_id));

      if (matchedCFs.length >= 2) {
        // Resolve display names: TRaSH conflicts first, then carrIdMapping, then raw id
        const cfNames = matchedCFs
          .map((cf) => {
            const carrConfig = cfMap.carrIdMapping.get(cf.trash_id);
            return carrConfig?.carrConfig.name || cf.name || cf.trash_id;
          })
          .join(", ");

        const cfIds = matchedCFs.map((cf) => cf.trash_id).join(", ");

        logger.warn(
          `QualityProfile '${profileName}': Conflicting CustomFormats detected [${cfNames}] (ids: [${cfIds}]). ` +
            `TRaSH marks these as mutually exclusive in conflict group '${conflictName}' (id: ${conflictId}). ` +
            `Sync continues unchanged.`,
        );
      }
    }
  }
};
