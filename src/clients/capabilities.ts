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

export interface QualityProfileItemLike {
  id?: number;
  name?: string | null;
  quality?: {
    id?: number;
    name?: string | null;
    resolution?: number;
    source?: string;
  } | null;
  items?: QualityProfileItemLike[] | null;
  allowed?: boolean;
}

export interface ProfileFormatItemLike {
  id?: number;
  format?: number;
  name?: string | null;
  score?: number;
}

export interface QualityProfileLike {
  id?: number;
  name?: string | null;
  upgradeAllowed?: boolean;
  cutoff?: number;
  items?: QualityProfileItemLike[] | null;
  minFormatScore?: number;
  cutoffFormatScore?: number;
  minUpgradeFormatScore?: number;
  formatItems?: ProfileFormatItemLike[] | null;
  language?: LanguageLike | null;
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

export interface LanguageLike {
  id?: number;
  name?: string | null;
  nameLower?: string | null;
}

export interface DelayProfileProtocolItem {
  name?: string | null;
  protocol?: string | null;
  allowed?: boolean;
  delay?: number;
}

export interface DelayProfileLike {
  id?: number;
  name?: string | null;
  tags?: number[] | null;
  enableUsenet?: boolean;
  enableTorrent?: boolean;
  preferredProtocol?: string;
  usenetDelay?: number;
  torrentDelay?: number;
  bypassIfHighestQuality?: boolean;
  bypassIfAboveCustomFormatScore?: boolean;
  minimumCustomFormatScore?: number;
  order?: number;
  items?: DelayProfileProtocolItem[] | null;
}

export interface DelayProfilesClient<DP extends DelayProfileLike = DelayProfileLike> {
  getDelayProfiles(): Promise<DP[]>;
  createDelayProfile(profile: DP): Promise<DP>;
  updateDelayProfile(id: string, data: DP): Promise<DP>;
  deleteDelayProfile(id: string): Promise<unknown>;
}

export interface NamingLike {
  id?: number;
}

export interface NamingClient<N extends NamingLike = NamingLike> {
  getNaming(): Promise<N>;
  updateNaming(id: string, data: N): Promise<N>;
}

export interface MediaManagementLike {
  id?: number;
}

export interface MediaManagementClient<M extends MediaManagementLike = MediaManagementLike> {
  getMediamanagement(): Promise<M>;
  updateMediamanagement(id: string, data: M): Promise<M>;
}
