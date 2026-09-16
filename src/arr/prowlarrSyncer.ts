import { ServerCache } from "../cache";
import { getClient } from "../clients/client";
import { DiffCollector } from "../diffReport/diffCollector";
import { InstanceDiffReport } from "../diffReport/diffReport.types";
import { syncDownloadClients } from "../downloadClients/downloadClientSyncer";
import { logger } from "../logger";
import { syncProwlarrProviders } from "../prowlarr/prowlarrSyncer";
import { loadServerTags } from "../tags/tags";
import { InputConfigProwlarrInstance } from "../types/config.types";

export class ProwlarrSyncer {
  async run(instance: InputConfigProwlarrInstance, instanceName: string): Promise<InstanceDiffReport> {
    const api = getClient("PROWLARR");
    const diffCollector = new DiffCollector();

    const system = await api.getSystemStatus();
    logger.info(`System status: ${JSON.stringify(system)}`);

    // ServerCache is media-manager shaped; Prowlarr only needs its tags and download-client schema slots.
    const serverCache = new ServerCache();
    serverCache.tags = await loadServerTags("PROWLARR");

    diffCollector.add(await syncProwlarrProviders(instance, serverCache));

    if (instance.download_clients?.data || instance.download_clients?.delete_unmanaged?.enabled) {
      try {
        const downloadClientsResult = await syncDownloadClients("PROWLARR", { download_clients: instance.download_clients }, serverCache);
        diffCollector.add(downloadClientsResult.diffEntries);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Failed to sync download clients: ${message}`);
      }
    }

    return { arrType: "PROWLARR", instanceName, entries: diffCollector.getEntries() };
  }
}
