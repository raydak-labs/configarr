import type { QualityProfileResource } from "../__generated__/whisparr/data-contracts";
import type { FieldChange } from "../diffReport/diffReport.types";
import type { QualityProfileLanguage, QualityProfileShared } from "./qualityProfile.types";
import { attachMinUpgradeOnCreate, diffMinUpgradeOnUpdate, warnUnsupportedQualityProfileLanguage } from "./qualityProfileBase";
import { BaseQualityProfileSync } from "./qualityProfileSyncBase";

export class QualityProfileWhisparrSync extends BaseQualityProfileSync<QualityProfileResource> {
  protected toServerProfile(profile: QualityProfileShared): QualityProfileResource {
    return profile;
  }

  protected resolveLanguage(
    profileName: string,
    configLanguage: string | undefined,
    _languageMap: Map<string, QualityProfileLanguage>,
  ): QualityProfileLanguage | undefined {
    warnUnsupportedQualityProfileLanguage(profileName, "WHISPARR", configLanguage);
    return undefined;
  }

  protected attachLanguageOnCreate(_profile: QualityProfileShared, _language: QualityProfileLanguage | undefined): void {}

  protected diffLanguageOnUpdate(
    _updated: QualityProfileShared,
    _serverMatch: QualityProfileShared,
    _language: QualityProfileLanguage | undefined,
    _fieldChanges: FieldChange[],
  ): boolean {
    return false;
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
