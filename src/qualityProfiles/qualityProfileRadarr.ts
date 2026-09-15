import { getClient } from "../clients/client";
import type { QualityProfileResource } from "../__generated__/radarr/data-contracts";
import { FieldChange } from "../diffReport/diffReport.types";
import {
  attachLanguageOnCreate,
  attachMinUpgradeOnCreate,
  BaseQualityProfileSync,
  diffLanguageOnUpdate,
  diffMinUpgradeOnUpdate,
  resolveQualityProfileLanguage,
} from "./qualityProfileBase";
import { QualityProfileLanguage, QualityProfileShared } from "./qualityProfile.types";

export class QualityProfileRadarrSync extends BaseQualityProfileSync<QualityProfileResource> {
  protected getApi() {
    return getClient("RADARR");
  }

  protected resolveLanguage(
    _profileName: string,
    configLanguage: string | undefined,
    languageMap: Map<string, QualityProfileLanguage>,
  ): QualityProfileLanguage | undefined {
    return resolveQualityProfileLanguage(configLanguage, languageMap);
  }

  protected attachLanguageOnCreate(profile: QualityProfileShared, language: QualityProfileLanguage | undefined): void {
    attachLanguageOnCreate(profile, language);
  }

  protected diffLanguageOnUpdate(
    updated: QualityProfileShared,
    serverMatch: QualityProfileShared,
    language: QualityProfileLanguage | undefined,
    fieldChanges: FieldChange[],
  ): boolean {
    return diffLanguageOnUpdate(updated, serverMatch, language, fieldChanges);
  }

  protected attachMinUpgradeOnCreate(profile: QualityProfileShared, minUpgradeFormatScore: number): void {
    attachMinUpgradeOnCreate(profile, minUpgradeFormatScore);
  }

  protected diffMinUpgradeOnUpdate(
    updated: QualityProfileShared,
    serverMatch: QualityProfileShared,
    upgradeAllowed: boolean,
    configMinUpgrade: number | undefined,
    fieldChanges: FieldChange[],
  ): boolean {
    return diffMinUpgradeOnUpdate(updated, serverMatch, upgradeAllowed, configMinUpgrade, fieldChanges);
  }
}
