import { InputConfigIndexer, InputConfigIndexerSchema } from "../types/config.types";
import { ExtraProp, ProviderResourceSync } from "./providerResourceSync";
import { AppProfileResource, IndexerResource } from "./types";

type IndexerCtx = { appProfiles: AppProfileResource[] };

const DEFAULT_PRIORITY = 25;

/**
 * Syncs Prowlarr indexers. Config entries are based on a schema `definitionName`
 * (e.g. "1337x") and matched to the server by display `name`. Carries `enable`,
 * `priority` and `appProfileId` (resolved from a sync-profile name).
 */
export class IndexerSync extends ProviderResourceSync<InputConfigIndexer, IndexerResource, IndexerCtx> {
  protected readonly label = "Indexer";
  protected readonly configSchema = InputConfigIndexerSchema;

  /**
   * @param syncedProfiles profiles as they will exist after this run, when the sync-profile
   * section ran first. Passing them lets an indexer reference a profile created in the same
   * run, which a fresh fetch would miss in a dry run.
   */
  constructor(private readonly syncedProfiles?: AppProfileResource[]) {
    super();
  }

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
      specified: (c) => c.sync_profile !== undefined,
      fallback: (c, ctx) => this.defaultAppProfileId(c, ctx),
    },
  ];

  /**
   * Throws on an unknown name rather than falling back: silently picking another
   * profile would bind the indexer to the wrong sync rules.
   *
   * A match without an id is a profile this dry run would create. Returning undefined
   * leaves `appProfileId` out of the comparison rather than inventing an id it cannot know.
   */
  private resolveAppProfileId(config: InputConfigIndexer, ctx: IndexerCtx): number | undefined {
    const wanted = config.sync_profile;
    if (!wanted) return undefined;

    const match = ctx.appProfiles.find((p) => p.name?.toLowerCase() === wanted.toLowerCase());
    if (!match) {
      const available = ctx.appProfiles.map((p) => p.name).filter(Boolean);
      throw new Error(
        `Sync profile '${wanted}' not found for Indexer '${config.name}'. Available: ${available.length > 0 ? available.join(", ") : "none"}`,
      );
    }
    if (match.id == null) {
      this.logger.debug(`Sync profile '${wanted}' for Indexer '${config.name}' does not exist yet, skipping its comparison`);
      return undefined;
    }
    return match.id;
  }

  private defaultAppProfileId(config: InputConfigIndexer, ctx: IndexerCtx): number {
    const id = ctx.appProfiles.find((p) => p.id != null)?.id;
    if (id == null) {
      throw new Error(
        `No sync profile available on Prowlarr for Indexer '${config.name}'. Add one under 'sync_profiles' or create one in Prowlarr.`,
      );
    }
    return id;
  }

  protected async loadContext(): Promise<IndexerCtx> {
    return { appProfiles: this.syncedProfiles ?? (await this.apiClient.getAppProfiles()) };
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
