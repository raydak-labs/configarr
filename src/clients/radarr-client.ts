import { KyHttpClient } from "../__generated__/ky-client";
import { Api } from "../__generated__/radarr/Api";
import {
  CustomFormatResource,
  LanguageResource,
  QualityDefinitionResource,
  QualityProfileResource,
} from "../__generated__/radarr/data-contracts";
import { logger } from "../logger";
import { cloneWithJSON } from "../util";
import { IArrClient, logConnectionError, validateClientParams } from "./unified-client";

export class RadarrClient implements IArrClient<QualityProfileResource, QualityDefinitionResource, CustomFormatResource, LanguageResource> {
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
    this.api.v3LanguageList();
    return this.getQualityDefinitions();
  }

  // Quality Profiles
  getQualityProfiles(): Promise<QualityProfileResource[]> {
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

  updateQualityProfile(id: string, profile: QualityProfileResource): Promise<QualityProfileResource> {
    return this.api.v3QualityprofileUpdate(id, profile);
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

  // System/Health Check
  getSystemStatus() {
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
