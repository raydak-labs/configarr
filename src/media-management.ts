import { getUnifiedClient } from "./clients/unified-client";
import { logger } from "./logger";
import { MediaManagementType, MediaNamingType } from "./types/config.types";
import { compareMediamanagement, compareNaming } from "./util";

const loadNamingFromServer = async () => {
  const api = getUnifiedClient();
  const result = await api.getNaming();
  return result;
};

const loadMediamanagementConfigFromServer = async () => {
  const api = getUnifiedClient();
  const result = await api.getMediamanagement();
  return result;
};

export const calculateNamingDiff = async (mediaNaming?: MediaNamingType) => {
  if (mediaNaming == null) {
    logger.debug(`Config 'media_naming' not specified. Ignoring.`);
    return null;
  }

  const serverData = await loadNamingFromServer();

  const { changes, equal } = compareNaming(serverData, mediaNaming);

  if (equal) {
    logger.debug(`Media naming settings are in sync`);
    return null;
  }

  logger.info(`Found ${changes.length} differences for media naming.`);
  logger.debug(changes, `Found following changes for media naming`);

  return {
    changes,
    updatedData: {
      ...serverData,
      ...mediaNaming,
    },
  };
};

export const calculateMediamanagementDiff = async (mediaManagement?: MediaManagementType) => {
  if (mediaManagement == null) {
    logger.debug(`Config 'media_management' not specified. Ignoring.`);
    return null;
  }

  const serverData = await loadMediamanagementConfigFromServer();

  console.log(serverData, mediaManagement);
  logger.debug(serverData, "Media Server");
  logger.debug(mediaManagement, "Media Local");
  const { changes, equal } = compareMediamanagement(serverData, mediaManagement);

  if (equal) {
    logger.debug(`Media management settings are in sync`);
    return null;
  }

  logger.info(`Found ${changes.length} differences for media management.`);
  logger.debug(changes, `Found following changes for media management`);

  return {
    changes,
    updatedData: {
      ...serverData,
      ...mediaManagement,
    },
  };
};
