import type { ServerCache } from "../cache";
import type { TagsClient } from "../clients/capabilities";
import { getEnvs } from "../env";
import { logger } from "../logger";
import type { DeleteUnmanagedTagsOptions, EnsureTagsResult, Tag, TagResolveOptions, TagSyncResult } from "./tag.types";

export const loadServerTags = async (client: TagsClient): Promise<Tag[]> => {
  if (getEnvs().LOAD_LOCAL_SAMPLES) {
    throw new Error("Local sample loading for tags is not implemented yet.");
  }
  return client.getTags();
};

/** Numeric tag entries are deprecated: labels are the default and recommended form. Warn once per label per run. */
const warnedNumericTags = new Set<string>();

/**
 * Resolves configured tag entries to server tag ids.
 *
 * Labels match case-insensitively. Numeric entries are passed through as raw server ids and
 * reported as deprecated. Labels that do not exist on the server land in `missing`; a caller
 * that passes `placeholders` additionally gets a synthetic id for them (see TagResolveOptions).
 */
export const resolveTagNames = (
  tagNames: readonly (string | number)[],
  serverTags: readonly Tag[],
  options: TagResolveOptions = {},
): { ids: number[]; missing: string[] } => {
  const ids: number[] = [];
  const missing: string[] = [];
  const byLabel = new Map<string, Tag>();

  for (const tag of serverTags) {
    // First match wins, matching the Array.find the per-caller resolvers used before.
    if (tag.label && tag.id != null && !byLabel.has(tag.label.toLowerCase())) {
      byLabel.set(tag.label.toLowerCase(), tag);
    }
  }

  for (const entry of tagNames) {
    if (typeof entry === "number") {
      const key = String(entry);
      if (!warnedNumericTags.has(key)) {
        warnedNumericTags.add(key);
        logger.warn(
          `Numeric tag id '${entry}' in config is deprecated and may be removed. Use the tag label instead, e.g. 'tags: ["my-label"]'.`,
        );
      }
      ids.push(entry);
      continue;
    }

    const key = entry.toLowerCase();
    const serverTag = byLabel.get(key);
    if (serverTag?.id != null) {
      ids.push(serverTag.id);
      continue;
    }

    missing.push(entry);
    const placeholder = options.placeholders?.get(key);
    if (placeholder != null) {
      ids.push(placeholder);
    }
  }

  return { ids, missing };
};

/**
 * Builds a synthetic-id map for labels the server does not have yet, so a dry run can diff tag
 * fields against something stable. Keys are lowercased labels; labels the server already knows
 * are skipped so they do not consume synthetic ids.
 */
export const buildTagPlaceholders = (tagNames: readonly string[], serverTags: readonly Tag[]): Map<string, number> => {
  const known = new Set(serverTags.map((tag) => tag.label?.toLowerCase()).filter((label) => label != null));
  const placeholders = new Map<string, number>();

  for (const name of tagNames) {
    const key = name.toLowerCase();
    if (!known.has(key) && !placeholders.has(key)) {
      placeholders.set(key, -(placeholders.size + 1));
    }
  }

  return placeholders;
};

/** Folds config tag lists into one lowercased set of labels, skipping raw numeric ids. */
export const collectTagLabels = (...tagLists: readonly ((string | number)[] | undefined)[]): Set<string> => {
  const labels = new Set<string>();
  for (const tags of tagLists) {
    for (const tag of tags ?? []) {
      if (typeof tag === "string") {
        labels.add(tag.toLowerCase());
      }
    }
  }
  return labels;
};

/**
 * Collects the raw server ids from config tag entries. Numeric entries are deprecated but still
 * accepted in the per-feature blocks, and such a tag must survive an unmanaged-tag prune.
 */
export const collectTagIds = (...tagLists: readonly ((string | number)[] | undefined)[]): number[] => {
  const ids: number[] = [];
  for (const tags of tagLists) {
    for (const tag of tags ?? []) {
      if (typeof tag === "number" && !ids.includes(tag)) {
        ids.push(tag);
      }
    }
  }
  return ids;
};

/**
 * Resolves configured tag entries and creates the ones the server does not have yet.
 *
 * Created tags are pushed onto `serverCache.tags`. A dry run creates nothing: labels without a
 * server tag get a synthetic id only if the caller passed `placeholders`.
 */
export const ensureTags = async (
  client: TagsClient,
  serverCache: ServerCache,
  tagNames: readonly (string | number)[],
  options: TagResolveOptions = {},
): Promise<EnsureTagsResult> => {
  const { missing } = resolveTagNames(tagNames, serverCache.tags, options);
  const created: string[] = [];

  const toCreate: string[] = [];
  // A server tag without an id cannot be referenced, so it does not count as known.
  const seen = new Set(serverCache.tags.filter((tag) => tag.id != null).map((tag) => tag.label?.toLowerCase() ?? ""));
  for (const label of missing) {
    const key = label.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    toCreate.push(label);
  }

  if (toCreate.length > 0 && getEnvs().DRY_RUN) {
    logger.info(`DryRun: Would create tags: ${toCreate.join(", ")}`);
  } else if (toCreate.length > 0) {
    logger.info(`Creating missing tags on server: ${toCreate.join(", ")}`);

    for (const label of toCreate) {
      try {
        const newTag = await client.createTag({ label });
        serverCache.tags.push(newTag);
        created.push(label);
        logger.debug(`Created tag: '${label}' (ID: ${newTag.id})`);
      } catch (error: unknown) {
        const message = `Failed to create tag '${label}': ${error instanceof Error ? error.message : String(error)}`;
        logger.error(message);
        throw new Error(message);
      }
    }
  }

  // Resolve again so labels created above come back with their real ids.
  const { ids } = resolveTagNames(tagNames, serverCache.tags, options);

  return { ids, created, missing: toCreate };
};

