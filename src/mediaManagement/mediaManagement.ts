import { getClient } from "../clients/client";
import type { LidarrClient } from "../clients/lidarr-client";
import type { RadarrClient } from "../clients/radarr-client";
import type { ReadarrClient } from "../clients/readarr-client";
import type { SonarrClient } from "../clients/sonarr-client";
import type { WhisparrClient } from "../clients/whisparr-client";
import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import { logger } from "../logger";
import { MediaArrType } from "../types/common.types";
import { MediaManagementType, MediaNamingApiType } from "../types/config.types";
import { compareMediamanagement, compareNaming } from "../util";

export function calculateNamingDiffFor<T extends { id?: number }>(server: T, config: MediaNamingApiType) {
  const { changes, equal } = compareNaming(server, config);

  if (equal) {
    logger.debug(`Media naming API settings are in sync`);
    return null;
  }

  logger.info(`Found ${changes.length} differences for media naming api.`);
  logger.debug(changes, `Found following changes for media naming api`);

  return {
    changes,
    updatedData: {
      ...server,
      ...config,
    },
  };
}

export function calculateMediamanagementDiffFor<T extends { id?: number }>(server: T, config: MediaManagementType) {
  logger.debug(server as object, "Media Server");
  logger.debug(config as object, "Media Local");
  const { changes, equal } = compareMediamanagement(server, config);

  if (equal) {
    logger.debug(`Media management settings are in sync`);
    return null;
  }

  logger.info(`Found ${changes.length} differences for media management.`);
  logger.debug(changes, `Found following changes for media management`);

  return {
    changes,
    updatedData: {
      ...server,
      ...config,
    },
  };
}

class SonarrMediaManagementSync {
  async calculateNamingDiff(mediaNaming?: MediaNamingApiType) {
    if (mediaNaming == null) {
      logger.debug(`Config 'media_naming_api' not specified. Ignoring.`);
      return null;
    }
    return calculateNamingDiffFor(await getClient("SONARR").getNaming(), mediaNaming);
  }

  updateNaming(id: string, data: Awaited<ReturnType<SonarrClient["getNaming"]>>) {
    return getClient("SONARR").updateNaming(id, data);
  }

  async calculateMediamanagementDiff(mediaManagement?: MediaManagementType) {
    if (mediaManagement == null) {
      logger.debug(`Config 'media_management' not specified. Ignoring.`);
      return null;
    }
    return calculateMediamanagementDiffFor(await getClient("SONARR").getMediamanagement(), mediaManagement);
  }

  updateMediamanagement(id: string, data: Awaited<ReturnType<SonarrClient["getMediamanagement"]>>) {
    return getClient("SONARR").updateMediamanagement(id, data);
  }
}

class RadarrMediaManagementSync {
  async calculateNamingDiff(mediaNaming?: MediaNamingApiType) {
    if (mediaNaming == null) {
      logger.debug(`Config 'media_naming_api' not specified. Ignoring.`);
      return null;
    }
    return calculateNamingDiffFor(await getClient("RADARR").getNaming(), mediaNaming);
  }

  updateNaming(id: string, data: Awaited<ReturnType<RadarrClient["getNaming"]>>) {
    return getClient("RADARR").updateNaming(id, data);
  }

  async calculateMediamanagementDiff(mediaManagement?: MediaManagementType) {
    if (mediaManagement == null) {
      logger.debug(`Config 'media_management' not specified. Ignoring.`);
      return null;
    }
    return calculateMediamanagementDiffFor(await getClient("RADARR").getMediamanagement(), mediaManagement);
  }

  updateMediamanagement(id: string, data: Awaited<ReturnType<RadarrClient["getMediamanagement"]>>) {
    return getClient("RADARR").updateMediamanagement(id, data);
  }
}

class LidarrMediaManagementSync {
  async calculateNamingDiff(mediaNaming?: MediaNamingApiType) {
    if (mediaNaming == null) {
      logger.debug(`Config 'media_naming_api' not specified. Ignoring.`);
      return null;
    }
    return calculateNamingDiffFor(await getClient("LIDARR").getNaming(), mediaNaming);
  }

  updateNaming(id: string, data: Awaited<ReturnType<LidarrClient["getNaming"]>>) {
    return getClient("LIDARR").updateNaming(id, data);
  }

  async calculateMediamanagementDiff(mediaManagement?: MediaManagementType) {
    if (mediaManagement == null) {
      logger.debug(`Config 'media_management' not specified. Ignoring.`);
      return null;
    }
    return calculateMediamanagementDiffFor(await getClient("LIDARR").getMediamanagement(), mediaManagement);
  }

