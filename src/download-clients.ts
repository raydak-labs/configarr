import { ServerCache } from "./cache";
import { getUnifiedClient } from "./clients/unified-client";
import { logger } from "./logger";
import { ArrType } from "./types/common.types";
import { InputConfigDownloadClient, MergedConfigInstance } from "./types/config.types";
import { cloneWithJSON } from "./util";

export interface DownloadClientResource {
  id?: number;
  enable?: boolean;
  protocol?: string;
  priority?: number;
  removeCompletedDownloads?: boolean;
  removeFailedDownloads?: boolean;
  name?: string | null;
  fields?: DownloadClientField[];
  implementationName?: string;
  implementation?: string;
  configContract?: string;
  infoLink?: string;
  tags?: number[];
}

export interface DownloadClientField {
  order?: number;
  name?: string;
  label?: string;
  value?: any;
  type?: string;
  advanced?: boolean;
  helpText?: string;
  selectOptions?: { value: any; name: string; order: number; hint?: string }[];
  isFloat?: boolean;
}

export interface TagResource {
  id?: number;
  label?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConnectionTestResult {
  success: boolean;
  message?: string;
  error?: string;
}

type DownloadClientDiff = {
  create: InputConfigDownloadClient[];
  update: { config: InputConfigDownloadClient; server: DownloadClientResource; partialUpdate: boolean }[];
  unchanged: { config: InputConfigDownloadClient; server: DownloadClientResource }[];
  deleted: DownloadClientResource[];
};

/**
 * Resolve tag names to tag IDs
 */
const resolveTagNamesToIds = (
  tagNames: (string | number)[],
  serverTags: TagResource[],
): { ids: number[]; missingTags: string[] } => {
  const ids: number[] = [];
  const missingTags: string[] = [];

  for (const tag of tagNames) {
    if (typeof tag === "number") {
      ids.push(tag);
    } else {
      const serverTag = serverTags.find((t) => t.label?.toLowerCase() === tag.toLowerCase());
      if (serverTag && serverTag.id) {
        ids.push(serverTag.id);
      } else {
        missingTags.push(tag);
      }
    }
  }

  return { ids, missingTags };
};

/**
 * Validate download client configuration
 */
const validateDownloadClient = (
  config: InputConfigDownloadClient,
  schema: DownloadClientResource[],
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate name
  if (!config.name || config.name.trim() === "") {
    errors.push("Download client name is required");
  }

  // Validate type
  if (!config.type || config.type.trim() === "") {
    errors.push("Download client type is required");
  } else {
    const template = findImplementationInSchema(schema, config.type);
    if (!template) {
      errors.push(`Unknown download client type '${config.type}'. Available types: ${schema.map((s) => s.implementation).join(", ")}`);
    } else {
      // Validate required fields
      const requiredFields = (template.fields || []).filter((f) => {
        // Fields with no default value are typically required
        return f.value === undefined || f.value === null || f.value === "";
      });

      for (const reqField of requiredFields) {
        const fieldName = reqField.name;
        if (fieldName && !(config.fields && fieldName in config.fields)) {
          // Only warn about potentially required fields, as we can't always determine this from schema
          warnings.push(`Field '${fieldName}' may be required for ${config.type}`);
        }
      }
    }
  }

  // Validate priority
  if (config.priority !== undefined && (config.priority < 1 || config.priority > 50)) {
    warnings.push(`Priority ${config.priority} is outside typical range (1-50)`);
  }

  return { valid: errors.length === 0, errors, warnings };
};

/**
 * Test download client connection
 */
const testDownloadClientConnection = async (
  clientPayload: DownloadClientResource,
): Promise<ConnectionTestResult> => {
  const api = getUnifiedClient();

  try {
    // Use the test endpoint if available
    await api.testDownloadClient(clientPayload);
    return { success: true, message: "Connection successful" };
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    
    // Parse common error types
    if (errorMessage.includes("connection refused") || errorMessage.includes("ECONNREFUSED")) {
      return { success: false, error: "Connection refused - check host and port" };
    } else if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT")) {
      return { success: false, error: "Connection timeout - check network connectivity" };
    } else if (errorMessage.includes("unauthorized") || errorMessage.includes("401")) {
      return { success: false, error: "Authentication failed - check username/password/API key" };
    } else if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      return { success: false, error: "Endpoint not found - check URL base path" };
    } else {
      return { success: false, error: errorMessage };
    }
  }
};

/**
 * Get download client schema from server
 */
const getDownloadClientSchema = async (cache: ServerCache): Promise<DownloadClientResource[]> => {
  const cached = cache.getDownloadClientSchema();
  if (cached) {
    return cached;
  }

  const api = getUnifiedClient();
  const schema = await api.getDownloadClientSchema();
  cache.setDownloadClientSchema(schema);
  return schema;
};

