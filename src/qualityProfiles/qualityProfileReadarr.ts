import { getClient } from "../clients/client";
import { FieldChange } from "../diffReport/diffReport.types";
import { BaseQualityProfileSync, warnUnsupportedQualityProfileLanguage } from "./qualityProfileBase";
import { QualityProfileLanguage, QualityProfileReadarrResource } from "./qualityProfile.types";

export class QualityProfileReadarrSync extends BaseQualityProfileSync<QualityProfileReadarrResource> {
  protected resolveLanguage(
    profileName: string,
    configLanguage: string | undefined,
    _languageMap: Map<string, QualityProfileLanguage>,
  ): QualityProfileLanguage | undefined {
    warnUnsupportedQualityProfileLanguage(profileName, "READARR", configLanguage);
    return undefined;
  }

  protected attachLanguageOnCreate(_profile: QualityProfileReadarrResource, _language: QualityProfileLanguage | undefined): void {}

  protected diffLanguageOnUpdate(
    _updated: QualityProfileReadarrResource,
    _serverMatch: QualityProfileReadarrResource,
    _language: QualityProfileLanguage | undefined,
    _fieldChanges: FieldChange[],
  ): boolean {
    return false;
  }

  protected attachMinUpgradeOnCreate(_profile: QualityProfileReadarrResource, _minUpgradeFormatScore: number): void {}

  protected diffMinUpgradeOnUpdate(
    _updated: QualityProfileReadarrResource,
    _serverMatch: QualityProfileReadarrResource,
    _upgradeAllowed: boolean,
    _configMinUpgrade: number | undefined,
    _fieldChanges: FieldChange[],
  ): boolean {
    return false;
  }

  createOnServer(profile: QualityProfileReadarrResource) {
    return getClient("READARR").createQualityProfile(profile);
  }

  updateOnServer(id: string, profile: QualityProfileReadarrResource) {
    return getClient("READARR").updateQualityProfile(id, profile);
  }

  loadFromServer() {
    return getClient("READARR").getQualityProfiles();
  }

  deleteOnServer(qualityProfile: QualityProfileReadarrResource) {
    return getClient("READARR").deleteQualityProfile(qualityProfile.id + "");
  }
}
