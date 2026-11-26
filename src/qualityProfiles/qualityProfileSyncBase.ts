import path from "node:path";
import type { ServerCache } from "../cache";
import type { QualityProfilesClient } from "../clients/capabilities";
import type { CFProcessing, CustomFormatRequest } from "../customFormats/customFormat.types";
import type { FieldChange } from "../diffReport/diffReport.types";
import { getEnvs } from "../env";
import { logger } from "../logger";
import type { QualityDefinitionShared } from "../qualityDefinitions/qualityDefinition.types";
import type { ConfigQualityProfile, MergedConfigInstance } from "../types/config.types";
import { cloneWithJSON, loadJsonFile } from "../util";
import { ConfigValidationError } from "../validation";
import type { FormatItem, QualityProfileLanguage, QualityProfileShared } from "./qualityProfile.types";
import { getUnmanagedQualityProfiles, mapQualityProfiles } from "./qualityProfileBase";
import { getDisabledUpgradeCutoff, isOrderOfQualitiesEqual, mapQualities, translateServerCutoff } from "./qualityProfileQualities";

export type QualityProfileDiffResult<T extends QualityProfileShared = QualityProfileShared> = {
  changedQPs: T[];
  create: T[];
  noChanges: string[];
  changes: Map<string, FieldChange[]>;
};

export abstract class BaseQualityProfileSync<T extends QualityProfileShared> {
  protected readonly logger = logger;

  constructor(protected readonly api: QualityProfilesClient<T>) {}

  /** Convert the shared diff shape to the app-specific server resource. */
  protected abstract toServerProfile(profile: QualityProfileShared): T;

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

  /**
   * Restrict the quality universe for an app-specific profile. Defaults to every quality
   * the server exposes. Readarr overrides this for Chaptarr's media-typed profiles.
   */
  protected qualityDefinitionsForProfile(
    definitions: QualityDefinitionShared[],
    _serverMatch: QualityProfileShared | undefined,
    _profile: ConfigQualityProfile,
  ): QualityDefinitionShared[] {
    return definitions;
  }

  /** Restrict custom formats to the ones valid for this profile. Defaults to all. */
  protected customFormatsForProfile(
    customFormats: CustomFormatRequest[],
    _profile: ConfigQualityProfile | undefined,
    _serverMatch?: QualityProfileShared,
  ): CustomFormatRequest[] {
    return customFormats;
  }

  /** Only names the filter drops: formats not on the server yet (dry run) must still be reported. */
  private excludedCustomFormatNames(
    customFormats: CustomFormatRequest[],
    profile: ConfigQualityProfile | undefined,
    serverMatch: QualityProfileShared,
  ): Set<string | null | undefined> {
    const allowed = new Set(this.customFormatsForProfile(customFormats, profile, serverMatch));
    return new Set(customFormats.filter((format) => !allowed.has(format)).map((format) => format.name));
  }

  createOnServer(profile: QualityProfileShared) {
    return this.api.createQualityProfile(this.toServerProfile(profile));
  }

  updateOnServer(id: string, profile: QualityProfileShared) {
    return this.api.updateQualityProfile(id, this.toServerProfile(profile));
  }

  async loadFromServer(): Promise<T[] | QualityProfileShared[]> {
    if (getEnvs().LOAD_LOCAL_SAMPLES) {
      return loadJsonFile<QualityProfileShared[]>(path.resolve(__dirname, "../../tests/samples/quality_profiles.json"));
    }
    return this.api.getQualityProfiles();
  }

  deleteOnServer(qualityProfile: QualityProfileShared) {
    return this.api.deleteQualityProfile(qualityProfile.id + "");
  }

