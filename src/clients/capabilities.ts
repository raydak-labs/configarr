import type { CustomFormatRequest } from "../customFormats/customFormat.types";
import type { MediaDownloadClientResource } from "../downloadClients/downloadClient.types";
import type { Tag } from "../tags/tag.types";

export type { Tag };

export interface SystemClient {
  getSystemStatus(): Promise<unknown>;
  testConnection(): Promise<boolean>;
}

export interface TagsClient<T extends Tag = Tag> {
  getTags(): Promise<T[]>;
  createTag(tag: T): Promise<T>;
}

export interface DownloadClientsClient<DownloadClient = MediaDownloadClientResource> {
  getDownloadClientSchema(): Promise<DownloadClient[]>;
  getDownloadClients(): Promise<DownloadClient[]>;
  createDownloadClient(client: DownloadClient): Promise<DownloadClient>;
  updateDownloadClient(id: string, client: DownloadClient): Promise<DownloadClient>;
  deleteDownloadClient(id: string): Promise<void>;
  testDownloadClient(client: DownloadClient): Promise<unknown>;
}

export interface QualityProfilesClient<QualityProfile extends { id?: number; name?: string | null }> {
  getQualityProfiles(): Promise<QualityProfile[]>;
  createQualityProfile(profile: QualityProfile): Promise<QualityProfile>;
  updateQualityProfile(id: string, profile: QualityProfile): Promise<QualityProfile>;
  deleteQualityProfile(id: string): Promise<void>;
}

export interface CustomFormatsClient<CustomFormat extends { id?: number; name?: string | null } = CustomFormatRequest> {
  getCustomFormats(): Promise<CustomFormat[]>;
  createCustomFormat(format: CustomFormatRequest): Promise<CustomFormat>;
  updateCustomFormat(id: string, format: CustomFormatRequest): Promise<CustomFormat>;
  deleteCustomFormat(id: string): Promise<void>;
}

export interface QualityDefinitionsClient<QualityDefinition extends { id?: number }> {
  getQualityDefinitions(): Promise<QualityDefinition[]>;
  updateQualityDefinitions(definitions: QualityDefinition[]): Promise<QualityDefinition[]>;
}
