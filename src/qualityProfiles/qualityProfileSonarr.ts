import type { QualityProfileResource } from "../__generated__/sonarr/data-contracts";
import type { SonarrClient, SonarrProfileQualitySize } from "../clients/sonarr-client";
import type { QualityProfilesClient } from "../clients/capabilities";
import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import {
  attachMinUpgradeOnCreate,
  BaseQualityProfileSync,
  diffMinUpgradeOnUpdate,
  warnUnsupportedQualityProfileLanguage,
} from "./qualityProfileBase";
import { QualityProfileLanguage, QualityProfileShared } from "./qualityProfile.types";
import { ConfigQualityProfile } from "../types/config.types";
import type { QualityDefinitionShared } from "../qualityDefinitions/qualityDefinition.types";
import { ConfigValidationError } from "../validation";
import type { TrashQualityDefinitionQuality } from "../types/trashguide.types";
import type { InputConfigQualitySize } from "../types/config.types";

type SonarrQualityProfileClient = QualityProfilesClient<QualityProfileResource> &
  Pick<SonarrClient, "supportsProfileQualitySizes" | "getProfileQualitySizes" | "updateProfileQualitySizes" | "getQualityDefinitions">;

function resolveQualityName(configuredName: string, definitions: QualityDefinitionShared[]): string | undefined {
  const matches = new Set(
    definitions.flatMap((candidate) =>
      candidate.quality?.name != null && (candidate.quality.name === configuredName || candidate.title === configuredName)
        ? [candidate.quality.name]
        : [],
    ),
  );
  if (matches.size > 1) {
    throw new ConfigValidationError(`Quality selector '${configuredName}' is ambiguous; it matches ${[...matches].join(", ")}.`);
  }
  return matches.values().next().value;
}

export class QualityProfileSonarrSync extends BaseQualityProfileSync<QualityProfileResource> {
  constructor(private readonly sonarrClient: SonarrQualityProfileClient) {
    super(sonarrClient);
  }

  protected toServerProfile(profile: QualityProfileShared): QualityProfileResource {
    return profile;
  }

  protected async validateQualitySizeConfig(profiles: ConfigQualityProfile[]): Promise<void> {
    const configuredProfiles = profiles.filter((profile) => profile.quality_sizes?.length);
    if (configuredProfiles.length === 0) {
      return;
    }
    if (!(await this.sonarrClient.supportsProfileQualitySizes())) {
      throw new ConfigValidationError("Per-profile quality_sizes require Sonarr v5.");
    }

    const definitions = await this.sonarrClient.getQualityDefinitions();
    const availableQualityNames = new Set(definitions.flatMap((definition) => definition.quality?.name ?? []));
    for (const profile of configuredProfiles) {
      const seen = new Set<string>();

      for (const size of profile.quality_sizes ?? []) {
        const qualityName = resolveQualityName(size.quality, definitions);
        if (qualityName == null) {
          throw new ConfigValidationError(`QualityProfile '${profile.name}': unknown quality '${size.quality}' in quality_sizes.`);
        }
        if (seen.has(qualityName)) {
          throw new ConfigValidationError(
            `QualityProfile '${profile.name}': quality '${qualityName}' is listed more than once in quality_sizes.`,
          );
        }
        seen.add(qualityName);
      }
    }
  }

