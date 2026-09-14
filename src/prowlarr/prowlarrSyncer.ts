import { ServerCache } from "../cache";
import { DiffEntry } from "../diffReport/diffReport.types";
import { InputConfigProwlarrInstance } from "../types/config.types";
import { ApplicationSync } from "./applicationSync";
import { IndexerProxySync } from "./indexerProxySync";
import { IndexerSync } from "./indexerSync";
import { syncTags } from "./tagSync";

/**
 * Runs the Prowlarr provider-resource syncs for one instance, in dependency order:
 * tags first (so the rest can reference them), then indexer proxies, indexers and
 * applications. Each sync no-ops when its section is absent. Download clients are
 * handled separately by the shared syncer.
 *
 * Failures are fatal: these resources are the whole Prowlarr run, so an error here
 * must fail the instance (and honour `STOP_ON_ERROR`) instead of being logged away.
 */
export async function syncProwlarrProviders(instance: InputConfigProwlarrInstance, serverCache: ServerCache): Promise<DiffEntry[]> {
  const { indexer_proxies: proxies, indexers, applications } = instance;
  const diffEntries: DiffEntry[] = [];

  const collect = (result: { diffEntries: DiffEntry[] }) => diffEntries.push(...result.diffEntries);

  collect(await syncTags(instance, serverCache));
  collect(await new IndexerProxySync().sync(proxies?.data ?? [], proxies?.delete_unmanaged, serverCache));
  collect(await new IndexerSync().sync(indexers?.data ?? [], indexers?.delete_unmanaged, serverCache));
  collect(await new ApplicationSync().syncApplications(applications, serverCache));

  return diffEntries;
}
