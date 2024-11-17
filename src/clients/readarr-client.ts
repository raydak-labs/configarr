import { KyHttpClient } from "../__generated__/ky-client";
import { MergedCustomFormatResource } from "../__generated__/mergedTypes";
import { Api } from "../__generated__/readarr/Api";
import { logger } from "../logger";
import { IArrClient, validateClientParams } from "./unified-client";

export class ReadarrClient implements IArrClient {
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

  // Quality Management
  getQualityDefinitions() {
    return this.api.v1QualitydefinitionList();
  }

  updateQualityDefinitions(definitions: any) {
    return this.api.v1QualitydefinitionUpdateUpdate(definitions);
  }

  // Quality Profiles
  getQualityProfiles() {
    return this.api.v1QualityprofileList();
  }

  createQualityProfile(profile: any) {
    return this.api.v1QualityprofileCreate(profile);
  }

  updateQualityProfile(id: string, profile: any) {
    return this.api.v1QualityprofileUpdate(id, profile);
  }

  // Custom Formats
  getCustomFormats() {
    return this.api.v1CustomformatList();
  }

  createCustomFormat(format: MergedCustomFormatResource) {
    return this.api.v1CustomformatCreate(format);
  }

  updateCustomFormat(id: string, format: MergedCustomFormatResource) {
    return this.api.v1CustomformatUpdate(id, format);
  }

  deleteCustomFormat(id: string) {
    return this.api.v1CustomformatDelete(+id);
  }

  // Metadata Profiles
  async getMetadataProfiles() {
    return this.api.v1MetadataprofileList();
  }

  async createMetadataProfile(profile: any) {
    return this.api.v1MetadataprofileCreate(profile);
  }

  async updateMetadataProfile(id: number, profile: any) {
    return this.api.v1MetadataprofileUpdate(id.toString(), profile);
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
