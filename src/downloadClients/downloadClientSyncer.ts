import { ServerCache } from "../cache";
import { ArrType } from "../types/common.types";
import { MergedConfigInstance, InputConfigDownloadClient } from "../types/config.types";
import type { DownloadClientResource } from "../types/download-client.types";
import { BaseDownloadClientSync, DownloadClientError } from "./downloadClientBase";
import { GenericDownloadClientSync } from "./downloadClientGeneric";
import { DownloadClientSyncResult, ValidationResult, ConnectionTestResult, TagLike } from "./downloadClient.types";

// ============================================================================
// FACTORY PATTERN
// ============================================================================

/**
 * Factory function to create the appropriate download client sync implementation
 * Follows the established pattern used by createRootFolderSync and createMetadataProfileSync
 *
 * For now, all ARR types use the GenericDownloadClientSync implementation.
 * This architecture allows for easy addition of type-specific implementations in the future
 * (e.g., LidarrDownloadClientSync for music-specific logic).
 *
 * @param arrType - The ARR application type
 * @returns Appropriate download client sync implementation
 */
export function createDownloadClientSync(arrType: ArrType): BaseDownloadClientSync {
  // Currently, all types use the generic implementation
  // Future: Add type-specific implementations here as needed
  return new GenericDownloadClientSync(arrType);
}

// ============================================================================
// PUBLIC SYNC API
// ============================================================================

/**
 * Synchronize download clients configuration
 * Main entry point that follows the established pattern of syncRootFolders and syncMetadataProfiles
 *
 * This function provides a clean interface that matches the pattern used by other syncers:
 * - Takes arrType as first parameter
 * - Takes config object as second parameter
 * - Takes serverCache as third parameter
 * - Returns structured sync result
 *
 * @param arrType - Type of *arr application being configured
 * @param config - Merged configuration instance containing download client configs
 * @param serverCache - Server cache for storing/retrieving server data
 * @returns Synchronization result with counts of added/updated/removed clients
 *
 * @example
 * ```typescript
 * const result = await syncDownloadClients(
 *   "RADARR",
 *   config,
 *   serverCache
 * );
 * console.log(`Synced: +${result.added} ~${result.updated} -${result.removed}`);
 * ```
 */
export async function syncDownloadClients(
  arrType: ArrType,
  config: MergedConfigInstance,
  serverCache: ServerCache,
): Promise<DownloadClientSyncResult> {
  const sync = createDownloadClientSync(arrType);
  return sync.syncDownloadClients(config, serverCache);
}

// ============================================================================
// BACKWARD COMPATIBILITY RE-EXPORTS
// ============================================================================

/**
 * Re-export utilities that were previously available from the original download-clients.ts
 * This maintains backward compatibility for any external consumers
 */

// Lazy initialization for sync instance - only create when needed
let _genericSync: GenericDownloadClientSync | null = null;

const getGenericSync = (): GenericDownloadClientSync => {
  if (!_genericSync) {
    _genericSync = new GenericDownloadClientSync("SONARR");
  }
  return _genericSync;
};

// Re-export utility functions that use the sync instance
export const validateDownloadClient = (config: InputConfigDownloadClient, schema: DownloadClientResource[]): ValidationResult => {
  return getGenericSync().validateDownloadClient(config, schema);
};

export const resolveTagNamesToIds = (tagNames: (string | number)[], serverTags: TagLike[]): { ids: number[]; missingTags: string[] } => {
  return getGenericSync().resolveTagNamesToIds(tagNames, serverTags);
};

export const getCategoryFieldName = (arrType: ArrType): string => {
  return getGenericSync().getCategoryFieldName(arrType);
};

export const normalizeConfigFields = (configFields: Record<string, any>, arrType: ArrType): Record<string, any> => {
  return getGenericSync().normalizeConfigFields(configFields, arrType);
};

// Create a temporary generic sync for utility functions that need it
const createTempSync = (arrType: ArrType): GenericDownloadClientSync => {
  return new GenericDownloadClientSync(arrType);
};

export const isDownloadClientEqual = (
  config: InputConfigDownloadClient,
  server: DownloadClientResource,
  cache: ServerCache,
  arrType: ArrType,
): boolean => {
  const sync = createTempSync(arrType);
  return sync.isDownloadClientEqual(config, server, cache);
};

export const shouldUsePartialUpdate = (config: InputConfigDownloadClient): boolean => {
  const sync = createTempSync("SONARR");
  return sync.shouldUsePartialUpdate(config);
};

export const filterUnmanagedClients = (
  serverClients: DownloadClientResource[],
  configClients: InputConfigDownloadClient[],
  deleteConfig: MergedConfigInstance["delete_unmanaged_download_clients"],
): DownloadClientResource[] => {
  return getGenericSync().filterUnmanagedClients(serverClients, configClients, deleteConfig);
};

// Re-export types
export type { ValidationResult, ConnectionTestResult, TagLike, DownloadClientSyncResult };

// Re-export error class
export { DownloadClientError };
