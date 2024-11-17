import { MergedCustomFormatResource } from "../__generated__/mergedTypes";
import { logger } from "../logger";
import { ArrType } from "../types/common.types";
import { RadarrClient } from "./radarr-client";
import { ReadarrClient } from "./readarr-client";
import { SonarrClient } from "./sonarr-client";
import { WhisparrClient } from "./whisparr-client";

let unifiedClient: UnifiedClient | undefined;

export const unsetApi = () => {
  unifiedClient = undefined;
};

export const getUnifiedClient = (): UnifiedClient => {
  if (!unifiedClient) {
    throw new Error("Please configure API first.");
  }
  return unifiedClient;
};

export const validateClientParams = (url: string, apiKey: string, arrType: ArrType) => {
  const arrLabel = arrType.toLowerCase();

  if (!url) {
    const message = `URL not correctly configured for ${arrLabel} API!`;
    logger.error(message);
    throw new Error(message);
  }
  if (!apiKey) {
    const message = `API Key not correctly configured for ${arrLabel} API!`;
    logger.error(message);
    throw new Error(message);
  }
};

export const handleErrorApi = (error: any, arrType: ArrType) => {
  let message;
  const arrLabel = arrType.toLowerCase();
  const causeError = error?.cause?.message || error?.cause?.errors?.map((e: any) => e.message).join(";") || undefined;

  const errorMessage = (error.message && `Message: ${error.message}`) || "";
  const causeMessage = (causeError && `- Cause: ${causeError}`) || "";

  logger.error(`Error configuring ${arrLabel} API. ${errorMessage} ${causeMessage}`);

  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    message = `Unable to retrieve data from ${arrLabel} API. Server responded with status code ${error.response.status}: ${error.response.statusText}. Please check the API server status or your request parameters.`;
  } else {
    // Something happened in setting up the request that triggered an Error
    message = `An unexpected error occurred while setting up the ${arrLabel} request: ${errorMessage} ${causeMessage}. Please try again.`;
  }

  throw new Error(message);
};

export const configureApi = async (type: ArrType, baseUrl: string, apiKey: string) => {
  unsetApi();

  unifiedClient = new UnifiedClient(type, baseUrl, apiKey);

  try {
    await unifiedClient.testConnection();
  } catch (error: any) {
    handleErrorApi(error, type);
  }

  return unifiedClient;
};

export interface IArrClient {
  // Quality Management
  getQualityDefinitions(): Promise<any>;
  updateQualityDefinitions(definitions: any): Promise<any>;

  // Quality Profiles
  getQualityProfiles(): Promise<any>;
  createQualityProfile(profile: any): Promise<any>;
  updateQualityProfile(id: string, profile: any): Promise<any>;

  // Custom Formats
  getCustomFormats(): Promise<MergedCustomFormatResource[]>;
  createCustomFormat(format: MergedCustomFormatResource): Promise<MergedCustomFormatResource>;
  updateCustomFormat(id: string, format: MergedCustomFormatResource): Promise<MergedCustomFormatResource>;
  deleteCustomFormat(id: string): Promise<void>;

  // Metadata Profiles (Readarr-specific)
  getMetadataProfiles(): Promise<any>;
  createMetadataProfile(profile: any): Promise<any>;
  updateMetadataProfile(id: number, profile: any): Promise<any>;

  // System/Health Check
  getSystemStatus(): Promise<any>;
  testConnection(): Promise<boolean>;
}

export class UnifiedClient implements IArrClient {
  private api!: IArrClient;
  private type: ArrType;

  constructor(type: ArrType, baseUrl: string, apiKey: string) {
    this.type = type;

    switch (type) {
      case "SONARR":
        this.api = new SonarrClient(baseUrl, apiKey);
        break;
      case "RADARR":
        this.api = new RadarrClient(baseUrl, apiKey);
        break;
      case "READARR":
        this.api = new ReadarrClient(baseUrl, apiKey);
        break;
      case "WHISPARR":
        this.api = new WhisparrClient(baseUrl, apiKey);
        break;
      default:
        throw new Error(`Invalid API type: ${type}`);
    }
  }

  async getQualityDefinitions() {
    return await this.api.getQualityDefinitions();
  }

  async updateQualityDefinitions(definitions: any) {
    return await this.api.updateQualityDefinitions(definitions);
  }

  async createQualityProfile(profile: any) {
    return await this.api.createQualityProfile(profile);
  }

  async getQualityProfiles() {
    return await this.api.getQualityProfiles();
  }

  async updateQualityProfile(id: string, profile: any) {
    return await this.api.updateQualityProfile(id, profile);
  }

  // Readarr-specific methods
  async createMetadataProfile(profile: any) {
    return await this.api.createMetadataProfile(profile);
  }

  async getMetadataProfiles() {
    return await this.api.getMetadataProfiles();
  }

  async updateMetadataProfile(id: number, profile: any) {
    return await this.api.updateMetadataProfile(id, profile);
  }

  async getCustomFormats() {
    return await this.api.getCustomFormats();
  }

  async createCustomFormat(format: MergedCustomFormatResource) {
    return await this.api.createCustomFormat(format);
  }

  async updateCustomFormat(id: string, format: MergedCustomFormatResource) {
    return await this.api.updateCustomFormat(id, format);
  }

  async deleteCustomFormat(id: string) {
    return await this.api.deleteCustomFormat(id);
  }

  async getSystemStatus() {
    return await this.api.getSystemStatus();
  }

  async testConnection() {
    return await this.api.testConnection();
  }

  // Helper method to check if a specific feature is supported
  supportsFeature(feature: "metadataProfiles" | "qualityProfiles" | "qualityDefinitions"): boolean {
    switch (feature) {
      case "metadataProfiles":
        return this.type === "READARR";
      case "qualityProfiles":
      case "qualityDefinitions":
        return true; // Supported by all types
      default:
        return false;
    }
  }
}
