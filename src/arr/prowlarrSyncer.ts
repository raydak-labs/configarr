import { ServerCache } from "../cache";
import { getClient } from "../clients/client";
import { DiffCollector } from "../diffReport/diffCollector";
import { InstanceDiffReport } from "../diffReport/diffReport.types";
import { ProwlarrDownloadClientSync } from "../downloadClients/downloadClientProwlarr";
import { logger } from "../logger";
import { syncProwlarrProviders } from "../prowlarr/prowlarrSyncer";
import { deleteUnmanagedInstanceTags } from "../tags/tags";
import { loadServerTags } from "../tags/tags";
import { InputConfigNotificationsSchema, InputConfigProwlarrInstance } from "../types/config.types";
import { ConfigValidationError } from "../validation";
import { validateNotifications, syncNotifications } from "../notifications/notifications";

export class ProwlarrSyncer {
  /**
   * Run synchronization for a Prowlarr instance across providers, download clients, notifications, and tags.
   * Returns the accumulated instance diff report, or throws a ConfigValidationError if configuration is invalid.
   */
  async run(instance: InputConfigProwlarrInstance, instanceName: string): Promise<InstanceDiffReport> {
    if (instance.indexer_config !== undefined) {
      throw new ConfigValidationError("indexer_config is not supported on Prowlarr");
    }

    const client = getClient("PROWLARR");
    const diffCollector = new DiffCollector();

    const system = await client.getSystemStatus();
    logger.info(`System status: ${JSON.stringify(system)}`);

    if (instance.notifications !== undefined) {
      const parsed = InputConfigNotificationsSchema.safeParse(instance.notifications);
      if (!parsed.success) {
        throw new ConfigValidationError(`Invalid notifications configuration: ${parsed.error.message}`);
      }
      instance.notifications = parsed.data;
      await validateNotifications(client, instance.notifications);
    }

    // ServerCache is media-manager shaped; Prowlarr only needs its tags and download-client schema slots.
    const serverCache = new ServerCache();
    serverCache.tags = await loadServerTags(client);

    diffCollector.add(await syncProwlarrProviders(client, instance, serverCache));

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
        if (err instanceof ConfigValidationError) {
          throw err;
        }
        downloadClientsFailed = true;
      }
    }

    if (instance.notifications) {
      diffCollector.add(await syncNotifications(client, instance.notifications, serverCache));
    }

    if (instance.delete_unmanaged_tags?.enabled) {
      if (downloadClientsFailed) {
        // A client that survived its own sync may still hold a tag this run would drop,
        // and Prowlarr 409s while a tag is in use.
        logger.warn(`Skipping unmanaged tag cleanup: download client sync reported failures.`);
      } else {
        serverCache.tags = await loadServerTags(client);
        // Every tag-bearing Prowlarr resource is managed, so a 409 is a real error.
        diffCollector.add(
          (
            await deleteUnmanagedInstanceTags(client, serverCache, {
              deleteConfig: instance.delete_unmanaged_tags,
              instanceLabels: instance.tags,
              referencedTagLists: [
                instance.applications?.data?.flatMap((application) => application.tags ?? []),
                instance.indexers?.data?.flatMap((indexer) => indexer.tags ?? []),
                instance.indexer_proxies?.data?.flatMap((proxy) => proxy.tags ?? []),
                instance.download_clients?.data?.flatMap((downloadClient) => downloadClient.tags ?? []),
                instance.notifications?.data?.flatMap((notification) => notification.tags ?? []),
              ],
              onInUse: "throw",
            })
          ).diffEntries,
        );
      }
    }

    return { arrType: "PROWLARR", instanceName, entries: diffCollector.getEntries() };
  }
}
