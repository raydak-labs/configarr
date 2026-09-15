import { KyHttpClient } from "../ky-client";
import { Api } from "../__generated__/readarr/Api";
import {
  CustomFormatResource,
  DelayProfileResource,
  MediaManagementConfigResource,
  NamingConfigResource,
  RootFolderResource,
  SystemResource,
  TagResource,
  DownloadClientConfigResource,
  DownloadClientResource as GeneratedDownloadClientResource,
  LanguageResource,
  MetadataProfileResource,
  QualityDefinitionResource,
  QualityProfileResource,
  RemotePathMappingResource,
  UiConfigResource,
} from "../__generated__/readarr/data-contracts";
import { logger } from "../logger";
import type { CustomFormatRequest } from "../customFormats/customFormat.types";
import type { DelayProfileGenericResource } from "../delayProfiles/delayProfile.types";
import type { MediaDownloadClientResource } from "../downloadClients/downloadClient.types";
import type { QualityDefinitionReadarrResource } from "../qualityDefinitions/qualityDefinition.types";
import type { QualityProfileReadarrResource } from "../qualityProfiles/qualityProfile.types";
import { logConnectionError, validateClientParams } from "./connection";
import {
  CustomFormatsClient,
  DownloadClientsClient,
  QualityDefinitionsClient,
  QualityProfilesClient,
  SystemClient,
  TagsClient,
} from "./capabilities";
export class ReadarrClient
  implements
    SystemClient,
    TagsClient,
    DownloadClientsClient,
    QualityProfilesClient<QualityProfileReadarrResource>,
    CustomFormatsClient,
    QualityDefinitionsClient<QualityDefinitionReadarrResource>
{
  private api!: Api<unknown>;

  constructor(baseUrl: string, apiKey: string) {
    this.initialize(baseUrl, apiKey);
  }

  private initialize(baseUrl: string, apiKey: string) {
    validateClientParams(baseUrl, apiKey, "READARR");

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

  async updateQualityDefinitions(definitions: QualityDefinitionReadarrResource[]) {
    await this.api.v1QualitydefinitionUpdateUpdate(definitions as QualityDefinitionResource[]);
    return this.api.v1QualitydefinitionList();
  }

  // Quality Profiles
  getQualityProfiles() {
    return this.api.v1QualityprofileList();
  }

  createQualityProfile(profile: QualityProfileReadarrResource) {
    return this.api.v1QualityprofileCreate(profile as QualityProfileResource);
  }

  updateQualityProfile(id: string, profile: QualityProfileReadarrResource) {
    return this.api.v1QualityprofileUpdate(id, profile as QualityProfileResource);
  }

  deleteQualityProfile(id: string): Promise<void> {
    return this.api.v1QualityprofileDelete(Number(id));
  }

  // Custom Formats
  getCustomFormats() {
    return this.api.v1CustomformatList();
  }

  createCustomFormat(format: CustomFormatRequest) {
    return this.api.v1CustomformatCreate(format as CustomFormatResource);
  }

  updateCustomFormat(id: string, format: CustomFormatRequest) {
    return this.api.v1CustomformatUpdate(id, format as CustomFormatResource);
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

  async createDelayProfile(profile: DelayProfileGenericResource): Promise<DelayProfileResource> {
    return this.api.v1DelayprofileCreate(profile as DelayProfileResource);
  }

  async updateDelayProfile(id: string, data: DelayProfileGenericResource): Promise<DelayProfileResource> {
    return this.api.v1DelayprofileUpdate(id, data as DelayProfileResource);
  }

  async deleteDelayProfile(id: string): Promise<void> {
    return this.api.v1DelayprofileDelete(+id);
  }

  async getTags(): Promise<TagResource[]> {
    return this.api.v1TagList();
  }

  async createTag(tag: TagResource): Promise<TagResource> {
    return this.api.v1TagCreate(tag);
  }

  // Download Clients
  async getDownloadClientSchema(): Promise<MediaDownloadClientResource[]> {
    return this.api.v1DownloadclientSchemaList();
  }

  async getDownloadClients(): Promise<MediaDownloadClientResource[]> {
    return this.api.v1DownloadclientList();
  }

  async createDownloadClient(client: MediaDownloadClientResource): Promise<MediaDownloadClientResource> {
    return this.api.v1DownloadclientCreate(client as GeneratedDownloadClientResource);
  }

  // Note: Readarr's v1 API expects string for update but number for delete
  async updateDownloadClient(id: string, client: MediaDownloadClientResource): Promise<MediaDownloadClientResource> {
    return this.api.v1DownloadclientUpdate(id, client as GeneratedDownloadClientResource);
  }

  async deleteDownloadClient(id: string): Promise<void> {
    return this.api.v1DownloadclientDelete(+id);
  }

  async testDownloadClient(client: MediaDownloadClientResource): Promise<void> {
    return this.api.v1DownloadclientTestCreate(client as GeneratedDownloadClientResource);
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

  async createRemotePathMapping(mapping: RemotePathMappingResource): Promise<RemotePathMappingResource> {
    return this.api.v1RemotepathmappingCreate(mapping);
  }

  async updateRemotePathMapping(id: string, mapping: RemotePathMappingResource): Promise<RemotePathMappingResource> {
    return this.api.v1RemotepathmappingUpdate(id, mapping);
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
      const message = logConnectionError(error, "READARR");
      logger.error(message);
      return false;
    }

    return true;
  }
}
