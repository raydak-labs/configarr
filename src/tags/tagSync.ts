import type { ServerCache } from "../cache";
import type { TagsClient } from "../clients/capabilities";
import { getEnvs } from "../env";
import { logger } from "../logger";
import type { TagSyncResult } from "./tag.types";
import { collectTagIds, collectTagLabels, deleteUnmanagedTags, ensureTags } from "./tags";

/** The `delete_unmanaged_tags` shape, shared by the media and Prowlarr instance schemas. */
export type TagDeleteConfig = { enabled: boolean; ignore?: string[] };

export interface DeleteUnmanagedInstanceTagsOptions {
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
