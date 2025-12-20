import { MergedCustomFormatResource, MergedQualityDefinitionResource, MergedQualityProfileResource } from "../__generated__/mergedTypes";
import { logger } from "../logger";
import { ArrType } from "../types/common.types";
import type { DownloadClientResource } from "../types/download-client.types";
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

/**
 * Get the underlying specific client instance
 * This bypasses the unified client wrapper and returns the actual RadarrClient, SonarrClient, etc.
 */
export const getSpecificClient = <T extends RadarrClient | SonarrClient | LidarrClient | ReadarrClient | WhisparrClient>(): T => {
  const client = getUnifiedClient();
  return (client as any).api as T;
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
  const arrLabel = arrType.toLowerCase();
  const errorParts = createConnectionErrorParts(error);

  if (errorParts.length > 0) {
    const [friendlyMessage, structuredMessage] = errorParts;
    const bestMessage = structuredMessage || friendlyMessage;
    return `Connection to ${arrLabel} API failed: ${bestMessage}`;
  }

  // Fallback to original logic if createConnectionErrorParts returns empty
  const causeError = error?.cause?.message || error?.cause?.errors?.map((e: any) => e.message).join(";") || undefined;
  const errorMessage = (error.message && `Message: ${error.message}`) || "";
  const causeMessage = (causeError && `- Cause: ${causeError}`) || "";

  if (error.response) {
    return `Unable to retrieve data from ${arrLabel} API. Server responded with status code ${error.response.status}: ${error.response.statusText}. Please check the API server status or your request parameters.`;
  } else {
    return `An unexpected error occurred while setting up the ${arrLabel} request: ${errorMessage} ${causeMessage}. Please try again.`;
  }
};

/**
 * Create detailed error parts for connection testing and error reporting
 * Returns an array of error messages with structured details and user-friendly messages
 */
export const createConnectionErrorParts = (error: unknown): string[] => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const httpError = error as any;

  const status = httpError?.response?.status;
  const data = httpError?.response?.data;

  let structuredDetail: string | undefined;

  if (data) {
    if (typeof data === "string") {
      structuredDetail = data;
    } else if (typeof data === "object" && data !== null) {
      const message = (data as any).message ?? (data as any).error;
      const errors = Array.isArray((data as any).errors)
        ? (data as any).errors.map((e: any) => e.errorMessage ?? e.message ?? String(e)).join("; ")
        : undefined;

      structuredDetail = [message, errors].filter(Boolean).join(" - ") || undefined;
    }
  }

  const statusPrefix = status ? `HTTP ${status}` : "Connection test failed";
  const structuredMessage = structuredDetail ? `${statusPrefix}: ${structuredDetail}` : statusPrefix;

  // Common connection error patterns with user-friendly messages
  let friendly: string | undefined;
  if (errorMessage.includes("connection refused") || errorMessage.includes("ECONNREFUSED")) {
    friendly = "Connection refused - check host and port";
  } else if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT")) {
    friendly = "Connection timeout - check network connectivity";
  } else if (errorMessage.includes("unauthorized") || errorMessage.includes("401")) {
    friendly = "Authentication failed - check username/password/API key";
  } else if (errorMessage.includes("not found") || errorMessage.includes("404")) {
    friendly = "Endpoint not found - check URL base path";
  }

  return [friendly, structuredMessage, errorMessage].filter((part, index, self) => part && self.indexOf(part) === index) as string[];
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
  deleteQualityProfile(id: string): Promise<void>;

  // Custom Formats
  getCustomFormats(): Promise<CF[]>;
  createCustomFormat(format: CF): Promise<CF>;
  updateCustomFormat(id: string, format: CF): Promise<CF>;
  deleteCustomFormat(id: string): Promise<void>;

  getNaming(): Promise<any>;
  updateNaming(id: string, data: any): Promise<any>;

  getMediamanagement(): Promise<any>;
  updateMediamanagement(id: string, data: any): Promise<any>;

  getRootfolders(): Promise<any>;
  addRootFolder(data: any): Promise<any>;
  updateRootFolder(id: string, data: any): Promise<any>;
  deleteRootFolder(id: string): Promise<any>;

  getLanguages(): Promise<L[]>;

  // Delay Profiles
  getDelayProfiles(): Promise<any>;
  createDelayProfile(profile: any): Promise<any>;
  updateDelayProfile(id: string, data: any): Promise<any>;
  deleteDelayProfile(id: string): Promise<any>;

  // Tags
  getTags(): Promise<any>;
  createTag(tag: any): Promise<any>;
  // deleteTag(id: string): Promise<void>;
  // updateTag(id: string, tag: any): Promise<any>;

  // Download Clients
  getDownloadClientSchema(): Promise<DownloadClientResource[]>;
  getDownloadClients(): Promise<DownloadClientResource[]>;
  createDownloadClient(client: DownloadClientResource): Promise<DownloadClientResource>;
  updateDownloadClient(id: string, client: DownloadClientResource): Promise<DownloadClientResource>;
  deleteDownloadClient(id: string): Promise<void>;
  testDownloadClient(client: DownloadClientResource): Promise<any>;

  // System/Health Check
  getSystemStatus(): Promise<any>;
  testConnection(): Promise<boolean>;
}

export class UnifiedClient implements IArrClient {
  private api!: IArrClient;

  constructor(type: ArrType, baseUrl: string, apiKey: string) {
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

  async deleteQualityProfile(id: string) {
    return await this.api.deleteQualityProfile(id);
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

  async getRootfolders() {
    return this.api.getRootfolders();
  }

  async addRootFolder(data: any) {
    return this.api.addRootFolder(data);
  }

  async updateRootFolder(id: string, data: any) {
    return this.api.updateRootFolder(id, data);
  }

  async deleteRootFolder(id: string) {
    return this.api.deleteRootFolder(id);
  }

  async getDelayProfiles() {
    return this.api.getDelayProfiles();
  }

  async createDelayProfile(profile: any) {
    return this.api.createDelayProfile(profile);
  }

  async updateDelayProfile(id: string, data: any) {
    return this.api.updateDelayProfile(id, data);
  }

  async deleteDelayProfile(id: string) {
    return this.api.deleteDelayProfile(id);
  }

  async getTags() {
    return this.api.getTags();
  }

  async createTag(tag: any) {
    return this.api.createTag(tag);
  }

  async getDownloadClientSchema() {
    return this.api.getDownloadClientSchema();
  }

  async getDownloadClients() {
    return this.api.getDownloadClients();
  }

  async createDownloadClient(client: DownloadClientResource): Promise<DownloadClientResource> {
    return this.api.createDownloadClient(client);
  }

  async updateDownloadClient(id: string, client: DownloadClientResource): Promise<DownloadClientResource> {
    return this.api.updateDownloadClient(id, client);
  }

  async deleteDownloadClient(id: string): Promise<void> {
    return this.api.deleteDownloadClient(id);
  }

  async testDownloadClient(client: DownloadClientResource): Promise<any> {
    return this.api.testDownloadClient(client);
  }

  async getSystemStatus() {
    return await this.api.getSystemStatus();
  }

  async testConnection() {
    return await this.api.testConnection();
  }
}
