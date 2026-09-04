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

  // Create missing
  const failed: string[] = [];
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
      failed.push(label);
      logger.error(`Failed to create tag '${label}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failed.length > 0) {
    // Non-fatal: a resource that actually needs a missing tag still fails its own
    // create/update in ProviderResourceSync.createMissingTags. Surface it here too.
    logger.warn(`Could not create ${failed.length} Prowlarr tag(s): ${failed.join(", ")}`);
  }

  // Delete unmanaged
  if (deleteConfig?.enabled) {
    const keep = new Set<string>([
      ...desired.map((t) => t.toLowerCase()),
      ...(deleteConfig.ignore ?? []).map((t) => t.toLowerCase()),
      ...referencedTagNames(instance),
    ]);

    for (const tag of [...serverCache.tags]) {
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
        serverCache.tags = serverCache.tags.filter((t) => t.id !== tag.id);
        result.diffEntries.push({ resourceType: "Tag", name: label, action: "delete" });
        result.removed++;
        logger.info(`Deleted unmanaged tag: '${label}'`);
      } catch (error: unknown) {
        logger.error(`Failed to delete tag '${label}': ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  return result;
}
