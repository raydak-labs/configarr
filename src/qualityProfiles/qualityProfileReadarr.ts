import type { QualityProfileResource } from "../__generated__/readarr/data-contracts";
import type { FieldChange } from "../diffReport/diffReport.types";
import type { QualityProfileLanguage, QualityProfileShared } from "./qualityProfile.types";
import { warnUnsupportedQualityProfileLanguage } from "./qualityProfileBase";
import { BaseQualityProfileSync } from "./qualityProfileSyncBase";

export class QualityProfileReadarrSync extends BaseQualityProfileSync<QualityProfileResource> {
  protected toServerProfile(profile: QualityProfileShared): QualityProfileResource {
    return profile;
  }

  protected resolveLanguage(
    profileName: string,
    configLanguage: string | undefined,
    _languageMap: Map<string, QualityProfileLanguage>,
  ): QualityProfileLanguage | undefined {
    warnUnsupportedQualityProfileLanguage(profileName, "READARR", configLanguage);
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

  protected attachMinUpgradeOnCreate(_profile: QualityProfileShared, _minUpgradeFormatScore: number): void {}

  protected diffMinUpgradeOnUpdate(
    _updated: QualityProfileShared,
    _serverMatch: QualityProfileShared,
    _upgradeAllowed: boolean,
    _configMinUpgrade: number | undefined,
    _fieldChanges: FieldChange[],
  ): boolean {
    return false;
  }
}
