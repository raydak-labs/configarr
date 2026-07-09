import { ServerCache } from "../cache";
import { RadarrClient } from "../clients/radarr-client";
import { SonarrClient } from "../clients/sonarr-client";
import { LidarrClient } from "../clients/lidarr-client";
import { ReadarrClient } from "../clients/readarr-client";
import { WhisparrClient } from "../clients/whisparr-client";
import { getSpecificClient } from "../clients/unified-client";
import { DiffEntry } from "../diffReport/diffReport.types";
import { logger } from "../logger";
import { ArrType } from "../types/common.types";
import { InputConfigDownloadClientConfig, MergedConfigInstance } from "../types/config.types";
import { getEnvs } from "../env";
import { camelToSnake, compareObjectsCarr, snakeToCamel } from "../util";
import { DownloadClientConfigSyncResult } from "./downloadClientConfig.types";

/**
 * Normalize field names from snake_case (config) to camelCase (server)
 */
function normalizeConfigFields(configFields: InputConfigDownloadClientConfig): Record<string, any> {
  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(configFields)) {
    if (value !== undefined) {
      const camelKey = snakeToCamel(key);
      normalized[camelKey] = value;
    }
  }

  return normalized;
}

/**
 * Filter config fields based on arrType support
 * Returns only fields that are supported by the specific arrType
 */
function filterFieldsByArrType(fields: Record<string, any>, arrType: ArrType): Record<string, any> {
  const filtered: Record<string, any> = {};

  // Common fields for all *arr types
  const commonFields = ["downloadClientWorkingFolders", "enableCompletedDownloadHandling", "autoRedownloadFailed"];

  // Instance-specific fields
  const radarrOnlyFields = ["checkForFinishedDownloadInterval"];
  const nonWhisparrFields = ["autoRedownloadFailedFromInteractiveSearch"];

  for (const [key, value] of Object.entries(fields)) {
    // Include common fields
    if (commonFields.includes(key)) {
      filtered[key] = value;
      continue;
    }

    // Radarr-only field
    if (radarrOnlyFields.includes(key)) {
      if (arrType === "RADARR") {
        filtered[key] = value;
      }
      continue;
    }

    // Non-Whisparr field (Sonarr, Lidarr, Readarr have this)
    if (nonWhisparrFields.includes(key)) {
      if (arrType !== "WHISPARR") {
        filtered[key] = value;
      }
      continue;
    }
  }

  return filtered;
}

/**
 * Sync download client configuration for a specific *arr instance
 */
export async function syncDownloadClientConfig(
  arrType: ArrType,
  config: MergedConfigInstance,
  serverCache: ServerCache,
): Promise<DownloadClientConfigSyncResult> {
  const downloadClientConfig = config.download_clients?.config;

  if (!downloadClientConfig) {
    logger.debug(`No download client config specified for ${arrType}`);
    return { updated: false, arrType, fieldChanges: [] };
  }

  try {
    // Get specific client for this arrType - TypeScript infers the correct type
    const client = getSpecificClient(arrType);

    // Fetch current server config
    logger.debug(`Fetching download client config from ${arrType}...`);
    const serverConfig = await client.getDownloadClientConfig();

    // Normalize and filter desired config
    const normalizedConfig = normalizeConfigFields(downloadClientConfig);
    const desiredConfig = filterFieldsByArrType(normalizedConfig, arrType);

    logger.debug(`Server config: ${JSON.stringify(serverConfig)}`);
    logger.debug(`Desired config: ${JSON.stringify(desiredConfig)}`);

    // Check if changes are needed
    const { changes, equal } = compareObjectsCarr(serverConfig, desiredConfig);

    if (equal) {
      logger.info(`Download client config for ${arrType} is already up-to-date`);
      return { updated: false, arrType, fieldChanges: [] };
    }

    logger.info(`Download client config changes detected for ${arrType}`);

    if (getEnvs().DRY_RUN) {
      logger.info("DryRun: Would update download client config.");
      return { updated: true, arrType, fieldChanges: changes };
    }

    // Merge with server config to preserve unmanaged fields
    const mergedConfig = { ...serverConfig, ...desiredConfig };

    // Update the config
    const configId = serverConfig.id?.toString() || "1";
    logger.info(`Updating download client config for ${arrType}...`);
    await client.updateDownloadClientConfig(configId, mergedConfig);

    logger.info(`Successfully updated download client config for ${arrType}`);
    return { updated: true, arrType, fieldChanges: changes };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to sync download client config for ${arrType}: ${errorMessage}`);
    throw new Error(`Download client config sync failed for ${arrType}: ${errorMessage}`);
  }
}

export function downloadClientConfigDiffToDiffEntries(result: DownloadClientConfigSyncResult): DiffEntry[] {
  if (!result.updated) {
    return [];
  }
  return [{ resourceType: "DownloadClientConfig", name: result.arrType, action: "update", fieldChanges: result.fieldChanges }];
}
