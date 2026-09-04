import { KyHttpClient } from "../ky-client";
import { Api } from "../__generated__/prowlarr/Api";
import {
  ApplicationResource,
  AppProfileResource,
  CommandResource,
  IndexerProxyResource,
  IndexerResource,
  TagResource,
} from "../__generated__/prowlarr/data-contracts";
import { logger } from "../logger";
import type { DownloadClientResource } from "../types/download-client.types";
import { IArrClient, logConnectionError, validateClientParams } from "./unified-client";

const NOT_SUPPORTED = (feature: string) => new Error(`${feature} is not supported for Prowlarr`);

/**
 * Prowlarr client.
 *
 * Prowlarr is an indexer manager, not a media manager: it has no quality profiles,
 * custom formats, quality definitions, naming, media management, root folders,
 * metadata profiles, delay profiles or languages. Those `IArrClient` members are
 * implemented as throwing stubs and are never called by the Prowlarr pipeline.
 *
 * Download client sync is shared/generic (see `downloadClients/`) and works through
 * the methods below. Application sync is Prowlarr-specific and uses the concrete
 * `getApplications*` / `*Application` methods via `getSpecificClient("PROWLARR")`.
 */
export class ProwlarrClient implements IArrClient {
  private api!: Api<unknown>;

  constructor(baseUrl: string, apiKey: string) {
    this.initialize(baseUrl, apiKey);
  }

  private initialize(baseUrl: string, apiKey: string) {
    validateClientParams(baseUrl, apiKey, "PROWLARR");

    const httpClient = new KyHttpClient({
      headers: {
        "X-Api-Key": apiKey,
      },
      prefix: baseUrl,
    });

    this.api = new Api(httpClient);
  }

  // ---------------------------------------------------------------------------
  // Applications (Prowlarr-specific)
  // ---------------------------------------------------------------------------

  async getApplicationSchema(): Promise<ApplicationResource[]> {
    return this.api.v1ApplicationsSchemaList();
  }

  async getApplications(): Promise<ApplicationResource[]> {
    return this.api.v1ApplicationsList();
  }

  async createApplication(application: ApplicationResource): Promise<ApplicationResource> {
    return this.api.v1ApplicationsCreate(application);
  }

  async updateApplication(id: string, application: ApplicationResource): Promise<ApplicationResource> {
    return this.api.v1ApplicationsUpdate(id, application);
  }

  async deleteApplication(id: string): Promise<void> {
    return this.api.v1ApplicationsDelete(+id);
  }

  async testApplication(application: ApplicationResource): Promise<any> {
    return this.api.v1ApplicationsTestCreate(application);
  }

  /**
   * Trigger Prowlarr's global "Sync App Indexers" command so it pushes its indexer
   * list to every configured application. Command names are runtime strings and are
   * not part of the OpenAPI spec.
   */
  async syncAppIndexers(): Promise<CommandResource> {
    return this.api.v1CommandCreate({ name: "ApplicationIndexerSync" });
  }

  // ---------------------------------------------------------------------------
  // Indexers (Prowlarr-specific)
  // ---------------------------------------------------------------------------

  async getIndexerSchema(): Promise<IndexerResource[]> {
    return this.api.v1IndexerSchemaList();
  }

  async getIndexers(): Promise<IndexerResource[]> {
    return this.api.v1IndexerList();
  }

  async createIndexer(indexer: IndexerResource): Promise<IndexerResource> {
    return this.api.v1IndexerCreate(indexer);
  }

  async updateIndexer(id: string, indexer: IndexerResource): Promise<IndexerResource> {
    return this.api.v1IndexerUpdate(id, indexer);
  }

  async deleteIndexer(id: string): Promise<void> {
    return this.api.v1IndexerDelete(+id);
  }

  async testIndexer(indexer: IndexerResource): Promise<any> {
    return this.api.v1IndexerTestCreate(indexer);
  }

  async getAppProfiles(): Promise<AppProfileResource[]> {
    return this.api.v1AppprofileList();
  }

  // ---------------------------------------------------------------------------
  // Indexer proxies (Prowlarr-specific)
  // ---------------------------------------------------------------------------

  async getIndexerProxySchema(): Promise<IndexerProxyResource[]> {
    return this.api.v1IndexerproxySchemaList();
  }

  async getIndexerProxies(): Promise<IndexerProxyResource[]> {
    return this.api.v1IndexerproxyList();
  }

  async createIndexerProxy(proxy: IndexerProxyResource): Promise<IndexerProxyResource> {
    return this.api.v1IndexerproxyCreate(proxy);
  }

  async updateIndexerProxy(id: string, proxy: IndexerProxyResource): Promise<IndexerProxyResource> {
    return this.api.v1IndexerproxyUpdate(id, proxy);
  }

  async deleteIndexerProxy(id: string): Promise<void> {
    return this.api.v1IndexerproxyDelete(+id);
  }

  async testIndexerProxy(proxy: IndexerProxyResource): Promise<any> {
    return this.api.v1IndexerproxyTestCreate(proxy);
  }

  // ---------------------------------------------------------------------------
  // Download Clients (shared/generic sync)
  // ---------------------------------------------------------------------------

  async getDownloadClientSchema(): Promise<DownloadClientResource[]> {
    return this.api.v1DownloadclientSchemaList() as unknown as Promise<DownloadClientResource[]>;
  }

