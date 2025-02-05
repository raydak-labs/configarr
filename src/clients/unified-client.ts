import { MergedCustomFormatResource, MergedQualityDefinitionResource, MergedQualityProfileResource } from "../__generated__/mergedTypes";
import { logger } from "../logger";
import { ArrType } from "../types/common.types";
import { LidarrClient } from "./lidarr-client";
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

export const logConnectionError = (error: any, arrType: ArrType) => {
  let message;
  const arrLabel = arrType.toLowerCase();
  const causeError = error?.cause?.message || error?.cause?.errors?.map((e: any) => e.message).join(";") || undefined;

  const errorMessage = (error.message && `Message: ${error.message}`) || "";
  const causeMessage = (causeError && `- Cause: ${causeError}`) || "";

  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    message = `Unable to retrieve data from ${arrLabel} API. Server responded with status code ${error.response.status}: ${error.response.statusText}. Please check the API server status or your request parameters.`;
  } else {
    // Something happened in setting up the request that triggered an Error
    message = `An unexpected error occurred while setting up the ${arrLabel} request: ${errorMessage} ${causeMessage}. Please try again.`;
  }

  return message;
};

export const configureApi = async (type: ArrType, baseUrl: string, apiKey: string) => {
  unsetApi();

  unifiedClient = new UnifiedClient(type, baseUrl, apiKey);
  let connectionSuccessful = false;

  try {
    connectionSuccessful = await unifiedClient.testConnection();
  } catch (error: any) {
    logger.error(`Unhandled connection error.`);
    throw error;
  }

  if (!connectionSuccessful) {
    throw new Error(`Could not connect to client: ${type} - ${baseUrl}`);
  }

  return unifiedClient;
};

export type ArrClientCustomFormat = {
  id?: number;
};

export type ArrClientQualityDefinition = {
  id?: number;
};

export type ArrClientQualityProfile = {
  id?: number;
  name?: string | null;
  // Add other common properties that all quality profiles share
};

export type ArrClientLanguageResource = {
  id?: number;
  name?: string | null;
  nameLower?: string | null;
};

export interface IArrClient<
  QP extends ArrClientQualityProfile = MergedQualityProfileResource,
  QD extends ArrClientQualityDefinition = MergedQualityDefinitionResource,
  CF extends ArrClientCustomFormat = MergedCustomFormatResource,
  L extends ArrClientLanguageResource = ArrClientLanguageResource,
> {
  // Quality Management
  getQualityDefinitions(): Promise<QD[]>;
  updateQualityDefinitions(definitions: QD[]): Promise<QD[]>;

  // Quality Profiles
  getQualityProfiles(): Promise<QP[]>;
  createQualityProfile(profile: QP): Promise<QP>;
  updateQualityProfile(id: string, profile: QP): Promise<QP>;

  // Custom Formats
  getCustomFormats(): Promise<CF[]>;
  createCustomFormat(format: CF): Promise<CF>;
  updateCustomFormat(id: string, format: CF): Promise<CF>;
  deleteCustomFormat(id: string): Promise<void>;

  getNaming(): Promise<any>;
  updateNaming(id: string, data: any): Promise<any>;

  getMediamanagement(): Promise<any>;
  updateMediamanagement(id: string, data: any): Promise<any>;

  getLanguages(): Promise<L[]>;

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
      case "LIDARR":
        this.api = new LidarrClient(baseUrl, apiKey);
        break;
      default:
        throw new Error(`Invalid API type: ${type}`);
    }
  }

  getSpecificClient<T extends IArrClient>(): T {
    return this.api as T;
  }

  async getLanguages() {
    return this.api.getLanguages();
  }

  async getQualityDefinitions() {
    return await this.api.getQualityDefinitions();
  }

  async updateQualityDefinitions(definitions: MergedQualityDefinitionResource[]) {
    return await this.api.updateQualityDefinitions(definitions);
  }

  async createQualityProfile(profile: MergedQualityProfileResource) {
    return await this.api.createQualityProfile(profile);
  }

  async getQualityProfiles() {
    return await this.api.getQualityProfiles();
  }

  async updateQualityProfile(id: string, profile: MergedQualityProfileResource) {
    return await this.api.updateQualityProfile(id, profile);
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

  async getNaming() {
    return this.api.getNaming();
  }

  async updateNaming(id: string, data: any) {
    return this.api.updateNaming(id, data);
  }

  async getMediamanagement() {
    return this.api.getMediamanagement();
  }

  async updateMediamanagement(id: string, data: any) {
    return this.api.updateMediamanagement(id, data);
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
