import type { DownloadClientResource } from "../types/download-client.types";

export interface SystemClient {
  getSystemStatus(): Promise<unknown>;
  testConnection(): Promise<boolean>;
}

export interface Tag {
  id?: number;
  label?: string | null;
}

export interface TagsClient<T extends Tag = Tag> {
  getTags(): Promise<T[]>;
  createTag(tag: T): Promise<T>;
}

export interface DownloadClientsClient<DC = DownloadClientResource> {
  getDownloadClientSchema(): Promise<DC[]>;
  getDownloadClients(): Promise<DC[]>;
  createDownloadClient(client: DC): Promise<DC>;
  updateDownloadClient(id: string, client: DC): Promise<DC>;
  deleteDownloadClient(id: string): Promise<void>;
  testDownloadClient(client: DC): Promise<unknown>;
}

export interface QualityProfilesClient<QP extends { id?: number; name?: string | null }> {
  getQualityProfiles(): Promise<QP[]>;
  createQualityProfile(profile: QP): Promise<QP>;
  updateQualityProfile(id: string, profile: QP): Promise<QP>;
  deleteQualityProfile(id: string): Promise<void>;
}

export interface CustomFormatsClient<CF extends { id?: number; name?: string | null }> {
  getCustomFormats(): Promise<CF[]>;
  createCustomFormat(format: CF): Promise<CF>;
  updateCustomFormat(id: string, format: CF): Promise<CF>;
  deleteCustomFormat(id: string): Promise<void>;
}

export interface QualityDefinitionsClient<QD extends { id?: number }> {
  getQualityDefinitions(): Promise<QD[]>;
  updateQualityDefinitions(definitions: QD[]): Promise<QD[]>;
}
