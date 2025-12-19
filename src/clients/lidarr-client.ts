import { KyHttpClient } from "../__generated__/ky-client";
import { Api } from "../__generated__/lidarr/Api";
import {
  CustomFormatResource,
  LanguageResource,
  MetadataProfileResource,
  QualityDefinitionResource,
  QualityProfileResource,
} from "../__generated__/lidarr/data-contracts";
import { logger } from "../logger";
import type { DownloadClientResource } from "../types/download-client.types";
import { IArrClient, logConnectionError, validateClientParams } from "./unified-client";

export class LidarrClient implements IArrClient<QualityProfileResource, QualityDefinitionResource, CustomFormatResource, LanguageResource> {
  private api!: Api<unknown>;

  constructor(baseUrl: string, apiKey: string) {
    this.initialize(baseUrl, apiKey);
  }

  private initialize(baseUrl: string, apiKey: string) {
    validateClientParams(baseUrl, apiKey, "LIDARR");

    const httpClient = new KyHttpClient({
      headers: {
        "X-Api-Key": apiKey,
      },
      prefixUrl: baseUrl,
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
  getQualityProfiles() {
    return this.api.v1QualityprofileList();
  }

  createQualityProfile(profile: QualityProfileResource) {
    return this.api.v1QualityprofileCreate(profile);
  }

  updateQualityProfile(id: string, profile: QualityProfileResource) {
    return this.api.v1QualityprofileUpdate(id, profile);
  }

  deleteQualityProfile(id: string): Promise<void> {
    return this.api.v1QualityprofileDelete(Number(id));
  }

  // Custom Formats
  getCustomFormats() {
    return this.api.v1CustomformatList();
  }

  createCustomFormat(format: CustomFormatResource) {
    return this.api.v1CustomformatCreate(format);
  }

  updateCustomFormat(id: string, format: CustomFormatResource) {
    return this.api.v1CustomformatUpdate(id, format);
  }

  deleteCustomFormat(id: string) {
    return this.api.v1CustomformatDelete(+id);
  }

  // Metadata Profiles
  getMetadataProfiles() {
    return this.api.v1MetadataprofileList();
  }

  getMetadataProfileSchema() {
    return this.api.v1MetadataprofileSchemaList();
  }

  createMetadataProfile(profile: MetadataProfileResource) {
    return this.api.v1MetadataprofileCreate(profile);
  }

  updateMetadataProfile(id: string, profile: MetadataProfileResource) {
    return this.api.v1MetadataprofileUpdate(id, profile);
  }

  deleteMetadataProfile(id: string) {
    return this.api.v1MetadataprofileDelete(Number(id));
  }

  async getNaming() {
    return this.api.v1ConfigNamingList();
  }

  async updateNaming(id: string, data: any) {
    return this.api.v1ConfigNamingUpdate(id, data);
  }

  async getMediamanagement() {
    return this.api.v1ConfigMediamanagementList();
  }

  async updateMediamanagement(id: string, data: any) {
    return this.api.v1ConfigMediamanagementUpdate(id, data);
  }

  async getRootfolders() {
    return this.api.v1RootfolderList();
  }

  async addRootFolder(data: any) {
    return this.api.v1RootfolderCreate(data);
  }

  async updateRootFolder(id: string, data: any) {
    return this.api.v1RootfolderUpdate(id, data);
  }

  async deleteRootFolder(id: string) {
    return this.api.v1RootfolderDelete(+id);
  }

  // Delay Profiles
  async getDelayProfiles() {
    return this.api.v1DelayprofileList();
  }

  async createDelayProfile(profile: any) {
    return this.api.v1DelayprofileCreate(profile);
  }

  async updateDelayProfile(id: string, data: any) {
    return this.api.v1DelayprofileUpdate(id, data);
  }

  async deleteDelayProfile(id: string) {
    return this.api.v1DelayprofileDelete(+id);
  }

  async getTags() {
    return this.api.v1TagList();
  }

  async createTag(tag: any) {
    return this.api.v1TagCreate(tag);
  }

  // Download Clients
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
    return this.api.v1DownloadclientUpdate(+id, client);
  }

  async deleteDownloadClient(id: string): Promise<void> {
    return this.api.v1DownloadclientDelete(+id);
  }

  async testDownloadClient(client: DownloadClientResource): Promise<any> {
    return this.api.v1DownloadclientTestCreate(client);
  }

  // System/Health Check
  getSystemStatus() {
    return this.api.v1SystemStatusList();
  }

  async testConnection() {
    try {
      await this.api.v1HealthList();
    } catch (error) {
      const message = logConnectionError(error, "LIDARR");
      logger.error(message);

      return false;
    }

    return true;
  }
}