/**
 * True when the server rejected the delete because the tag is still referenced.
 *
 * The API client wraps every failure as `new Error(message, { cause })` where the cause is ky's
 * HTTPError, so the status lives on `cause.response.status` - not on the thrown error itself.
 */
const isInUseError = (error: unknown): boolean => {
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current != null && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const candidate = current as { response?: { status?: number }; status?: number; cause?: unknown };
    const status = candidate.response?.status ?? candidate.status;
    if (typeof status === "number") {
      return status === 409;
    }
    current = candidate.cause;
  }

  return false;
};

/**
 * Deletes server tags that are not in `keep`.
 *
 * `onInUse` decides what happens when the server answers 409 because a resource configarr does
 * not manage still holds the tag: "skip" leaves it and carries on, "throw" fails the instance.
 */
export const deleteUnmanagedTags = async (
  client: TagsClient,
  serverCache: ServerCache,
  options: DeleteUnmanagedTagsOptions,
): Promise<TagSyncResult> => {
  const result: TagSyncResult = { added: 0, removed: 0, diffEntries: [] };
  const keep = new Set<string>();
  for (const label of options.keep) {
    keep.add(label.toLowerCase());
  }
  const keepIds = new Set(options.keepIds ?? []);

  const dryRun = getEnvs().DRY_RUN;
  const deletedIds = new Set<number>();

  for (const tag of serverCache.tags) {
    const label = tag.label ?? "";
    if (!label || tag.id == null || keep.has(label.toLowerCase()) || keepIds.has(tag.id)) {
      continue;
    }

    if (dryRun) {
      logger.info(`DryRun: Would delete unmanaged tag '${label}'.`);
      result.diffEntries.push({ resourceType: "Tag", name: label, action: "delete" });
      result.removed++;
      continue;
    }

    try {
      await client.deleteTag(tag.id.toString());
    } catch (error: unknown) {
      if (isInUseError(error) && options.onInUse === "skip") {
        logger.warn(`Skipping unmanaged tag '${label}': still in use by a resource configarr does not manage.`);
        continue;
      }
      const message = `Failed to delete tag '${label}': ${error instanceof Error ? error.message : String(error)}`;
      logger.error(message);
      throw new Error(message);
    }

    deletedIds.add(tag.id);
    result.diffEntries.push({ resourceType: "Tag", name: label, action: "delete" });
    result.removed++;
    logger.info(`Deleted unmanaged tag: '${label}'`);
  }

  serverCache.tags = serverCache.tags.filter((tag) => tag.id == null || !deletedIds.has(tag.id));

  return result;
};

type TagDeleteConfig = { enabled: boolean; ignore?: string[] };

interface DeleteUnmanagedInstanceTagsOptions {
  /** Only prunes when `enabled` is set. */
  deleteConfig?: TagDeleteConfig;
  /** Every `tags` list in the instance config, so a tag a managed resource uses is never pruned. */
  referencedTagLists: readonly ((string | number)[] | undefined)[];
  /**
   * What to do when the server answers 409 because a resource configarr does not manage still
   * holds the tag. Media *arrs skip it and carry on; Prowlarr manages every tag-bearing
   * resource, so a conflict there fails the instance.
   */
  onInUse: "throw" | "skip";
}

/**
 * Ensures the instance-level `tags` labels exist on the server.
 *
 * A dry run creates nothing, so it reports the labels it would have created instead.
 */
export async function syncInstanceTags(
  client: TagsClient,
  serverCache: ServerCache,
  labels: readonly string[] | undefined,
): Promise<TagSyncResult> {
  const result: TagSyncResult = { added: 0, removed: 0, diffEntries: [] };

  if (!labels?.length) {
    return result;
  }

  const { created, missing } = await ensureTags(client, serverCache, labels);
  for (const label of created) {
    logger.info(`Created tag: '${label}'`);
  }

  for (const label of getEnvs().DRY_RUN ? missing : created) {
    result.diffEntries.push({ resourceType: "Tag", name: label, action: "create" });
    result.added++;
  }

  return result;
}

/**
 * Prunes server tags that are neither listed under `tags`/`ignore` nor referenced by a
 * managed resource in the instance config.
 */
export async function deleteUnmanagedInstanceTags(
  client: TagsClient,
  serverCache: ServerCache,
  options: DeleteUnmanagedInstanceTagsOptions,
): Promise<TagSyncResult> {
  if (!options.deleteConfig?.enabled) {
    return { added: 0, removed: 0, diffEntries: [] };
  }

  return deleteUnmanagedTags(client, serverCache, {
    keep: collectTagLabels(options.deleteConfig.ignore, ...options.referencedTagLists),
    keepIds: collectTagIds(...options.referencedTagLists),
    onInUse: options.onInUse,
  });
}
