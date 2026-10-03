import type { DownloadClientResource } from "../__generated__/prowlarr/data-contracts";
import { ServerCache } from "../cache";
import { FieldChange } from "../diffReport/diffReport.types";
import { InputConfigDownloadClient } from "../types/config.types";
import { BaseDownloadClientSync } from "./downloadClientBase";

export class ProwlarrDownloadClientSync extends BaseDownloadClientSync<DownloadClientResource> {
  protected getArrType(): "PROWLARR" {
    return "PROWLARR";
  }

  public isDownloadClientEqual = (
    config: InputConfigDownloadClient,
    server: DownloadClientResource,
    cache: ServerCache,
    updatePassword: boolean = false,
  ): { equal: boolean; changes: FieldChange[] } => {
    if (config.name !== server.name || config.type.toLowerCase() !== server.implementation?.toLowerCase()) {
      return { equal: false, changes: [] };
    }

    const changes = this.collectSharedFieldChanges(config, server, cache, updatePassword);
    return { equal: changes.length === 0, changes };
  };

  public shouldUsePartialUpdate = (config: InputConfigDownloadClient): boolean => {
    const hasFieldOverrides = !!(config.fields && Object.keys(config.fields).length > 0);

    if (hasFieldOverrides) {
      return false;
    }

    const hasTags = Array.isArray(config.tags) && config.tags.length > 0;

    const specifiedTopLevelProps = [config.enable !== undefined, config.priority !== undefined, hasTags].filter(Boolean).length;

    return specifiedTopLevelProps > 0;
  };

  async resolveConfig(
    config: InputConfigDownloadClient,
    cache: ServerCache,
    serverClient?: DownloadClientResource,
    partialUpdate: boolean = false,
    updatePassword: boolean = true,
  ): Promise<DownloadClientResource> {
    const schema = await this.getDownloadClientSchema(cache);
    const template = this.findImplementationInSchema(schema, config.type);

    if (!template) {
      throw new Error(`Download client implementation '${config.type}' not found in schema`);
    }

    const mergedFields = this.mergeFieldsWithSchema(
      template.fields || [],
      config.fields || {},
      "PROWLARR",
      serverClient?.fields ?? undefined,
      partialUpdate,
      updatePassword,
    );

    return {
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
      categories: serverClient?.categories ?? template.categories ?? [],
    };
  }
}
