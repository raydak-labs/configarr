import { getClient } from "../clients/client";
import type { QualityProfileResource } from "../__generated__/lidarr/data-contracts";
import { FieldChange } from "../diffReport/diffReport.types";
import { BaseQualityProfileSync, warnUnsupportedQualityProfileLanguage } from "./qualityProfileBase";
import { QualityProfileLanguage, QualityProfileShared } from "./qualityProfile.types";

export class QualityProfileLidarrSync extends BaseQualityProfileSync<QualityProfileResource> {
  protected getApi() {
    return getClient("LIDARR");
  }

  protected resolveLanguage(
    profileName: string,
    configLanguage: string | undefined,
    _languageMap: Map<string, QualityProfileLanguage>,
  ): QualityProfileLanguage | undefined {
    warnUnsupportedQualityProfileLanguage(profileName, "LIDARR", configLanguage);
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
