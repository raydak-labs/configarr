import type { ServerCache } from "../cache";
import type { TagsClient } from "../clients/capabilities";
import type { TagSyncResult } from "../tags/tag.types";
import { collectTagIds, collectTagLabels, deleteUnmanagedTags as deleteUnmanagedTagsOnServer, syncInstanceTags } from "../tags/tags";
import type { InputConfigProwlarrInstance } from "../types/config.types";

/** Every `tags` list in a Prowlarr instance config, in the shape the shared keep-set wants. */
function referencedTagLists(instance: InputConfigProwlarrInstance): (string | number)[][] {
  return [
    instance.applications?.data?.flatMap((application) => application.tags ?? []) ?? [],
    instance.indexers?.data?.flatMap((indexer) => indexer.tags ?? []) ?? [],
    instance.indexer_proxies?.data?.flatMap((proxy) => proxy.tags ?? []) ?? [],
    instance.download_clients?.data?.flatMap((downloadClient) => downloadClient.tags ?? []) ?? [],
  ];
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
  return syncInstanceTags(client, serverCache, instance.tags);
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

  const referenced = referencedTagLists(instance);

  // Every tag-bearing Prowlarr resource is managed, so a tag still in use is a real error.
  return deleteUnmanagedTagsOnServer(client, serverCache, {
    keep: collectTagLabels(instance.tags, deleteConfig.ignore, ...referenced),
    keepIds: collectTagIds(...referenced),
    onInUse: "throw",
  });
}
