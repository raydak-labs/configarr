import { getClient } from "../clients/client";
import { FieldChange } from "../diffReport/diffReport.types";
import { logger } from "../logger";
import { ANY_LANGUAGE_NAME } from "../util";
import { attachMinUpgradeOnCreate, BaseQualityProfileSync, diffMinUpgradeOnUpdate } from "./qualityProfileBase";
import { QualityProfileLanguage, QualityProfileRadarrWhisparrResource } from "./qualityProfile.types";

export class QualityProfileRadarrWhisparrSync extends BaseQualityProfileSync<QualityProfileRadarrWhisparrResource> {
  constructor(private arrType: "RADARR" | "WHISPARR") {
    super();
  }

  protected resolveLanguage(
    _profileName: string,
    configLanguage: string | undefined,
    languageMap: Map<string, QualityProfileLanguage>,
  ): QualityProfileLanguage | undefined {
    if (configLanguage) {
      const profileLanguage = languageMap.get(configLanguage);

      if (profileLanguage == null) {
        logger.warn(`Profile language '${configLanguage}' not found in server. Ignoring.`);
      }

      return profileLanguage;
    }

    const profileLanguage = languageMap.get(ANY_LANGUAGE_NAME);

    if (profileLanguage == null) {
      logger.warn(`Default language '${ANY_LANGUAGE_NAME}' not found in server. Ignoring.`);
    }

    return profileLanguage;
  }

  protected attachLanguageOnCreate(profile: QualityProfileRadarrWhisparrResource, language: QualityProfileLanguage | undefined): void {
    if (language) {
      profile.language = language;
    }
  }

  protected diffLanguageOnUpdate(
    updated: QualityProfileRadarrWhisparrResource,
    serverMatch: QualityProfileRadarrWhisparrResource,
    language: QualityProfileLanguage | undefined,
    fieldChanges: FieldChange[],
  ): boolean {
    if (language != null && serverMatch.language?.name !== language.name) {
      updated.language = language;
      fieldChanges.push({ field: "language", from: serverMatch.language?.name, to: language.name });
      return true;
    }

    return false;
  }

  protected attachMinUpgradeOnCreate(profile: QualityProfileRadarrWhisparrResource, minUpgradeFormatScore: number): void {
    attachMinUpgradeOnCreate(profile, minUpgradeFormatScore);
  }

  protected diffMinUpgradeOnUpdate(
    updated: QualityProfileRadarrWhisparrResource,
    serverMatch: QualityProfileRadarrWhisparrResource,
    upgradeAllowed: boolean,
    configMinUpgrade: number | undefined,
    fieldChanges: FieldChange[],
  ): boolean {
    return diffMinUpgradeOnUpdate(updated, serverMatch, upgradeAllowed, configMinUpgrade, fieldChanges);
  }

  createOnServer(profile: QualityProfileRadarrWhisparrResource) {
    return getClient(this.arrType).createQualityProfile(profile);
  }

  updateOnServer(id: string, profile: QualityProfileRadarrWhisparrResource) {
    return getClient(this.arrType).updateQualityProfile(id, profile);
  }

  loadFromServer() {
    return getClient(this.arrType).getQualityProfiles();
  }

  deleteOnServer(qualityProfile: QualityProfileRadarrWhisparrResource) {
    return getClient(this.arrType).deleteQualityProfile(qualityProfile.id + "");
  }
}
