import { ServerCache } from "../cache";
import type { IndexerListItem, ReleaseProfilesApi } from "../clients/capabilities";
import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import { getEnvs } from "../env";
import { logger } from "../logger";
import { Tag } from "../tags/tag.types";
import { buildTagPlaceholders, ensureTags, resolveTagNames } from "../tags/tags";
import { InputConfigReleaseProfile } from "../types/config.types";
import { ConfigValidationError } from "../validation";
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

function tagsOf(profile: { tags?: number[] | null }): number[] {
  return Array.isArray(profile.tags) ? [...profile.tags].sort((a, b) => a - b) : [];
}

export function contentKey(profile: ReleaseProfileShared): string {
  return `content:${JSON.stringify({
    enabled: profile.enabled ?? true,
    required: sortedTerms(profile.required),
    ignored: sortedTerms(profile.ignored),
    indexerId: profile.indexerId ?? 0,
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

function compareFields(mapped: ReleaseProfileShared, server: ReleaseProfileShared, supportsName: boolean): FieldChange[] {
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

  const mappedIndexer = mapped.indexerId ?? 0;
  const serverIndexer = server.indexerId ?? 0;
  if (mappedIndexer !== serverIndexer) {
    changes.push({ field: "indexerId", from: serverIndexer, to: mappedIndexer });
  }

  const mappedTags = tagsOf(mapped);
  const serverTags = tagsOf(server);
  if (mappedTags.length !== serverTags.length || mappedTags.some((id, i) => id !== serverTags[i])) {
    changes.push({ field: "tags", from: serverTags, to: mappedTags });
  }

  return changes;
}

/**
 * Dry-run only: stable synthetic negative ids for configured labels the server does not have yet,
 * keyed by LOWERCASED label. Never written to the server, they only keep the `tags` field of a
 * dry-run diff comparable across configs.
 */
export function resolveIndexerId(indexerName: string | undefined, indexers: IndexerListItem[]): number {
  if (indexerName == null || indexerName === "") {
    return 0;
  }
  const found = indexers.find((indexer) => indexer.name === indexerName);
  if (found?.id == null) {
    throw new ConfigValidationError(`Unknown indexer '${indexerName}' for release profile.`);
  }
  return found.id;
}

export class BaseReleaseProfileSync<T extends ReleaseProfileShared> {
  private warnedAboutName = false;

  constructor(
    protected readonly api: ReleaseProfilesApi<T>,
    protected readonly supportsName: boolean,
  ) {}

  mapToServer(profile: InputConfigReleaseProfile, tagIds: number[], indexerId: number): ReleaseProfileShared {
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

    return mapped;
  }

  private async createMissingTags(configs: InputConfigReleaseProfile[], serverCache: ServerCache): Promise<void> {
    const missingTags = new Set<string>();
    for (const config of configs) {
      // Keep the configured casing: this is the label that ends up on the server.
      resolveTagNames(config.tags ?? [], serverCache.tags).missing.forEach((tag) => missingTags.add(tag));
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
    const serverData = await this.api.getReleaseProfiles();
    const needsIndexers = configs.some((config) => config.indexer != null && config.indexer !== "");
    const indexers = needsIndexers ? await serverCache.getIndexers(() => this.api.getIndexers()) : [];

    const placeholders = placeholderMissingTags
      ? buildTagPlaceholders(
          configs.flatMap((config) => config.tags ?? []),
          serverCache.tags,
        )
      : undefined;
    const mappedConfigs: MappedReleaseProfile[] = configs.map((config) => {
      const { ids } = resolveTagNames(config.tags ?? [], serverCache.tags, { placeholders });
      return { config, mapped: this.mapToServer(config, ids, resolveIndexerId(config.indexer, indexers)) };
    });

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
      const fieldChanges = compareFields(entry.mapped, match.profile, this.supportsName);
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