/**
 * Convert snake_case to camelCase
 */
const snakeToCamel = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * Get the app-specific category field name based on ArrType
 */
const getCategoryFieldName = (arrType: ArrType): string => {
  switch (arrType) {
    case "sonarr":
    case "lidarr":
      return "musicCategory";
    case "radarr":
    case "whisparr":
      return "movieCategory";
    case "readarr":
      return "bookCategory";
    default:
      return "musicCategory"; // Default fallback
  }
};

/**
 * Normalize config fields to support both camelCase and snake_case
 * Also supports generic "category" field that maps to the app-specific category
 * Returns a new object with camelCase keys
 */
const normalizeConfigFields = (
  configFields: Record<string, any>,
  arrType: ArrType,
): Record<string, any> => {
  const normalized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(configFields)) {
    // Handle generic "category" field
    if (key === "category") {
      const appCategoryField = getCategoryFieldName(arrType);
      normalized[appCategoryField] = value;
      // Also keep original for backward compatibility
      normalized[key] = value;
      continue;
    }
    
    // Convert snake_case to camelCase
    const camelKey = snakeToCamel(key);
    normalized[camelKey] = value;
    
    // Also keep original key for backward compatibility
    if (key !== camelKey) {
      normalized[key] = value;
    }
  }
  
  return normalized;
};

/**
 * Find download client implementation in schema by name
 */
const findImplementationInSchema = (
  schema: DownloadClientResource[],
  implementation: string,
): DownloadClientResource | undefined => {
  return schema.find((s) => s.implementation?.toLowerCase() === implementation.toLowerCase());
};

/**
 * Merge field values from config into schema template (supports partial updates)
 * Supports both camelCase and snake_case field names in config
 * Supports generic "category" field that maps to app-specific category
 */
const mergeFieldsWithSchema = (
  schemaFields: DownloadClientField[],
  configFields: Record<string, any>,
  arrType: ArrType,
  serverFields?: DownloadClientField[],
  partialUpdate: boolean = false,
): DownloadClientField[] => {
  // Normalize config fields to support both camelCase and snake_case, and generic category
  const normalizedFields = normalizeConfigFields(configFields, arrType);
  
  if (partialUpdate && serverFields) {
    // For partial updates, start with server fields and only update specified config fields
    return serverFields.map((field) => {
      const fieldName = field.name || "";
      const configValue = normalizedFields[fieldName];
      if (configValue !== undefined) {
        return { ...field, value: configValue };
      }
      return field;
    });
  } else {
    // Full update: use schema fields with config overrides
    return schemaFields.map((field) => {
      const fieldName = field.name || "";
      const configValue = normalizedFields[fieldName];
      if (configValue !== undefined) {
        return { ...field, value: configValue };
      }
      return field;
    });
  }
};

/**
 * Create download client payload from config
 */
const createDownloadClientFromConfig = async (
  config: InputConfigDownloadClient,
  schema: DownloadClientResource[],
  cache: ServerCache,
  arrType: ArrType,
  serverClient?: DownloadClientResource,
  partialUpdate: boolean = false,
): Promise<DownloadClientResource> => {
  const template = findImplementationInSchema(schema, config.type);
  
  if (!template) {
    throw new Error(`Download client implementation '${config.type}' not found in schema`);
  }

  // Resolve tag names to IDs
  let tagIds: number[] = [];
  if (config.tags && config.tags.length > 0) {
    const { ids, missingTags } = resolveTagNamesToIds(config.tags, cache.tags);
    
    if (missingTags.length > 0) {
      logger.info(`Creating missing tags for download client '${config.name}': ${missingTags.join(", ")}`);
      const api = getUnifiedClient();
      
      for (const tagName of missingTags) {
        try {
          const newTag = await api.createTag({ label: tagName });
          cache.tags.push(newTag);
          if (newTag.id) {
            ids.push(newTag.id);
          }
        } catch (error: any) {
          logger.warn(`Failed to create tag '${tagName}': ${error.message}`);
        }
      }
    }
    
    tagIds = ids;
  }

  const mergedFields = mergeFieldsWithSchema(
    template.fields || [],
    config.fields || {},
    arrType,
    serverClient?.fields,
    partialUpdate,
  );

  return {
    enable: config.enable ?? (serverClient?.enable ?? true),
    protocol: template.protocol,
    priority: config.priority ?? (serverClient?.priority ?? 1),
    removeCompletedDownloads: config.remove_completed_downloads ?? (serverClient?.removeCompletedDownloads ?? true),
    removeFailedDownloads: config.remove_failed_downloads ?? (serverClient?.removeFailedDownloads ?? true),
    name: config.name,
    fields: mergedFields,
    implementationName: template.implementationName,
    implementation: template.implementation,
    configContract: template.configContract,
    infoLink: template.infoLink,
    tags: tagIds,
  };
};

