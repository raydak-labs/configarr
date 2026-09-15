import { getClient } from "../clients/client";
import { FieldChange } from "../diffReport/diffReport.types";
import { BaseQualityProfileSync, warnUnsupportedQualityProfileLanguage } from "./qualityProfileBase";
import { QualityProfileLanguage, QualityProfileLidarrReadarrResource } from "./qualityProfile.types";

export class QualityProfileLidarrReadarrSync extends BaseQualityProfileSync<QualityProfileLidarrReadarrResource> {
  constructor(private arrType: "LIDARR" | "READARR") {
    super();
  }

  protected resolveLanguage(
    profileName: string,
    configLanguage: string | undefined,
    _languageMap: Map<string, QualityProfileLanguage>,
  ): QualityProfileLanguage | undefined {
    warnUnsupportedQualityProfileLanguage(profileName, this.arrType, configLanguage);
    return undefined;
  }

  protected attachLanguageOnCreate(_profile: QualityProfileLidarrReadarrResource, _language: QualityProfileLanguage | undefined): void {}

  protected diffLanguageOnUpdate(
    _updated: QualityProfileLidarrReadarrResource,
    _serverMatch: QualityProfileLidarrReadarrResource,
    _language: QualityProfileLanguage | undefined,
    _fieldChanges: FieldChange[],
  ): boolean {
    return false;
  }

  protected attachMinUpgradeOnCreate(_profile: QualityProfileLidarrReadarrResource, _minUpgradeFormatScore: number): void {}

  protected diffMinUpgradeOnUpdate(
    _updated: QualityProfileLidarrReadarrResource,
    _serverMatch: QualityProfileLidarrReadarrResource,
    _upgradeAllowed: boolean,
    _configMinUpgrade: number | undefined,
    _fieldChanges: FieldChange[],
  ): boolean {
    return false;
  }

  createOnServer(profile: QualityProfileLidarrReadarrResource) {
    return getClient(this.arrType).createQualityProfile(profile);
  }

  updateOnServer(id: string, profile: QualityProfileLidarrReadarrResource) {
    return getClient(this.arrType).updateQualityProfile(id, profile);
  }

  loadFromServer() {
    return getClient(this.arrType).getQualityProfiles();
  }

  deleteOnServer(qualityProfile: QualityProfileLidarrReadarrResource) {
    return getClient(this.arrType).deleteQualityProfile(qualityProfile.id + "");
  }
}
