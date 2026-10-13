import { ReleaseProfileResource } from "../__generated__/sonarr-v5/data-contracts";
import type { IndexerListItem, ReleaseProfilesApi } from "../clients/capabilities";
import { FieldChange } from "../diffReport/diffReport.types";
import { resolveTagNames } from "../tags/tags";
import type { Tag, TagResolveOptions } from "../tags/tag.types";
import { InputConfigReleaseProfile } from "../types/config.types";
import { ConfigValidationError } from "../validation";
import { BaseReleaseProfileSync, ReleaseProfileAdapter, normalizeTerms } from "./releaseProfileBase";

type SonarrReleaseProfileApi = ReleaseProfilesApi<ReleaseProfileResource, ReleaseProfileResource> & {
  supportsReleaseProfileControls(): Promise<boolean>;
};

function resolveIndexerIds(names: string[], indexers: IndexerListItem[]): number[] {
  return names.map((name) => {
    const found = indexers.find((indexer) => indexer.name === name);
    if (found?.id == null) {
      throw new ConfigValidationError(`Unknown indexer '${name}' for release profile.`);
    }
    return found.id;
  });
}

function sortedNumbers(values: number[] | null | undefined): number[] {
  return [...(values ?? [])].sort((left, right) => left - right);
}

function sortedTerms(value: unknown): string[] {
  return normalizeTerms(value).sort();
}

function renderTagIds(ids: number[], placeholderLabels?: Map<number, string>): Array<number | string> {
  if (placeholderLabels === undefined) {
    return ids;
  }
  const resolved = ids.filter((id) => !placeholderLabels.has(id));
  const pending = ids.filter((id) => placeholderLabels.has(id)).map((id) => placeholderLabels.get(id) as string);
  return [...resolved, ...pending];
}

function sonarrProfileKey(profile: ReleaseProfileResource, supportsName: boolean): string {
  const name = profile.name?.trim();
  if (supportsName && name) {
    return `name:${name}`;
  }

  return `content:${JSON.stringify({
    enabled: profile.enabled ?? true,
    required: sortedTerms(profile.required),
    ignored: sortedTerms(profile.ignored),
    indexerIds: sortedNumbers(profile.indexerIds),
    tags: sortedNumbers(profile.tags),
    excludedTags: sortedNumbers(profile.excludedTags),
    airDateRestriction: profile.airDateRestriction ?? false,
    airDateGracePeriod: profile.airDateGracePeriod ?? 0,
    allowSeasonPackWithoutAllEpisodesAired: profile.allowSeasonPackWithoutAllEpisodesAired ?? false,
  })}`;
}

function compareSonarrFields(
  mapped: ReleaseProfileResource,
  server: ReleaseProfileResource,
  placeholderLabels?: Map<number, string>,
): FieldChange[] {
  const changes: FieldChange[] = [];
  const mappedEnabled = mapped.enabled ?? true;
  const serverEnabled = server.enabled ?? true;
  if (mappedEnabled !== serverEnabled) {
    changes.push({ field: "enabled", from: serverEnabled, to: mappedEnabled });
  }

  if (JSON.stringify(sortedTerms(mapped.required)) !== JSON.stringify(sortedTerms(server.required))) {
    changes.push({ field: "required", from: normalizeTerms(server.required), to: normalizeTerms(mapped.required) });
  }
  if (JSON.stringify(sortedTerms(mapped.ignored)) !== JSON.stringify(sortedTerms(server.ignored))) {
    changes.push({ field: "ignored", from: normalizeTerms(server.ignored), to: normalizeTerms(mapped.ignored) });
  }

  const mappedIndexers = sortedNumbers(mapped.indexerIds);
  const serverIndexers = sortedNumbers(server.indexerIds);
  if (JSON.stringify(mappedIndexers) !== JSON.stringify(serverIndexers)) {
    changes.push({ field: "indexerIds", from: serverIndexers, to: mappedIndexers });
  }

  const mappedTags = sortedNumbers(mapped.tags);
  const serverTags = sortedNumbers(server.tags);
  if (JSON.stringify(mappedTags) !== JSON.stringify(serverTags)) {
    changes.push({ field: "tags", from: serverTags, to: renderTagIds(mappedTags, placeholderLabels) });
  }

  const configuredExcludedTags = sortedNumbers(mapped.excludedTags);
  const currentExcludedTags = sortedNumbers(server.excludedTags);
  if (mapped.excludedTags !== undefined && JSON.stringify(configuredExcludedTags) !== JSON.stringify(currentExcludedTags)) {
    changes.push({
      field: "excludedTags",
      from: currentExcludedTags,
      to: renderTagIds(configuredExcludedTags, placeholderLabels),
    });
  }

  const optionalFields = [
    ["airDateRestriction", mapped.airDateRestriction, server.airDateRestriction ?? false],
    ["airDateGracePeriod", mapped.airDateGracePeriod, server.airDateGracePeriod ?? 0],
    [
      "allowSeasonPackWithoutAllEpisodesAired",
      mapped.allowSeasonPackWithoutAllEpisodesAired,
      server.allowSeasonPackWithoutAllEpisodesAired ?? false,
    ],
  ] as const;
  for (const [field, configured, current] of optionalFields) {
    if (configured !== undefined && configured !== current) {
      changes.push({
        field,
        from: current,
        to: configured,
      });
    }
  }
  return changes;
}

