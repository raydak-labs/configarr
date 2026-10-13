import type { QualityProfileResource } from "../__generated__/sonarr/data-contracts";
import { resolveServerMajorVersion } from "../arr/serverVersion";
import { ConfigValidationError } from "../validation";
import type { MergedConfigInstance } from "../types/config.types";
import type { ServerCache } from "../cache";
import { FieldChange } from "../diffReport/diffReport.types";
import {
  attachMinUpgradeOnCreate,
  BaseQualityProfileSync,
  diffMinUpgradeOnUpdate,
  warnUnsupportedQualityProfileLanguage,
} from "./qualityProfileBase";
import { QualityProfileLanguage, QualityProfileShared } from "./qualityProfile.types";

export class QualityProfileSonarrSync extends BaseQualityProfileSync<QualityProfileResource> {
  protected toServerProfile(profile: QualityProfileShared): QualityProfileResource {
    return profile;
  }

  /**
   * Per-item size limits exist only on a Sonarr v5 server, which moved them off the quality
   * definition and onto the profile item. Checked before anything is written so a v4 server rejects
   * loudly instead of dropping the fields the way the diff logic would: compareObjectsCarr skips keys
   * the server response does not carry, so the run would report equal while the config took no effect.
   */
  protected async assertItemSizeLimitsSupported(config: MergedConfigInstance, _serverCache: ServerCache): Promise<void> {
    const configured = (config.quality_profiles ?? []).some((profile) =>
      (profile.qualities ?? []).some((item) => item.min != null || item.max != null || item.preferred != null),
    );

    if (!configured) {
      return;
    }

    // The syncer injects the full SonarrClient, so the server version is readable here.
    if ((await resolveServerMajorVersion(this.api as never)) < 5) {
      throw new ConfigValidationError("Quality profile 'min', 'max' and 'preferred' size limits need a Sonarr v5 server.");
    }
  }

  protected resolveLanguage(
    profileName: string,
    configLanguage: string | undefined,
    _languageMap: Map<string, QualityProfileLanguage>,
  ): QualityProfileLanguage | undefined {
    warnUnsupportedQualityProfileLanguage(profileName, "SONARR", configLanguage);
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
