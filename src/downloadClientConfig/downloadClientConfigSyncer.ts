import { ServerCache } from "../cache";
import { RadarrClient } from "../clients/radarr-client";
import { SonarrClient } from "../clients/sonarr-client";
import { LidarrClient } from "../clients/lidarr-client";
import { ReadarrClient } from "../clients/readarr-client";
import { WhisparrClient } from "../clients/whisparr-client";
import { getUnifiedClient } from "../clients/unified-client";
import { logger } from "../logger";
import { ArrType } from "../types/common.types";
import { InputConfigDownloadClientConfig, MergedConfigInstance } from "../types/config.types";
import { getEnvs } from "../env";
import { camelToSnake, snakeToCamel } from "../util";
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
 * Check if server config differs from desired config
 */
function configHasChanges(serverConfig: Record<string, any>, desiredConfig: Record<string, any>): boolean {
  for (const [key, value] of Object.entries(desiredConfig)) {
    if (serverConfig[key] !== value) {
      return true;
    }
  }
  return false;
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
    return { updated: false, arrType };
  }

  try {
    const api = getUnifiedClient();

    // Get specific client for this arrType
    let getConfigFn: () => Promise<Record<string, any>>;
    let updateConfigFn: (id: string, config: Record<string, any>) => Promise<Record<string, any>>;

    switch (arrType) {
      case "RADARR": {
        const radarrClient = api.getSpecificClient<RadarrClient>();
        getConfigFn = () => radarrClient.getDownloadClientConfig();
        updateConfigFn = (id: string, cfg: Record<string, any>) => radarrClient.updateDownloadClientConfig(id, cfg);
        break;
      }
      case "SONARR": {
        const sonarrClient = api.getSpecificClient<SonarrClient>();
        getConfigFn = () => sonarrClient.getDownloadClientConfig();
        updateConfigFn = (id: string, cfg: Record<string, any>) => sonarrClient.updateDownloadClientConfig(id, cfg);
        break;
      }
      case "LIDARR": {
        const lidarrClient = api.getSpecificClient<LidarrClient>();
        getConfigFn = () => lidarrClient.getDownloadClientConfig();
        updateConfigFn = (id: string, cfg: Record<string, any>) => lidarrClient.updateDownloadClientConfig(id, cfg);
        break;
      }
      case "READARR": {
        const readarrClient = api.getSpecificClient<ReadarrClient>();
        getConfigFn = () => readarrClient.getDownloadClientConfig();
        updateConfigFn = (id: string, cfg: Record<string, any>) => readarrClient.updateDownloadClientConfig(id, cfg);
        break;
      }
      case "WHISPARR": {
        const whisparrClient = api.getSpecificClient<WhisparrClient>();
        getConfigFn = () => whisparrClient.getDownloadClientConfig();
        updateConfigFn = (id: string, cfg: Record<string, any>) => whisparrClient.updateDownloadClientConfig(id, cfg);
        break;
      }
      default:
        throw new Error(`Unknown arrType: ${arrType}`);
    }

    // Fetch current server config
    logger.debug(`Fetching download client config from ${arrType}...`);
    const serverConfig = await getConfigFn();

    // Normalize and filter desired config
    const normalizedConfig = normalizeConfigFields(downloadClientConfig);
    const desiredConfig = filterFieldsByArrType(normalizedConfig, arrType);

    logger.debug(`Server config: ${JSON.stringify(serverConfig)}`);
    logger.debug(`Desired config: ${JSON.stringify(desiredConfig)}`);

    // Check if changes are needed
    if (!configHasChanges(serverConfig, desiredConfig)) {
      logger.info(`Download client config for ${arrType} is already up-to-date`);
      return { updated: false, arrType };
    }

    logger.info(`Download client config changes detected for ${arrType}`);

    if (getEnvs().DRY_RUN) {
      logger.info("DryRun: Would update download client config.");
      return { updated: true, arrType };
    }

    // Merge with server config to preserve unmanaged fields
    const mergedConfig = { ...serverConfig, ...desiredConfig };

    // Update the config
    const configId = serverConfig.id?.toString() || "1";
    logger.info(`Updating download client config for ${arrType}...`);
    await updateConfigFn(configId, mergedConfig);

    logger.info(`Successfully updated download client config for ${arrType}`);
    return { updated: true, arrType };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to sync download client config for ${arrType}: ${errorMessage}`);
    throw new Error(`Download client config sync failed for ${arrType}: ${errorMessage}`);
  }
}
