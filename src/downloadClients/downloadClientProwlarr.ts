import type { DownloadClientsClient, TagsClient } from "../clients/capabilities";
import { getClient } from "../clients/client";
import type { DownloadClientResource } from "../__generated__/prowlarr/data-contracts";
import { ServerCache } from "../cache";
import { FieldChange } from "../diffReport/diffReport.types";
import { logger } from "../logger";
import { InputConfigDownloadClient } from "../types/config.types";
import { DownloadClientDiff } from "./downloadClient.types";
import { BaseDownloadClientSync } from "./downloadClientBase";

export class ProwlarrDownloadClientSync extends BaseDownloadClientSync<DownloadClientResource> {
  protected getArrType(): "PROWLARR" {
    return "PROWLARR";
  }

  protected getApi(): DownloadClientsClient<DownloadClientResource> & TagsClient {
    return getClient("PROWLARR");
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

    return specifiedTopLevelProps > 0 && specifiedTopLevelProps <= 2;
  };

  async calculateDiff(
    configClients: InputConfigDownloadClient[],
    serverClients: DownloadClientResource[],
    cache: ServerCache,
    updatePassword: boolean = false,
  ): Promise<DownloadClientDiff<DownloadClientResource>> {
    const create: InputConfigDownloadClient[] = [];
    const update: DownloadClientDiff<DownloadClientResource>["update"] = [];
    const unchanged: { config: InputConfigDownloadClient; server: DownloadClientResource }[] = [];

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
    serverClient?: DownloadClientResource,
    partialUpdate: boolean = false,
  ): Promise<DownloadClientResource> {
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
      "PROWLARR",
      serverClient?.fields ?? undefined,
      partialUpdate,
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
      tags: tagIds,
      categories: serverClient?.categories ?? template.categories ?? [],
    };
  }
}
