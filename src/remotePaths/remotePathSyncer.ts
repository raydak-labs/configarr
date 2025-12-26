import { ServerCache } from "../cache";
import { RadarrClient } from "../clients/radarr-client";
import { SonarrClient } from "../clients/sonarr-client";
import { LidarrClient } from "../clients/lidarr-client";
import { ReadarrClient } from "../clients/readarr-client";
import { WhisparrClient } from "../clients/whisparr-client";
import { getSpecificClient } from "../clients/unified-client";
import { logger } from "../logger";
import { ArrType } from "../types/common.types";
import {
  InputConfigRemotePath,
  RemotePathMappingResource,
  RemotePathSyncResult,
  RemotePathDiff,
  RemotePathConfigSchema,
} from "./remotePath.types";
import { MergedConfigInstance } from "../types/config.types";
import { getEnvs } from "../env";

/**
 * Normalize a path by removing trailing slashes
 * Radarr may add trailing slashes but we need consistent comparison
 */
function normalizePath(path: string): string {
  return path.replace(/\/+$/, "");
}

/**
 * Create a composite key for matching remote path mappings
 * Uses host + remote_path combination for uniqueness
 */
function createCompositeKey(host: string, remotePath: string): string {
  return `${host}||${normalizePath(remotePath)}`;
}

/**
 * Validate remote path configuration
 * Throws if validation fails
 */
