import { getClient } from "../clients/client";
import { FieldChange } from "../diffReport/diffReport.types";
import {
  attachLanguageOnCreate,
  attachMinUpgradeOnCreate,
  BaseQualityProfileSync,
  diffLanguageOnUpdate,
  diffMinUpgradeOnUpdate,
  resolveQualityProfileLanguage,
} from "./qualityProfileBase";
import { QualityProfileLanguage, QualityProfileRadarrResource } from "./qualityProfile.types";

export class QualityProfileRadarrSync extends BaseQualityProfileSync<QualityProfileRadarrResource> {
  protected resolveLanguage(
    _profileName: string,
    configLanguage: string | undefined,
    languageMap: Map<string, QualityProfileLanguage>,
  ): QualityProfileLanguage | undefined {
    return resolveQualityProfileLanguage(configLanguage, languageMap);
  }

  protected attachLanguageOnCreate(profile: QualityProfileRadarrResource, language: QualityProfileLanguage | undefined): void {
    attachLanguageOnCreate(profile, language);
  }

  protected diffLanguageOnUpdate(
    updated: QualityProfileRadarrResource,
    serverMatch: QualityProfileRadarrResource,
    language: QualityProfileLanguage | undefined,
    fieldChanges: FieldChange[],
  ): boolean {
    return diffLanguageOnUpdate(updated, serverMatch, language, fieldChanges);
  }

  protected attachMinUpgradeOnCreate(profile: QualityProfileRadarrResource, minUpgradeFormatScore: number): void {
    attachMinUpgradeOnCreate(profile, minUpgradeFormatScore);
  }

  protected diffMinUpgradeOnUpdate(
    updated: QualityProfileRadarrResource,
    serverMatch: QualityProfileRadarrResource,
    upgradeAllowed: boolean,
    configMinUpgrade: number | undefined,
    fieldChanges: FieldChange[],
  ): boolean {
    return diffMinUpgradeOnUpdate(updated, serverMatch, upgradeAllowed, configMinUpgrade, fieldChanges);
  }

  createOnServer(profile: QualityProfileRadarrResource) {
    return getClient("RADARR").createQualityProfile(profile);
  }

  updateOnServer(id: string, profile: QualityProfileRadarrResource) {
    return getClient("RADARR").updateQualityProfile(id, profile);
  }

  loadFromServer() {
    return getClient("RADARR").getQualityProfiles();
  }

  deleteOnServer(qualityProfile: QualityProfileRadarrResource) {
    return getClient("RADARR").deleteQualityProfile(qualityProfile.id + "");
  }
}
