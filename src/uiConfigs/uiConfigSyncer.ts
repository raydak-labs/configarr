import { getSpecificClient } from "../clients/unified-client";
import { logger } from "../logger";
import { ArrType } from "../types/common.types";
import type { UiConfigType } from "../types/config.types";
import { UiConfigSyncResult, UiConfigResource } from "./uiConfig.types";
import { compareObjectsCarr } from "../util";
import { getEnvs } from "../env";

/**
 * Type guard to validate that server config has the required id field
 */
function hasValidId(config: Record<string, unknown>): config is UiConfigResource {
  return typeof config.id === "number" && config.id > 0;
}

/**
 * Sync UI config for a specific *Arr instance
 */
export async function syncUiConfig(arrType: ArrType, uiConfig: UiConfigType | undefined): Promise<UiConfigSyncResult> {
  // If ui_config is undefined/not present, skip management entirely
  if (uiConfig === undefined) {
    logger.debug(`No UI config specified for ${arrType}`);
    return { updated: false, arrType };
  }

  try {
    // Get specific client for this arrType - TypeScript infers the correct type
    const client = getSpecificClient(arrType);

    // Fetch current server UI config
    logger.debug(`Fetching UI config from ${arrType}...`);
    const serverConfig = await client.getUiConfig();

    // Cast to generic record for comparison - generated types don't have index signatures
    const serverConfigRecord = serverConfig as Record<string, unknown>;

    // Calculate diff directly using compareObjectsCarr
    const { changes, equal } = compareObjectsCarr(serverConfigRecord, uiConfig);

    if (equal) {
      logger.info(`UI config for ${arrType} is already up-to-date`);
      return { updated: false, arrType };
    }

    logger.info(`UI config changes detected for ${arrType}: ${changes.length} differences`);
    logger.debug(`UI config changes: ${changes.join(", ")}`);

    // Respect dry-run mode
    if (getEnvs().DRY_RUN) {
      logger.info(`DryRun: Would update UI config for ${arrType}`);
      return { updated: true, arrType };
    }

    // Validate server config has required id field
    if (!hasValidId(serverConfigRecord)) {
      throw new Error(`UI config for ${arrType} is missing required 'id' field`);
    }

    // Execute update - merge server config with local config
    const updatedConfig = {
      ...serverConfig,
      ...uiConfig,
    };

    await client.updateUiConfig(serverConfigRecord.id.toString(), updatedConfig);
    logger.info(`Successfully updated UI config for ${arrType}`);
    return { updated: true, arrType };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to sync UI config for ${arrType}: ${errorMessage}`);
    throw new Error(`UI config sync failed for ${arrType}: ${errorMessage}`);
  }
}
