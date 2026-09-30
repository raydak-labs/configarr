import type { ServerCache } from "../cache";
import type { TagsClient } from "../clients/capabilities";
import { getEnvs } from "../env";
import { logger } from "../logger";
import type { TagSyncResult } from "../tags/tag.types";
import {
  collectTagIds,
  collectTagLabels,
  deleteUnmanagedTags as deleteUnmanagedTagsOnServer,
  ensureTags,
  resolveTagNames,
} from "../tags/tags";
import type { InputConfigProwlarrInstance } from "../types/config.types";

/** Tag labels referenced by any managed Prowlarr resource in the instance config. */
function referencedTagNames(instance: InputConfigProwlarrInstance): Set<string> {
  return collectTagLabels(
    instance.applications?.data?.flatMap((application) => application.tags ?? []),
    instance.indexers?.data?.flatMap((indexer) => indexer.tags ?? []),
    instance.indexer_proxies?.data?.flatMap((proxy) => proxy.tags ?? []),
    instance.download_clients?.data?.flatMap((downloadClient) => downloadClient.tags ?? []),
  );
}

/**
 * Ensures the tag labels listed under `prowlarr.<instance>.tags` exist.
 * Unmanaged deletes run later via `deleteUnmanagedTags` so tagged apps/indexers
 * can be removed first (Prowlarr returns 409 while a tag is still in use).
 */
export async function syncTags(
  client: TagsClient,
  instance: InputConfigProwlarrInstance,
  serverCache: ServerCache,
): Promise<TagSyncResult> {
  const result: TagSyncResult = { added: 0, removed: 0, diffEntries: [] };
  const desired = instance.tags ?? [];

  if (desired.length === 0) {
    return result;
  }

  const { missing } = resolveTagNames(desired, serverCache.tags);
  const { created } = await ensureTags(client, serverCache, desired);

  for (const label of created) {
    logger.info(`Created tag: '${label}'`);
  }

  // A dry run creates nothing, so the report still lists the labels it would have created.
  // Dedupe case-insensitively so the dry run lists the same labels the real run would create.
  const createdLabels = getEnvs().DRY_RUN ? [...collectTagLabels(missing)] : created;
  for (const label of createdLabels) {
    result.diffEntries.push({ resourceType: "Tag", name: label, action: "create" });
    result.added++;
  }

  return result;
}

/** Deletes server tags that are neither listed, ignored, nor referenced by remaining YAML resources. */
export async function deleteUnmanagedTags(
  client: TagsClient,
  instance: InputConfigProwlarrInstance,
  serverCache: ServerCache,
): Promise<TagSyncResult> {
  const deleteConfig = instance.delete_unmanaged_tags;
  if (!deleteConfig?.enabled) {
    return { added: 0, removed: 0, diffEntries: [] };
  }

  // Every tag-bearing Prowlarr resource is managed, so a tag still in use is a real error.
  return deleteUnmanagedTagsOnServer(client, serverCache, {
    keep: new Set<string>([...collectTagLabels(instance.tags, deleteConfig.ignore), ...referencedTagNames(instance)]),
    keepIds: collectTagIds(
      instance.applications?.data?.flatMap((application) => application.tags ?? []),
      instance.indexers?.data?.flatMap((indexer) => indexer.tags ?? []),
      instance.indexer_proxies?.data?.flatMap((proxy) => proxy.tags ?? []),
      instance.download_clients?.data?.flatMap((downloadClient) => downloadClient.tags ?? []),
    ),
    onInUse: "throw",
  });
}
