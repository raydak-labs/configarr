import { KyHttpClient } from "../ky-client";
import { Api } from "../__generated__/prowlarr/Api";
import {
  ApplicationResource,
  AppProfileResource,
  CommandResource,
  DownloadClientResource,
  IndexerProxyResource,
  IndexerResource,
  TagResource,
} from "../__generated__/prowlarr/data-contracts";
import { logger } from "../logger";
import { logConnectionError, validateClientParams } from "./connection";
import { DownloadClientsClient, SystemClient, TagsClient } from "./capabilities";

/**
 * Prowlarr is an indexer manager, not a media manager. It implements System, Tags,
 * and DownloadClients plus Prowlarr-only application, indexer, and proxy APIs.
 */
export class ProwlarrClient implements SystemClient, TagsClient<TagResource>, DownloadClientsClient<DownloadClientResource> {
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

  /**
   * Trigger Prowlarr's global "Sync App Indexers" command so it pushes its indexer
   * list to every configured application. Command names are runtime strings and are
   * not part of the OpenAPI spec.
   */
  async syncAppIndexers(): Promise<CommandResource> {
    return this.api.v1CommandCreate({ name: "ApplicationIndexerSync" });
  }

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

  async getAppProfiles(): Promise<AppProfileResource[]> {
    return this.api.v1AppprofileList();
  }

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

  async getDownloadClientSchema(): Promise<DownloadClientResource[]> {
    return this.api.v1DownloadclientSchemaList();
  }

  async getDownloadClients(): Promise<DownloadClientResource[]> {
    return this.api.v1DownloadclientList();
  }

  async createDownloadClient(client: DownloadClientResource): Promise<DownloadClientResource> {
    return this.api.v1DownloadclientCreate(client);
  }

  async updateDownloadClient(id: string, client: DownloadClientResource): Promise<DownloadClientResource> {
    return this.api.v1DownloadclientUpdate(id, client);
  }

  async deleteDownloadClient(id: string): Promise<void> {
    return this.api.v1DownloadclientDelete(+id);
  }

  async testDownloadClient(client: DownloadClientResource): Promise<unknown> {
    return this.api.v1DownloadclientTestCreate(client);
  }

  async getTags() {
    return this.api.v1TagList();
  }

  async createTag(tag: TagResource) {
    return this.api.v1TagCreate(tag);
  }

  async deleteTag(id: string): Promise<void> {
    return this.api.v1TagDelete(+id);
  }

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
}
