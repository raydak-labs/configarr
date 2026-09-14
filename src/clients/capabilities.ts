import type { DownloadClientResource } from "../types/download-client.types";

export interface SystemClient {
  getSystemStatus(): Promise<unknown>;
  testConnection(): Promise<boolean>;
}

export interface TagLike {
  id?: number;
  label?: string | null;
}

export interface TagsClient<T extends TagLike = TagLike> {
  getTags(): Promise<T[]>;
  createTag(tag: T): Promise<T>;
}

export interface DownloadClientsClient {
  getDownloadClientSchema(): Promise<DownloadClientResource[]>;
  getDownloadClients(): Promise<DownloadClientResource[]>;
  createDownloadClient(client: DownloadClientResource): Promise<DownloadClientResource>;
  updateDownloadClient(id: string, client: DownloadClientResource): Promise<DownloadClientResource>;
  deleteDownloadClient(id: string): Promise<void>;
  testDownloadClient(client: DownloadClientResource): Promise<unknown>;
}

export interface QualityProfileLike {
  id?: number;
  name?: string | null;
}

export interface QualityProfilesClient<QP extends QualityProfileLike = QualityProfileLike> {
  getQualityProfiles(): Promise<QP[]>;
  createQualityProfile(profile: QP): Promise<QP>;
  updateQualityProfile(id: string, profile: QP): Promise<QP>;
  deleteQualityProfile(id: string): Promise<void>;
}

export interface CustomFormatLike {
  id?: number;
  name?: string | null;
  includeCustomFormatWhenRenaming?: boolean | null;
  specifications?: unknown;
}

export interface CustomFormatsClient<CF extends CustomFormatLike = CustomFormatLike> {
  getCustomFormats(): Promise<CF[]>;
  createCustomFormat(format: CF): Promise<CF>;
  updateCustomFormat(id: string, format: CF): Promise<CF>;
  deleteCustomFormat(id: string): Promise<void>;
}

export interface QualityDefinitionLike {
  id?: number;
  title?: string | null;
  minSize?: number | null;
  maxSize?: number | null;
  preferredSize?: number | null;
  quality?: {
    id?: number;
    name?: string | null;
    resolution?: number;
    source?: string;
  } | null;
}

export interface QualityDefinitionsClient<QD extends QualityDefinitionLike = QualityDefinitionLike> {
  getQualityDefinitions(): Promise<QD[]>;
  updateQualityDefinitions(definitions: QD[]): Promise<QD[]>;
}
