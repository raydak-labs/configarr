import { z } from "zod";
import type { AppProfileResource } from "../__generated__/prowlarr/data-contracts";
import { InputConfigIndexer } from "../types/config.types";
import { ExtraProp, ProviderResourceSync, TagLike } from "./providerResourceSync";
import { IndexerResource } from "./types";

const IndexerConfigSchema = z.object({
  name: z.string().min(1, "Indexer name is required"),
  definition: z.string().min(1, "Indexer definition is required"),
  enable: z.boolean().optional(),
  app_profile: z.string().optional(),
  priority: z.number().int().optional(),
  fields: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.union([z.string().min(1), z.number().int().positive()])).optional(),
});

type IndexerConfig = InputConfigIndexer;
type IndexerCtx = { appProfiles: AppProfileResource[] };

const DEFAULT_PRIORITY = 25;

/**
 * Syncs Prowlarr indexers. Config entries are based on a schema `definitionName`
 * (e.g. "1337x") and matched to the server by display `name`. Carries `enable`,
 * `priority` and `appProfileId` (resolved from an app-profile name).
 */
export class IndexerSync extends ProviderResourceSync<IndexerConfig, IndexerResource, IndexerCtx> {
  protected readonly label = "Indexer";
  protected readonly configSchema = IndexerConfigSchema;

  protected readonly templatePassthrough = [
    "protocol",
    "privacy",
    "language",
    "capabilities",
    "indexerUrls",
    "legacyUrls",
    "definitionName",
    "description",
    "supportsRss",
    "supportsSearch",
    "supportsRedirect",
    "supportsPagination",
    "redirect",
    "sortName",
  ];

  protected readonly extras: ExtraProp<IndexerConfig, IndexerCtx>[] = [
    { serverKey: "enable", fromConfig: (c) => c.enable ?? undefined, specified: (c) => c.enable !== undefined },
    { serverKey: "priority", fromConfig: (c) => c.priority ?? undefined, specified: (c) => c.priority !== undefined },
    {
      serverKey: "appProfileId",
      fromConfig: (c, ctx) => this.resolveAppProfileId(c, ctx),
      specified: (c) => c.app_profile !== undefined,
    },
  ];

  private resolveAppProfileId(config: IndexerConfig, ctx: IndexerCtx): number | undefined {
    if (!config.app_profile) return undefined;
    const match = ctx.appProfiles.find((p) => p.name?.toLowerCase() === config.app_profile!.toLowerCase());
    if (!match?.id) {
      this.logger.warn(`App profile '${config.app_profile}' not found for indexer '${config.name}'; using default`);
    }
    return match?.id;
  }

  protected async loadContext(): Promise<IndexerCtx> {
    try {
      return { appProfiles: await this.apiClient.getAppProfiles() };
    } catch {
      return { appProfiles: [] };
    }
  }

  protected fetchSchema() {
    return this.apiClient.getIndexerSchema();
  }
  protected fetchServer() {
    return this.apiClient.getIndexers();
  }
  protected createResource(payload: IndexerResource) {
    return this.apiClient.createIndexer(payload);
  }
  protected updateResource(id: string, payload: IndexerResource) {
    return this.apiClient.updateIndexer(id, payload);
  }
  protected deleteResource(id: string) {
    return this.apiClient.deleteIndexer(id);
  }

  protected findTemplate(config: IndexerConfig, schema: IndexerResource[]) {
    // `definition` may be the schema `definitionName` ("thepiratebay") or the
    // human-facing schema `name` ("The Pirate Bay").
    const wanted = config.definition.toLowerCase();
    return schema.find((s) => s.definitionName?.toLowerCase() === wanted) ?? schema.find((s) => s.name?.toLowerCase() === wanted);
  }
  protected templateHint(config: IndexerConfig) {
    return config.definition;
  }
  protected matches(config: IndexerConfig, server: IndexerResource) {
    return config.name === server.name;
  }
  protected configKey(config: IndexerConfig) {
    return config.name;
  }
  protected serverKey(server: IndexerResource) {
    return server.name ?? "";
  }

  async resolveConfig(
    config: IndexerConfig,
    serverTags: TagLike[],
    ctx: IndexerCtx,
    server?: IndexerResource,
    partialUpdate = false,
  ): Promise<IndexerResource> {
    const payload = await super.resolveConfig(config, serverTags, ctx, server, partialUpdate);

    payload.enable = config.enable ?? server?.enable ?? true;
    payload.priority = config.priority ?? server?.priority ?? DEFAULT_PRIORITY;
    payload.appProfileId = this.resolveAppProfileId(config, ctx) ?? server?.appProfileId ?? ctx.appProfiles.find((p) => p.id)?.id ?? 1;

    return payload;
  }
}
