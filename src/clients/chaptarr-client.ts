import { Api } from "../__generated__/chaptarr/Api";
import {
  type CustomFormatResource,
  type DelayProfileResource,
  type DownloadClientConfigResource,
  type DownloadClientResource,
  type HostConfigResource,
  type IndexerConfigResource,
  LanguageResource,
  type MediaManagementConfigResource,
  type MetadataProfileResource,
  type NamingConfigResource,
  type NotificationResource,
  type QualityDefinitionResource,
  type ReleaseProfileResource,
  type RemotePathMappingResource,
  type RootFolderResource,
  type SystemResource,
  type TagResource,
  type UiConfigResource,
} from "../__generated__/chaptarr/data-contracts";
import type { ChaptarrCustomFormatRequest } from "../customFormats/customFormatChaptarr.types";
import { KyHttpClient } from "../ky-client";
import { logger } from "../logger";
import { type ChaptarrQualityProfileResource, normalizeQualityProfile } from "../qualityProfiles/qualityProfileChaptarr.types";
import type {
  CustomFormatsClient,
  DownloadClientsClient,
  MetadataProfilesClient,
  QualityDefinitionsClient,
  QualityProfilesClient,
  SystemClient,
  TagsClient,
} from "./capabilities";
import { forceSaveIfDisabled, logConnectionError, validateClientParams } from "./connection";
/** The shared mapping shape plus Chaptarr's optional client id; omitted means a global mapping. */
export type ChaptarrRemotePathMappingInput = Omit<RemotePathMappingResource, "downloadClientId"> & { downloadClientId?: number };

