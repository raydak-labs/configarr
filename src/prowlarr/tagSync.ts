import { ServerCache } from "../cache";
import { getSpecificClient } from "../clients/unified-client";
import { DiffEntry } from "../diffReport/diffReport.types";
import { getEnvs } from "../env";
import { logger } from "../logger";
import { InputConfigProwlarrInstance } from "../types/config.types";

export interface TagSyncResult {
  added: number;
  removed: number;
  diffEntries: DiffEntry[];
}

/** Tag labels referenced by any managed Prowlarr resource in the instance config. */
function referencedTagNames(instance: InputConfigProwlarrInstance): Set<string> {
  const names = new Set<string>();
  const collect = (tags?: (string | number)[]) => {
    for (const t of tags ?? []) {
      if (typeof t === "string") names.add(t.toLowerCase());
    }
  };
  instance.applications?.data?.forEach((a) => collect(a.tags));
  instance.indexers?.data?.forEach((i) => collect(i.tags));
  instance.indexer_proxies?.data?.forEach((p) => collect(p.tags));
  instance.download_clients?.data?.forEach((d) => collect(d.tags));
  return names;
}

/**
 * Ensures the tag labels listed under `prowlarr.<instance>.tags` exist, and
 * (optionally) deletes server tags that are neither listed nor referenced by a
 * managed resource.
 *
 * A failed create or delete throws: provider resources reference tags by name, so
 * continuing would silently sync them with the wrong tags.
 */
export async function syncTags(instance: InputConfigProwlarrInstance, serverCache: ServerCache): Promise<TagSyncResult> {
  const desired = instance.tags ?? [];
  const deleteConfig = instance.delete_unmanaged_tags;
  const result: TagSyncResult = { added: 0, removed: 0, diffEntries: [] };

  if (desired.length === 0 && !deleteConfig?.enabled) {
    return result;
  }

  const api = getSpecificClient("PROWLARR");
  const dryRun = getEnvs().DRY_RUN;

  const existingByLabel = new Map<string, { id?: number; label?: string | null }>();
  for (const tag of serverCache.tags) {
    if (tag.label) existingByLabel.set(tag.label.toLowerCase(), tag);
  }

  for (const label of desired) {
    if (existingByLabel.has(label.toLowerCase())) continue;

    if (dryRun) {
      logger.info(`DryRun: Would create tag '${label}'.`);
      result.diffEntries.push({ resourceType: "Tag", name: label, action: "create" });
      result.added++;
      continue;
    }
    try {
      const created = await api.createTag({ label });
      serverCache.tags.push(created);
      existingByLabel.set(label.toLowerCase(), created);
      result.diffEntries.push({ resourceType: "Tag", name: label, action: "create" });
      result.added++;
      logger.info(`Created tag: '${label}' (ID: ${created.id})`);
    } catch (error: unknown) {
      const message = `Failed to create tag '${label}': ${error instanceof Error ? error.message : String(error)}`;
      logger.error(message);
      throw new Error(message);
    }
  }

  if (deleteConfig?.enabled) {
    const keep = new Set<string>([
      ...desired.map((t) => t.toLowerCase()),
      ...(deleteConfig.ignore ?? []).map((t) => t.toLowerCase()),
      ...referencedTagNames(instance),
    ]);

    const deletedIds = new Set<number>();
    for (const tag of serverCache.tags) {
      const label = tag.label ?? "";
      if (!label || keep.has(label.toLowerCase()) || tag.id == null) continue;

      if (dryRun) {
        logger.info(`DryRun: Would delete unmanaged tag '${label}'.`);
        result.diffEntries.push({ resourceType: "Tag", name: label, action: "delete" });
        result.removed++;
        continue;
      }
      try {
        await api.deleteTag(tag.id.toString());
        deletedIds.add(tag.id);
        result.diffEntries.push({ resourceType: "Tag", name: label, action: "delete" });
        result.removed++;
        logger.info(`Deleted unmanaged tag: '${label}'`);
      } catch (error: unknown) {
        const message = `Failed to delete tag '${label}': ${error instanceof Error ? error.message : String(error)}`;
        logger.error(message);
        throw new Error(message);
      }
    }
    serverCache.tags = serverCache.tags.filter((t) => t.id == null || !deletedIds.has(t.id));
  }

  return result;
}
