import { asGenerated } from "../arr/cast";
import { getClient } from "../clients/client";
import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import { logger } from "../logger";
import { MediaArrType } from "../types/common.types";
import { MediaManagementType, MediaNamingApiType } from "../types/config.types";
import { compareMediamanagement, compareNaming } from "../util";

const loadNamingFromServer = async (arrType: MediaArrType) => {
  return getClient(arrType).getNaming();
};

const loadMediamanagementConfigFromServer = async (arrType: MediaArrType) => {
  return getClient(arrType).getMediamanagement();
};

export const updateNamingOnServer = async (arrType: MediaArrType, id: string, data: unknown) => {
  switch (arrType) {
    case "SONARR":
      return getClient("SONARR").updateNaming(id, asGenerated(data));
    case "RADARR":
      return getClient("RADARR").updateNaming(id, asGenerated(data));
    case "LIDARR":
      return getClient("LIDARR").updateNaming(id, asGenerated(data));
    case "READARR":
      return getClient("READARR").updateNaming(id, asGenerated(data));
    case "WHISPARR":
      return getClient("WHISPARR").updateNaming(id, asGenerated(data));
  }
};

export const updateMediamanagementOnServer = async (arrType: MediaArrType, id: string, data: unknown) => {
  switch (arrType) {
    case "SONARR":
      return getClient("SONARR").updateMediamanagement(id, asGenerated(data));
    case "RADARR":
      return getClient("RADARR").updateMediamanagement(id, asGenerated(data));
    case "LIDARR":
      return getClient("LIDARR").updateMediamanagement(id, asGenerated(data));
    case "READARR":
      return getClient("READARR").updateMediamanagement(id, asGenerated(data));
    case "WHISPARR":
      return getClient("WHISPARR").updateMediamanagement(id, asGenerated(data));
  }
};

export const calculateNamingDiff = async (arrType: MediaArrType, mediaNaming?: MediaNamingApiType) => {
  if (mediaNaming == null) {
    logger.debug(`Config 'media_naming_api' not specified. Ignoring.`);
    return null;
  }

  const serverData = await loadNamingFromServer(arrType);

  const { changes, equal } = compareNaming(serverData, mediaNaming);

  if (equal) {
    logger.debug(`Media naming API settings are in sync`);
    return null;
  }

  logger.info(`Found ${changes.length} differences for media naming api.`);
  logger.debug(changes, `Found following changes for media naming api`);

  return {
    changes,
    updatedData: {
      ...serverData,
      ...mediaNaming,
    },
  };
};

export const calculateMediamanagementDiff = async (arrType: MediaArrType, mediaManagement?: MediaManagementType) => {
  if (mediaManagement == null) {
    logger.debug(`Config 'media_management' not specified. Ignoring.`);
    return null;
  }

  const serverData = await loadMediamanagementConfigFromServer(arrType);

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

export function namingDiffToDiffEntries(namingDiff: { changes: FieldChange[] }): DiffEntry[] {
  return [{ resourceType: "MediaNaming", name: "MediaNaming", action: "update", fieldChanges: namingDiff.changes }];
}

export function mediamanagementDiffToDiffEntries(managementDiff: { changes: FieldChange[] }): DiffEntry[] {
  return [{ resourceType: "MediaManagement", name: "MediaManagement", action: "update", fieldChanges: managementDiff.changes }];
}
