import { KyHttpClient } from "../__generated__/ky-client";
import { Api } from "../__generated__/radarr/Api";
import { CustomFormatResource, QualityDefinitionResource, QualityProfileResource } from "../__generated__/radarr/data-contracts";
import { logger } from "../logger";
import { IArrClient, validateClientParams } from "./unified-client";

export class RadarrClient implements IArrClient<QualityProfileResource, QualityDefinitionResource, CustomFormatResource> {
  private api!: Api<unknown>;

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

  // Quality Management
  getQualityDefinitions() {
    return this.api.v3QualitydefinitionList();
  }

  async updateQualityDefinitions(definitions: QualityDefinitionResource[]) {
    await this.api.v3QualitydefinitionUpdateUpdate(definitions);
    return this.getQualityDefinitions();
  }

  // Quality Profiles
  getQualityProfiles(): Promise<QualityProfileResource[]> {
    return this.api.v3QualityprofileList();
  }

  createQualityProfile(profile: QualityProfileResource): Promise<QualityProfileResource> {
    if (profile.language) {
    }
    return this.api.v3QualityprofileCreate(profile);
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
