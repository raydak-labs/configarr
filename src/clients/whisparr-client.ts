import { KyHttpClient } from "../__generated__/ky-client";
import { Api } from "../__generated__/whisparr/Api";
import {
  CustomFormatResource,
  LanguageResource,
  QualityDefinitionResource,
  QualityProfileResource,
} from "../__generated__/whisparr/data-contracts";
import { logger } from "../logger";
import type { DownloadClientResource } from "../types/download-client.types";
import { cloneWithJSON } from "../util";
import { IArrClient, logConnectionError, validateClientParams } from "./unified-client";

/**
 * Overwrite wrong types for now
 */
declare module "../__generated__/whisparr/data-contracts" {
  export interface QualityProfileResource {
    language?: Language;
  }
}

export class WhisparrClient
  implements IArrClient<QualityProfileResource, QualityDefinitionResource, CustomFormatResource, LanguageResource>
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
      prefixUrl: baseUrl,
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
      cloned.language = this.languageMap.get("Any");
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

  async getNaming() {
    return this.api.v3ConfigNamingList();
  }

  async updateNaming(id: string, data: any) {
    return this.api.v3ConfigNamingUpdate(id, data);
  }

  async getMediamanagement() {
    return this.api.v3ConfigMediamanagementList();
  }

  async updateMediamanagement(id: string, data: any) {
    return this.api.v3ConfigMediamanagementUpdate(id, data);
  }

  async getRootfolders() {
    return this.api.v3RootfolderList();
  }

  async addRootFolder(data: any) {
    return this.api.v3RootfolderCreate(data);
  }

  async updateRootFolder(id: string, data: any) {
    throw new Error("Whisparr does not support updating root folders");
  }

  async deleteRootFolder(id: string) {
    return this.api.v3RootfolderDelete(+id);
  }

  // Delay Profiles
  async getDelayProfiles() {
    return this.api.v3DelayprofileList();
  }

  async createDelayProfile(profile: any) {
    return this.api.v3DelayprofileCreate(profile);
  }

  async updateDelayProfile(id: string, data: any) {
    return this.api.v3DelayprofileUpdate(id, data);
  }

  async deleteDelayProfile(id: string) {
    return this.api.v3DelayprofileDelete(+id);
  }

  async getTags() {
    return this.api.v3TagList();
  }

  async createTag(tag: any) {
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

  async updateDownloadClient(id: string, client: DownloadClientResource): Promise<DownloadClientResource> {
    return this.api.v3DownloadclientUpdate(id, client);
  }

  async deleteDownloadClient(id: string): Promise<void> {
    return this.api.v3DownloadclientDelete(+id);
  }

  async testDownloadClient(client: DownloadClientResource): Promise<any> {
    return this.api.v3DownloadclientTestCreate(client);
  }

  // System/Health Check
  getSystemStatus() {
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
