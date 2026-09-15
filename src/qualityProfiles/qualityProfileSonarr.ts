import { getClient } from "../clients/client";
import { FieldChange } from "../diffReport/diffReport.types";
import {
  attachMinUpgradeOnCreate,
  BaseQualityProfileSync,
  diffMinUpgradeOnUpdate,
  warnUnsupportedQualityProfileLanguage,
} from "./qualityProfileBase";
import { QualityProfileLanguage, QualityProfileSonarrResource } from "./qualityProfile.types";

export class QualityProfileSonarrSync extends BaseQualityProfileSync<QualityProfileSonarrResource> {
  protected resolveLanguage(
    profileName: string,
    configLanguage: string | undefined,
    _languageMap: Map<string, QualityProfileLanguage>,
  ): QualityProfileLanguage | undefined {
    warnUnsupportedQualityProfileLanguage(profileName, "SONARR", configLanguage);
    return undefined;
  }

  protected attachLanguageOnCreate(_profile: QualityProfileSonarrResource, _language: QualityProfileLanguage | undefined): void {}

  protected diffLanguageOnUpdate(
    _updated: QualityProfileSonarrResource,
    _serverMatch: QualityProfileSonarrResource,
    _language: QualityProfileLanguage | undefined,
    _fieldChanges: FieldChange[],
  ): boolean {
    return false;
  }

  protected attachMinUpgradeOnCreate(profile: QualityProfileSonarrResource, minUpgradeFormatScore: number): void {
    attachMinUpgradeOnCreate(profile, minUpgradeFormatScore);
  }

  protected diffMinUpgradeOnUpdate(
    updated: QualityProfileSonarrResource,
    serverMatch: QualityProfileSonarrResource,
    upgradeAllowed: boolean,
    configMinUpgrade: number | undefined,
    fieldChanges: FieldChange[],
  ): boolean {
    return diffMinUpgradeOnUpdate(updated, serverMatch, upgradeAllowed, configMinUpgrade, fieldChanges);
  }

  createOnServer(profile: QualityProfileSonarrResource) {
    return getClient("SONARR").createQualityProfile(profile);
  }

  updateOnServer(id: string, profile: QualityProfileSonarrResource) {
    return getClient("SONARR").updateQualityProfile(id, profile);
  }

  loadFromServer() {
    return getClient("SONARR").getQualityProfiles();
  }

  deleteOnServer(qualityProfile: QualityProfileSonarrResource) {
    return getClient("SONARR").deleteQualityProfile(qualityProfile.id + "");
  }
}