  async validateConfig(config: MergedConfigInstance): Promise<void> {
    await this.validateQualitySizeConfig(config.quality_profiles);
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
    const scoring = mapQualityProfiles(cfMap, config);
    const qpMerged = new Map(config.quality_profiles.map((obj) => [obj.name, obj]));
    const serverQualityProfiles = serverCache.qualityProfiles;
    const qpServerMap = new Map(serverQualityProfiles.map((obj) => [obj.name!, obj]));
    const languageMap = new Map(serverCache.languages.map((obj) => [obj.name!, obj]));

    const createQPs: QualityProfileShared[] = [];
    const changedQPs: QualityProfileShared[] = [];
    const noChangedQPs: string[] = [];

    const changes = new Map<string, FieldChange[]>();

    for (const [name, value] of qpMerged.entries()) {
      const serverMatch = qpServerMap.get(name);
      const scoringForQP = scoring.get(name);
      const definitions = this.qualityDefinitionsForProfile(serverCache.qualityDefinitions, serverMatch, value);
      const mappedQualities = mapQualities(definitions, value, serverMatch?.items);

      const profileLanguage = this.resolveLanguage(name, value.language, languageMap);

      const resetScoreExceptions: Map<string, boolean> =
        value.reset_unmatched_scores?.except?.reduce((p, c) => {
          p.set(c, true);
          return p;
        }, new Map()) ?? new Map();

      if (serverMatch == null) {
        logger.info(`QualityProfile '${name}' not found in server. Will be created.`);

        const cfServerMap = new Map(this.customFormatsForProfile(serverCache.customFormats, value).map((obj) => [obj.name!, obj]));

        const qualityToId = mappedQualities.reduce<Map<string, number>>((p, c) => {
          const id = c.id ?? c.quality?.id;
          const qName = c.name ?? c.quality?.name;

          if (id == null || qName == null) {
            throw new Error(`No ID (${id}) or name ${qName} found for quality? QP: ${name}`);
          }

          p.set(qName, id);

          return p;
        }, new Map());

        const customFormatsMapped = Array.from(cfServerMap.values()).map<FormatItem>((e) => {
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
          // Preserve configured until_score; forcing 1 rewrites valid zero scores.
          newP.cutoffFormatScore = value.upgrade.until_score ?? 1;
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
          // Preserve and remap disabled-upgrade cutoffs when config omits them.
          // Effective write items keep undeclared enabled qualities valid as cutoffs.
          const effectiveItems = updatedServerObject.items ?? mappedQualities;
          const cutoffId =
            value.upgrade.until_quality == null
              ? (translateServerCutoff(serverMatch.cutoff, serverMatch.items, effectiveItems) ??
                getDisabledUpgradeCutoff(effectiveItems, qualityToId, undefined, name))
              : getDisabledUpgradeCutoff(effectiveItems, qualityToId, value.upgrade.until_quality, name);
          const cutoffFormatScore = value.upgrade.until_score ?? serverMatch.cutoffFormatScore ?? 1;

          if (serverMatch.cutoff !== cutoffId) {
            updatedServerObject.cutoff = cutoffId;
            diffExist = true;
            fieldChanges.push({ field: "cutoff", from: serverMatch.cutoff, to: cutoffId });
          }

          if (serverMatch.cutoffFormatScore !== cutoffFormatScore) {
            updatedServerObject.cutoffFormatScore = cutoffFormatScore;
            diffExist = true;
            fieldChanges.push({ field: "cutoffFormatScore", from: serverMatch.cutoffFormatScore, to: cutoffFormatScore });
          }

          if (this.diffMinUpgradeOnUpdate(updatedServerObject, serverMatch, false, undefined, fieldChanges)) {
            diffExist = true;
          }
        }
      }

      if (this.diffLanguageOnUpdate(updatedServerObject, serverMatch, profileLanguage, fieldChanges)) {
        diffExist = true;
      }

      // Use refreshed custom formats so new or updated entries are included.
      const serverProfileCFMap = new Map(serverMatch.formatItems!.map((obj) => [obj.name!, obj]));
      // Formats this profile excludes must not receive a score: the server profile has no item
      // to attach it to, so the update would send an item without a format id.
      const excludedCustomFormats = this.excludedCustomFormatNames(serverCache.customFormats, value, serverMatch);

      let scoringDiff = false;

      if (scoringForQP != null) {
        const newCFFormats: FormatItem[] = [];

        for (const [scoreKey, scoreValue] of scoringForQP.entries()) {
          if (excludedCustomFormats.has(scoreKey)) continue;

          const serverCF = serverProfileCFMap.get(scoreKey);
          serverProfileCFMap.delete(scoreKey);

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
      // Use refreshed custom formats so new or updated entries are included.
      const serverProfileCFMap = new Map(unmanagedServerQp.formatItems!.map((obj) => [obj.name!, obj]));
      const scoringForQP = scoring.get(unmanagedServerQp.name!);
      // Formats this profile excludes have no server item to attach a score to.
      const excludedCustomFormats = this.excludedCustomFormatNames(serverCache.customFormats, undefined, unmanagedServerQp);
      let scoringDiff = false;
      const fieldChanges: FieldChange[] = [];
      changes.set(unmanagedServerQp.name!, fieldChanges);

      if (scoringForQP != null) {
        const newCFFormats: FormatItem[] = [];

        for (const [scoreKey, scoreValue] of scoringForQP.entries()) {
          if (excludedCustomFormats.has(scoreKey)) continue;

          const serverCF = serverProfileCFMap.get(scoreKey);
          serverProfileCFMap.delete(scoreKey);

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

  protected async validateQualitySizeConfig(profiles: ConfigQualityProfile[]): Promise<void> {
    if (profiles.some((profile) => profile.quality_sizes?.length)) {
      throw new ConfigValidationError("Per-profile quality_sizes are only supported by Sonarr v5.");
    }
  }
}
