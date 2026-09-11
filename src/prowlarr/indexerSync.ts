import type { AppProfileResource } from "../__generated__/prowlarr/data-contracts";
import { InputConfigIndexer, InputConfigIndexerSchema } from "../types/config.types";
import { ExtraProp, ProviderResourceSync } from "./providerResourceSync";
import { IndexerResource } from "./types";

type IndexerCtx = { appProfiles: AppProfileResource[] };

const DEFAULT_PRIORITY = 25;

/**
 * Syncs Prowlarr indexers. Config entries are based on a schema `definitionName`
 * (e.g. "1337x") and matched to the server by display `name`. Carries `enable`,
 * `priority` and `appProfileId` (resolved from an app-profile name).
 */
export class IndexerSync extends ProviderResourceSync<InputConfigIndexer, IndexerResource, IndexerCtx> {
  protected readonly label = "Indexer";
  protected readonly configSchema = InputConfigIndexerSchema;

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

  protected readonly extras: ExtraProp<InputConfigIndexer, IndexerCtx>[] = [
    { serverKey: "enable", fromConfig: (c) => c.enable, specified: (c) => c.enable !== undefined, fallback: () => true },
    { serverKey: "priority", fromConfig: (c) => c.priority, specified: (c) => c.priority !== undefined, fallback: () => DEFAULT_PRIORITY },
    {
      serverKey: "appProfileId",
      fromConfig: (c, ctx) => this.resolveAppProfileId(c, ctx),
      specified: (c) => c.app_profile !== undefined,
      fallback: (c, ctx) => this.defaultAppProfileId(c, ctx),
    },
  ];

  /**
   * Throws on an unknown name rather than falling back: silently picking another
   * profile would bind the indexer to the wrong sync rules.
   */
  private resolveAppProfileId(config: InputConfigIndexer, ctx: IndexerCtx): number | undefined {
    if (!config.app_profile) return undefined;

    const match = ctx.appProfiles.find((p) => p.name?.toLowerCase() === config.app_profile!.toLowerCase());
    if (!match?.id) {
      const available = ctx.appProfiles.map((p) => p.name).filter(Boolean);
      throw new Error(
        `App profile '${config.app_profile}' not found for Indexer '${config.name}'. Available: ${available.length > 0 ? available.join(", ") : "none"}`,
      );
    }
    return match.id;
  }

  private defaultAppProfileId(config: InputConfigIndexer, ctx: IndexerCtx): number {
    const id = ctx.appProfiles.find((p) => p.id != null)?.id;
    if (id == null) {
      throw new Error(`No app profile available on Prowlarr for Indexer '${config.name}'. Create one in Prowlarr or set 'app_profile'.`);
    }
    return id;
  }

  protected async loadContext(): Promise<IndexerCtx> {
    return { appProfiles: await this.apiClient.getAppProfiles() };
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

  protected findTemplate(config: InputConfigIndexer, schema: IndexerResource[]) {
    // `definition` may be the schema `definitionName` ("thepiratebay") or the
    // human-facing schema `name` ("The Pirate Bay").
    const wanted = config.definition.toLowerCase();
    return schema.find((s) => s.definitionName?.toLowerCase() === wanted) ?? schema.find((s) => s.name?.toLowerCase() === wanted);
  }
  protected templateHint(config: InputConfigIndexer) {
    return config.definition;
  }
  protected configKey(config: InputConfigIndexer) {
    return config.name;
  }
  protected serverKey(server: IndexerResource) {
    return server.name ?? "";
  }
}