export class ChaptarrClient
  implements
    SystemClient,
    TagsClient,
    DownloadClientsClient<DownloadClientResource>,
    QualityProfilesClient<ChaptarrQualityProfileResource>,
    CustomFormatsClient<CustomFormatResource>,
    QualityDefinitionsClient<QualityDefinitionResource>,
    MetadataProfilesClient<MetadataProfileResource>
{
  private api!: Api<unknown>;

  constructor(baseUrl: string, apiKey: string) {
    this.initialize(baseUrl, apiKey);
  }

  private initialize(baseUrl: string, apiKey: string) {
    validateClientParams(baseUrl, apiKey, "CHAPTARR");

    const httpClient = new KyHttpClient({
      headers: {
        "X-Api-Key": apiKey,
      },
      prefix: baseUrl,
    });

    this.api = new Api(httpClient);
  }

  async getLanguages() {
    return this.api.v1LanguageList();
  }

  // Quality Management
  getQualityDefinitions() {
    return this.api.v1QualitydefinitionList();
  }

  async updateQualityDefinitions(definitions: QualityDefinitionResource[]) {
    await this.api.v1QualitydefinitionUpdateUpdate(definitions);
    return this.api.v1QualitydefinitionList();
  }

  // Quality Profiles
  async getQualityProfiles(): Promise<ChaptarrQualityProfileResource[]> {
    return (await this.api.v1QualityprofileList()).map(normalizeQualityProfile);
  }

  async createQualityProfile(profile: ChaptarrQualityProfileResource): Promise<ChaptarrQualityProfileResource> {
    return normalizeQualityProfile(await this.api.v1QualityprofileCreate(profile));
  }

  async updateQualityProfile(id: string, profile: ChaptarrQualityProfileResource): Promise<ChaptarrQualityProfileResource> {
    return normalizeQualityProfile(await this.api.v1QualityprofileUpdate(id, profile));
  }

  deleteQualityProfile(id: string): Promise<void> {
    return this.api.v1QualityprofileDelete(Number(id));
  }

  // Custom Formats
  getCustomFormats() {
    return this.api.v1CustomformatList();
  }

  createCustomFormat(format: ChaptarrCustomFormatRequest) {
    return this.api.v1CustomformatCreate(format);
  }

  updateCustomFormat(id: string, format: ChaptarrCustomFormatRequest) {
    return this.api.v1CustomformatUpdate(id, format);
  }

  deleteCustomFormat(id: string) {
    return this.api.v1CustomformatDelete(+id);
  }

  // Metadata Profiles
  async getMetadataProfiles() {
    return this.api.v1MetadataprofileList();
  }

  async createMetadataProfile(profile: MetadataProfileResource) {
    return this.api.v1MetadataprofileCreate(profile);
  }

  async updateMetadataProfile(id: string, profile: MetadataProfileResource) {
    return this.api.v1MetadataprofileUpdate(id, profile);
  }

  async deleteMetadataProfile(id: string) {
    return this.api.v1MetadataprofileDelete(Number(id));
  }

  async getNaming(): Promise<NamingConfigResource> {
    return this.api.v1ConfigNamingList();
  }

  async updateNaming(id: string, data: NamingConfigResource): Promise<NamingConfigResource> {
    return this.api.v1ConfigNamingUpdate(id, data);
  }

  async getMediamanagement(): Promise<MediaManagementConfigResource> {
    return this.api.v1ConfigMediamanagementList();
  }

  async updateMediamanagement(id: string, data: MediaManagementConfigResource): Promise<MediaManagementConfigResource> {
    return this.api.v1ConfigMediamanagementUpdate(id, data);
  }

  async getUiConfig(): Promise<UiConfigResource> {
    return this.api.v1ConfigUiList();
  }

  async updateUiConfig(id: string, data: UiConfigResource): Promise<UiConfigResource> {
    return this.api.v1ConfigUiUpdate(id, data);
  }

  async getHostConfig(): Promise<HostConfigResource> {
    return this.api.v1ConfigHostList({ redactResponseErrors: true });
  }

  async updateHostConfig(id: string, data: HostConfigResource): Promise<void> {
    await this.api.v1ConfigHostUpdate(id, data, { redactResponseErrors: true });
  }

  async getRootfolders(): Promise<RootFolderResource[]> {
    return this.api.v1RootfolderList();
  }

  async addRootFolder(data: RootFolderResource): Promise<RootFolderResource> {
    return this.api.v1RootfolderCreate(data);
  }

  async updateRootFolder(id: string, data: RootFolderResource): Promise<RootFolderResource> {
    return this.api.v1RootfolderUpdate(id, data);
  }

  async deleteRootFolder(id: string): Promise<void> {
    return this.api.v1RootfolderDelete(+id);
  }

  // Delay Profiles
  async getDelayProfiles(): Promise<DelayProfileResource[]> {
    return this.api.v1DelayprofileList();
  }

  async createDelayProfile(profile: DelayProfileResource): Promise<DelayProfileResource> {
    return this.api.v1DelayprofileCreate(profile);
  }

  async updateDelayProfile(id: string, data: DelayProfileResource): Promise<DelayProfileResource> {
    return this.api.v1DelayprofileUpdate(id, data);
  }

  async deleteDelayProfile(id: string): Promise<void> {
    return this.api.v1DelayprofileDelete(+id);
  }

  async getReleaseProfiles(): Promise<ReleaseProfileResource[]> {
    return this.api.v1ReleaseprofileList();
  }

  async createReleaseProfile(profile: ReleaseProfileResource): Promise<ReleaseProfileResource> {
    return this.api.v1ReleaseprofileCreate(profile);
  }

  async updateReleaseProfile(id: string, data: ReleaseProfileResource): Promise<ReleaseProfileResource> {
    return this.api.v1ReleaseprofileUpdate(id, data);
  }

  async deleteReleaseProfile(id: string): Promise<void> {
    return this.api.v1ReleaseprofileDelete(+id);
  }

  async getIndexers() {
    return this.api.v1IndexerList();
  }

  async getIndexerConfig(): Promise<IndexerConfigResource> {
    return this.api.v1ConfigIndexerList();
  }

  async updateIndexerConfig(id: string, data: IndexerConfigResource): Promise<IndexerConfigResource> {
    return this.api.v1ConfigIndexerUpdate(id, data);
  }

  async getNotificationSchema(): Promise<NotificationResource[]> {
    return this.api.v1NotificationSchemaList();
  }

  async getNotifications(): Promise<NotificationResource[]> {
    return this.api.v1NotificationList();
  }

  async createNotification(notification: NotificationResource): Promise<NotificationResource> {
    return this.api.v1NotificationCreate(notification, { forceSave: true }, { redactResponseErrors: true });
  }

  async updateNotification(id: string, notification: NotificationResource): Promise<NotificationResource> {
    return this.api.v1NotificationUpdate(id, notification, { forceSave: true }, { redactResponseErrors: true });
  }

  async deleteNotification(id: string): Promise<void> {
    return this.api.v1NotificationDelete(+id);
  }

  async getTags(): Promise<TagResource[]> {
    return this.api.v1TagList();
  }

  async createTag(tag: TagResource): Promise<TagResource> {
    return this.api.v1TagCreate(tag);
  }

  async deleteTag(id: string): Promise<void> {
    return this.api.v1TagDelete(+id);
  }

  // Download Clients
  async getDownloadClientSchema(): Promise<DownloadClientResource[]> {
    return this.api.v1DownloadclientSchemaList();
  }

  async getDownloadClients(): Promise<DownloadClientResource[]> {
    return this.api.v1DownloadclientList();
  }

  async createDownloadClient(client: DownloadClientResource): Promise<DownloadClientResource> {
    return this.api.v1DownloadclientCreate(client, forceSaveIfDisabled(client.enable));
  }

  // Note: the v1 API expects a string id for update but a number for delete
  async updateDownloadClient(id: string, client: DownloadClientResource): Promise<DownloadClientResource> {
    return this.api.v1DownloadclientUpdate(id, client, forceSaveIfDisabled(client.enable));
  }

  async deleteDownloadClient(id: string): Promise<void> {
    return this.api.v1DownloadclientDelete(+id);
  }

  async testDownloadClient(client: DownloadClientResource): Promise<void> {
    return this.api.v1DownloadclientTestCreate(client);
  }

  // Download Client Configuration
  async getDownloadClientConfig(): Promise<DownloadClientConfigResource> {
    return this.api.v1ConfigDownloadclientList();
  }

  async updateDownloadClientConfig(id: string, config: DownloadClientConfigResource): Promise<DownloadClientConfigResource> {
    return this.api.v1ConfigDownloadclientUpdate(id, config);
  }

  // Remote Path Mappings
  async getRemotePathMappings(): Promise<RemotePathMappingResource[]> {
    return this.api.v1RemotepathmappingList();
  }

  // Chaptarr requires a download client id on every mapping. Zero keeps a mapping global; a path-only
  // update passes the server mapping's id through so a client-specific mapping stays client-specific.
  async createRemotePathMapping(mapping: ChaptarrRemotePathMappingInput): Promise<RemotePathMappingResource> {
    return this.api.v1RemotepathmappingCreate({ ...mapping, downloadClientId: mapping.downloadClientId ?? 0 });
  }

  async updateRemotePathMapping(id: string, mapping: ChaptarrRemotePathMappingInput): Promise<RemotePathMappingResource> {
    return this.api.v1RemotepathmappingUpdate(id, { ...mapping, downloadClientId: mapping.downloadClientId ?? 0 });
  }

  async deleteRemotePathMapping(id: string): Promise<void> {
    return this.api.v1RemotepathmappingDelete(+id);
  }

  // System/Health Check
  getSystemStatus(): Promise<SystemResource> {
    return this.api.v1SystemStatusList();
  }

  async testConnection() {
    try {
      await this.api.v1HealthList();
    } catch (error) {
      const message = logConnectionError(error, "CHAPTARR");
      logger.error(message);
      return false;
    }

    return true;
  }
}
