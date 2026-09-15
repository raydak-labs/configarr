import { KyHttpClient } from "../ky-client";
import { Api } from "../__generated__/whisparr/Api";
import {
  CustomFormatResource,
  DelayProfileResource,
  MediaManagementConfigResource,
  NamingConfigResource,
  RootFolderResource,
  SystemResource,
  TagResource,
  DownloadClientConfigResource,
  LanguageResource,
  QualityDefinitionResource,
  QualityProfileResource,
  RemotePathMappingResource,
  UiConfigResource,
} from "../__generated__/whisparr/data-contracts";
import { logger } from "../logger";
import type { DownloadClientResource } from "../types/download-client.types";
import { ANY_LANGUAGE_NAME, cloneWithJSON } from "../util";
import { logConnectionError, validateClientParams } from "./connection";
import {
  CustomFormatsClient,
  DownloadClientsClient,
  QualityDefinitionsClient,
  QualityProfilesClient,
  SystemClient,
  TagsClient,
} from "./capabilities";

/**
 * Overwrite wrong types for now
 */
declare module "../__generated__/whisparr/data-contracts" {
  export interface QualityProfileResource {
    language?: Language;
  }
}

export class WhisparrClient
  implements
    SystemClient,
    TagsClient,
    DownloadClientsClient,
    QualityProfilesClient<QualityProfileResource>,
    CustomFormatsClient<CustomFormatResource>,
    QualityDefinitionsClient<QualityDefinitionResource>
{
  private api!: Api<unknown>;
  private languageMap: Map<string, LanguageResource> = new Map();

  constructor(baseUrl: string, apiKey: string) {
    this.initialize(baseUrl, apiKey);
  }

  private initialize(baseUrl: string, apiKey: string) {
    validateClientParams(baseUrl, apiKey, "WHISPARR");

    const httpClient = new KyHttpClient({
      headers: {
        "X-Api-Key": apiKey,
      },
      prefix: baseUrl,
    });

    this.api = new Api(httpClient);
  }

  async getLanguages() {
    return this.api.v3LanguageList();
  }

  // Quality Management
  getQualityDefinitions() {
    return this.api.v3QualitydefinitionList();
  }

  async updateQualityDefinitions(definitions: QualityDefinitionResource[]) {
    await this.api.v3QualitydefinitionUpdateUpdate(definitions);
    return this.api.v3QualitydefinitionList();
  }

  // Quality Profiles
  getQualityProfiles() {
    return this.api.v3QualityprofileList();
  }

  async createQualityProfile(profile: QualityProfileResource): Promise<QualityProfileResource> {
    const cloned = cloneWithJSON(profile);

    if (this.languageMap.size <= 0) {
      const languages = await this.getLanguages();
      this.languageMap = new Map(languages.map((i) => [i.name!, i]));
    }

    if (profile.language == null) {
      cloned.language = this.languageMap.get(ANY_LANGUAGE_NAME);
    }

    return this.api.v3QualityprofileCreate(cloned);
  }

  updateQualityProfile(id: string, profile: QualityProfileResource) {
    return this.api.v3QualityprofileUpdate(id, profile);
  }

  deleteQualityProfile(id: string): Promise<void> {
    return this.api.v3QualityprofileDelete(Number(id));
  }

  // Custom Formats
  getCustomFormats() {
    return this.api.v3CustomformatList();
  }

  createCustomFormat(format: CustomFormatResource) {
    return this.api.v3CustomformatCreate(format);
  }

  updateCustomFormat(id: string, format: CustomFormatResource) {
    return this.api.v3CustomformatUpdate(id, format);
  }

  deleteCustomFormat(id: string) {
    return this.api.v3CustomformatDelete(+id);
  }

  async getNaming(): Promise<NamingConfigResource> {
    return this.api.v3ConfigNamingList();
  }

  async updateNaming(id: string, data: NamingConfigResource): Promise<NamingConfigResource> {
    return this.api.v3ConfigNamingUpdate(id, data);
  }

  async getMediamanagement(): Promise<MediaManagementConfigResource> {
    return this.api.v3ConfigMediamanagementList();
  }

  async updateMediamanagement(id: string, data: MediaManagementConfigResource): Promise<MediaManagementConfigResource> {
    return this.api.v3ConfigMediamanagementUpdate(id, data);
  }

  async getUiConfig(): Promise<UiConfigResource> {
    return this.api.v3ConfigUiList();
  }

  async updateUiConfig(id: string, data: UiConfigResource): Promise<UiConfigResource> {
    return this.api.v3ConfigUiUpdate(id, data);
  }

  async getRootfolders(): Promise<RootFolderResource[]> {
    return this.api.v3RootfolderList();
  }

  async addRootFolder(data: RootFolderResource): Promise<RootFolderResource> {
    return this.api.v3RootfolderCreate(data);
  }

  async updateRootFolder(id: string, data: RootFolderResource): Promise<RootFolderResource> {
    throw new Error("Whisparr does not support updating root folders");
  }

  async deleteRootFolder(id: string): Promise<void> {
    return this.api.v3RootfolderDelete(+id);
  }

  // Delay Profiles
  async getDelayProfiles(): Promise<DelayProfileResource[]> {
    return this.api.v3DelayprofileList();
  }

  async createDelayProfile(profile: DelayProfileResource): Promise<DelayProfileResource> {
    return this.api.v3DelayprofileCreate(profile);
  }

  async updateDelayProfile(id: string, data: DelayProfileResource): Promise<DelayProfileResource> {
    return this.api.v3DelayprofileUpdate(id, data);
  }

  async deleteDelayProfile(id: string): Promise<void> {
    return this.api.v3DelayprofileDelete(+id);
  }

  async getTags(): Promise<TagResource[]> {
    return this.api.v3TagList();
  }

  async createTag(tag: TagResource): Promise<TagResource> {
    return this.api.v3TagCreate(tag);
  }

  // Download Clients
  async getDownloadClientSchema(): Promise<DownloadClientResource[]> {
    return this.api.v3DownloadclientSchemaList();
  }

  async getDownloadClients(): Promise<DownloadClientResource[]> {
    return this.api.v3DownloadclientList();
  }

  async createDownloadClient(client: DownloadClientResource): Promise<DownloadClientResource> {
    return this.api.v3DownloadclientCreate(client);
  }

  // Note: Whisparr's v3 API expects string for update but number for delete
  async updateDownloadClient(id: string, client: DownloadClientResource): Promise<DownloadClientResource> {
    return this.api.v3DownloadclientUpdate(id, client);
  }

  async deleteDownloadClient(id: string): Promise<void> {
    return this.api.v3DownloadclientDelete(+id);
  }

  async testDownloadClient(client: DownloadClientResource): Promise<void> {
    return this.api.v3DownloadclientTestCreate(client);
  }

  // Download Client Configuration
  async getDownloadClientConfig(): Promise<DownloadClientConfigResource> {
    return this.api.v3ConfigDownloadclientList();
  }

  async updateDownloadClientConfig(id: string, config: DownloadClientConfigResource): Promise<DownloadClientConfigResource> {
    return this.api.v3ConfigDownloadclientUpdate(id, config);
  }

  // Remote Path Mappings
  async getRemotePathMappings(): Promise<RemotePathMappingResource[]> {
    return this.api.v3RemotepathmappingList();
  }

  async createRemotePathMapping(mapping: RemotePathMappingResource): Promise<RemotePathMappingResource> {
    return this.api.v3RemotepathmappingCreate(mapping);
  }

  async updateRemotePathMapping(id: string, mapping: RemotePathMappingResource): Promise<RemotePathMappingResource> {
    return this.api.v3RemotepathmappingUpdate(id, mapping);
  }

  async deleteRemotePathMapping(id: string): Promise<void> {
    return this.api.v3RemotepathmappingDelete(+id);
  }

  // System/Health Check
  getSystemStatus(): Promise<SystemResource> {
    return this.api.v3SystemStatusList();
  }

  async testConnection() {
    try {
      await this.api.v3HealthList();
    } catch (error) {
      const message = logConnectionError(error, "WHISPARR");
      logger.error(message);
      return false;
    }

    return true;
  }
}
