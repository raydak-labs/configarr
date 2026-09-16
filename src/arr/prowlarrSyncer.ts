import { ServerCache } from "../cache";
import { getClient } from "../clients/client";
import { DiffCollector } from "../diffReport/diffCollector";
import { InstanceDiffReport } from "../diffReport/diffReport.types";
import { ProwlarrDownloadClientSync } from "../downloadClients/downloadClientProwlarr";
import { logger } from "../logger";
import { syncProwlarrProviders } from "../prowlarr/prowlarrSyncer";
import { deleteUnmanagedTags } from "../prowlarr/tagSync";
import { loadServerTags } from "../tags/tags";
import { InputConfigProwlarrInstance } from "../types/config.types";

export class ProwlarrSyncer {
  async run(instance: InputConfigProwlarrInstance, instanceName: string): Promise<InstanceDiffReport> {
    const client = getClient("PROWLARR");
    const diffCollector = new DiffCollector();

    const system = await client.getSystemStatus();
    logger.info(`System status: ${JSON.stringify(system)}`);

    // ServerCache is media-manager shaped; Prowlarr only needs its tags and download-client schema slots.
    const serverCache = new ServerCache();
    serverCache.tags = await loadServerTags(client);

    diffCollector.add(await syncProwlarrProviders(instance, serverCache));

    let downloadClientsFailed = false;
    if (instance.download_clients?.data || instance.download_clients?.delete_unmanaged?.enabled) {
      try {
        const downloadClientsSync = new ProwlarrDownloadClientSync(client);
        const downloadClientsResult = await downloadClientsSync.syncDownloadClients(
          { download_clients: instance.download_clients },
          serverCache,
        );
        diffCollector.add(downloadClientsResult.diffEntries);
        downloadClientsFailed = downloadClientsResult.failed > 0;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to sync download clients: ${message}`);
        downloadClientsFailed = true;
      }
    }

    if (instance.delete_unmanaged_tags?.enabled) {
      if (downloadClientsFailed) {
        // A client that survived its own sync may still hold a tag this run would drop,
        // and Prowlarr 409s while a tag is in use.
        logger.warn(`Skipping unmanaged tag cleanup: download client sync reported failures.`);
      } else {
        serverCache.tags = await loadServerTags(client);
        diffCollector.add((await deleteUnmanagedTags(instance, serverCache)).diffEntries);
      }
    }

    return { arrType: "PROWLARR", instanceName, entries: diffCollector.getEntries() };
  }
}
