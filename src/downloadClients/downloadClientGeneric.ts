import { ServerCache } from "../cache";
import { logger } from "../logger";
import { ArrType } from "../types/common.types";
import { InputConfigDownloadClient } from "../types/config.types";
import type { DownloadClientResource, DownloadClientField } from "../types/download-client.types";
import { BaseDownloadClientSync } from "./downloadClientBase";
import { DownloadClientDiff } from "./downloadClient.types";

/**
 * Generic download client synchronization implementation
 * Handles most ARR types (Radarr, Sonarr, Whisparr, Readarr) with standard logic
 * Follows the established pattern used by GenericRootFolderSync
 */
export class GenericDownloadClientSync extends BaseDownloadClientSync {
  constructor(private arrType: ArrType) {
    super();
  }

  protected getArrType(): ArrType {
    return this.arrType;
  }

  /**
   * Check if two download clients are equal (ignoring ID)
   * Implements omission semantics - undefined config properties don't affect equality
   */
  public isDownloadClientEqual = (config: InputConfigDownloadClient, server: DownloadClientResource, cache: ServerCache): boolean => {
    // Compare basic properties
    if (config.name !== server.name) return false;

    // Only compare top-level properties when they are explicitly specified in the config.
    // When omitted in the config, they are treated as "do not manage" and do not affect equality.
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

    // Compare fields (normalize to support snake_case and generic category)
    const configFields = this.normalizeConfigFields(config.fields || {}, this.arrType);
    const serverFields = server.fields || [];

    for (const serverField of serverFields) {
      const fieldName = serverField.name;
      if (!fieldName) continue;

      const configValue = configFields[fieldName];
      const serverValue = serverField.value;

      // Skip if config doesn't specify this field (use server default)
      if (configValue === undefined) continue;

      // Deep comparison for arrays and objects
      if (JSON.stringify(configValue) !== JSON.stringify(serverValue)) {
        return false;
      }
    }

    const serverFieldNames = new Set(
      serverFields.map((f: DownloadClientField) => f.name).filter((name): name is string => typeof name === "string" && name.length > 0),
    );

    for (const key of Object.keys(configFields)) {
      if (!serverFieldNames.has(key) && configFields[key] !== undefined) {
        // Config references a field that does not exist on the server; treat as different
        return false;
      }
    }

    // Compare tags (resolve names to IDs first)
    const configTags = config.tags ?? [];
    const { ids: resolvedTagIds } = this.resolveTagNamesToIds(configTags, cache.tags);
    const serverTags = server.tags ?? [];

    const sortedConfigTagIds = [...resolvedTagIds].sort();
    const sortedServerTags = [...serverTags].sort();

    if (JSON.stringify(sortedConfigTagIds) !== JSON.stringify(sortedServerTags)) {
      return false;
    }

    return true;
  };

  /**
   * Determine if update should be partial (only specified fields) or full
   */
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

  /**
   * Calculate diff between configured download clients and server download clients
   */
  async calculateDiff(
    configClients: InputConfigDownloadClient[],
    serverClients: DownloadClientResource[],
    cache: ServerCache,
  ): Promise<DownloadClientDiff> {
    const create: InputConfigDownloadClient[] = [];
    const update: { config: InputConfigDownloadClient; server: DownloadClientResource; partialUpdate: boolean }[] = [];
    const unchanged: { config: InputConfigDownloadClient; server: DownloadClientResource }[] = [];

    for (const config of configClients) {
      const serverClient = serverClients.find((s: DownloadClientResource) => s.name === config.name);

      if (!serverClient) {
        create.push(config);
      } else if (!this.isDownloadClientEqual(config, serverClient, cache)) {
        const partialUpdate = this.shouldUsePartialUpdate(config);
        update.push({ config, server: serverClient, partialUpdate });
      } else {
        unchanged.push({ config, server: serverClient });
      }
    }

    // Find clients to delete (on server but not in config)
    const configNames = new Set(configClients.map((c: InputConfigDownloadClient) => c.name));
    const deleted = serverClients.filter((s: DownloadClientResource) => !configNames.has(s.name || ""));

    return { create, update, unchanged, deleted };
  }

  /**
   * Create download client payload from config
   * This method implements the core logic for transforming configuration into API payload
   */
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
