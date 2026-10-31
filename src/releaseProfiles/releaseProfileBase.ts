import { ServerCache } from "../cache";
import type { IndexerListItem, ReleaseProfilesApi } from "../clients/capabilities";
import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import { getEnvs } from "../env";
import { logger } from "../logger";
import { Tag, TagResolveOptions } from "../tags/tag.types";
import { buildTagPlaceholders, ensureTags, renderTags, resolveTagNames } from "../tags/tags";
import { InputConfigReleaseProfile } from "../types/config.types";
import { ConfigValidationError } from "../validation";
import { MappedReleaseProfile, ReleaseProfileShared, ReleaseProfilesDiff, ReleaseProfileSyncResult } from "./releaseProfile.types";

export interface ReleaseProfileAdapter<Server extends ReleaseProfileShared, Request extends ReleaseProfileShared> {
  mapToServer(profile: InputConfigReleaseProfile, serverTags: Tag[], indexers: IndexerListItem[], tagOptions?: TagResolveOptions): Request;
  profileKey(profile: Server | Request, supportsName: boolean): string;
  matches(mapped: Request, server: Server, supportsName: boolean): boolean;
  compareFields(mapped: Request, server: Server, supportsName: boolean, placeholderLabels?: Map<number, string>): FieldChange[];
  mergeForUpdate(mapped: Request, server: Server): Request;
  tagLabels(profile: InputConfigReleaseProfile): string[];
}

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

  const mappedIndexer = mapped.indexerId ?? 0;
  const serverIndexer = server.indexerId ?? 0;
  if (mappedIndexer !== serverIndexer) {
    changes.push({ field: "indexerId", from: serverIndexer, to: mappedIndexer });
  }

  const mappedTags = tagsOf(mapped);
  const serverTags = tagsOf(server);
  if (mappedTags.length !== serverTags.length || mappedTags.some((id, i) => id !== serverTags[i])) {
    changes.push({ field: "tags", from: serverTags, to: renderTags(mappedTags, placeholderLabels) });
  }

  return changes;
}

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

export function sharedReleaseProfileAdapter<Server extends ReleaseProfileShared>(): ReleaseProfileAdapter<Server, ReleaseProfileShared> {
  return {
    mapToServer(profile, serverTags, indexers, tagOptions) {
      const { ids: tagIds } = resolveTagNames(profile.tags ?? [], serverTags, tagOptions);
      return {
        ...(profile.name?.trim() ? { name: profile.name.trim() } : {}),
        enabled: profile.enabled ?? true,
        required: normalizeTerms(profile.required),
        ignored: normalizeTerms(profile.ignored),
        indexerId: resolveIndexerId(profile.indexer, indexers),
        tags: tagIds,
      };
    },
    profileKey(profile, supportsName) {
      return profileKey(profile, supportsName);
    },
    matches(mapped, server, _supportsName) {
      return contentKey(mapped) === contentKey(server);
    },
    compareFields(mapped, server, supportsName, placeholderLabels) {
      return compareFields(mapped, server, supportsName, placeholderLabels);
    },
    mergeForUpdate(mapped, server) {
      return {
        ...mapped,
        id: server.id,
        ...(mapped.name != null || server.name != null ? { name: mapped.name ?? server.name } : {}),
      };
    },
    tagLabels(profile) {
      return profile.tags ?? [];
    },
  };
}

export class BaseReleaseProfileSync<T extends ReleaseProfileShared, Request extends ReleaseProfileShared = ReleaseProfileShared> {
  private warnedAboutName = false;

  constructor(
    protected readonly api: ReleaseProfilesApi<T, Request>,
    protected readonly supportsName: boolean,
    private readonly adapter: ReleaseProfileAdapter<T, Request>,
  ) {}

  async validateConfig(configs: InputConfigReleaseProfile[]): Promise<void> {
    const unsupported = configs.find(
      (profile) =>
        profile.indexers !== undefined ||
        profile.excluded_tags !== undefined ||
        profile.air_date_restriction !== undefined ||
        profile.air_date_grace_period !== undefined ||
        profile.allow_season_pack_without_all_episodes_aired !== undefined,
    );
    if (unsupported) {
      throw new ConfigValidationError("Sonarr v5 release-profile options are not supported by this *arr.");
    }
  }

