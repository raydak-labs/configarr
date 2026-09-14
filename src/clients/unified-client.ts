import { MergedCustomFormatResource, MergedQualityDefinitionResource, MergedQualityProfileResource } from "../types/merged.types";
import { logger } from "../logger";
import { ArrType } from "../types/common.types";
import type { DownloadClientResource } from "../types/download-client.types";
import { LidarrClient } from "./lidarr-client";
import { ProwlarrClient } from "./prowlarr-client";
import { RadarrClient } from "./radarr-client";
import { ReadarrClient } from "./readarr-client";
import { SonarrClient } from "./sonarr-client";
import { WhisparrClient } from "./whisparr-client";

export { createConnectionErrorParts, logConnectionError, validateClientParams } from "./connection";

export type ArrTypeToClient = {
  RADARR: RadarrClient;
  SONARR: SonarrClient;
  LIDARR: LidarrClient;
  READARR: ReadarrClient;
  WHISPARR: WhisparrClient;
  PROWLARR: ProwlarrClient;
};

type ConfiguredClient = {
  [K in ArrType]: { type: K; api: ArrTypeToClient[K] };
}[ArrType];

let configured: ConfiguredClient | undefined;

export const unsetApi = () => {
  configured = undefined;
};

const createClient = (type: ArrType, baseUrl: string, apiKey: string): ArrTypeToClient[ArrType] => {
  switch (type) {
    case "SONARR":
      return new SonarrClient(baseUrl, apiKey);
    case "RADARR":
      return new RadarrClient(baseUrl, apiKey);
    case "READARR":
      return new ReadarrClient(baseUrl, apiKey);
    case "WHISPARR":
      return new WhisparrClient(baseUrl, apiKey);
    case "LIDARR":
      return new LidarrClient(baseUrl, apiKey);
    case "PROWLARR":
      return new ProwlarrClient(baseUrl, apiKey);
  }
};

export function getClient<T extends ArrType>(arrType: T): ArrTypeToClient[T] {
  if (!configured) {
    throw new Error("Please configure API first.");
  }
  if (configured.type !== arrType) {
    throw new Error(
      `Type mismatch: requested ${arrType} but client is configured for ${configured.type}. Ensure configureApi is called with the correct arrType.`,
    );
  }
  return configured.api as ArrTypeToClient[T];
}

export const configureApi = async <T extends ArrType>(type: T, baseUrl: string, apiKey: string): Promise<ArrTypeToClient[T]> => {
  unsetApi();

  const api = createClient(type, baseUrl, apiKey);
  let connectionSuccessful = false;

  try {
    connectionSuccessful = await api.testConnection();
  } catch (error: unknown) {
    logger.error(`Unhandled connection error.`);
    throw error;
  }

  if (!connectionSuccessful) {
    throw new Error(`Could not connect to client: ${type} - ${baseUrl}`);
  }

  configured = { type, api } as ConfiguredClient;
  return api as ArrTypeToClient[T];
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
  getQualityDefinitions(): Promise<QD[]>;
  updateQualityDefinitions(definitions: QD[]): Promise<QD[]>;

  getQualityProfiles(): Promise<QP[]>;
  createQualityProfile(profile: QP): Promise<QP>;
  updateQualityProfile(id: string, profile: QP): Promise<QP>;
  deleteQualityProfile(id: string): Promise<void>;

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

  getDelayProfiles(): Promise<any>;
  createDelayProfile(profile: any): Promise<any>;
  updateDelayProfile(id: string, data: any): Promise<any>;
  deleteDelayProfile(id: string): Promise<any>;

  getTags(): Promise<any>;
  createTag(tag: any): Promise<any>;

  getDownloadClientSchema(): Promise<DownloadClientResource[]>;
  getDownloadClients(): Promise<DownloadClientResource[]>;
  createDownloadClient(client: DownloadClientResource): Promise<DownloadClientResource>;
  updateDownloadClient(id: string, client: DownloadClientResource): Promise<DownloadClientResource>;
  deleteDownloadClient(id: string): Promise<void>;
  testDownloadClient(client: DownloadClientResource): Promise<any>;

  getSystemStatus(): Promise<any>;
  testConnection(): Promise<boolean>;
}
