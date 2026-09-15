import { ServerCache } from "../cache";
import type { DownloadClientsClient, TagsClient } from "../clients/capabilities";
import { getClient } from "../clients/client";
import { FieldChange } from "../diffReport/diffReport.types";
import { logger } from "../logger";
import { MediaArrType } from "../types/common.types";
import { InputConfigDownloadClient } from "../types/config.types";
import { DownloadClientDiff, MediaDownloadClientResource } from "./downloadClient.types";
import { BaseDownloadClientSync } from "./downloadClientBase";

export class MediaDownloadClientSync extends BaseDownloadClientSync<MediaDownloadClientResource> {
  constructor(private arrType: MediaArrType) {
    super();
  }

  protected getArrType(): MediaArrType {
    return this.arrType;
  }

  protected getApi(): DownloadClientsClient<MediaDownloadClientResource> & TagsClient {
    return getClient(this.arrType);
  }

  public isDownloadClientEqual = (
    config: InputConfigDownloadClient,
    server: MediaDownloadClientResource,
    cache: ServerCache,
    updatePassword: boolean = false,
  ): { equal: boolean; changes: FieldChange[] } => {
    if (config.name !== server.name || config.type.toLowerCase() !== server.implementation?.toLowerCase()) {
      return { equal: false, changes: [] };
    }

    const changes = this.collectSharedFieldChanges(config, server, cache, updatePassword);

    if (config.remove_completed_downloads !== undefined && config.remove_completed_downloads !== server.removeCompletedDownloads) {
      changes.push({
        field: "removeCompletedDownloads",
        from: server.removeCompletedDownloads,
        to: config.remove_completed_downloads,
      });
    }
    if (config.remove_failed_downloads !== undefined && config.remove_failed_downloads !== server.removeFailedDownloads) {
      changes.push({ field: "removeFailedDownloads", from: server.removeFailedDownloads, to: config.remove_failed_downloads });
    }

    return { equal: changes.length === 0, changes };
  };

  public shouldUsePartialUpdate = (config: InputConfigDownloadClient): boolean => {
    const hasFieldOverrides = !!(config.fields && Object.keys(config.fields).length > 0);

    if (hasFieldOverrides) {
      return false;
    }

    const hasTags = Array.isArray(config.tags) && config.tags.length > 0;

    const specifiedTopLevelProps = [
      config.enable !== undefined,
      config.priority !== undefined,
      config.remove_completed_downloads !== undefined,
      config.remove_failed_downloads !== undefined,
      hasTags,
    ].filter(Boolean).length;

    return specifiedTopLevelProps > 0 && specifiedTopLevelProps <= 2;
  };

  async calculateDiff(
    configClients: InputConfigDownloadClient[],
    serverClients: MediaDownloadClientResource[],
    cache: ServerCache,
    updatePassword: boolean = false,
  ): Promise<DownloadClientDiff<MediaDownloadClientResource>> {
    const create: InputConfigDownloadClient[] = [];
    const update: DownloadClientDiff<MediaDownloadClientResource>["update"] = [];
    const unchanged: { config: InputConfigDownloadClient; server: MediaDownloadClientResource }[] = [];

    for (const config of configClients) {
      const serverClient = serverClients.find(
        (s) => s.name === config.name && s.implementation?.toLowerCase() === config.type.toLowerCase(),
      );

      if (!serverClient) {
        create.push(config);
      } else {
        const comparison = this.isDownloadClientEqual(config, serverClient, cache, updatePassword);
        if (!comparison.equal) {
          const partialUpdate = this.shouldUsePartialUpdate(config);
          update.push({ config, server: serverClient, partialUpdate, fieldChanges: comparison.changes });
        } else {
          unchanged.push({ config, server: serverClient });
        }
      }
    }

    const configKeys = new Set(configClients.map((c) => `${c.name}::${c.type.toLowerCase()}`));
    const deleted = serverClients.filter((s) => !configKeys.has(`${s.name ?? ""}::${s.implementation?.toLowerCase() ?? ""}`));

    return { create, update, unchanged, deleted };
  }

  async resolveConfig(
    config: InputConfigDownloadClient,
    cache: ServerCache,
    serverClient?: MediaDownloadClientResource,
    partialUpdate: boolean = false,
  ): Promise<MediaDownloadClientResource> {
    const schema = await this.getDownloadClientSchema(cache);
    const template = this.findImplementationInSchema(schema, config.type);

    if (!template) {
      throw new Error(`Download client implementation '${config.type}' not found in schema`);
    }

    let tagIds: number[] = [];
    if (config.tags && config.tags.length > 0) {
      const { ids, missingTags } = this.resolveTagNamesToIds(config.tags, cache.tags);

      if (missingTags.length > 0) {
        logger.warn(
          `Missing tags for download client '${config.name}': ${missingTags.join(", ")}. ` +
            `These should have been created during batch tag creation.`,
        );
      }

      tagIds = ids;
    }

    const mergedFields = this.mergeFieldsWithSchema(
      template.fields || [],
      config.fields || {},
      this.arrType,
      serverClient?.fields ?? undefined,
      partialUpdate,
    );

    return {
      enable: config.enable ?? serverClient?.enable ?? true,
      protocol: template.protocol,
      priority: config.priority ?? serverClient?.priority ?? 1,
      name: config.name,
      fields: mergedFields,
      implementationName: template.implementationName,
      implementation: template.implementation,
      configContract: template.configContract,
      infoLink: template.infoLink,
      tags: tagIds,
      removeCompletedDownloads: config.remove_completed_downloads ?? serverClient?.removeCompletedDownloads ?? true,
      removeFailedDownloads: config.remove_failed_downloads ?? serverClient?.removeFailedDownloads ?? true,
    };
  }
}
