import { ServerCache } from "../cache";
import { getEnvs } from "../env";
import { InputConfigApplication, InputConfigApplicationSchema, InputConfigProwlarrInstance } from "../types/config.types";
import { ExtraProp, ProviderResourceSync, ProviderSyncOutcome } from "./providerResourceSync";
import { ApplicationResource } from "./types";

type NoCtx = Record<string, never>;

/**
 * Syncs Prowlarr "Applications" - the Sonarr/Radarr/... instances Prowlarr pushes
 * its indexers to. Matched by `name` + `implementation`; adds a `syncLevel`.
 * Optionally triggers Prowlarr's global "Sync App Indexers" command afterwards.
 */
export class ApplicationSync extends ProviderResourceSync<InputConfigApplication, ApplicationResource> {
  protected readonly label = "Application";
  protected readonly configSchema = InputConfigApplicationSchema;

  protected readonly extras: ExtraProp<InputConfigApplication, NoCtx>[] = [
    {
      serverKey: "syncLevel",
      fromConfig: (c) => c.sync_level,
      specified: (c) => c.sync_level !== undefined,
      fallback: () => "fullSync",
    },
  ];

  protected fetchSchema() {
    return this.apiClient.getApplicationSchema();
  }
  protected fetchServer() {
    return this.apiClient.getApplications();
  }
  protected createResource(payload: ApplicationResource) {
    return this.apiClient.createApplication(payload);
  }
  protected updateResource(id: string, payload: ApplicationResource) {
    return this.apiClient.updateApplication(id, payload);
  }
  protected deleteResource(id: string) {
    return this.apiClient.deleteApplication(id);
  }

  protected findTemplate(config: InputConfigApplication, schema: ApplicationResource[]) {
    return schema.find((s) => s.implementation?.toLowerCase() === config.type.toLowerCase());
  }
  protected templateHint(config: InputConfigApplication) {
    return config.type;
  }
  protected configKey(config: InputConfigApplication) {
    return `${config.name}::${config.type.toLowerCase()}`;
  }
  protected serverKey(server: ApplicationResource) {
    return `${server.name ?? ""}::${server.implementation?.toLowerCase() ?? ""}`;
  }

  async syncApplications(
    applications: InputConfigProwlarrInstance["applications"],
    serverCache: ServerCache,
  ): Promise<ProviderSyncOutcome> {
    const outcome = await this.sync(applications?.data ?? [], applications?.delete_unmanaged, serverCache);

    if (!applications?.sync_indexers) {
      return outcome;
    }

    if (getEnvs().DRY_RUN) {
      this.logger.info("DryRun: Would trigger Prowlarr App Indexer sync.");
    } else {
      try {
        this.logger.info("Triggering Prowlarr App Indexer sync...");
        await this.apiClient.syncAppIndexers();
        this.logger.info("Prowlarr App Indexer sync triggered");
      } catch (error: unknown) {
        const message = `Failed to trigger Prowlarr App Indexer sync: ${error instanceof Error ? error.message : String(error)}`;
        // Fatal: the user explicitly asked for this with `sync_indexers: true`, so a
        // failure must fail the instance rather than report a successful run.
        this.logger.error(message);
        throw new Error(message);
      }
    }

    return outcome;
  }
}
