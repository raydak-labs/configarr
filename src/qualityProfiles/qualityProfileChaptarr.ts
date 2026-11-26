import type { QualityProfileResource } from "../__generated__/readarr/data-contracts";
import type { QualityProfilesClient } from "../clients/capabilities";
import type { CustomFormatRequest } from "../customFormats/customFormat.types";
import type { QualityDefinitionShared } from "../qualityDefinitions/qualityDefinition.types";
import type { ConfigQualityProfile, ReadarrMediaType } from "../types/config.types";
import type { QualityItem, QualityProfileShared } from "./qualityProfile.types";
import { QualityProfileReadarrSync } from "./qualityProfileReadarr";

type ChaptarrQualityProfileResource = QualityProfileResource & { profileType: "ebook" | "audiobook" };

/** Read the profile type of an existing server profile, if it has one. */
function existingProfileType(profile: QualityProfileShared): "ebook" | "audiobook" | undefined {
  if (!("profileType" in profile)) return undefined;
  return profile.profileType === "ebook" || profile.profileType === "audiobook" ? profile.profileType : undefined;
}

export class QualityProfileChaptarrSync extends QualityProfileReadarrSync {
  constructor(
    api: QualityProfilesClient<QualityProfileResource>,
    private readonly mediaType?: ReadarrMediaType,
  ) {
    super(api, "CHAPTARR");
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
    if (this.mediaType === undefined) return definitions;

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
   * ebook one. New profiles default to the instance media type, or ebook when mixed.
   */
  protected override toServerProfile(profile: QualityProfileShared): QualityProfileResource {
    const profileType = existingProfileType(profile) ?? (this.mediaType === "audiobook" ? "audiobook" : "ebook");
    const result: ChaptarrQualityProfileResource = { ...profile, profileType };
    return result;
  }

  /**
   * A profile must not receive custom formats that belong to the other media side. An existing
   * server profile decides the side through its own type, which matters for a mixed instance;
   * new profiles fall back to the instance type, or ebook when mixed or omitted.
   */
  protected override customFormatsForProfile(
    customFormats: CustomFormatRequest[],
    _profile: ConfigQualityProfile | undefined,
    serverMatch?: QualityProfileShared,
  ): CustomFormatRequest[] {
    const existing = serverMatch ? existingProfileType(serverMatch) : undefined;
    const appliesTo = existing ?? (this.mediaType === "audiobook" ? "audiobook" : "ebook");
    return customFormats.filter((format) => format.appliesTo == null || format.appliesTo === "both" || format.appliesTo === appliesTo);
  }
}
