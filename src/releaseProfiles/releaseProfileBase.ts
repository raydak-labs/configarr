import { ServerCache } from "../cache";
import type { IndexerListItem, ReleaseProfilesApi } from "../clients/capabilities";
import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import { getEnvs } from "../env";
import { logger } from "../logger";
import { Tag } from "../tags/tag.types";
import { buildTagPlaceholders, ensureTags, resolveTagNames } from "../tags/tags";
import { InputConfigReleaseProfile } from "../types/config.types";
import { ConfigValidationError } from "../validation";
import { resolveServerMajorVersion } from "../arr/serverVersion";
import { SonarrClient } from "../clients/sonarr-client";
import { MappedReleaseProfile, ReleaseProfileShared, ReleaseProfilesDiff, ReleaseProfileSyncResult } from "./releaseProfile.types";

export function normalizeTerms(value: unknown): string[] {
  if (value == null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter((item) => item.length > 0);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return [];
}

function sortedTerms(value: unknown): string[] {
  return [...normalizeTerms(value)].sort();
}

/**
 * The indexers a profile applies to, in one canonical form. Sonarr's v3 contract expresses this as
 * a scalar `indexerId` and its v5 contract as an `indexerIds` array, so both are read here. Keeping
 * the canonical form in one place lets a server shape and a mapped config shape be compared and
 * keyed identically whichever contract produced them.
 */
function indexerIdsOf(profile: ReleaseProfileShared): number[] {
  if (profile.indexerIds != null) {
    return [...profile.indexerIds].sort((a, b) => a - b);
  }
  return profile.indexerId != null ? [profile.indexerId] : [];
}

function tagsOf(profile: { tags?: number[] | null }): number[] {
  return Array.isArray(profile.tags) ? [...profile.tags].sort((a, b) => a - b) : [];
}

function sortedIds(ids: number[] | null | undefined): number[] {
  return Array.isArray(ids) ? [...ids].sort((a, b) => a - b) : [];
}

export function contentKey(profile: ReleaseProfileShared): string {
  return `content:${JSON.stringify({
    enabled: profile.enabled ?? true,
    required: sortedTerms(profile.required),
    ignored: sortedTerms(profile.ignored),
    indexerIds: indexerIdsOf(profile),
    tags: tagsOf(profile),
  })}`;
}

export function profileKey(profile: ReleaseProfileShared, supportsName: boolean): string {
  const name = profile.name?.trim();
  if (supportsName && name) {
    return `name:${name}`;
  }
  return contentKey(profile);
}

function usesName(profile: ReleaseProfileShared, supportsName: boolean): boolean {
  return Boolean(supportsName && profile.name?.trim());
}

export function displayName(profile: { name?: string | null; required?: unknown }, index: number): string {
  const name = profile.name?.trim();
  if (name) {
    return name;
  }
  const required = normalizeTerms(profile.required);
  if (required.length > 0) {
    return required.join(",");
  }
  return `profile-${index + 1}`;
}

/**
 * A tag that does not exist on the server yet has no id the server could ever assign it. A dry run
 * still needs a stable stand-in to match profiles by content, but it must not print that stand-in:
 * listing the tag by label keeps the report honest about what the real run will do. Mirrors the
 * convention in `providerResourceSync`.
 */
function renderTags(ids: number[], placeholderLabels?: Map<number, string>): Array<number | string> {
  if (placeholderLabels === undefined) {
    return ids;
  }
  const resolved = ids.filter((id) => !placeholderLabels.has(id));
  const pending = ids.filter((id) => placeholderLabels.has(id)).map((id) => placeholderLabels.get(id) as string);
  return [...resolved, ...pending];
}

function compareFields(
  mapped: ReleaseProfileShared,
  server: ReleaseProfileShared,
  supportsName: boolean,
  placeholderLabels?: Map<number, string>,
): FieldChange[] {
  const changes: FieldChange[] = [];

  if (supportsName && mapped.name != null && mapped.name !== (server.name ?? "")) {
    changes.push({ field: "name", from: server.name ?? null, to: mapped.name });
  }

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

  const mappedIndexers = indexerIdsOf(mapped);
  const serverIndexers = indexerIdsOf(server);
  if (JSON.stringify(mappedIndexers) !== JSON.stringify(serverIndexers)) {
    changes.push({ field: "indexerIds", from: serverIndexers, to: mappedIndexers });
  }

  const mappedTags = tagsOf(mapped);
  const serverTags = tagsOf(server);
  if (mappedTags.length !== serverTags.length || mappedTags.some((id, i) => id !== serverTags[i])) {
    changes.push({ field: "tags", from: serverTags, to: renderTags(mappedTags, placeholderLabels) });
  }

  const mappedExcluded = sortedIds(mapped.excludedTags);
  const serverExcluded = sortedIds(server.excludedTags);
  if (JSON.stringify(mappedExcluded) !== JSON.stringify(serverExcluded)) {
    changes.push({ field: "excludedTags", from: serverExcluded, to: mappedExcluded });
  }

  if (mapped.airDateRestriction !== undefined && mapped.airDateRestriction !== (server.airDateRestriction ?? false)) {
    changes.push({ field: "airDateRestriction", from: server.airDateRestriction ?? false, to: mapped.airDateRestriction });
  }

  if (mapped.airDateGracePeriod !== undefined && mapped.airDateGracePeriod !== (server.airDateGracePeriod ?? null)) {
    changes.push({
      field: "airDateGracePeriod",
      from: server.airDateGracePeriod ?? null,
      to: mapped.airDateGracePeriod,
    });
  }

  if (
    mapped.allowSeasonPackWithoutAllEpisodesAired !== undefined &&
    mapped.allowSeasonPackWithoutAllEpisodesAired !== (server.allowSeasonPackWithoutAllEpisodesAired ?? false)
  ) {
    changes.push({
      field: "allowSeasonPackWithoutAllEpisodesAired",
      from: server.allowSeasonPackWithoutAllEpisodesAired ?? false,
      to: mapped.allowSeasonPackWithoutAllEpisodesAired,
    });
  }

  return changes;
}

export function resolveIndexerId(indexerName: string | undefined, indexers: IndexerListItem[]): number {
  if (indexerName == null || indexerName === "") {
    return 0;
  }
  return resolveIndexerIds([indexerName], indexers)[0] ?? 0;
}

/**
 * Ids for every indexer a profile applies to, preserving the configured order and rejecting an
 * unknown name rather than silently writing a profile restricted to nothing.
 */
export function resolveIndexerIds(indexerNames: readonly string[], indexers: IndexerListItem[]): number[] {
  const names = indexerNames.map((name) => name.trim()).filter((name) => name.length > 0);
  return names.map((name) => {
    const found = indexers.find((indexer) => indexer.name === name);
    if (found?.id == null) {
      throw new ConfigValidationError(`Unknown indexer '${name}' for release profile.`);
    }
    return found.id;
  });
}

/** Config keys whose target field exists only on the Sonarr v5 release profile resource. */
const RELEASE_PROFILE_V5_KEYS = [
  "excluded_tags",
  "air_date_restriction",
  "air_date_grace_period",
  "allow_season_pack_without_all_episodes_aired",
] as const satisfies readonly (keyof InputConfigReleaseProfile)[];

export class BaseReleaseProfileSync<T extends ReleaseProfileShared> {
  private warnedAboutName = false;

  constructor(
    protected readonly api: ReleaseProfilesApi<T>,
    protected readonly supportsName: boolean,
  ) {}

  mapToServer(
    profile: InputConfigReleaseProfile,
    tagIds: number[],
    indexerId: number,
    excludedTagIds: number[] = [],
  ): ReleaseProfileShared {
    const name = profile.name?.trim();
    if (!this.supportsName && name && !this.warnedAboutName) {
      logger.warn(`Release profile 'name' is not supported on this *arr and will be ignored.`);
      this.warnedAboutName = true;
    }

    const mapped: ReleaseProfileShared = {
      enabled: profile.enabled ?? true,
      required: normalizeTerms(profile.required),
      ignored: normalizeTerms(profile.ignored),
      indexerId,
      tags: tagIds,
    };

    if (this.supportsName && name) {
      mapped.name = name;
    }

    this.attachV5Fields(mapped, profile);
    // Set only when configured, so a config without excluded_tags produces a payload identical to
    // before and no diff entry against a server that has the field.
    if (profile.excluded_tags !== undefined) {
      mapped.excludedTags = excludedTagIds;
    }

    return mapped;
  }

  /**
   * Fields the Sonarr v5 release profile resource added. They are emitted only when the config sets
   * them, so a v3 server never receives a field it would silently drop, and a config that leaves them
   * out produces no diff entry against a server that has them.
   */
  private attachV5Fields(mapped: ReleaseProfileShared, profile: InputConfigReleaseProfile): void {
    if (profile.air_date_restriction !== undefined) {
      mapped.airDateRestriction = profile.air_date_restriction;
    }
    if (profile.air_date_grace_period !== undefined) {
      mapped.airDateGracePeriod = profile.air_date_grace_period;
    }
    if (profile.allow_season_pack_without_all_episodes_aired !== undefined) {
      mapped.allowSeasonPackWithoutAllEpisodesAired = profile.allow_season_pack_without_all_episodes_aired;
    }
  }

  /**
   * Every field the v5 resource added and the v4 one lacks, plus the multi-indexer list that needs the
   * v5 contract. Checked once, before any tag is created or profile written, so a rejected config
   * costs nothing. A v4 server would drop these fields and the diff would report equal on every run
   * while the user's config took no effect.
   */
  private async assertSupportedFields(configs: InputConfigReleaseProfile[]): Promise<void> {
    const needsV5Server = configs.some((config) => RELEASE_PROFILE_V5_KEYS.some((key) => config[key] !== undefined));
    if (needsV5Server && (await resolveServerMajorVersion(this.api)) < 5) {
      throw new ConfigValidationError(
        "Release profile 'air_date_restriction', 'air_date_grace_period', " +
          "'allow_season_pack_without_all_episodes_aired' and 'excluded_tags' need a Sonarr v5 server.",
      );
    }

    for (const config of configs) {
      if (!Array.isArray(config.indexer) || config.indexer.length <= 1) {
        continue;
      }
      // Only the v5 contract carries the array field, so the list would be truncated on v3.
      const version = this.api instanceof SonarrClient ? this.api.apiVersion : "v3";
      if (version !== "v5") {
        throw new ConfigValidationError(
          `Release profile '${displayName(config, 0)}' lists more than one indexer, which needs the ` +
            "Sonarr v5 API. Set 'api_version: v5' on the instance.",
        );
      }
    }
  }

  private async createMissingTags(configs: InputConfigReleaseProfile[], serverCache: ServerCache): Promise<void> {
    const missingTags = new Set<string>();
    for (const config of configs) {
      // Configured casing wins: this is the label the server gets.
      resolveTagNames(config.tags ?? [], serverCache.tags).missing.forEach((tag) => missingTags.add(tag));
      // An excluded tag is referenced by the profile exactly as a held one is, so it has to exist
      // before it can be written.
      resolveTagNames(config.excluded_tags ?? [], serverCache.tags).missing.forEach((tag) => missingTags.add(tag));
    }

    if (missingTags.size === 0) {
      return;
    }

    await ensureTags(this.api, serverCache, [...missingTags]);
  }

  async calculateDiff(
    configs: InputConfigReleaseProfile[],
    serverCache: ServerCache,
    placeholderMissingTags = getEnvs().DRY_RUN,
  ): Promise<ReleaseProfilesDiff> {
    // Rejected before any tag is created or profile written, so a misconfigured config costs nothing.
    await this.assertSupportedFields(configs);

    const serverData = await this.api.getReleaseProfiles();
    const needsIndexers = configs.some((config) => {
      const value = config.indexer;
      return Array.isArray(value) ? value.length > 0 : value != null && value !== "";
    });
    const indexers = needsIndexers ? await serverCache.getIndexers(() => this.api.getIndexers()) : [];

    const placeholders = placeholderMissingTags
      ? buildTagPlaceholders(
          configs.flatMap((config) => config.tags ?? []),
          serverCache.tags,
        )
      : undefined;
    const mappedConfigs: MappedReleaseProfile[] = configs.map((config) => {
      const { ids } = resolveTagNames(config.tags ?? [], serverCache.tags, { placeholders });
      const excluded = resolveTagNames(config.excluded_tags ?? [], serverCache.tags, { placeholders });
      const indexerNames = Array.isArray(config.indexer) ? config.indexer : config.indexer ? [config.indexer] : [];
      const indexerIds = resolveIndexerIds(indexerNames, indexers);
      const mapped = this.mapToServer(config, ids, indexerIds[0] ?? 0, excluded.ids);
      // A list is collapsed onto the scalar field by mapToServer, so it is widened here for the
      // v5 contract. Doing it in the client instead would need a v3 scalar to become an array at
      // the request boundary, which the client's public signature cannot express.
      if (indexerIds.length > 1) {
        mapped.indexerId = indexerIds[0];
        mapped.indexerIds = indexerIds;
      }
      return { config, mapped };
    });

    // Inverted once every stand-in is assigned, so the report can name a stand-in id instead of
    // printing a number the server never handed out.
    const placeholderLabels =
      placeholders && placeholders.size > 0 ? new Map([...placeholders].map(([label, id]) => [id, label])) : undefined;

    const seen = new Map<string, number>();
    mappedConfigs.forEach((entry, index) => {
      const key = profileKey(entry.mapped, this.supportsName);
      if (seen.has(key)) {
        throw new ConfigValidationError(`Duplicate release profile '${displayName(entry.config, index)}'.`);
      }
      seen.set(key, index);
    });

    const servers = serverData.map((profile) => ({ profile, claimed: false }));
    const create: MappedReleaseProfile[] = [];
    const update: ReleaseProfilesDiff["update"] = [];

    const named = mappedConfigs.filter((entry) => usesName(entry.mapped, this.supportsName));
    const nameless = mappedConfigs.filter((entry) => !usesName(entry.mapped, this.supportsName));

    for (const entry of [...named, ...nameless]) {
      const match = usesName(entry.mapped, this.supportsName)
        ? servers.find((server) => !server.claimed && server.profile.name?.trim() === entry.mapped.name?.trim())
        : servers.find((server) => !server.claimed && contentKey(server.profile) === contentKey(entry.mapped));

      if (match == null) {
        create.push(entry);
        continue;
      }

      match.claimed = true;
      const fieldChanges = compareFields(entry.mapped, match.profile, this.supportsName, placeholderLabels);
      if (fieldChanges.length > 0) {
        update.push({ config: entry.config, server: match.profile, mapped: entry.mapped, fieldChanges });
      }
    }

    return { create, update, remove: servers.filter((server) => !server.claimed).map((server) => server.profile) };
  }

  async sync(configs: InputConfigReleaseProfile[], serverCache: ServerCache): Promise<ReleaseProfileSyncResult> {
    // Validates duplicates and indexer names before any tag is created.
    const preview = await this.calculateDiff(configs, serverCache, true);

    if (getEnvs().DRY_RUN) {
      logger.info("DryRun: Would update ReleaseProfiles.");
      return {
        added: preview.create.length,
        removed: preview.remove.length,
        updated: preview.update.length,
        diffEntries: releaseProfilesToDiffEntries(preview),
      };
    }

    await this.createMissingTags(configs, serverCache);
    const diff = await this.calculateDiff(configs, serverCache, false);
    const diffEntries = releaseProfilesToDiffEntries(diff);

    let removed = 0;
    for (const profile of diff.remove) {
      if (profile.id == null) {
        continue;
      }
      logger.info(`Deleting ReleaseProfile: '${displayName(profile, removed)}'`);
      await this.api.deleteReleaseProfile(String(profile.id));
      removed++;
    }

    let updated = 0;
    for (const item of diff.update) {
      if (item.server.id == null) {
        throw new Error("Release profile id missing from server; cannot update.");
      }
      logger.info(`Updating ReleaseProfile: '${displayName(item.config, updated)}'`);
      await this.api.updateReleaseProfile(String(item.server.id), {
        ...item.mapped,
        id: item.server.id,
        ...(item.mapped.name != null || item.server.name != null ? { name: item.mapped.name ?? item.server.name } : {}),
      });
      updated++;
    }

    let added = 0;
    for (const item of diff.create) {
      logger.info(`Creating ReleaseProfile: '${displayName(item.config, added)}'`);
      await this.api.createReleaseProfile(item.mapped);
      added++;
    }

    if (added > 0 || removed > 0 || updated > 0) {
      logger.info(`Updated ReleaseProfiles: +${added} -${removed} ~${updated}`);
    } else {
      logger.debug(`Release profiles are in sync`);
    }

    return { added, removed, updated, diffEntries };
  }
}

export function releaseProfilesToDiffEntries(diff: ReleaseProfilesDiff): DiffEntry[] {
  const entries: DiffEntry[] = [];

  diff.create.forEach((item, index) => {
    entries.push({ resourceType: "ReleaseProfile", name: displayName(item.config, index), action: "create" });
  });

  diff.update.forEach((item, index) => {
    entries.push({
      resourceType: "ReleaseProfile",
      name: displayName(item.config, index),
      action: "update",
      fieldChanges: item.fieldChanges,
    });
  });

  diff.remove.forEach((profile, index) => {
    entries.push({ resourceType: "ReleaseProfile", name: displayName(profile, index), action: "delete" });
  });

  return entries;
}