  async syncQualitySizes(
    profiles: ConfigQualityProfile[],
    definitions: QualityDefinitionShared[],
    write: boolean,
    globalDefaults: TrashQualityDefinitionQuality[] = [],
  ): Promise<DiffEntry[]> {
    const profilesWithOverrides = new Map(
      profiles.filter((profile) => profile.quality_sizes?.length).map((profile) => [profile.name, profile]),
    );
    if (profilesWithOverrides.size === 0 && globalDefaults.length === 0) {
      return [];
    }
    if (!(await this.sonarrClient.supportsProfileQualitySizes())) {
      if (profilesWithOverrides.size > 0) {
        throw new ConfigValidationError("Per-profile quality_sizes require Sonarr v5.");
      }
      return [];
    }

    const sizeFields = [
      ["min", "minSize"],
      ["preferred", "preferredSize"],
      ["max", "maxSize"],
    ] as const;
    const configuredSizes = new Map<string, Map<string, InputConfigQualitySize>>();
    for (const profile of profilesWithOverrides.values()) {
      const sizes = new Map<string, InputConfigQualitySize>();
      for (const size of profile.quality_sizes ?? []) {
        const qualityName = resolveQualityName(size.quality, definitions);
        if (qualityName == null) {
          throw new ConfigValidationError(`QualityProfile '${profile.name}': unknown quality '${size.quality}' in quality_sizes.`);
        }
        if (sizes.has(qualityName)) {
          throw new ConfigValidationError(
            `QualityProfile '${profile.name}': quality '${qualityName}' is listed more than once in quality_sizes.`,
          );
        }
        sizes.set(qualityName, size);
      }
      configuredSizes.set(profile.name, sizes);
    }

    const defaultsByQuality = new Map(
      globalDefaults.flatMap((size) => {
        const qualityName = resolveQualityName(size.quality, definitions);
        return qualityName == null ? [] : [[qualityName, { minSize: size.min, preferredSize: size.preferred, maxSize: size.max }] as const];
      }),
    );

    const serverProfiles = await this.sonarrClient.getProfileQualitySizes();
    const changes: DiffEntry[] = [];

    const targetProfileNames = new Set(serverProfiles.map((profile) => profile.name));
    for (const profile of profilesWithOverrides.values()) {
      targetProfileNames.add(profile.name);
    }
    if (globalDefaults.length > 0) {
      for (const profile of profiles) {
        targetProfileNames.add(profile.name);
      }
    }

    for (const profileName of targetProfileNames) {
      const serverProfile = serverProfiles.find((candidate) => candidate.name === profileName);
      const isNewProfile = serverProfile == null;
      if (isNewProfile && write) {
        throw new ConfigValidationError(`QualityProfile '${profileName}' was not found while applying quality_sizes.`);
      }

      const configuredByQuality = configuredSizes.get(profileName) ?? new Map<string, InputConfigQualitySize>();
      const overrides: SonarrProfileQualitySize[] = [];
      const fieldChanges: FieldChange[] = [];

      if (isNewProfile) {
        const newProfileQualityNames = new Set(definitions.flatMap((definition) => definition.quality?.name ?? []));

        for (const qualityName of newProfileQualityNames) {
          const size = configuredByQuality.get(qualityName);
          const defaults = defaultsByQuality.get(qualityName);
          const override: SonarrProfileQualitySize = { quality: qualityName };
          for (const [configField, apiField] of sizeFields) {
            const desired = size?.[configField] ?? defaults?.[apiField];
            if (desired !== undefined) {
              override[apiField] = desired;
              fieldChanges.push({ field: `quality_sizes.${qualityName}.${configField}`, from: undefined, to: desired });
            }
          }
          overrides.push(override);
        }
        if (fieldChanges.length > 0) {
          changes.push({ resourceType: "QualityProfile", name: profileName, action: "update", fieldChanges });
        }
        continue;
      } else {
        const currentSizes = new Map((serverProfile?.items ?? []).map((item) => [item.quality, item]));
        for (const [qualityName, size] of configuredByQuality) {
          if (!currentSizes.has(qualityName)) {
            throw new ConfigValidationError(`QualityProfile '${profileName}': quality '${qualityName}' is not present in the profile.`);
          }
        }

        for (const [qualityName, current] of currentSizes) {
          const explicit = configuredByQuality.get(qualityName);
          const defaults = defaultsByQuality.get(qualityName);
          if (explicit == null && defaults == null) {
            continue;
          }

          const override: SonarrProfileQualitySize = { quality: qualityName };
          for (const [configField, apiField] of sizeFields) {
            const desired = explicit?.[configField] ?? defaults?.[apiField];
            if (desired === undefined) {
              continue;
            }
            override[apiField] = desired;
            if (current[apiField] !== desired) {
              fieldChanges.push({
                field: `quality_sizes.${qualityName}.${configField}`,
                from: current[apiField],
                to: desired,
              });
            }
          }
          overrides.push(override);
        }
      }

      if (fieldChanges.length > 0) {
        changes.push({
          resourceType: "QualityProfile",
          name: profileName,
          action: "update",
          fieldChanges,
        });
        if (write && serverProfile != null) {
          await this.sonarrClient.updateProfileQualitySizes(String(serverProfile.id), overrides);
        }
      }
    }

    return changes;
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