/**
 * Check if two download clients are equal (ignoring ID)
 * Returns true if equal, false if different
 */
const isDownloadClientEqual = (
  config: InputConfigDownloadClient,
  server: DownloadClientResource,
  cache: ServerCache,
  arrType: ArrType,
): boolean => {
  // Compare basic properties
  if (config.name !== server.name) return false;
  if ((config.enable ?? true) !== server.enable) return false;
  if ((config.priority ?? 1) !== server.priority) return false;
  if ((config.remove_completed_downloads ?? true) !== server.removeCompletedDownloads) return false;
  if ((config.remove_failed_downloads ?? true) !== server.removeFailedDownloads) return false;

  // Compare implementation
  if (config.type.toLowerCase() !== server.implementation?.toLowerCase()) return false;

  // Compare fields (normalize to support snake_case and generic category)
  const configFields = normalizeConfigFields(config.fields || {}, arrType);
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

  // Compare tags (resolve names to IDs first)
  const configTags = config.tags ?? [];
  const { ids: resolvedTagIds } = resolveTagNamesToIds(configTags, cache.tags);
  const serverTags = server.tags ?? [];
  
  if (JSON.stringify(resolvedTagIds.sort()) !== JSON.stringify(serverTags.sort())) {
    return false;
  }

  return true;
};

/**
 * Determine if update should be partial (only specified fields) or full
 */
const shouldUsePartialUpdate = (config: InputConfigDownloadClient): boolean => {
  // If only some properties are specified, use partial update
  const specifiedProps = [
    config.enable !== undefined,
    config.priority !== undefined,
    config.remove_completed_downloads !== undefined,
    config.remove_failed_downloads !== undefined,
    config.fields && Object.keys(config.fields).length > 0,
  ].filter(Boolean).length;

  // If less than 3 properties specified, assume partial update intent
  return specifiedProps < 3;
};

/**
 * Calculate diff between configured download clients and server download clients
 */
const calculateDownloadClientDiff = (
  configClients: InputConfigDownloadClient[],
  serverClients: DownloadClientResource[],
  schema: DownloadClientResource[],
  cache: ServerCache,
  arrType: ArrType,
): DownloadClientDiff => {
  const create: InputConfigDownloadClient[] = [];
  const update: { config: InputConfigDownloadClient; server: DownloadClientResource; partialUpdate: boolean }[] = [];
  const unchanged: { config: InputConfigDownloadClient; server: DownloadClientResource }[] = [];

  for (const config of configClients) {
    const serverClient = serverClients.find((s) => s.name === config.name);

    if (!serverClient) {
      create.push(config);
    } else if (!isDownloadClientEqual(config, serverClient, cache, arrType)) {
      const partialUpdate = shouldUsePartialUpdate(config);
      update.push({ config, server: serverClient, partialUpdate });
    } else {
      unchanged.push({ config, server: serverClient });
    }
  }

  // Find clients to delete (on server but not in config)
  const configNames = new Set(configClients.map((c) => c.name));
  const deleted = serverClients.filter((s) => !configNames.has(s.name || ""));

  return { create, update, unchanged, deleted };
};

/**
 * Filter unmanaged download clients based on delete configuration
 */
const filterUnmanagedClients = (
  serverClients: DownloadClientResource[],
  configClients: InputConfigDownloadClient[],
  deleteConfig: MergedConfigInstance["delete_unmanaged_download_clients"],
): DownloadClientResource[] => {
  const enabled = typeof deleteConfig === "boolean" ? deleteConfig : deleteConfig?.enabled ?? false;
  
  if (!enabled) {
    return [];
  }

  const ignore = typeof deleteConfig === "boolean" ? [] : deleteConfig?.ignore ?? [];
  const configNames = new Set(configClients.map((c) => c.name));

  return serverClients.filter((server) => {
    const name = server.name || "";
    const isUnmanaged = !configNames.has(name);
    const isIgnored = ignore.includes(name);
    return isUnmanaged && !isIgnored;
  });
};

/**
 * Sync download clients configuration
 */
