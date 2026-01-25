import { getUnifiedClient } from "./clients/unified-client";
import { logger } from "./logger";
import { UiConfigType } from "./types/config.types";
import { compareUiConfig } from "./util";

const loadUiConfigFromServer = async () => {
  const api = getUnifiedClient();
  const result = await api.getUiConfig();
  return result;
};

export const calculateUiConfigDiff = async (uiConfig?: UiConfigType) => {
  if (uiConfig == null) {
    logger.debug(`Config 'ui_config' not specified. Ignoring.`);
    return null;
  }

  const serverData = await loadUiConfigFromServer();

  logger.debug(serverData, "UI Config Server");
  logger.debug(uiConfig, "UI Config Local");
  const { changes, equal } = compareUiConfig(serverData, uiConfig);

  if (equal) {
    logger.debug(`UI config settings are in sync`);
    return null;
  }

  logger.info(`Found ${changes.length} differences for UI config.`);
  logger.debug(changes, `Found following changes for UI config`);

  return {
    changes,
    updatedData: {
      ...serverData,
      ...uiConfig,
    },
  };
};
