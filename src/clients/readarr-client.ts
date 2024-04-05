import { KyHttpClient } from "../__generated__/ky-client";
import { Api } from "../__generated__/readarr/Api";
import {
  CustomFormatResource,
  LanguageResource,
  MetadataProfileResource,
  QualityDefinitionResource,
  QualityProfileResource,
} from "../__generated__/readarr/data-contracts";
import { logger } from "../logger";
import { IArrClient, validateClientParams } from "./unified-client";

export class ReadarrClient
  implements IArrClient<QualityProfileResource, QualityDefinitionResource, CustomFormatResource, LanguageResource>
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
  async getMetadataProfiles() {
    return this.api.v1MetadataprofileList();
  }

  async createMetadataProfile(profile: MetadataProfileResource) {
    return this.api.v1MetadataprofileCreate(profile);
  }

  async updateMetadataProfile(id: number, profile: MetadataProfileResource) {
    return this.api.v1MetadataprofileUpdate(id.toString(), profile);
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

  // System/Health Check
  getSystemStatus() {
    return this.api.v1SystemStatusList();
  }

  async testConnection() {
    try {
      await this.api.v1HealthList();
    } catch (error) {
      logger.error(error);
      return false;
    }

    return true;
  }
}