function validateRemotePathConfig(remotePaths: InputConfigRemotePath[]): void {
  // Check for duplicates by host + remote_path combination
  const keys = new Set<string>();
  for (const config of remotePaths) {
    const key = createCompositeKey(config.host, config.remote_path);
    if (keys.has(key)) {
      throw new Error(`Duplicate remote path mapping: '${config.host} + ${config.remote_path}' already configured.`);
    }
    keys.add(key);

    // Validate individual config
    try {
      RemotePathConfigSchema.parse(config);
    } catch (error) {
      throw new Error(`Invalid remote path config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Calculate the diff between config and server remote path mappings
 */
function calculateDiff(configs: InputConfigRemotePath[], serverMappings: RemotePathMappingResource[]): RemotePathDiff {
  const configMap = new Map<string, InputConfigRemotePath>();
  const serverMap = new Map<string, RemotePathMappingResource>();

  // Build config map
  for (const config of configs) {
    const key = createCompositeKey(config.host, config.remote_path);
    configMap.set(key, config);
  }

  // Build server map
  for (const mapping of serverMappings) {
    if (mapping.host && mapping.remotePath) {
      const key = createCompositeKey(mapping.host, mapping.remotePath);
      serverMap.set(key, mapping);
    }
  }

  const toCreate: InputConfigRemotePath[] = [];
  const toUpdate: Array<{ id: number; config: InputConfigRemotePath }> = [];
  let unchanged = 0;

  // Find items to create or update
  for (const [key, config] of configMap) {
    const serverMapping = serverMap.get(key);
    if (!serverMapping) {
      toCreate.push(config);
    } else if (serverMapping.localPath !== config.local_path) {
      if (serverMapping.id) {
        toUpdate.push({ id: serverMapping.id, config });
      }
    } else {
      unchanged++;
    }
  }

  // Find items to delete
  const toDelete = Array.from(serverMap.entries())
    .filter(([key]) => !configMap.has(key))
    .map(([, mapping]) => ({ id: mapping.id! }));

  return { toCreate, toUpdate, toDelete, unchanged };
}

/**
 * Sync remote path mappings for a specific *Arr instance
 */
export async function syncRemotePaths(
  arrType: ArrType,
  config: MergedConfigInstance,
  serverCache: ServerCache,
): Promise<RemotePathSyncResult> {
  const remotePaths = config.download_clients?.remote_paths;
  const deleteUnmanaged = config.download_clients?.delete_unmanaged_remote_paths ?? false;

  logger.debug(`[DEBUG] download_clients: ${JSON.stringify(config.download_clients)}`);
  logger.debug(`[DEBUG] remote_paths: ${JSON.stringify(remotePaths)}`);
  logger.debug(`[DEBUG] delete_unmanaged_remote_paths: ${deleteUnmanaged}`);

  // If remote_paths is undefined/not present, skip management entirely
  if (remotePaths === undefined) {
    logger.debug(`No remote path mappings specified for ${arrType}`);
    return { created: 0, updated: 0, deleted: 0, unchanged: 0, arrType };
  }

  // If remote_paths is empty array [], skip unless delete_unmanaged is enabled
  // This allows users to opt-in to deleting all remote paths with delete_unmanaged_remote_paths: true
  if (remotePaths.length === 0) {
    if (!deleteUnmanaged) {
      logger.debug(`No remote path mappings specified for ${arrType}`);
      return { created: 0, updated: 0, deleted: 0, unchanged: 0, arrType };
    }
    logger.debug(`Empty remote_paths with delete_unmanaged_remote_paths enabled for ${arrType} - will delete all existing mappings`);
  }

  try {
    // Validate config
    validateRemotePathConfig(remotePaths);

    // Get specific client for this arrType
    let client: RadarrClient | SonarrClient | LidarrClient | ReadarrClient | WhisparrClient;

    switch (arrType) {
      case "RADARR":
        client = getSpecificClient<RadarrClient>();
        break;
      case "SONARR":
        client = getSpecificClient<SonarrClient>();
        break;
      case "LIDARR":
        client = getSpecificClient<LidarrClient>();
        break;
      case "READARR":
        client = getSpecificClient<ReadarrClient>();
        break;
      case "WHISPARR":
        client = getSpecificClient<WhisparrClient>();
        break;
      default:
        throw new Error(`Unknown arrType: ${arrType}`);
    }

    // Fetch current server mappings
    logger.debug(`Fetching remote path mappings from ${arrType}...`);
    const serverMappings = await client.getRemotePathMappings();

    // Calculate diff
    const diff = calculateDiff(remotePaths, serverMappings);

    logger.debug(
      `Remote path mapping diff for ${arrType}: create=${diff.toCreate.length}, update=${diff.toUpdate.length}, delete=${diff.toDelete.length}, unchanged=${diff.unchanged}`,
    );

    // Check if any changes needed
    if (diff.toCreate.length === 0 && diff.toUpdate.length === 0 && diff.toDelete.length === 0) {
      logger.info(`Remote path mappings for ${arrType} are already up-to-date`);
      return { created: 0, updated: 0, deleted: 0, unchanged: diff.unchanged, arrType };
    }

    logger.info(`Remote path mapping changes detected for ${arrType}`);

    // Respect dry-run mode
    if (getEnvs().DRY_RUN) {
      logger.info(
        `DryRun: Would create ${diff.toCreate.length}, update ${diff.toUpdate.length}, delete ${diff.toDelete.length} remote path mappings for ${arrType}`,
      );
      return {
        created: diff.toCreate.length,
        updated: diff.toUpdate.length,
        deleted: diff.toDelete.length,
        unchanged: diff.unchanged,
        arrType,
      };
    }

    // Execute operations
    let created = 0;
    let updated = 0;
    let deleted = 0;

    // Create new mappings
    for (const config of diff.toCreate) {
      try {
        await client.createRemotePathMapping({
          host: config.host,
          remotePath: config.remote_path,
          localPath: config.local_path,
        });
        created++;
        logger.info(`Created remote path mapping: ${config.host} => ${config.remote_path} -> ${config.local_path}`);
      } catch (error) {
        // Check if the error is because the remotePath already exists
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes("RemotePath already configured") || errorMsg.includes("already exists")) {
          // Try to find the existing mapping and update it (match by host AND remotePath)
          const normalizedConfigPath = normalizePath(config.remote_path);
          const existingMapping = serverMappings.find(
            (m) => m.host === config.host && m.remotePath && normalizePath(m.remotePath) === normalizedConfigPath,
          );
          if (existingMapping && existingMapping.id) {
            logger.debug(`RemotePath '${config.host} + ${config.remote_path}' already exists. Attempting to update instead.`);
            try {
              await client.updateRemotePathMapping(existingMapping.id.toString(), {
                id: existingMapping.id,
                host: config.host,
                remotePath: config.remote_path,
                localPath: config.local_path,
              });
              updated++;
              logger.info(`Updated existing remote path mapping: ${config.host} => ${config.remote_path} -> ${config.local_path}`);
              continue;
            } catch (updateError) {
              logger.error(
                `Failed to update remote path mapping: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
              );
              throw updateError;
            }
          }
        }
        logger.error(`Failed to create remote path mapping for ${config.host}/${config.remote_path}: ${errorMsg}`);
        throw error;
      }
    }

    // Update existing mappings
    for (const { id, config } of diff.toUpdate) {
      try {
        await client.updateRemotePathMapping(id.toString(), {
          id,
          host: config.host,
          remotePath: config.remote_path,
          localPath: config.local_path,
        });
        updated++;
        logger.info(`Updated remote path mapping: ${config.host} => ${config.remote_path} -> ${config.local_path}`);
      } catch (error) {
        logger.error(`Failed to update remote path mapping ${id}: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }

    // Delete removed mappings
    for (const { id } of diff.toDelete) {
      try {
        await client.deleteRemotePathMapping(id.toString());
        deleted++;
        logger.info(`Deleted remote path mapping: ${id}`);
      } catch (error) {
        logger.error(`Failed to delete remote path mapping ${id}: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }

    logger.info(`Successfully synced remote path mappings for ${arrType}: created=${created}, updated=${updated}, deleted=${deleted}`);
    return { created, updated, deleted, unchanged: diff.unchanged, arrType };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to sync remote path mappings for ${arrType}: ${errorMessage}`);
    throw new Error(`Remote path mapping sync failed for ${arrType}: ${errorMessage}`);
  }
}
