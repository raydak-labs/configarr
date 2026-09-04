import { z } from "zod";
import { ServerCache } from "../cache";
import { getEnvs } from "../env";
import { InputConfigApplication } from "../types/config.types";
import { ExtraProp, ProviderResourceSync, ProviderSyncOutcome, TagLike } from "./providerResourceSync";
import { ApplicationResource } from "./types";

const ApplicationConfigSchema = z.object({
  name: z.string().min(1, "Application name is required"),
  type: z.string().min(1, "Application type is required"),
  sync_level: z.enum(["disabled", "addOnly", "fullSync"]).optional(),
  fields: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.union([z.string().min(1), z.number().int().positive()])).optional(),
});

type ApplicationConfig = InputConfigApplication;
type NoCtx = Record<string, never>;

export interface ApplicationSyncOutcome extends ProviderSyncOutcome {
  indexersSynced: boolean;
}

/**
 * Syncs Prowlarr "Applications" - the Sonarr/Radarr/... instances Prowlarr pushes
 * its indexers to. Matched by `name` + `implementation`; adds a `syncLevel`.
 * Optionally triggers Prowlarr's global "Sync App Indexers" command afterwards.
 */
export class ApplicationSync extends ProviderResourceSync<ApplicationConfig, ApplicationResource> {
  protected readonly label = "Application";
  protected readonly configSchema = ApplicationConfigSchema;

  protected readonly extras: ExtraProp<ApplicationConfig, NoCtx>[] = [
    { serverKey: "syncLevel", fromConfig: (c) => c.sync_level ?? undefined, specified: (c) => c.sync_level !== undefined },
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

  protected findTemplate(config: ApplicationConfig, schema: ApplicationResource[]) {
    return schema.find((s) => s.implementation?.toLowerCase() === config.type.toLowerCase());
  }
  protected templateHint(config: ApplicationConfig) {
    return config.type;
  }
  protected matches(config: ApplicationConfig, server: ApplicationResource) {
    return config.name === server.name && config.type.toLowerCase() === server.implementation?.toLowerCase();
  }
  protected configKey(config: ApplicationConfig) {
    return `${config.name}::${config.type.toLowerCase()}`;
  }
  protected serverKey(server: ApplicationResource) {
    return `${server.name ?? ""}::${server.implementation?.toLowerCase() ?? ""}`;
  }

  async resolveConfig(
    config: ApplicationConfig,
    serverTags: TagLike[],
    ctx: NoCtx,
    server?: ApplicationResource,
    partialUpdate = false,
  ): Promise<ApplicationResource> {
    const payload = await super.resolveConfig(config, serverTags, ctx, server, partialUpdate);
    payload.syncLevel = (config.sync_level ?? server?.syncLevel ?? "fullSync") as ApplicationResource["syncLevel"];
    return payload;
  }

  /** Generic add/update/delete plus the optional post-sync "Sync App Indexers" trigger. */
  async syncApplications(
    config: {
      applications?: {
        data?: ApplicationConfig[];
        delete_unmanaged?: { enabled: boolean; ignore?: string[] };
        sync_indexers?: boolean;
      };
    },
    serverCache: ServerCache,
  ): Promise<ApplicationSyncOutcome> {
    const applications = config.applications;
    const configApps = applications?.data ?? [];
    const syncIndexers = applications?.sync_indexers ?? false;
    const deleteUnmanaged = applications?.delete_unmanaged;

    if (configApps.length === 0 && !deleteUnmanaged?.enabled && !syncIndexers) {
      this.logger.info("No applications configured and delete_unmanaged / sync_indexers not enabled, skipping");
      return { added: 0, updated: 0, removed: 0, indexersSynced: false, diffEntries: [] };
    }

    const outcome = await this.sync(configApps, deleteUnmanaged, serverCache);

    let indexersSynced = false;
    if (syncIndexers) {
      if (getEnvs().DRY_RUN) {
        this.logger.info("DryRun: Would trigger Prowlarr App Indexer sync.");
        outcome.diffEntries.push({ resourceType: "Application", name: "Sync App Indexers", action: "update" });
      } else {
        try {
          this.logger.info("Triggering Prowlarr App Indexer sync...");
          await this.apiClient.syncAppIndexers();
          indexersSynced = true;
          outcome.diffEntries.push({ resourceType: "Application", name: "Sync App Indexers", action: "update" });
          this.logger.info("Prowlarr App Indexer sync triggered");
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          // Non-fatal: the apps themselves synced, and Prowlarr also runs this command
          // on its own schedule / on app changes. `indexersSynced` stays false so the
          // diff report does not claim it happened.
          this.logger.error(`Failed to trigger Prowlarr App Indexer sync (continuing): ${errorMessage}`);
        }
      }
    }

    return { ...outcome, indexersSynced };
  }
}