function sonarrReleaseProfileAdapter(): ReleaseProfileAdapter<ReleaseProfileResource, ReleaseProfileResource> {
  return {
    mapToServer(profile, serverTags, indexers, tagOptions) {
      const { ids: tags } = resolveTagNames(profile.tags ?? [], serverTags, tagOptions);
      const excludedTags =
        profile.excluded_tags === undefined ? undefined : resolveTagNames(profile.excluded_tags, serverTags, tagOptions).ids;
      const overlap = tags.find((tagId) => excludedTags?.includes(tagId));
      if (overlap !== undefined) {
        const label = serverTags.find((tag) => tag.id === overlap)?.label ?? String(overlap);
        throw new ConfigValidationError(`Release profile tag '${label}' cannot be both included and excluded.`);
      }

      let indexerIds: number[];
      if (profile.indexers !== undefined) {
        indexerIds = resolveIndexerIds(profile.indexers, indexers);
      } else if (profile.indexer !== undefined && profile.indexer !== "") {
        const indexer = indexers.find((candidate) => candidate.name === profile.indexer);
        if (indexer?.id == null) {
          throw new ConfigValidationError(`Unknown indexer '${profile.indexer}' for release profile.`);
        }
        indexerIds = [indexer.id];
      } else {
        indexerIds = [];
      }

      return {
        ...(profile.name?.trim() ? { name: profile.name.trim() } : {}),
        enabled: profile.enabled ?? true,
        required: normalizeTerms(profile.required),
        ignored: normalizeTerms(profile.ignored),
        indexerIds: sortedNumbers(indexerIds),
        tags,
        ...(excludedTags === undefined ? {} : { excludedTags: sortedNumbers(excludedTags) }),
        ...(profile.air_date_restriction === undefined ? {} : { airDateRestriction: profile.air_date_restriction }),
        ...(profile.air_date_grace_period === undefined ? {} : { airDateGracePeriod: profile.air_date_grace_period }),
        ...(profile.allow_season_pack_without_all_episodes_aired === undefined
          ? {}
          : { allowSeasonPackWithoutAllEpisodesAired: profile.allow_season_pack_without_all_episodes_aired }),
      };
    },
    profileKey(profile) {
      return sonarrProfileKey(profile, true);
    },
    matches(mapped, server) {
      const mappedKey = {
        ...mapped,
        airDateRestriction: mapped.airDateRestriction === undefined ? server.airDateRestriction : mapped.airDateRestriction,
        airDateGracePeriod: mapped.airDateGracePeriod === undefined ? server.airDateGracePeriod : mapped.airDateGracePeriod,
        allowSeasonPackWithoutAllEpisodesAired:
          mapped.allowSeasonPackWithoutAllEpisodesAired === undefined
            ? server.allowSeasonPackWithoutAllEpisodesAired
            : mapped.allowSeasonPackWithoutAllEpisodesAired,
        excludedTags: mapped.excludedTags === undefined ? server.excludedTags : mapped.excludedTags,
      };
      return sonarrProfileKey(mappedKey, false) === sonarrProfileKey(server, false);
    },
    compareFields(mapped, server, _supportsName, placeholderLabels) {
      return compareSonarrFields(mapped, server, placeholderLabels);
    },
    mergeForUpdate(mapped, server) {
      return {
        ...server,
        ...mapped,
        id: server.id,
        name: mapped.name ?? server.name,
        excludedTags: mapped.excludedTags ?? server.excludedTags,
        airDateRestriction: mapped.airDateRestriction ?? server.airDateRestriction,
        airDateGracePeriod: mapped.airDateGracePeriod ?? server.airDateGracePeriod,
        allowSeasonPackWithoutAllEpisodesAired:
          mapped.allowSeasonPackWithoutAllEpisodesAired ?? server.allowSeasonPackWithoutAllEpisodesAired,
      };
    },
    tagLabels(profile) {
      return [...(profile.tags ?? []), ...(profile.excluded_tags ?? [])];
    },
  };
}

function usesV5Controls(profile: InputConfigReleaseProfile): boolean {
  return (
    profile.indexers !== undefined ||
    profile.excluded_tags !== undefined ||
    profile.air_date_restriction !== undefined ||
    profile.air_date_grace_period !== undefined ||
    profile.allow_season_pack_without_all_episodes_aired !== undefined
  );
}

export class ReleaseProfileSonarrSync extends BaseReleaseProfileSync<ReleaseProfileResource, ReleaseProfileResource> {
  constructor(private readonly sonarrApi: SonarrReleaseProfileApi) {
    super(sonarrApi, true, sonarrReleaseProfileAdapter());
  }

  override async validateConfig(configs: InputConfigReleaseProfile[]): Promise<void> {
    if (!configs.some(usesV5Controls)) {
      return;
    }
    if (!(await this.sonarrApi.supportsReleaseProfileControls())) {
      throw new ConfigValidationError("Sonarr v5 release-profile options require the Sonarr v5 API.");
    }
  }
}
