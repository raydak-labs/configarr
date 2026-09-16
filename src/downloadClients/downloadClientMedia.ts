import { ServerCache } from "../cache";
import { FieldChange } from "../diffReport/diffReport.types";
import { MediaArrType } from "../types/common.types";
import { InputConfigDownloadClient } from "../types/config.types";
import { DownloadClientDiff, MediaDownloadClientResource } from "./downloadClient.types";
import { BaseDownloadClientSync } from "./downloadClientBase";

export abstract class MediaDownloadClientSync<T extends MediaDownloadClientResource> extends BaseDownloadClientSync<T> {
  protected abstract getArrType(): MediaArrType;

  public isDownloadClientEqual = (
    config: InputConfigDownloadClient,
    server: T,
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
    serverClients: T[],
    cache: ServerCache,
    updatePassword: boolean = false,
  ): Promise<DownloadClientDiff<T>> {
    const create: InputConfigDownloadClient[] = [];
    const update: DownloadClientDiff<T>["update"] = [];
    const unchanged: { config: InputConfigDownloadClient; server: T }[] = [];

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
    serverClient?: T,
    partialUpdate: boolean = false,
    updatePassword: boolean = true,
  ): Promise<T> {
    const schema = await this.getDownloadClientSchema(cache);
    const template = this.findImplementationInSchema(schema, config.type);

    if (!template) {
      throw new Error(`Download client implementation '${config.type}' not found in schema`);
    }

    const mergedFields = this.mergeFieldsWithSchema(
      template.fields || [],
      config.fields || {},
      this.getArrType(),
      serverClient?.fields ?? undefined,
      partialUpdate,
      updatePassword,
    );

    const payload = {
      ...template,
      enable: config.enable ?? serverClient?.enable ?? true,
      protocol: template.protocol,
      priority: config.priority ?? serverClient?.priority ?? 1,
      name: config.name,
      fields: mergedFields,
      implementationName: template.implementationName,
      implementation: template.implementation,
      configContract: template.configContract,
      infoLink: template.infoLink,
      tags: this.resolveDownloadClientTags(config, cache, serverClient),
      removeCompletedDownloads: config.remove_completed_downloads ?? serverClient?.removeCompletedDownloads ?? true,
      removeFailedDownloads: config.remove_failed_downloads ?? serverClient?.removeFailedDownloads ?? true,
    };
    Reflect.deleteProperty(payload, "categories");
    return payload;
  }
}
