import { ServerCache } from "./cache";
import { getUnifiedClient } from "./clients/unified-client";
import { logger } from "./logger";
import { ArrType } from "./types/common.types";
import { InputConfigDownloadClient, MergedConfigInstance } from "./types/config.types";
import type { DownloadClientResource, DownloadClientField, DownloadClientTagResource } from "./types/download-client.types";
import { cloneWithJSON } from "./util";
import { z } from "zod";

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Constraints for download client configuration
 */
const DOWNLOAD_CLIENT_CONSTRAINTS = {
  PRIORITY_MIN: 1,
  PRIORITY_MAX: 50,
  NAME_MAX_LENGTH: 100,
} as const;

/**
 * Mapping of ARR types to their category field names
 * 
 * Each *arr application uses a different field name for download client categories:
 * - SONARR uses "tvCategory" for TV show downloads
 * - LIDARR uses "musicCategory" for music downloads
 * - RADARR uses "movieCategory" for movie downloads
 * - WHISPARR uses "movieCategory" for adult content downloads
 * - READARR uses "bookCategory" for book/audiobook downloads
 */
const ARR_CATEGORY_FIELDS: Record<ArrType, string> = {
  SONARR: "tvCategory",
  LIDARR: "musicCategory",
  RADARR: "movieCategory",
  WHISPARR: "movieCategory",
  READARR: "bookCategory",
} as const;

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Custom error class for download client operations
 */
export class DownloadClientError extends Error {
  constructor(
    message: string,
    public readonly clientName: string | undefined,
    public readonly operation: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'DownloadClientError';
  }
}

/**
 * Handle download client errors consistently
 */
const handleDownloadClientError = (
  operation: string,
  clientName: string | undefined,
  error: any,
  options: { fatal?: boolean } = {}
): never | void => {
  const message = `${operation}${clientName ? ` for '${clientName}'` : ''} failed: ${error.message}`;
  
  if (options.fatal) {
    logger.error(`${message}`);
    throw new DownloadClientError(message, clientName, operation, error);
  } else {
    logger.error(`${message}`);
    if (error.response?.data) {
      logger.debug(`Server response: ${JSON.stringify(error.response.data)}`);
    }
  }
};

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Zod schema for download client configuration validation
 */
const DownloadClientConfigSchema = z.object({
  name: z.string()
    .min(1, "Download client name is required")
    .max(DOWNLOAD_CLIENT_CONSTRAINTS.NAME_MAX_LENGTH, `Download client name must be ${DOWNLOAD_CLIENT_CONSTRAINTS.NAME_MAX_LENGTH} characters or less`),
  type: z.string().min(1, "Download client type is required"),
  enable: z.boolean().optional().default(true),
  priority: z.number()
    .int("Priority must be an integer")
    .min(DOWNLOAD_CLIENT_CONSTRAINTS.PRIORITY_MIN, `Priority must be at least ${DOWNLOAD_CLIENT_CONSTRAINTS.PRIORITY_MIN}`)
    .max(DOWNLOAD_CLIENT_CONSTRAINTS.PRIORITY_MAX, `Priority must be at most ${DOWNLOAD_CLIENT_CONSTRAINTS.PRIORITY_MAX}`)
    .optional()
    .default(1),
  remove_completed_downloads: z.boolean().optional().default(true),
  remove_failed_downloads: z.boolean().optional().default(true),
  fields: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.union([
    z.string().min(1, "Tag name cannot be empty"),
    z.number().int().positive("Tag ID must be a positive integer")
  ])).optional().default([]),
});

/**
 * Validate download client configuration using Zod schema
 */
