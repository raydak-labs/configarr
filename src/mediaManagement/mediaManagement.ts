import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import { logger } from "../logger";
import type { MediaManagementClient } from "../clients/capabilities";
import { MediaManagementType, MediaNamingApiType } from "../types/config.types";
import { compareObjectsCarr } from "../util";

export function calculateNamingDiffFor<T extends { id?: number }>(server: T, config: MediaNamingApiType) {
  const { changes, equal } = compareObjectsCarr(server, config);

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
  const { changes, equal } = compareObjectsCarr(server, config);

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

export class MediaManagementSync<Naming extends { id?: number }, Management extends { id?: number }> {
  constructor(protected readonly api: MediaManagementClient<Naming, Management>) {}

  protected getApi() {
    return this.api;
  }

  async calculateNamingDiff(mediaNaming?: MediaNamingApiType) {
    if (mediaNaming == null) {
      logger.debug(`Config 'media_naming_api' not specified. Ignoring.`);
      return null;
    }
    return calculateNamingDiffFor(await this.getApi().getNaming(), mediaNaming);
  }

  async persistNaming(mediaNaming: MediaNamingApiType | undefined, write: boolean) {
    const namingDiff = await this.calculateNamingDiff(mediaNaming);
    if (namingDiff && write) {
      const id = namingDiff.updatedData.id;
      if (id == null) {
        throw new Error("Naming configuration response is missing its id.");
      }
      await this.getApi().updateNaming(String(id), namingDiff.updatedData);
    }
    return namingDiff;
  }

  async calculateMediamanagementDiff(mediaManagement?: MediaManagementType) {
    if (mediaManagement == null) {
      logger.debug(`Config 'media_management' not specified. Ignoring.`);
      return null;
    }
    return calculateMediamanagementDiffFor(await this.getApi().getMediamanagement(), mediaManagement);
  }

  async persistMediamanagement(mediaManagement: MediaManagementType | undefined, write: boolean) {
    const managementDiff = await this.calculateMediamanagementDiff(mediaManagement);
    if (managementDiff && write) {
      const id = managementDiff.updatedData.id;
      if (id == null) {
        throw new Error("Media-management configuration response is missing its id.");
      }
      await this.getApi().updateMediamanagement(String(id), managementDiff.updatedData);
    }
    return managementDiff;
  }
}

export function namingDiffToDiffEntries(namingDiff: { changes: FieldChange[] }): DiffEntry[] {
  return [{ resourceType: "MediaNaming", name: "MediaNaming", action: "update", fieldChanges: namingDiff.changes }];
}

export function mediamanagementDiffToDiffEntries(managementDiff: { changes: FieldChange[] }): DiffEntry[] {
  return [{ resourceType: "MediaManagement", name: "MediaManagement", action: "update", fieldChanges: managementDiff.changes }];
}
