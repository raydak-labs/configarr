import { KyHttpClient } from "../ky-client";
import { Api } from "../__generated__/radarr/Api";
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
  QualityDefinitionResource,
  QualityProfileResource,
  RemotePathMappingResource,
  UiConfigResource,
} from "../__generated__/radarr/data-contracts";
import { logger } from "../logger";
import type { CustomFormatRequest } from "../customFormats/customFormat.types";
import type { DelayProfileGenericResource } from "../delayProfiles/delayProfile.types";
import type { MediaDownloadClientResource } from "../downloadClients/downloadClient.types";
import type { QualityDefinitionPreferredResource } from "../qualityDefinitions/qualityDefinition.types";
import type { QualityProfileRadarrWhisparrResource } from "../qualityProfiles/qualityProfile.types";
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
export class RadarrClient
  implements
    SystemClient,
    TagsClient,
    DownloadClientsClient,
    QualityProfilesClient<QualityProfileRadarrWhisparrResource>,
    CustomFormatsClient,
    QualityDefinitionsClient<QualityDefinitionPreferredResource>
{
  private api!: Api<unknown>;
  private languageMap: Map<string, LanguageResource> = new Map();

  constructor(baseUrl: string, apiKey: string) {
    this.initialize(baseUrl, apiKey);
  }

  private initialize(baseUrl: string, apiKey: string) {
    validateClientParams(baseUrl, apiKey, "RADARR");

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
  getQualityDefinitions(): Promise<QualityDefinitionPreferredResource[]> {
    return this.api.v3QualitydefinitionList() as Promise<QualityDefinitionPreferredResource[]>;
  }

  async updateQualityDefinitions(definitions: QualityDefinitionPreferredResource[]): Promise<QualityDefinitionPreferredResource[]> {
    await this.api.v3QualitydefinitionUpdateUpdate(definitions as QualityDefinitionResource[]);
    this.api.v3LanguageList();
    return this.getQualityDefinitions();
  }

  // Quality Profiles
  getQualityProfiles(): Promise<QualityProfileRadarrWhisparrResource[]> {
    return this.api.v3QualityprofileList();
  }

  async createQualityProfile(profile: QualityProfileRadarrWhisparrResource): Promise<QualityProfileRadarrWhisparrResource> {
    const cloned = cloneWithJSON(profile);

    if (this.languageMap.size <= 0) {
      const languages = await this.getLanguages();
      this.languageMap = new Map(languages.map((i) => [i.name!, i]));
    }

    if (profile.language == null) {
      cloned.language = this.languageMap.get(ANY_LANGUAGE_NAME);
    }

    return this.api.v3QualityprofileCreate(cloned as QualityProfileResource);
  }

  updateQualityProfile(id: string, profile: QualityProfileRadarrWhisparrResource): Promise<QualityProfileRadarrWhisparrResource> {
    return this.api.v3QualityprofileUpdate(id, profile as QualityProfileResource);
  }

  deleteQualityProfile(id: string): Promise<void> {
    return this.api.v3QualityprofileDelete(Number(id));
  }

  // Custom Formats
  getCustomFormats() {
    return this.api.v3CustomformatList();
  }

  createCustomFormat(format: CustomFormatRequest) {
    return this.api.v3CustomformatCreate(format as CustomFormatResource);
  }

  updateCustomFormat(id: string, format: CustomFormatRequest) {
    return this.api.v3CustomformatUpdate(id, format as CustomFormatResource);
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
    throw new Error("Radarr does not support updating root folders");
  }

  async deleteRootFolder(id: string): Promise<void> {
    return this.api.v3RootfolderDelete(+id);
  }

  // Delay Profiles
  async getDelayProfiles(): Promise<DelayProfileResource[]> {
    return this.api.v3DelayprofileList();
  }

  async createDelayProfile(profile: DelayProfileGenericResource): Promise<DelayProfileResource> {
    return this.api.v3DelayprofileCreate(profile as DelayProfileResource);
  }

  async updateDelayProfile(id: string, data: DelayProfileGenericResource): Promise<DelayProfileResource> {
    return this.api.v3DelayprofileUpdate(id, data as DelayProfileResource);
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
  async getDownloadClientSchema(): Promise<MediaDownloadClientResource[]> {
    return this.api.v3DownloadclientSchemaList();
  }

  async getDownloadClients(): Promise<MediaDownloadClientResource[]> {
    return this.api.v3DownloadclientList();
  }

  async createDownloadClient(client: MediaDownloadClientResource): Promise<MediaDownloadClientResource> {
    return this.api.v3DownloadclientCreate(client as GeneratedDownloadClientResource);
  }

  async updateDownloadClient(id: string, client: MediaDownloadClientResource): Promise<MediaDownloadClientResource> {
    return this.api.v3DownloadclientUpdate(+id, client as GeneratedDownloadClientResource);
  }

  async deleteDownloadClient(id: string): Promise<void> {
    return this.api.v3DownloadclientDelete(+id);
  }

  async testDownloadClient(client: MediaDownloadClientResource): Promise<void> {
    return this.api.v3DownloadclientTestCreate(client as GeneratedDownloadClientResource);
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
      const message = logConnectionError(error, "RADARR");
      logger.error(message);
      return false;
    }

    return true;
  }
}
