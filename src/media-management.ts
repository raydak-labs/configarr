import { getArrApi } from "./api";
import { logger } from "./logger";
import { MediaManagementType, MediaNamingType } from "./types";
import { compareObjectsCarr } from "./util";

export const loadNamingFromServer = async () => {
  const api = getArrApi();
  const result = await api.v3ConfigNamingList();
  return result.data;
};

export const loadManagementConfigFromServer = async () => {
  const api = getArrApi();
  const result = await api.v3ConfigMediamanagementList();
  return result.data;
};

export const calculateNamingDiff = async (mediaNaming?: MediaNamingType) => {
  if (mediaNaming == null) {
    logger.debug(`Config 'media_naming' not specified. Ignoring.`);
    return null;
  }

  const serverData = await loadNamingFromServer();

  const { changes, equal } = compareObjectsCarr(serverData, mediaNaming);

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

export const calculateManagementDiff = async (mediaManagement?: MediaManagementType) => {
  if (mediaManagement == null) {
    logger.debug(`Config 'media_management' not specified. Ignoring.`);
    return null;
  }

  const serverData = await loadManagementConfigFromServer();

  const { changes, equal } = compareObjectsCarr(serverData, mediaManagement);

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
