import { ServerCache } from "../cache";
import { DiffEntry } from "../diffReport/diffReport.types";
import { logger } from "../logger";
import { InputConfigProwlarrInstance } from "../types/config.types";
import { ApplicationSync } from "./applicationSync";
import { IndexerProxySync } from "./indexerProxySync";
import { IndexerSync } from "./indexerSync";
import { syncTags } from "./tagSync";

export interface ProwlarrProvidersResult {
  diffEntries: DiffEntry[];
  indexersSynced: boolean;
}

/**
 * Runs the Prowlarr provider-resource syncs for one instance, in dependency order:
 * tags first (so the rest can reference them), then indexer proxies, indexers and
 * applications. Download clients are handled separately by the shared syncer.
 */
export async function syncProwlarrProviders(
  instance: InputConfigProwlarrInstance,
  serverCache: ServerCache,
): Promise<ProwlarrProvidersResult> {
  const diffEntries: DiffEntry[] = [];
  let indexersSynced = false;

  try {
    const tagResult = await syncTags(instance, serverCache);
    diffEntries.push(...tagResult.diffEntries);
  } catch (err: any) {
    logger.error(`Failed to sync Prowlarr tags: ${err.message}`);
  }

  if (instance.indexer_proxies?.data || instance.indexer_proxies?.delete_unmanaged?.enabled) {
    try {
      const result = await new IndexerProxySync().sync(
        instance.indexer_proxies.data ?? [],
        instance.indexer_proxies.delete_unmanaged,
        serverCache,
      );
      diffEntries.push(...result.diffEntries);
    } catch (err: any) {
      logger.error(`Failed to sync Prowlarr indexer proxies: ${err.message}`);
    }
  }

  if (instance.indexers?.data || instance.indexers?.delete_unmanaged?.enabled) {
    try {
      const result = await new IndexerSync().sync(instance.indexers.data ?? [], instance.indexers.delete_unmanaged, serverCache);
      diffEntries.push(...result.diffEntries);
    } catch (err: any) {
      logger.error(`Failed to sync Prowlarr indexers: ${err.message}`);
    }
  }

  if (instance.applications?.data || instance.applications?.delete_unmanaged?.enabled || instance.applications?.sync_indexers) {
    try {
      const result = await new ApplicationSync().syncApplications(instance, serverCache);
      diffEntries.push(...result.diffEntries);
      indexersSynced = result.indexersSynced;
    } catch (err: any) {
      logger.error(`Failed to sync Prowlarr applications: ${err.message}`);
    }
  }

  return { diffEntries, indexersSynced };
}