  updateMediamanagement(id: string, data: Awaited<ReturnType<LidarrClient["getMediamanagement"]>>) {
    return getClient("LIDARR").updateMediamanagement(id, data);
  }
}

class ReadarrMediaManagementSync {
  async calculateNamingDiff(mediaNaming?: MediaNamingApiType) {
    if (mediaNaming == null) {
      logger.debug(`Config 'media_naming_api' not specified. Ignoring.`);
      return null;
    }
    return calculateNamingDiffFor(await getClient("READARR").getNaming(), mediaNaming);
  }

  updateNaming(id: string, data: Awaited<ReturnType<ReadarrClient["getNaming"]>>) {
    return getClient("READARR").updateNaming(id, data);
  }

  async calculateMediamanagementDiff(mediaManagement?: MediaManagementType) {
    if (mediaManagement == null) {
      logger.debug(`Config 'media_management' not specified. Ignoring.`);
      return null;
    }
    return calculateMediamanagementDiffFor(await getClient("READARR").getMediamanagement(), mediaManagement);
  }

  updateMediamanagement(id: string, data: Awaited<ReturnType<ReadarrClient["getMediamanagement"]>>) {
    return getClient("READARR").updateMediamanagement(id, data);
  }
}

class WhisparrMediaManagementSync {
  async calculateNamingDiff(mediaNaming?: MediaNamingApiType) {
    if (mediaNaming == null) {
      logger.debug(`Config 'media_naming_api' not specified. Ignoring.`);
      return null;
    }
    return calculateNamingDiffFor(await getClient("WHISPARR").getNaming(), mediaNaming);
  }

  updateNaming(id: string, data: Awaited<ReturnType<WhisparrClient["getNaming"]>>) {
    return getClient("WHISPARR").updateNaming(id, data);
  }

  async calculateMediamanagementDiff(mediaManagement?: MediaManagementType) {
    if (mediaManagement == null) {
      logger.debug(`Config 'media_management' not specified. Ignoring.`);
      return null;
    }
    return calculateMediamanagementDiffFor(await getClient("WHISPARR").getMediamanagement(), mediaManagement);
  }

  updateMediamanagement(id: string, data: Awaited<ReturnType<WhisparrClient["getMediamanagement"]>>) {
    return getClient("WHISPARR").updateMediamanagement(id, data);
  }
}

type MediaManagementSync =
  | SonarrMediaManagementSync
  | RadarrMediaManagementSync
  | LidarrMediaManagementSync
  | ReadarrMediaManagementSync
  | WhisparrMediaManagementSync;

export function createMediaManagementSync(arrType: MediaArrType): MediaManagementSync {
  switch (arrType) {
    case "SONARR":
      return new SonarrMediaManagementSync();
    case "RADARR":
      return new RadarrMediaManagementSync();
    case "LIDARR":
      return new LidarrMediaManagementSync();
    case "READARR":
      return new ReadarrMediaManagementSync();
    case "WHISPARR":
      return new WhisparrMediaManagementSync();
  }
}

export const updateNamingOnServer = async (
  arrType: MediaArrType,
  id: string,
  data: NonNullable<Awaited<ReturnType<MediaManagementSync["calculateNamingDiff"]>>>["updatedData"],
) => {
  return createMediaManagementSync(arrType).updateNaming(id, data as never);
};

export const updateMediamanagementOnServer = async (
  arrType: MediaArrType,
  id: string,
  data: NonNullable<Awaited<ReturnType<MediaManagementSync["calculateMediamanagementDiff"]>>>["updatedData"],
) => {
  return createMediaManagementSync(arrType).updateMediamanagement(id, data as never);
};

export const calculateNamingDiff = async (arrType: MediaArrType, mediaNaming?: MediaNamingApiType) => {
  return createMediaManagementSync(arrType).calculateNamingDiff(mediaNaming);
};

export const calculateMediamanagementDiff = async (arrType: MediaArrType, mediaManagement?: MediaManagementType) => {
  return createMediaManagementSync(arrType).calculateMediamanagementDiff(mediaManagement);
};

export function namingDiffToDiffEntries(namingDiff: { changes: FieldChange[] }): DiffEntry[] {
  return [{ resourceType: "MediaNaming", name: "MediaNaming", action: "update", fieldChanges: namingDiff.changes }];
}

export function mediamanagementDiffToDiffEntries(managementDiff: { changes: FieldChange[] }): DiffEntry[] {
  return [{ resourceType: "MediaManagement", name: "MediaManagement", action: "update", fieldChanges: managementDiff.changes }];
}