  mapToServer(profile: InputConfigReleaseProfile, serverTags: Tag[], indexers: IndexerListItem[], tagOptions?: TagResolveOptions): Request {
    const name = profile.name?.trim();
    if (!this.supportsName && name && !this.warnedAboutName) {
      logger.warn(`Release profile 'name' is not supported on this *arr and will be ignored.`);
      this.warnedAboutName = true;
    }

    const mapped = this.adapter.mapToServer(profile, serverTags, indexers, tagOptions);
    if (!this.supportsName && name) {
      delete mapped.name;
    }
    return mapped;
  }

  private async createMissingTags(configs: InputConfigReleaseProfile[], serverCache: ServerCache): Promise<void> {
    const missingTags = new Set<string>();
    for (const config of configs) {
      // Configured casing wins: this is the label the server gets.
      resolveTagNames(this.adapter.tagLabels(config), serverCache.tags).missing.forEach((tag) => missingTags.add(tag));
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
  ): Promise<ReleaseProfilesDiff<T, Request>> {
    const serverData = await this.api.getReleaseProfiles();
    const needsIndexers = configs.some((config) => (config.indexer != null && config.indexer !== "") || (config.indexers?.length ?? 0) > 0);
    const indexers = needsIndexers ? await serverCache.getIndexers(() => this.api.getIndexers()) : [];

    const placeholders = placeholderMissingTags
      ? buildTagPlaceholders(
          configs.flatMap((config) => this.adapter.tagLabels(config)),
          serverCache.tags,
        )
      : undefined;
    const mappedConfigs: MappedReleaseProfile<Request>[] = configs.map((config) => ({
      config,
      mapped: this.mapToServer(config, serverCache.tags, indexers, { placeholders }),
    }));

    // Inverted once every stand-in is assigned, so the report can name a stand-in id instead of
    // printing a number the server never handed out.
    const placeholderLabels =
      placeholders && placeholders.size > 0 ? new Map([...placeholders].map(([label, id]) => [id, label])) : undefined;

    const seen = new Map<string, number>();
    mappedConfigs.forEach((entry, index) => {
      const key = this.adapter.profileKey(entry.mapped, this.supportsName);
      if (seen.has(key)) {
        throw new ConfigValidationError(`Duplicate release profile '${displayName(entry.config, index)}'.`);
      }
      seen.set(key, index);
    });

    const servers = serverData.map((profile) => ({ profile, claimed: false }));
    const create: MappedReleaseProfile<Request>[] = [];
    const update: ReleaseProfilesDiff<T, Request>["update"] = [];

    const named = mappedConfigs.filter((entry) => usesName(entry.mapped, this.supportsName));
    const nameless = mappedConfigs.filter((entry) => !usesName(entry.mapped, this.supportsName));

    for (const entry of [...named, ...nameless]) {
      const match = usesName(entry.mapped, this.supportsName)
        ? servers.find((server) => !server.claimed && server.profile.name?.trim() === entry.mapped.name?.trim())
        : servers.find((server) => !server.claimed && this.adapter.matches(entry.mapped, server.profile, this.supportsName));

      if (match == null) {
        create.push(entry);
        continue;
      }

      match.claimed = true;
      const fieldChanges = this.adapter.compareFields(entry.mapped, match.profile, this.supportsName, placeholderLabels);
      if (fieldChanges.length > 0) {
        update.push({ config: entry.config, server: match.profile, mapped: entry.mapped, fieldChanges });
      }
    }

    return { create, update, remove: servers.filter((server) => !server.claimed).map((server) => server.profile) };
  }

  async sync(configs: InputConfigReleaseProfile[], serverCache: ServerCache): Promise<ReleaseProfileSyncResult> {
    await this.validateConfig(configs);
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
      await this.api.updateReleaseProfile(String(item.server.id), this.adapter.mergeForUpdate(item.mapped, item.server));
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

export function releaseProfilesToDiffEntries<Server extends ReleaseProfileShared, Request extends ReleaseProfileShared>(
  diff: ReleaseProfilesDiff<Server, Request>,
): DiffEntry[] {
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
