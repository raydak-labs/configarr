import { ServerCache } from "../cache";
import { DiffEntry } from "../diffReport/diffReport.types";
import { InputConfigProwlarrInstance } from "../types/config.types";
import { ApplicationSync } from "./applicationSync";
import { IndexerProxySync } from "./indexerProxySync";
import { IndexerSync } from "./indexerSync";
import { deleteUnmanagedSyncProfiles, syncSyncProfiles } from "./syncProfileSync";
import { syncTags } from "./tagSync";

/**
 * Runs the Prowlarr provider-resource syncs for one instance, in dependency order:
 * tags first (so the rest can reference them by name), then indexer
 * proxies (create/update), indexers and applications. Unmanaged proxy and sync-profile
 * deletes run after indexers so Prowlarr does not 500 while they are still referenced.
 * Unmanaged tag deletes run after download clients in `ProwlarrSyncer` so Prowlarr
 * does not 409 on tags still in use. Download clients are handled separately by the
 * shared syncer.
 *
 * Failures are fatal: these resources are the whole Prowlarr run, so an error here
 * must fail the instance (and honour `STOP_ON_ERROR`) instead of being logged away.
 */
export async function syncProwlarrProviders(instance: InputConfigProwlarrInstance, serverCache: ServerCache): Promise<DiffEntry[]> {
  const { sync_profiles: syncProfiles, indexer_proxies: proxies, indexers, applications } = instance;
  const diffEntries: DiffEntry[] = [];

  const collect = (result: { diffEntries: DiffEntry[] }) => diffEntries.push(...result.diffEntries);

  collect(await syncTags(instance, serverCache));

  const profileResult = await syncSyncProfiles(syncProfiles);
  collect(profileResult);

  const proxySyncer = new IndexerProxySync();
  collect(await proxySyncer.sync(proxies?.data ?? [], proxies?.delete_unmanaged, serverCache, { deferDeletes: true }));
  collect(await new IndexerSync(profileResult.profiles).sync(indexers?.data ?? [], indexers?.delete_unmanaged, serverCache));
  collect(await new ApplicationSync().syncApplications(applications, serverCache));
  collect(await proxySyncer.deleteUnmanaged(proxies?.data ?? [], proxies?.delete_unmanaged));
  collect(await deleteUnmanagedSyncProfiles(syncProfiles));

  return diffEntries;
}