const validateDownloadClientConfig = (config: unknown): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  data?: z.infer<typeof DownloadClientConfigSchema>;
} => {
  const result = DownloadClientConfigSchema.safeParse(config);
  
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`),
      warnings: [],
    };
  }
  
  return {
    valid: true,
    errors: [],
    warnings: [],
    data: result.data,
  };
};

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

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
 * 
 * Converts an array of tag names/IDs to tag IDs by looking them up in the server's tag list.
 * Case-insensitive matching is used for tag names.
 * 
 * @param tagNames - Array of tag names (strings) or tag IDs (numbers)
 * @param serverTags - List of tags available on the server
 * @returns Object containing resolved IDs and any missing tag names
 * 
 * @example
 * ```typescript
 * const { ids, missingTags } = resolveTagNamesToIds(
 *   ["movies", "4k", 123],
 *   serverTags
 * );
 * // ids: [1, 2, 123]
 * // missingTags: [] if all found, or ["4k"] if not found
 * ```
 */
export const resolveTagNamesToIds = (
  tagNames: (string | number)[],
  serverTags: DownloadClientTagResource[],
): { ids: number[]; missingTags: string[] } => {
  const ids: number[] = [];
  const missingTags: string[] = [];

  for (const tag of tagNames) {
    if (typeof tag === "number") {
      ids.push(tag);
    } else {
      const serverTag = serverTags.find((t: DownloadClientTagResource) => t.label?.toLowerCase() === tag.toLowerCase());
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
 * 
 * Performs validation in two stages:
 * 1. Zod schema validation for type safety and basic constraints
 * 2. Business logic validation for server-specific requirements
 * 
 * @param config - Download client configuration to validate
 * @param schema - Server schema with available download client types
 * @returns Validation result with errors and warnings
 */
export const validateDownloadClient = (
  config: InputConfigDownloadClient,
  schema: DownloadClientResource[],
): ValidationResult => {
  // First, validate with Zod schema for type safety
  const zodValidation = validateDownloadClientConfig(config);
  
  if (!zodValidation.valid) {
    return zodValidation;
  }
  
  // Then perform business logic validation
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate type exists in server schema
  const template = findImplementationInSchema(schema, config.type);
  if (!template) {
    errors.push(`Unknown download client type '${config.type}'. Available types: ${schema.map((s: DownloadClientResource) => s.implementation).join(", ")}`);
  } else {
    // Validate required fields
    const requiredFields = (template.fields || []).filter((f: DownloadClientField) => {
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

  // Validate priority range (additional warning for values outside typical range)
  if (config.priority !== undefined && (config.priority < DOWNLOAD_CLIENT_CONSTRAINTS.PRIORITY_MIN || config.priority > DOWNLOAD_CLIENT_CONSTRAINTS.PRIORITY_MAX)) {
    warnings.push(`Priority ${config.priority} is outside typical range (${DOWNLOAD_CLIENT_CONSTRAINTS.PRIORITY_MIN}-${DOWNLOAD_CLIENT_CONSTRAINTS.PRIORITY_MAX})`);
  }

  return { valid: errors.length === 0, errors, warnings };
};

/**
 * Test download client connection
 * 
 * Attempts to connect to a download client using the provided configuration.
 * Provides user-friendly error messages for common connection issues.
 * 
 * @param clientPayload - Download client configuration to test
 * @returns Connection test result with success status and error details if failed
 * 
 * @example
 * ```typescript
 * const result = await testDownloadClientConnection(payload);
 * if (result.success) {
 *   console.log("Connection successful");
 * } else {
 *   console.error("Connection failed:", result.error);
 * }
 * ```
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
    const errorMessage = error?.message || String(error);

    // Extract structured details from HTTP responses when available
    const status = error?.response?.status;
    const data = error?.response?.data;

    let structuredDetail: string | undefined;

    if (data) {
      if (typeof data === "string") {
        structuredDetail = data;
      } else if (typeof data === "object") {
        const message = (data as any).message ?? (data as any).error;
        const errors = Array.isArray((data as any).errors)
          ? (data as any).errors
              .map((e: any) => e.errorMessage ?? e.message ?? String(e))
              .join("; ")
          : undefined;

        structuredDetail = [message, errors].filter(Boolean).join(" - ") || undefined;
      }
    }

    const statusPrefix = status ? `HTTP ${status}` : "Connection test failed";
    const structuredMessage = structuredDetail ? `${statusPrefix}: ${structuredDetail}` : statusPrefix;

    // Parse common low-level error types
    let friendly: string | undefined;
    if (errorMessage.includes("connection refused") || errorMessage.includes("ECONNREFUSED")) {
      friendly = "Connection refused - check host and port";
    } else if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT")) {
      friendly = "Connection timeout - check network connectivity";
    } else if (errorMessage.includes("unauthorized") || errorMessage.includes("401")) {
      friendly = "Authentication failed - check username/password/API key";
    } else if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      friendly = "Endpoint not found - check URL base path";
    }

    const parts = [friendly, structuredMessage, errorMessage].filter(
      (part, index, self) => part && self.indexOf(part) === index,
    ) as string[];

    return { success: false, error: parts.join(" | ") };
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
/**
 * Get the category field name for a specific *arr application
 * 
 * Different *arr applications use different field names for categorization:
 * - Sonarr: "tvCategory"
 * - Lidarr: "musicCategory"
 * - Radarr: "movieCategory"
 * - Whisparr: "movieCategory"
 * - Readarr: "bookCategory"
 * 
 * @param arrType - Type of *arr application
 * @returns Category field name for the application
 */
export const getCategoryFieldName = (arrType: ArrType): string => {
  return ARR_CATEGORY_FIELDS[arrType] || ARR_CATEGORY_FIELDS.SONARR; // Default to tvCategory
};

/**
 * Normalize config fields to support both camelCase and snake_case
 * Also supports generic "category" field that maps to the app-specific category
 * Returns a new object with camelCase keys
 */
/**
 * Normalize configuration field names
 * 
 * Performs two normalizations:
 * 1. Converts generic "category" field to app-specific category field (e.g., "movieCategory" for Radarr)
 * 2. Converts snake_case field names to camelCase
 * 
 * Maintains backward compatibility by keeping both original and normalized keys.
 * 
 * @param configFields - Raw configuration fields from user config
 * @param arrType - Type of *arr application (SONARR, RADARR, etc.)
 * @returns Normalized fields with both original and converted keys
 * 
 * @example
 * ```typescript
 * // For Radarr
 * normalizeConfigFields({ category: "movies", use_ssl: true }, "RADARR")
 * // Returns: { category: "movies", movieCategory: "movies", use_ssl: true, useSsl: true }
 * ```
 */
export const normalizeConfigFields = (
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
  return schema.find((s: DownloadClientResource) => s.implementation?.toLowerCase() === implementation.toLowerCase());
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
  serverFields?: DownloadClientField[] | null,
  partialUpdate: boolean = false,
): DownloadClientField[] => {
  // Normalize config fields to support both camelCase and snake_case, and generic category
  const normalizedFields = normalizeConfigFields(configFields, arrType);
  
  if (partialUpdate && serverFields) {
    // For partial updates, start with server fields and only update specified config fields
    return serverFields.map((field: DownloadClientField) => {
      const fieldName = field.name || "";
      const configValue = normalizedFields[fieldName];
      if (configValue !== undefined) {
        return { ...field, value: configValue };
      }
      return field;
    });
  } else {
    // Full update: use schema fields with config overrides
    return schemaFields.map((field: DownloadClientField) => {
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
    serverClient?.fields ?? undefined,
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
export const isDownloadClientEqual = (
  config: InputConfigDownloadClient,
  server: DownloadClientResource,
  cache: ServerCache,
  arrType: ArrType,
): boolean => {
  // Compare basic properties
  if (config.name !== server.name) return false;

  // Only compare top-level properties when they are explicitly specified in the config.
  // When omitted in the config, they are treated as "do not manage" and do not affect equality.
  if (config.enable !== undefined && config.enable !== server.enable) return false;
  if (config.priority !== undefined && config.priority !== server.priority) return false;
  if (
    config.remove_completed_downloads !== undefined &&
    config.remove_completed_downloads !== server.removeCompletedDownloads
  ) {
    return false;
  }
  if (
    config.remove_failed_downloads !== undefined &&
    config.remove_failed_downloads !== server.removeFailedDownloads
  ) {
    return false;
  }

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

  const serverFieldNames = new Set(
    serverFields
      .map((f: DownloadClientField) => f.name)
      .filter((name): name is string => typeof name === "string" && name.length > 0),
  );

  for (const key of Object.keys(configFields)) {
    if (!serverFieldNames.has(key) && configFields[key] !== undefined) {
      // Config references a field that does not exist on the server; treat as different
      return false;
    }
  }

  // Compare tags (resolve names to IDs first)
  const configTags = config.tags ?? [];
  const { ids: resolvedTagIds } = resolveTagNamesToIds(configTags, cache.tags);
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
export const shouldUsePartialUpdate = (config: InputConfigDownloadClient): boolean => {
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
    const serverClient = serverClients.find((s: DownloadClientResource) => s.name === config.name);

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
  const configNames = new Set(configClients.map((c: InputConfigDownloadClient) => c.name));
  const deleted = serverClients.filter((s: DownloadClientResource) => !configNames.has(s.name || ""));

  return { create, update, unchanged, deleted };
};

/**
 * Filter unmanaged download clients based on delete configuration
 */
export const filterUnmanagedClients = (
  serverClients: DownloadClientResource[],
  configClients: InputConfigDownloadClient[],
  deleteConfig: MergedConfigInstance["delete_unmanaged_download_clients"],
): DownloadClientResource[] => {
  const enabled = typeof deleteConfig === "boolean" ? deleteConfig : deleteConfig?.enabled ?? false;

  if (!enabled) {
    return [];
  }

  const ignoreNames = typeof deleteConfig === "boolean" ? [] : deleteConfig?.ignore ?? [];

  // Identify managed clients by a composite key of name + implementation
  const configKeys = new Set(
    configClients
      .filter((c: InputConfigDownloadClient) => !!c.name && !!c.type)
      .map((c: InputConfigDownloadClient) => `${c.name}::${c.type.toLowerCase()}`),
  );

  return serverClients.filter((server: DownloadClientResource) => {
    const name = server.name || "";
    const implementation = server.implementation?.toLowerCase() ?? "";
    const key = `${name}::${implementation}`;

    const isUnmanaged = !configKeys.has(key);
    const isIgnored = ignoreNames.includes(name);

    return isUnmanaged && !isIgnored;
  });
};

/**
 * Synchronize download clients configuration
 * 
 * Main orchestration function that syncs download clients from configuration to the server.
 * Performs the following operations:
 * 1. Validates all download client configurations
 * 2. Creates any missing tags referenced by download clients
 * 3. Calculates diff between config and server state
 * 4. Creates new download clients
 * 5. Updates existing download clients (full or partial)
 * 6. Deletes unmanaged download clients (if enabled)
 * 
 * @param instance - Merged configuration instance containing download client configs
 * @param cache - Server cache for storing/retrieving server data
 * @param arrType - Type of *arr application being configured
 * 
 * @throws {DownloadClientError} If critical operations fail (tag creation, validation)
 * 
 * @example
 * ```typescript
 * await syncDownloadClients(
 *   instance,
 *   serverCache,
 *   "RADARR"
 * );
 * ```
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

  // Enforce unique names across all configured download clients
  const nameCounts = new Map<string, number>();
  for (const config of configClients) {
    if (config.name) {
      const current = nameCounts.get(config.name) ?? 0;
      nameCounts.set(config.name, current + 1);
    }
  }

  const validConfigClients: InputConfigDownloadClient[] = [];

  for (const config of configClients) {
    const validation = validateDownloadClient(config, schema);
    const duplicateCount = config.name ? nameCounts.get(config.name) ?? 0 : 0;
    const isDuplicateName = !!config.name && duplicateCount > 1;

    if (!validation.valid) {
      logger.error(`Validation failed for download client '${config.name}': ${validation.errors.join(", ")}`);
      hasValidationErrors = true;
    }

    if (isDuplicateName) {
      logger.error(
        `Validation failed for download client '${config.name}': name must be unique (appears ${duplicateCount} times in configuration)`,
      );
      hasValidationErrors = true;
    }

    if (validation.warnings.length > 0) {
      logger.warn(`Validation warnings for download client '${config.name}': ${validation.warnings.join(", ")}`);
    }

    if (validation.valid && !isDuplicateName) {
      validConfigClients.push(config);
    }
  }

  if (hasValidationErrors) {
    logger.warn(
      "One or more download client configurations are invalid and will be skipped. Valid clients will still be processed.",
    );
  }

  // Collect all missing tags across all valid download clients
  const allMissingTags = new Set<string>();
  for (const config of validConfigClients) {
    if (config.tags) {
      const { missingTags } = resolveTagNamesToIds(config.tags, cache.tags);
      missingTags.forEach((tag: string) => allMissingTags.add(tag));
    }
  }

  // Create missing tags if any
  if (allMissingTags.size > 0) {
    logger.info(`Creating missing tags for download clients: ${Array.from(allMissingTags).join(", ")}`);
    
    for (const tagName of allMissingTags) {
      try {
        const newTag = await api.createTag({ label: tagName });
        cache.tags.push(newTag);
        logger.debug(`Created tag: '${tagName}' (ID: ${newTag.id})`);
      } catch (error: any) {
        logger.error(`Failed to create tag '${tagName}': ${error.message}`);
        throw new Error(`Tag creation failed. Cannot proceed with download client sync.`);
      }
    }
  }

// Calculate diff (only using valid client configurations)
  const diff = calculateDownloadClientDiff(validConfigClients, serverClients, schema, cache, arrType);

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
        logger.debug(`Connection test passed for '${config.name}'`);
      }
      
      const created = await api.createDownloadClient(payload);
      logger.info(`Created download client: '${created.name}' (${created.implementation})`);
    } catch (error: any) {
      handleDownloadClientError('Create download client', config.name, error, { fatal: false });
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
        logger.debug(`Connection test passed for '${config.name}'`);
      }
      
      const updated = await api.updateDownloadClient(server.id!.toString(), payload);
      logger.info(`Updated download client: '${updated.name}' (${updated.implementation})`);
    } catch (error: any) {
      handleDownloadClientError('Update download client', config.name, error, { fatal: false });
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
        logger.info(`Deleting unmanaged download client: '${client.name ?? 'Unknown'}' (${client.implementation})...`);
        await api.deleteDownloadClient(client.id!.toString());
        logger.info(`Deleted unmanaged download client: '${client.name ?? 'Unknown'}'`);
      } catch (error: any) {
        handleDownloadClientError('Delete download client', client.name ?? undefined, error, { fatal: false });
        
        // Provide additional diagnostic information for common issues
        if (error.message.includes("in use")) {
          logger.warn(`Download client '${client.name ?? 'Unknown'}' may be in use by active downloads`);
        }
      }
    }
  }

  logger.info("Download client synchronization complete");
};