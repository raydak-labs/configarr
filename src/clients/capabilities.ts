import type { CustomFormatRequest } from "../customFormats/customFormat.types";
import type { DelayProfileShared } from "../delayProfiles/delayProfile.types";
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

export interface DownloadClientsClient<
  DownloadClient extends { id?: number; name?: string | null } = { id?: number; name?: string | null; implementation?: string | null },
> {
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

export interface DelayProfilesWriter {
  createDelayProfile(profile: DelayProfileShared): Promise<unknown>;
  updateDelayProfile(id: string, profile: DelayProfileShared): Promise<unknown>;
  deleteDelayProfile(id: string): Promise<void>;
}

export interface DelayProfilesClient<DelayProfile extends DelayProfileShared = DelayProfileShared> extends DelayProfilesWriter {
  getDelayProfiles(): Promise<DelayProfile[]>;
}

export interface RootFoldersClient<RootFolder extends { id?: number; path?: string | null } = { id?: number; path?: string | null }> {
  getRootfolders(): Promise<RootFolder[]>;
  addRootFolder(data: RootFolder): Promise<unknown>;
  updateRootFolder(id: string, data: RootFolder): Promise<unknown>;
  deleteRootFolder(id: string): Promise<unknown>;
}

export interface MediaManagementClient<Naming extends { id?: number }, Management extends { id?: number }> {
  getNaming(): Promise<Naming>;
  updateNaming(id: string, data: Naming): Promise<unknown>;
  getMediamanagement(): Promise<Management>;
  updateMediamanagement(id: string, data: Management): Promise<unknown>;
}

export interface MetadataProfilesClient<T extends { id?: number; name?: string | null }> {
  getMetadataProfiles(): Promise<T[]>;
  createMetadataProfile(profile: T): Promise<T>;
  updateMetadataProfile(id: string, profile: T): Promise<T>;
  deleteMetadataProfile(id: string): Promise<void>;
}
