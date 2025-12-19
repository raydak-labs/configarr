import { ServerCache } from "../cache";
import { logger } from "../logger";
import { ArrType } from "../types/common.types";
import { InputConfigDownloadClient } from "../types/config.types";
import { DownloadClientDiff, DownloadClientField, DownloadClientResource } from "../types/download-client.types";
import { snakeToCamel } from "../util";
import { BaseDownloadClientSync } from "./downloadClientBase";

export class GenericDownloadClientSync extends BaseDownloadClientSync {
  constructor(private arrType: ArrType) {
    super();
  }

  protected getArrType(): ArrType {
    return this.arrType;
  }

  public isDownloadClientEqual = (
    config: InputConfigDownloadClient,
    server: DownloadClientResource,
    cache: ServerCache,
    updatePassword: boolean = false,
  ): boolean => {
    // Basic comparison
    if (config.name !== server.name) return false;

    // Compare only when specified
    // Omitted means "do not manage"
    if (config.enable !== undefined && config.enable !== server.enable) return false;
    if (config.priority !== undefined && config.priority !== server.priority) return false;
    if (config.remove_completed_downloads !== undefined && config.remove_completed_downloads !== server.removeCompletedDownloads) {
      return false;
    }
    if (config.remove_failed_downloads !== undefined && config.remove_failed_downloads !== server.removeFailedDownloads) {
      return false;
    }

    // Compare implementation
    if (config.type.toLowerCase() !== server.implementation?.toLowerCase()) return false;

    // Compare fields (normalize to support snake_case)
    const normalizedConfigFields = this.normalizeConfigFields(config.fields || {}, this.arrType);
    const serverFields = server.fields || [];

    for (const serverField of serverFields) {
      const fieldName = serverField.name;
      if (!fieldName) continue;

      const configValue = normalizedConfigFields[fieldName];
      const serverValue = serverField.value;

      // Skip if config doesn't specify this field (use server default)
      if (configValue === undefined) continue;

      // Deep comparison for arrays and objects
      let valuesMatch = JSON.stringify(configValue) === JSON.stringify(serverValue);

      // Special handling for password fields - server masks them as "********" unless update_password is enabled
      if (
        !valuesMatch &&
        fieldName.toLowerCase().includes("password") &&
        serverValue === "********" &&
        typeof configValue === "string" &&
        configValue.length > 0 &&
        !updatePassword
      ) {
        valuesMatch = true;
      }

      if (!valuesMatch) {
        return false;
      }
    }

    const serverFieldNames = new Set(
      serverFields.map((f: DownloadClientField) => f.name).filter((name): name is string => typeof name === "string" && name.length > 0),
    );

    for (const key of Object.keys(normalizedConfigFields)) {
      // Only check camelCase field names against server (skip snake_case duplicates)
      if (key !== snakeToCamel(key)) {
        // This is a snake_case field, skip the server field check
        continue;
      }

      if (!serverFieldNames.has(key) && normalizedConfigFields[key] !== undefined) {
        // Config references a field that does not exist on the server; treat as different
        this.logger.warn(`Config field '${key}' does not exist on server`);
        return false;
      }
    }

    // Compare tags (resolve names to IDs first)
    const configTags = config.tags ?? [];
    const { ids: resolvedTagIds, missingTags } = this.resolveTagNamesToIds(configTags, cache.tags);
    const serverTags = server.tags ?? [];

    const sortedConfigTagIds = [...resolvedTagIds].sort();
    const sortedServerTags = [...serverTags].sort();

    if (JSON.stringify(sortedConfigTagIds) !== JSON.stringify(sortedServerTags)) {
      return false;
    }

    return true;
  };

  public shouldUsePartialUpdate = (config: InputConfigDownloadClient): boolean => {
    const hasFieldOverrides = !!(config.fields && Object.keys(config.fields).length > 0);

    // When field overrides are present, default to full updates so that the config is authoritative
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

    // Only treat it as a partial update when the user is toggling a small subset of top-level properties
    return specifiedTopLevelProps > 0 && specifiedTopLevelProps <= 2;
  };

  async calculateDiff(
    configClients: InputConfigDownloadClient[],
    serverClients: DownloadClientResource[],
    cache: ServerCache,
    updatePassword: boolean = false,
  ): Promise<DownloadClientDiff> {
    const create: InputConfigDownloadClient[] = [];
    const update: { config: InputConfigDownloadClient; server: DownloadClientResource; partialUpdate: boolean }[] = [];
    const unchanged: { config: InputConfigDownloadClient; server: DownloadClientResource }[] = [];

    for (const config of configClients) {
      // Use composite key (name + type) to match clients
      const serverClient = serverClients.find(
        (s: DownloadClientResource) => s.name === config.name && s.implementation?.toLowerCase() === config.type.toLowerCase(),
      );

      if (!serverClient) {
        create.push(config);
      } else if (!this.isDownloadClientEqual(config, serverClient, cache, updatePassword)) {
        const partialUpdate = this.shouldUsePartialUpdate(config);
        update.push({ config, server: serverClient, partialUpdate });
      } else {
        unchanged.push({ config, server: serverClient });
      }
    }

    // Find clients to delete (on server but not in config) using composite keys
    const configKeys = new Set(configClients.map((c: InputConfigDownloadClient) => `${c.name}::${c.type.toLowerCase()}`));
    const deleted = serverClients.filter(
      (s: DownloadClientResource) => !configKeys.has(`${s.name ?? ""}::${s.implementation?.toLowerCase() ?? ""}`),
    );

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

    // Resolve tag names to IDs (all tags should exist by this point due to batch creation in syncDownloadClients)
    let tagIds: number[] = [];
    if (config.tags && config.tags.length > 0) {
      const { ids, missingTags } = this.resolveTagNamesToIds(config.tags, cache.tags);

      if (missingTags.length > 0) {
        // This should not happen as tags are created in batch before this function is called
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
      removeCompletedDownloads: config.remove_completed_downloads ?? serverClient?.removeCompletedDownloads ?? true,
      removeFailedDownloads: config.remove_failed_downloads ?? serverClient?.removeFailedDownloads ?? true,
      name: config.name,
      fields: mergedFields,
      implementationName: template.implementationName,
      implementation: template.implementation,
      configContract: template.configContract,
      infoLink: template.infoLink,
      tags: tagIds,
    };
  }
}
