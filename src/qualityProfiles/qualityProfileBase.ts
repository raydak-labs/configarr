import path from "node:path";
import { ServerCache } from "../cache";
import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import { getEnvs } from "../env";
import { logger } from "../logger";
import { CFProcessing } from "../customFormats/customFormat.types";
import { MediaArrType } from "../types/common.types";
import { ConfigQualityProfile, ConfigQualityProfileItem, MergedConfigInstance } from "../types/config.types";
import type { TrashCFConflict } from "../types/trashguide.types";
import { ANY_LANGUAGE_NAME, cloneWithJSON, loadJsonFile, zip } from "../util";
import { ConfigValidationError, warnOrThrowConfig } from "../validation";
import { CustomFormatRef, FormatItem, QualityItem, QualityProfileLanguage, QualityProfileShared } from "./qualityProfile.types";
import type { QualityDefinitionShared } from "../qualityDefinitions/qualityDefinition.types";

export type QualityProfileDiffResult<T extends QualityProfileShared = QualityProfileShared> = {
  changedQPs: T[];
  create: T[];
  noChanges: string[];
  changes: Map<string, FieldChange[]>;
};

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

// TODO should we use clones or not?
export const mapQualities = (qd_source: QualityDefinitionShared[], value_source: ConfigQualityProfile) => {
  const qd = cloneWithJSON(qd_source);
  const value = cloneWithJSON(value_source);

  const qdMap = new Map(qd.map((obj) => [obj.quality?.name, obj]));
  const qdLookupWithTitle = new Map(qdMap);

  // Add title names to map and overwrite existing ones if they exist. This acts as fallback if someone used the title we do not want to keep it user friendly.
  qdLookupWithTitle.forEach((element) => {
    if (element.title) {
      qdLookupWithTitle.set(element.title, element);
    }
  });

  const allowedQualities = value.qualities.map<QualityItem>((obj, i) => {
    if (obj.qualities?.length && obj.qualities.length > 0) {
      return {
        allowed: obj.enabled ?? true,
        id: 1000 + i,
        name: obj.name,
        items:
          obj.qualities
            ?.map<QualityItem>((obj2) => {
              const qd = qdLookupWithTitle.get(obj2);

              if (qd == null) {
                logger.warn(`Unknown requested quality "${obj2}" for quality profile ${value.name}`);
                throw new ConfigValidationError(`QualityProfile '${value.name}': unknown requested quality '${obj2}'`);
              }

              const returnObject: QualityItem = {
                quality: {
                  id: qd.quality?.id,
                  name: obj2,
                  resolution: qd.quality?.resolution,
                },
                allowed: obj.enabled ?? true,
                items: [],
              };

              qdMap.delete(qd.quality?.name);

              return returnObject;
            })
            .reverse() || [],
      };
    } else {
      const serverQD = qdLookupWithTitle.get(obj.name);

      if (serverQD == null) {
        logger.warn(`Unknown requested quality "${obj.name}" for quality profile ${value.name}`);
        throw new ConfigValidationError(`QualityProfile '${value.name}': unknown requested quality '${obj.name}'`);
      }

      qdMap.delete(serverQD.quality?.name);

      const item: QualityItem = {
        allowed: obj.enabled ?? true,
        items: [],
        quality: {
          id: serverQD?.quality?.id,
          name: serverQD?.quality?.name,
          resolution: serverQD?.quality?.resolution,
        },
      };
      return item;
    }
  });

  const missingQualities: QualityItem[] = [];

  for (const [key, value] of qdMap.entries()) {
    missingQualities.push({
      allowed: false,
      items: [],
      //id: qualIndex++, // ID not allowed if not enabled
      quality: {
        id: value.quality?.id,
        name: key,
        resolution: value.quality?.resolution,
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

export const isOrderOfQualitiesEqual = (arr1: QualityItem[], arr2: QualityItem[]) => {
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
 * Resolves the cutoff ID to use when upgrades are disabled.
 * Prefers `untilQuality` when provided; falls back to the highest-priority
 * allowed quality in the mapped list. Throws when no allowed quality exists.
 */
const getDisabledUpgradeCutoff = (
  mappedQualities: QualityItem[],
  qualityToId: Map<string, number>,
  untilQuality: string | undefined,
  profileName: string,
): number => {
  if (untilQuality != null) {
    const id = qualityToId.get(untilQuality);
    if (id != null) return id;
  }

  // mappedQualities is in API order (reversed from config), so the last item is
  // the highest-priority quality in user config.
  const fallback = mappedQualities
    .slice()
    .reverse()
    .find((e) => e.allowed);
  const fallbackId = fallback?.id ?? fallback?.quality?.id;

  if (fallbackId == null) {
    throw new ConfigValidationError(`QualityProfile '${profileName}': no allowed quality found to use as cutoff when upgrade is disabled`);
  }

  if (untilQuality == null) {
    logger.debug(
      `QualityProfile '${profileName}': upgrade.until_quality not specified; using highest-priority allowed quality as cutoff (id=${fallbackId})`,
    );
  }

  return fallbackId;
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

export type QualityProfileSyncApi<T extends QualityProfileShared> = {
  getQualityProfiles(): Promise<T[]>;
  createQualityProfile(profile: QualityProfileShared): Promise<T>;
  updateQualityProfile(id: string, profile: QualityProfileShared): Promise<T>;
  deleteQualityProfile(id: string): Promise<void>;
};

export abstract class BaseQualityProfileSync<T extends QualityProfileShared> {
  protected readonly logger = logger;

  constructor(protected readonly api?: QualityProfileSyncApi<T>) {}

  protected getApi(): QualityProfileSyncApi<T> {
    if (this.api === undefined) {
      throw new Error("Quality profile API client is required");
    }
    return this.api;
  }

  protected abstract resolveLanguage(
    profileName: string,
    configLanguage: string | undefined,
    languageMap: Map<string, QualityProfileLanguage>,
  ): QualityProfileLanguage | undefined;

  protected abstract attachLanguageOnCreate(profile: QualityProfileShared, language: QualityProfileLanguage | undefined): void;

  protected abstract diffLanguageOnUpdate(
    updated: QualityProfileShared,
    serverMatch: QualityProfileShared,
    language: QualityProfileLanguage | undefined,
    fieldChanges: FieldChange[],
  ): boolean;

  protected abstract attachMinUpgradeOnCreate(profile: QualityProfileShared, minUpgradeFormatScore: number): void;

  protected abstract diffMinUpgradeOnUpdate(
    updated: QualityProfileShared,
    serverMatch: QualityProfileShared,
    upgradeAllowed: boolean,
    configMinUpgrade: number | undefined,
    fieldChanges: FieldChange[],
  ): boolean;

  createOnServer(profile: QualityProfileShared) {
    return this.getApi().createQualityProfile(profile);
  }

  updateOnServer(id: string, profile: QualityProfileShared) {
    return this.getApi().updateQualityProfile(id, profile);
  }

  loadFromServer() {
    if (getEnvs().LOAD_LOCAL_SAMPLES) {
      return loadJsonFile<QualityProfileShared[]>(path.resolve(__dirname, "../../tests/samples/quality_profiles.json"));
    }
    return this.getApi().getQualityProfiles();
  }

  deleteOnServer(qualityProfile: QualityProfileShared) {
    return this.getApi().deleteQualityProfile(qualityProfile.id + "");
  }

  async deleteAll(): Promise<void> {
    const qualityProfilesOnServer = await this.loadFromServer();

    for (const qualityProfile of qualityProfilesOnServer) {
      await this.deleteOnServer(qualityProfile);
      this.logger.info(`Deleted QP: '${qualityProfile.name}'`);
    }
  }

  async persist(diff: QualityProfileDiffResult, write: boolean): Promise<void> {
    if (!write) {
      return;
    }

    for (const element of diff.create) {
      try {
        const newProfile = await this.createOnServer(element);
        this.logger.info(`Created QualityProfile: ${newProfile.name}`);
      } catch (error: unknown) {
        this.logger.error(`Failed creating QualityProfile (${element.name})`);
        throw error;
      }
    }

    for (const element of diff.changedQPs) {
      try {
        const newProfile = await this.updateOnServer("" + element.id, element);
        this.logger.info(`Updated QualityProfile: ${newProfile.name}`);
      } catch (error: unknown) {
        this.logger.error(`Failed updating QualityProfile (${element.name})`);
        throw error;
      }
    }
  }

  async calculateQualityProfilesDiff(
    cfMap: CFProcessing,
    config: MergedConfigInstance,
    serverCache: ServerCache,
  ): Promise<QualityProfileDiffResult> {
    // TODO maybe improve?
    const scoring = mapQualityProfiles(cfMap, config);
    const qpMerged = new Map(config.quality_profiles.map((obj) => [obj.name, obj]));
    const serverQualityProfiles = serverCache.qualityProfiles;
    const qpServerMap = new Map(serverQualityProfiles.map((obj) => [obj.name!, obj]));
    const cfServerMap = new Map(serverCache.customFormats.map((obj) => [obj.name!, obj]));
    const languageMap = new Map(serverCache.languages.map((obj) => [obj.name!, obj]));

    const createQPs: QualityProfileShared[] = [];
    const changedQPs: QualityProfileShared[] = [];
    const noChangedQPs: string[] = [];

    const changes = new Map<string, FieldChange[]>();

    for (const [name, value] of qpMerged.entries()) {
      const serverMatch = qpServerMap.get(name);
      const scoringForQP = scoring.get(name);
      const mappedQualities = mapQualities(serverCache.qualityDefinitions, value);

      const profileLanguage = this.resolveLanguage(name, value.language, languageMap);

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

        const cfs: Map<string, CustomFormatRef> = new Map(JSON.parse(JSON.stringify(Array.from(cfServerMap))));

        const customFormatsMapped = Array.from(cfs.values()).map<FormatItem>((e) => {
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

        const newP: QualityProfileShared = {
          name: value.name,
          items: mappedQualities,
          minFormatScore: value.min_format_score,
          formatItems: customFormatsMapped,
        };

        if (value.upgrade.allowed) {
          if (value.upgrade.until_quality == null) {
            throw new ConfigValidationError(`QualityProfile '${name}': upgrade.until_quality is required when upgrade.allowed is true`);
          }

          newP.cutoff = qualityToId.get(value.upgrade.until_quality);
          if (newP.cutoff == null) {
            throw new ConfigValidationError(
              `QualityProfile '${name}': configured upgrade.until_quality '${value.upgrade.until_quality}' was not found on the server`,
            );
          }
          newP.cutoffFormatScore = value.upgrade.until_score;
          newP.upgradeAllowed = true;
          this.attachMinUpgradeOnCreate(newP, value.upgrade.min_format_score ?? 1);
        } else {
          const cutoffId = getDisabledUpgradeCutoff(mappedQualities, qualityToId, value.upgrade.until_quality, name);

          newP.cutoff = cutoffId;
          newP.cutoffFormatScore = 1;
          newP.upgradeAllowed = false;
          this.attachMinUpgradeOnCreate(newP, 1);
        }

        this.attachLanguageOnCreate(newP, profileLanguage);
        createQPs.push(newP);
        continue;
      }

      const fieldChanges: FieldChange[] = [];
      changes.set(serverMatch.name!, fieldChanges);

      const updatedServerObject = cloneWithJSON(serverMatch);

      let diffExist = false;

      // TODO do we want to enforce the whole structure or only match those which are enabled by us?
      if (!isOrderOfQualitiesEqual(mappedQualities, serverMatch.items || [])) {
        logger.debug(`QualityProfile quality order mismatch.`);
        diffExist = true;

        fieldChanges.push({ field: "items", from: serverMatch.items, to: mappedQualities });
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
          fieldChanges.push({ field: "minFormatScore", from: serverMatch.minFormatScore, to: value.min_format_score });
        }
      }

      if (value.upgrade != null) {
        if (serverMatch.upgradeAllowed !== value.upgrade.allowed) {
          updatedServerObject.upgradeAllowed = value.upgrade.allowed;
          diffExist = true;

          fieldChanges.push({ field: "upgradeAllowed", from: serverMatch.upgradeAllowed, to: value.upgrade.allowed });
        }

        // Further diffs only necessary if upgrade is allowed
        if (value.upgrade.allowed) {
          if (value.upgrade.until_quality == null) {
            throw new ConfigValidationError(`QualityProfile '${name}': upgrade.until_quality is required when upgrade.allowed is true`);
          }

          const upgradeUntil = qualityToId.get(value.upgrade.until_quality);

          if (upgradeUntil == null) {
            throw new ConfigValidationError(
              `QualityProfile '${name}': configured upgrade.until_quality '${value.upgrade.until_quality}' was not found on the server`,
            );
          }

          if (serverMatch.cutoff !== upgradeUntil) {
            updatedServerObject.cutoff = upgradeUntil;
            diffExist = true;
            fieldChanges.push({ field: "cutoff", from: serverMatch.cutoff, to: upgradeUntil });
          }

          if (serverMatch.cutoffFormatScore !== value.upgrade.until_score) {
            updatedServerObject.cutoffFormatScore = value.upgrade.until_score;
            diffExist = true;

            fieldChanges.push({ field: "cutoffFormatScore", from: serverMatch.cutoffFormatScore, to: value.upgrade.until_score });
          }

          if (this.diffMinUpgradeOnUpdate(updatedServerObject, serverMatch, true, value.upgrade.min_format_score, fieldChanges)) {
            diffExist = true;
          }
        } else {
          const cutoffId = getDisabledUpgradeCutoff(mappedQualities, qualityToId, value.upgrade.until_quality, name);

          if (serverMatch.cutoff !== cutoffId) {
            updatedServerObject.cutoff = cutoffId;
            diffExist = true;
            fieldChanges.push({ field: "cutoff", from: serverMatch.cutoff, to: cutoffId });
          }

          if (serverMatch.cutoffFormatScore !== 1) {
            updatedServerObject.cutoffFormatScore = 1;
            diffExist = true;
            fieldChanges.push({ field: "cutoffFormatScore", from: serverMatch.cutoffFormatScore, to: 1 });
          }

          if (this.diffMinUpgradeOnUpdate(updatedServerObject, serverMatch, false, undefined, fieldChanges)) {
            diffExist = true;
          }
        }
      }

      if (this.diffLanguageOnUpdate(updatedServerObject, serverMatch, profileLanguage, fieldChanges)) {
        diffExist = true;
      }

      // CFs matching. Hint: make sure to execute the method with updated CFs. Otherwise if we create CFs and update existing profiles those could be missing.
      const serverProfileCFMap = new Map(serverMatch.formatItems!.map((obj) => [obj.name!, obj]));

      let scoringDiff = false;

      if (scoringForQP != null) {
        const newCFFormats: FormatItem[] = [];

        for (const [scoreKey, scoreValue] of scoringForQP.entries()) {
          const serverCF = serverProfileCFMap.get(scoreKey);
          serverProfileCFMap.delete(scoreKey);

          // TODO (1): check where best handled
          if (scoreValue.score == null) {
            if (value.reset_unmatched_scores?.enabled && !resetScoreExceptions.has(scoreKey) && serverCF?.score !== 0) {
              scoringDiff = true;
              fieldChanges.push({ field: `customFormats.${scoreValue.name}`, from: serverCF?.score, to: 0 });
              newCFFormats.push({ ...serverCF, score: 0 });
            } else {
              newCFFormats.push({ ...serverCF });
            }
          } else {
            if (serverCF?.score !== scoreValue.score) {
              scoringDiff = true;
              fieldChanges.push({ field: `customFormats.${scoreValue.name}`, from: serverCF?.score, to: scoreValue.score });
              newCFFormats.push({ ...serverCF, score: scoreValue.score });
            } else {
              newCFFormats.push({ ...serverCF });
            }
          }
        }

        const missingCfs = Array.from(serverProfileCFMap.values()).reduce<FormatItem[]>((p, c) => {
          const cfName = c.name!;
          const cfScore = c.score;

          if (value.reset_unmatched_scores?.enabled && !resetScoreExceptions.has(c.name!) && cfScore !== 0) {
            scoringDiff = true;
            fieldChanges.push({ field: `customFormats.${cfName}`, from: cfScore, to: 0 });
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
        `QualityProfile (${value.name}) - In Sync: ${fieldChanges.length <= 0}, CF Changes: ${scoringDiff}, Some other diff: ${diffExist}`,
      );

      if (scoringDiff || diffExist) {
        changedQPs.push(updatedServerObject);
      } else {
        noChangedQPs.push(value.name);
      }

      if (fieldChanges.length > 0) {
        logger.debug(fieldChanges, `ChangeList for QualityProfile '${value.name}'`);
      }
    }

    const serverQpsUnmanaged = getUnmanagedQualityProfiles(serverQualityProfiles, config.quality_profiles);

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
      const fieldChanges: FieldChange[] = [];
      changes.set(unmanagedServerQp.name!, fieldChanges);

      if (scoringForQP != null) {
        const newCFFormats: FormatItem[] = [];

        for (const [scoreKey, scoreValue] of scoringForQP.entries()) {
          const serverCF = serverProfileCFMap.get(scoreKey);
          serverProfileCFMap.delete(scoreKey);

          // TODO (1): check where best handled
          if (scoreValue.score == null) {
            newCFFormats.push({ ...serverCF });
          } else {
            if (serverCF?.score !== scoreValue.score) {
              scoringDiff = true;
              fieldChanges.push({ field: `customFormats.${scoreValue.name}`, from: serverCF?.score, to: scoreValue.score });
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

      logger.debug(
        `Unmanaged QualityProfile (${unmanagedServerQp.name}) - In Sync: ${fieldChanges.length <= 0}, CF Changes: ${scoringDiff}}`,
      );

      if (scoringDiff) {
        changedQPs.push(unmanagedServerQp);
      } else {
        noChangedQPs.push(unmanagedServerQp.name!);
      }

      if (fieldChanges.length > 0) {
        logger.debug(fieldChanges, `ChangeList for unmanaged QualityProfile '${unmanagedServerQp.name}'`);
      }
    }

    return { create: createQPs, changedQPs: changedQPs, noChanges: noChangedQPs, changes };
  }
}
