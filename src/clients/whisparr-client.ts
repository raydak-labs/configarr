import { KyHttpClient } from "../__generated__/ky-client";
import { MergedCustomFormatResource } from "../__generated__/mergedTypes";
import { Api } from "../__generated__/whisparr/Api";
import { logger } from "../logger";
import { IArrClient, validateClientParams } from "./unified-client";

export class WhisparrClient implements IArrClient {
  private api!: Api<unknown>;

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

  // Quality Management
  getQualityDefinitions() {
    return this.api.v3QualitydefinitionList();
  }

  updateQualityDefinitions(definitions: any) {
    return this.api.v3QualitydefinitionUpdateUpdate(definitions);
  }

  // Quality Profiles
  getQualityProfiles() {
    return this.api.v3QualityprofileList();
  }

  createQualityProfile(profile: any) {
    return this.api.v3QualityprofileCreate(profile);
  }

  updateQualityProfile(id: string, profile: any) {
    return this.api.v3QualityprofileUpdate(id, profile);
  }

  // Custom Formats
  getCustomFormats() {
    return this.api.v3CustomformatList();
  }

  createCustomFormat(format: MergedCustomFormatResource) {
    return this.api.v3CustomformatCreate(format);
  }

  updateCustomFormat(id: string, format: MergedCustomFormatResource) {
    return this.api.v3CustomformatUpdate(id, format);
  }

  deleteCustomFormat(id: string) {
    return this.api.v3CustomformatDelete(+id);
  }

  // Metadata Profiles
  async getMetadataProfiles() {
    throw new Error("Metadata profiles are not supported in Whisparr");
  }

  async createMetadataProfile(profile: any) {
    throw new Error("Metadata profiles are not supported in Whisparr");
  }

  async updateMetadataProfile(id: number, profile: any) {
    throw new Error("Metadata profiles are not supported in Whisparr");
  }

  // System/Health Check
  getSystemStatus() {
    return this.api.v3SystemStatusList();
  }

  async testConnection() {
    try {
      await this.api.v3HealthList();
    } catch (error) {
      logger.error(error);
      return false;
    }

    return true;
  }
}