export const syncDownloadClients = async (
  instance: MergedConfigInstance,
  cache: ServerCache,
  arrType: ArrType,
): Promise<void> => {
  const configClients = instance.download_clients ?? [];

  if (configClients.length === 0 && !instance.delete_unmanaged_download_clients) {
    logger.info("No download clients configured and delete_unmanaged not enabled, skipping");
    return;
  }

  const api = getUnifiedClient();

  // Get schema and server clients
  logger.debug("Fetching download client schema...");
  const schema = await getDownloadClientSchema(cache);
  
  logger.debug("Fetching existing download clients...");
  const serverClients = await api.getDownloadClients();

  logger.info(`Found ${serverClients.length} download client(s) on server`);

  // Validate all configurations before making changes
  logger.debug("Validating download client configurations...");
  let hasValidationErrors = false;
  
  for (const config of configClients) {
    const validation = validateDownloadClient(config, schema);
    
    if (!validation.valid) {
      logger.error(`Validation failed for download client '${config.name}': ${validation.errors.join(", ")}`);
      hasValidationErrors = true;
    }
    
    if (validation.warnings.length > 0) {
      logger.warn(`Validation warnings for download client '${config.name}': ${validation.warnings.join(", ")}`);
    }
  }

  if (hasValidationErrors) {
    throw new Error("Download client configuration validation failed. Please fix errors and try again.");
  }

  // Calculate diff
  const diff = calculateDownloadClientDiff(configClients, serverClients, schema, cache, arrType);

  logger.info(
    `Download clients diff - Create: ${diff.create.length}, Update: ${diff.update.length}, Unchanged: ${diff.unchanged.length}`,
  );

  // Create new clients
  for (const config of diff.create) {
    try {
      logger.info(`Creating download client: '${config.name}' (${config.type})...`);
      
      const payload = await createDownloadClientFromConfig(config, schema, cache, arrType);
      
      // Test connection before creating
      logger.debug(`Testing connection for '${config.name}'...`);
      const testResult = await testDownloadClientConnection(payload);
      
      if (!testResult.success) {
        logger.warn(`Connection test failed for '${config.name}': ${testResult.error}`);
        logger.warn(`Creating anyway - you may need to fix connection settings`);
      } else {
        logger.debug(`✓ Connection test passed for '${config.name}'`);
      }
      
      const created = await api.createDownloadClient(payload);
      logger.info(`✓ Created download client: '${created.name}' (${created.implementation})`);
    } catch (error: any) {
      logger.error(`✗ Failed to create download client '${config.name}': ${error.message}`);
      
      // Provide diagnostic information
      if (error.response?.data) {
        logger.debug(`Server response: ${JSON.stringify(error.response.data)}`);
      }
    }
  }

  // Update existing clients
  for (const { config, server, partialUpdate } of diff.update) {
    try {
      const updateType = partialUpdate ? "partial" : "full";
      logger.info(`Updating download client: '${config.name}' (${updateType} update)...`);
      
      const payload = await createDownloadClientFromConfig(config, schema, cache, arrType, server, partialUpdate);
      payload.id = server.id; // Preserve server ID
      
      // Test connection before updating
      logger.debug(`Testing connection for '${config.name}'...`);
      const testResult = await testDownloadClientConnection(payload);
      
      if (!testResult.success) {
        logger.warn(`Connection test failed for '${config.name}': ${testResult.error}`);
        logger.warn(`Updating anyway - you may need to fix connection settings`);
      } else {
        logger.debug(`✓ Connection test passed for '${config.name}'`);
      }
      
      const updated = await api.updateDownloadClient(server.id!.toString(), payload);
      logger.info(`✓ Updated download client: '${updated.name}' (${updated.implementation})`);
    } catch (error: any) {
      logger.error(`✗ Failed to update download client '${config.name}': ${error.message}`);
      
      // Provide diagnostic information
      if (error.response?.data) {
        logger.debug(`Server response: ${JSON.stringify(error.response.data)}`);
      }
    }
  }

  // Handle unmanaged clients deletion
  if (instance.delete_unmanaged_download_clients) {
    const unmanagedClients = filterUnmanagedClients(
      serverClients,
      configClients,
      instance.delete_unmanaged_download_clients,
    );

    logger.info(`Found ${unmanagedClients.length} unmanaged download client(s) to delete`);

    for (const client of unmanagedClients) {
      try {
        logger.info(`Deleting unmanaged download client: '${client.name}' (${client.implementation})...`);
        await api.deleteDownloadClient(client.id!.toString());
        logger.info(`✓ Deleted unmanaged download client: '${client.name}'`);
      } catch (error: any) {
        logger.error(`✗ Failed to delete download client '${client.name}': ${error.message}`);
        
        // Provide diagnostic information
        if (error.message.includes("in use")) {
          logger.warn(`Download client '${client.name}' may be in use by active downloads`);
        }
      }
    }
  }

  logger.info("✓ Download client synchronization complete");
};

