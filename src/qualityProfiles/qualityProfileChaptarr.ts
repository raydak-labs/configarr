import { CustomFormatMediaType, ProfileType } from "../__generated__/chaptarr/data-contracts";
import type { QualityProfilesClient } from "../clients/capabilities";
import type { CustomFormatRequest } from "../customFormats/customFormat.types";
import { customFormatMediaType } from "../customFormats/customFormatChaptarr.types";
import type { FieldChange } from "../diffReport/diffReport.types";
import type { QualityDefinitionShared } from "../qualityDefinitions/qualityDefinition.types";
import type { ChaptarrMediaType, ConfigQualityProfile } from "../types/config.types";
import type { QualityItem, QualityProfileLanguage, QualityProfileShared } from "./qualityProfile.types";
import { warnUnsupportedQualityProfileLanguage } from "./qualityProfileBase";
import type { ChaptarrQualityProfileResource } from "./qualityProfileChaptarr.types";
import { BaseQualityProfileSync } from "./qualityProfileSyncBase";

/** The profile type of an existing server profile, if it has one. */
function existingProfileType(profile: QualityProfileShared): ProfileType | undefined {
  if (!("profileType" in profile)) return undefined;
  return Object.values(ProfileType).find((value) => value === profile.profileType);
}

const formatSideByProfileType: Record<ProfileType, CustomFormatMediaType> = {
  [ProfileType.Ebook]: CustomFormatMediaType.Ebook,
  [ProfileType.Audiobook]: CustomFormatMediaType.Audiobook,
};

export class QualityProfileChaptarrSync extends BaseQualityProfileSync<ChaptarrQualityProfileResource> {
  constructor(
    api: QualityProfilesClient<ChaptarrQualityProfileResource>,
    private readonly mediaType: ChaptarrMediaType = "ebook",
  ) {
    super(api);
  }

  /** The side a new profile belongs to: the instance type, or ebook for a mixed instance. */
  private get newProfileType(): ProfileType {
    return this.mediaType === "audiobook" ? ProfileType.Audiobook : ProfileType.Ebook;
  }

  /**
   * Chaptarr lists ebook and audiobook qualities together. Combine the existing profile's
   * leaves with the configured leaves, so a new quality can be added to an existing profile
   * while group labels still cannot admit another media type's quality.
   */
  protected override qualityDefinitionsForProfile(
    definitions: QualityDefinitionShared[],
    serverMatch: QualityProfileShared | undefined,
    profile: ConfigQualityProfile,
  ): QualityDefinitionShared[] {
    const names = new Set<string>();
    const collectServerLeaves = (items: QualityItem[]) => {
      for (const item of items) {
        // Group labels are client-side names, not quality definitions. Only leaves
        // identify a quality; a group named like another media type must not admit it.
        const name = item.quality?.name;
        if (name != null) names.add(name);
        if (item.items) collectServerLeaves(item.items);
      }
    };
    if (serverMatch?.items != null) collectServerLeaves(serverMatch.items);

    // Configured leaves are what mapQualities must be able to select, including qualities
    // the existing profile does not have yet. A named group is not a quality itself.
    for (const item of profile.qualities ?? []) {
      for (const quality of item.qualities ?? []) names.add(quality);
      if ((item.qualities?.length ?? 0) === 0 && item.name) names.add(item.name);
    }

    if (names.size === 0) return definitions;

    const filtered = definitions.filter(
      (definition) =>
        (definition.quality?.name != null && names.has(definition.quality.name)) ||
        (definition.title != null && names.has(definition.title)),
    );
    return filtered.length > 0 ? filtered : definitions;
  }

  /**
   * Chaptarr requires a profile type on every quality profile. An update keeps the type the
   * server profile already has, so a mixed instance never turns an audiobook profile into an
   * ebook one.
   */
  protected toServerProfile(profile: QualityProfileShared): ChaptarrQualityProfileResource {
    return { ...profile, profileType: existingProfileType(profile) ?? this.newProfileType };
  }

  /**
   * A profile must not receive custom formats that belong to the other media side. An existing
   * server profile decides the side through its own type, which matters for a mixed instance.
   */
  protected override customFormatsForProfile(
    customFormats: CustomFormatRequest[],
    _profile: ConfigQualityProfile | undefined,
    serverMatch?: QualityProfileShared,
  ): CustomFormatRequest[] {
    const side = formatSideByProfileType[(serverMatch ? existingProfileType(serverMatch) : undefined) ?? this.newProfileType];
    return customFormats.filter((format) => {
      const appliesTo = customFormatMediaType(format);
      return appliesTo === undefined || appliesTo === CustomFormatMediaType.Both || appliesTo === side;
    });
  }

  protected resolveLanguage(
    profileName: string,
    configLanguage: string | undefined,
    _languageMap: Map<string, QualityProfileLanguage>,
  ): QualityProfileLanguage | undefined {
    warnUnsupportedQualityProfileLanguage(profileName, "CHAPTARR", configLanguage);
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