  async getDownloadClients(): Promise<DownloadClientResource[]> {
    return this.api.v1DownloadclientList() as unknown as Promise<DownloadClientResource[]>;
  }

  async createDownloadClient(client: DownloadClientResource): Promise<DownloadClientResource> {
    return this.api.v1DownloadclientCreate(client as any) as unknown as Promise<DownloadClientResource>;
  }

  async updateDownloadClient(id: string, client: DownloadClientResource): Promise<DownloadClientResource> {
    return this.api.v1DownloadclientUpdate(id, client as any) as unknown as Promise<DownloadClientResource>;
  }

  async deleteDownloadClient(id: string): Promise<void> {
    return this.api.v1DownloadclientDelete(+id);
  }

  async testDownloadClient(client: DownloadClientResource): Promise<any> {
    return this.api.v1DownloadclientTestCreate(client as any);
  }

  // ---------------------------------------------------------------------------
  // Tags
  // ---------------------------------------------------------------------------

  async getTags() {
    return this.api.v1TagList();
  }

  async createTag(tag: TagResource) {
    return this.api.v1TagCreate(tag);
  }

  async deleteTag(id: string): Promise<void> {
    return this.api.v1TagDelete(+id);
  }

  // ---------------------------------------------------------------------------
  // System / Health
  // ---------------------------------------------------------------------------

  getSystemStatus() {
    return this.api.v1SystemStatusList();
  }

  async testConnection() {
    try {
      await this.api.v1HealthList();
    } catch (error) {
      const message = logConnectionError(error, "PROWLARR");
      logger.error(message);
      return false;
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // Unsupported media-manager features (never called for Prowlarr)
  // ---------------------------------------------------------------------------

  getLanguages(): Promise<any> {
    throw NOT_SUPPORTED("Languages");
  }

  getQualityDefinitions(): Promise<any> {
    throw NOT_SUPPORTED("Quality definitions");
  }

  updateQualityDefinitions(): Promise<any> {
    throw NOT_SUPPORTED("Quality definitions");
  }

  getQualityProfiles(): Promise<any> {
    throw NOT_SUPPORTED("Quality profiles");
  }

  createQualityProfile(): Promise<any> {
    throw NOT_SUPPORTED("Quality profiles");
  }

  updateQualityProfile(): Promise<any> {
    throw NOT_SUPPORTED("Quality profiles");
  }

  deleteQualityProfile(): Promise<void> {
    throw NOT_SUPPORTED("Quality profiles");
  }

  getCustomFormats(): Promise<any> {
    throw NOT_SUPPORTED("Custom formats");
  }

  createCustomFormat(): Promise<any> {
    throw NOT_SUPPORTED("Custom formats");
  }

  updateCustomFormat(): Promise<any> {
    throw NOT_SUPPORTED("Custom formats");
  }

  deleteCustomFormat(): Promise<void> {
    throw NOT_SUPPORTED("Custom formats");
  }

  getNaming(): Promise<any> {
    throw NOT_SUPPORTED("Naming");
  }

  updateNaming(): Promise<any> {
    throw NOT_SUPPORTED("Naming");
  }

  getMediamanagement(): Promise<any> {
    throw NOT_SUPPORTED("Media management");
  }

  updateMediamanagement(): Promise<any> {
    throw NOT_SUPPORTED("Media management");
  }

  getRootfolders(): Promise<any> {
    throw NOT_SUPPORTED("Root folders");
  }

  addRootFolder(): Promise<any> {
    throw NOT_SUPPORTED("Root folders");
  }

  updateRootFolder(): Promise<any> {
    throw NOT_SUPPORTED("Root folders");
  }

  deleteRootFolder(): Promise<any> {
    throw NOT_SUPPORTED("Root folders");
  }

  getDelayProfiles(): Promise<any> {
    throw NOT_SUPPORTED("Delay profiles");
  }

  createDelayProfile(): Promise<any> {
    throw NOT_SUPPORTED("Delay profiles");
  }

  updateDelayProfile(): Promise<any> {
    throw NOT_SUPPORTED("Delay profiles");
  }

  deleteDelayProfile(): Promise<any> {
    throw NOT_SUPPORTED("Delay profiles");
  }

  // Client-specific extras shared by the media *arr clients. Prowlarr has none of
  // these endpoints; present only so `getSpecificClient()`'s union stays structural.
  getUiConfig(): Promise<any> {
    throw NOT_SUPPORTED("UI config");
  }

  updateUiConfig(): Promise<any> {
    throw NOT_SUPPORTED("UI config");
  }

  getDownloadClientConfig(): Promise<any> {
    throw NOT_SUPPORTED("Download client config");
  }

  updateDownloadClientConfig(): Promise<any> {
    throw NOT_SUPPORTED("Download client config");
  }

  getRemotePathMappings(): Promise<any> {
    throw NOT_SUPPORTED("Remote path mappings");
  }

  createRemotePathMapping(): Promise<any> {
    throw NOT_SUPPORTED("Remote path mappings");
  }

  updateRemotePathMapping(): Promise<any> {
    throw NOT_SUPPORTED("Remote path mappings");
  }

  deleteRemotePathMapping(): Promise<any> {
    throw NOT_SUPPORTED("Remote path mappings");
  }
}
