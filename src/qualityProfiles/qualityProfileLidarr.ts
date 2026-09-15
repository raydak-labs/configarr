import { getClient } from "../clients/client";
import { FieldChange } from "../diffReport/diffReport.types";
import { BaseQualityProfileSync, warnUnsupportedQualityProfileLanguage } from "./qualityProfileBase";
import { QualityProfileLanguage, QualityProfileLidarrResource } from "./qualityProfile.types";

export class QualityProfileLidarrSync extends BaseQualityProfileSync<QualityProfileLidarrResource> {
  protected resolveLanguage(
    profileName: string,
    configLanguage: string | undefined,
    _languageMap: Map<string, QualityProfileLanguage>,
  ): QualityProfileLanguage | undefined {
    warnUnsupportedQualityProfileLanguage(profileName, "LIDARR", configLanguage);
    return undefined;
  }

  protected attachLanguageOnCreate(_profile: QualityProfileLidarrResource, _language: QualityProfileLanguage | undefined): void {}

  protected diffLanguageOnUpdate(
    _updated: QualityProfileLidarrResource,
    _serverMatch: QualityProfileLidarrResource,
    _language: QualityProfileLanguage | undefined,
    _fieldChanges: FieldChange[],
  ): boolean {
    return false;
  }

  protected attachMinUpgradeOnCreate(_profile: QualityProfileLidarrResource, _minUpgradeFormatScore: number): void {}

  protected diffMinUpgradeOnUpdate(
    _updated: QualityProfileLidarrResource,
    _serverMatch: QualityProfileLidarrResource,
    _upgradeAllowed: boolean,
    _configMinUpgrade: number | undefined,
    _fieldChanges: FieldChange[],
  ): boolean {
    return false;
  }

  createOnServer(profile: QualityProfileLidarrResource) {
    return getClient("LIDARR").createQualityProfile(profile);
  }

  updateOnServer(id: string, profile: QualityProfileLidarrResource) {
    return getClient("LIDARR").updateQualityProfile(id, profile);
  }

  loadFromServer() {
    return getClient("LIDARR").getQualityProfiles();
  }

  deleteOnServer(qualityProfile: QualityProfileLidarrResource) {
    return getClient("LIDARR").deleteQualityProfile(qualityProfile.id + "");
  }
}
