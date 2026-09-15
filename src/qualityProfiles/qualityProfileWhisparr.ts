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
import { QualityProfileLanguage, QualityProfileWhisparrResource } from "./qualityProfile.types";

export class QualityProfileWhisparrSync extends BaseQualityProfileSync<QualityProfileWhisparrResource> {
  protected resolveLanguage(
    _profileName: string,
    configLanguage: string | undefined,
    languageMap: Map<string, QualityProfileLanguage>,
  ): QualityProfileLanguage | undefined {
    return resolveQualityProfileLanguage(configLanguage, languageMap);
  }

  protected attachLanguageOnCreate(profile: QualityProfileWhisparrResource, language: QualityProfileLanguage | undefined): void {
    attachLanguageOnCreate(profile, language);
  }

  protected diffLanguageOnUpdate(
    updated: QualityProfileWhisparrResource,
    serverMatch: QualityProfileWhisparrResource,
    language: QualityProfileLanguage | undefined,
    fieldChanges: FieldChange[],
  ): boolean {
    return diffLanguageOnUpdate(updated, serverMatch, language, fieldChanges);
  }

  protected attachMinUpgradeOnCreate(profile: QualityProfileWhisparrResource, minUpgradeFormatScore: number): void {
    attachMinUpgradeOnCreate(profile, minUpgradeFormatScore);
  }

  protected diffMinUpgradeOnUpdate(
    updated: QualityProfileWhisparrResource,
    serverMatch: QualityProfileWhisparrResource,
    upgradeAllowed: boolean,
    configMinUpgrade: number | undefined,
    fieldChanges: FieldChange[],
  ): boolean {
    return diffMinUpgradeOnUpdate(updated, serverMatch, upgradeAllowed, configMinUpgrade, fieldChanges);
  }

  createOnServer(profile: QualityProfileWhisparrResource) {
    return getClient("WHISPARR").createQualityProfile(profile);
  }

  updateOnServer(id: string, profile: QualityProfileWhisparrResource) {
    return getClient("WHISPARR").updateQualityProfile(id, profile);
  }

  loadFromServer() {
    return getClient("WHISPARR").getQualityProfiles();
  }

  deleteOnServer(qualityProfile: QualityProfileWhisparrResource) {
    return getClient("WHISPARR").deleteQualityProfile(qualityProfile.id + "");
  }
}
