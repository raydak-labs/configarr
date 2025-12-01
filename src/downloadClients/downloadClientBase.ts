import { ServerCache } from "../cache";
import { getUnifiedClient, IArrClient } from "../clients/unified-client";
import { getEnvs } from "../env";
import { logger } from "../logger";
import { ArrType } from "../types/common.types";
import { InputConfigDownloadClient, MergedConfigInstance } from "../types/config.types";
import { cloneWithJSON } from "../util";
import { z } from "zod";
import {
  ValidationResult,
  ConnectionTestResult,
  DownloadClientDiff,
  DownloadClientSyncResult,
  TagLike,
  DownloadClientField,
  DownloadClientResource,
} from "./downloadClient.types";

const DOWNLOAD_CLIENT_CONSTRAINTS = {
  PRIORITY_MIN: 1,
  PRIORITY_MAX: 50,
  NAME_MAX_LENGTH: 100,
} as const;

const ARR_CATEGORY_FIELDS: Record<ArrType, string> = {
  SONARR: "tvCategory",
  LIDARR: "musicCategory",
  RADARR: "movieCategory",
  WHISPARR: "movieCategory",
  READARR: "bookCategory",
} as const;

const DownloadClientConfigSchema = z.object({
  name: z
    .string()
    .min(1, "Download client name is required")
    .max(
      DOWNLOAD_CLIENT_CONSTRAINTS.NAME_MAX_LENGTH,
      `Download client name must be ${DOWNLOAD_CLIENT_CONSTRAINTS.NAME_MAX_LENGTH} characters or less`,
    ),
  type: z.string().min(1, "Download client type is required"),
  enable: z.boolean().optional().default(true),
  priority: z.number().int("Priority must be an integer").positive("Priority must be positive").optional().default(1),
  remove_completed_downloads: z.boolean().optional().default(true),
  remove_failed_downloads: z.boolean().optional().default(true),
  fields: z.record(z.string(), z.unknown()).optional(),
  tags: z
    .array(z.union([z.string().min(1, "Tag name cannot be empty"), z.number().int().positive("Tag ID must be a positive integer")]))
    .optional()
    .default([]),
});

export abstract class BaseDownloadClientSync {
  protected api: IArrClient;
  protected logger = logger;

  constructor() {
    this.api = null as any;
  }

  protected getApi(): IArrClient {
    if (!this.api) {
      this.api = getUnifiedClient();
    }
    return this.api;
  }

  protected abstract getArrType(): ArrType;

  protected abstract calculateDiff(
    configClients: InputConfigDownloadClient[],
    serverClients: DownloadClientResource[],
    cache: ServerCache,
  ): Promise<DownloadClientDiff>;

  public abstract resolveConfig(
    config: InputConfigDownloadClient,
    cache: ServerCache,
    serverClient?: DownloadClientResource,
    partialUpdate?: boolean,
  ): Promise<DownloadClientResource>;

  public getCategoryFieldName = (arrType: ArrType): string => {
    return ARR_CATEGORY_FIELDS[arrType] || ARR_CATEGORY_FIELDS.SONARR;
  };

  protected snakeToCamel = (str: string): string => {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  };

  public normalizeConfigFields = (configFields: Record<string, any>, arrType: ArrType): Record<string, any> => {
    const normalized: Record<string, any> = {};

    for (const [key, value] of Object.entries(configFields)) {
      // Handle generic "category" field
      if (key === "category") {
        const appCategoryField = this.getCategoryFieldName(arrType);
        normalized[appCategoryField] = value;
        // Backward compatibility
        normalized[key] = value;
        continue;
      }

      // Convert to camelCase
      const camelKey = this.snakeToCamel(key);
      normalized[camelKey] = value;

      // Keep original key
      if (key !== camelKey) {
        normalized[key] = value;
      }
    }

    return normalized;
  };

  public resolveTagNamesToIds = (tagNames: (string | number)[], serverTags: TagLike[]): { ids: number[]; missingTags: string[] } => {
    const ids: number[] = [];
    const missingTags: string[] = [];

    for (const tag of tagNames) {
      if (typeof tag === "number") {
        ids.push(tag);
      } else {
        const serverTag = serverTags.find((t: TagLike) => t.label?.toLowerCase() === tag.toLowerCase());
        if (serverTag && serverTag.id) {
          ids.push(serverTag.id);
        } else {
          missingTags.push(tag);
        }
      }
    }

    return { ids, missingTags };
  };

  protected findImplementationInSchema = (schema: DownloadClientResource[], implementation: string): DownloadClientResource | undefined => {
    return schema.find((s: DownloadClientResource) => s.implementation?.toLowerCase() === implementation.toLowerCase());
  };

  protected mergeFieldsWithSchema = (
    schemaFields: DownloadClientField[],
    configFields: Record<string, any>,
    arrType: ArrType,
    serverFields?: DownloadClientField[] | null,
    partialUpdate: boolean = false,
  ): DownloadClientField[] => {
    // Normalize config fields to support both camelCase and snake_case, and generic category
    const normalizedFields = this.normalizeConfigFields(configFields, arrType);

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

  protected validateDownloadClientConfig = (
    config: unknown,
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    data?: z.infer<typeof DownloadClientConfigSchema>;
  } => {
    const result = DownloadClientConfigSchema.safeParse(config);

    if (!result.success) {
      return {
        valid: false,
        errors: result.error.issues.map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`),
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

  public validateDownloadClient = (config: InputConfigDownloadClient, schema: DownloadClientResource[]): ValidationResult => {
    // First, validate with Zod schema for type safety
    const zodValidation = this.validateDownloadClientConfig(config);

    if (!zodValidation.valid) {
      return zodValidation;
    }

    // Then perform business logic validation
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate type exists in server schema
    const template = this.findImplementationInSchema(schema, config.type);
    if (!template) {
      errors.push(
        `Unknown download client type '${config.type}'. Available types: ${schema.map((s: DownloadClientResource) => s.implementation).join(", ")}`,
      );
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
    if (
      config.priority !== undefined &&
      (config.priority < DOWNLOAD_CLIENT_CONSTRAINTS.PRIORITY_MIN || config.priority > DOWNLOAD_CLIENT_CONSTRAINTS.PRIORITY_MAX)
    ) {
      warnings.push(
        `Priority ${config.priority} is outside typical range (${DOWNLOAD_CLIENT_CONSTRAINTS.PRIORITY_MIN}-${DOWNLOAD_CLIENT_CONSTRAINTS.PRIORITY_MAX})`,
      );
    }

    return { valid: errors.length === 0, errors, warnings };
  };

  protected testDownloadClientConnection = async (clientPayload: DownloadClientResource): Promise<ConnectionTestResult> => {
    try {
      // Use the test endpoint if available
      await this.getApi().testDownloadClient(clientPayload);
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
            ? (data as any).errors.map((e: any) => e.errorMessage ?? e.message ?? String(e)).join("; ")
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

  protected getDownloadClientSchema = async (cache: ServerCache): Promise<DownloadClientResource[]> => {
    const cached = cache.getDownloadClientSchema();
    if (cached) {
      return cached;
    }

    const schema = await this.getApi().getDownloadClientSchema();
    cache.setDownloadClientSchema(schema);
    return schema;
  };

  public filterUnmanagedClients = (
    serverClients: DownloadClientResource[],
    configClients: InputConfigDownloadClient[],
    deleteConfig: MergedConfigInstance["delete_unmanaged_download_clients"],
  ): DownloadClientResource[] => {
    const enabled = deleteConfig?.enabled ?? false;

    if (!enabled) {
      return [];
    }

    const ignoreNames = deleteConfig?.ignore ?? [];

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

  public async syncDownloadClients(config: MergedConfigInstance, serverCache: ServerCache): Promise<DownloadClientSyncResult> {
    const configClients = config.download_clients ?? [];

    if (configClients.length === 0 && !config.delete_unmanaged_download_clients?.enabled) {
      this.logger.info("No download clients configured and delete_unmanaged not enabled, skipping");
      return { added: 0, updated: 0, removed: 0 };
    }

    // Get schema and server clients
    this.logger.debug("Fetching download client schema...");
    const schema = await this.getDownloadClientSchema(serverCache);

    this.logger.debug("Fetching existing download clients...");
    const serverClients = await this.getApi().getDownloadClients();

    this.logger.info(`Found ${serverClients.length} download client(s) on server`);

    // Validate all configurations before making changes
    this.logger.debug("Validating download client configurations...");
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
      const validation = this.validateDownloadClient(config, schema);
      const duplicateCount = config.name ? (nameCounts.get(config.name) ?? 0) : 0;
      const isDuplicateName = !!config.name && duplicateCount > 1;

      if (!validation.valid) {
        this.logger.error(`Validation failed for download client '${config.name}': ${validation.errors.join(", ")}`);
        hasValidationErrors = true;
      }

      if (isDuplicateName) {
        this.logger.error(
          `Validation failed for download client '${config.name}': name must be unique (appears ${duplicateCount} times in configuration)`,
        );
        hasValidationErrors = true;
      }

      if (validation.warnings.length > 0) {
        this.logger.warn(`Validation warnings for download client '${config.name}': ${validation.warnings.join(", ")}`);
      }

      if (validation.valid && !isDuplicateName) {
        validConfigClients.push(config);
      }
    }

    if (hasValidationErrors) {
      this.logger.warn(
        "One or more download client configurations are invalid and will be skipped. Valid clients will still be processed.",
      );
    }

    // Collect all missing tags across all valid download clients
    const allMissingTags = new Set<string>();
    for (const config of validConfigClients) {
      if (config.tags) {
        const { missingTags } = this.resolveTagNamesToIds(config.tags, serverCache.tags);
        missingTags.forEach((tag: string) => allMissingTags.add(tag));
      }
    }

    // Create missing tags if any
    if (allMissingTags.size > 0) {
      this.logger.info(`Creating missing tags for download clients: ${Array.from(allMissingTags).join(", ")}`);

      for (const tagName of allMissingTags) {
        try {
          const newTag = await this.getApi().createTag({ label: tagName });
          serverCache.tags.push(newTag);
          this.logger.debug(`Created tag: '${tagName}' (ID: ${newTag.id})`);
        } catch (error: any) {
          this.logger.error(`Failed to create tag '${tagName}': ${error.message}`);
          throw new Error(`Tag creation failed. Cannot proceed with download client sync.`);
        }
      }
    }

    // Calculate diff (only using valid client configurations)
    const diff = await this.calculateDiff(validConfigClients, serverClients, serverCache);

    this.logger.info(
      `Download clients diff - Create: ${diff.create.length}, Update: ${diff.update.length}, Unchanged: ${diff.unchanged.length}`,
    );

    if (getEnvs().DRY_RUN) {
      this.logger.info("DryRun: Would update download clients.");
      return {
        added: diff.create.length,
        updated: diff.update.length,
        removed: diff.deleted.length,
      };
    }

    let added = 0,
      updated = 0,
      removed = 0;

    // Create new clients
    for (const config of diff.create) {
      try {
        this.logger.info(`Creating download client: '${config.name}' (${config.type})...`);

        const payload = await this.resolveConfig(config, serverCache);

        // Test connection before creating
        this.logger.debug(`Testing connection for '${config.name}'...`);
        const testResult = await this.testDownloadClientConnection(payload);

        if (!testResult.success) {
          this.logger.warn(`Connection test failed for '${config.name}': ${testResult.error}`);
          this.logger.warn(`Creating anyway - you may need to fix connection settings`);
        } else {
          this.logger.debug(`Connection test passed for '${config.name}'`);
        }

        await this.getApi().createDownloadClient(payload);
        added++;
        this.logger.info(`Created download client: '${config.name}' (${config.type})`);
      } catch (error: any) {
        this.logger.error(`Create download client '${config.name}' failed: ${error.message}`);
        if (error.response?.data) {
          this.logger.debug(`Server response: ${JSON.stringify(error.response.data)}`);
        }
      }
    }

    // Update existing clients
    for (const { config, server, partialUpdate } of diff.update) {
      try {
        const updateType = partialUpdate ? "partial" : "full";
        this.logger.info(`Updating download client: '${config.name}' (${updateType} update)...`);

        const payload = await this.resolveConfig(config, serverCache, server, partialUpdate);
        payload.id = server.id; // Preserve server ID

        // Test connection before updating
        this.logger.debug(`Testing connection for '${config.name}'...`);
        const testResult = await this.testDownloadClientConnection(payload);

        if (!testResult.success) {
          this.logger.warn(`Connection test failed for '${config.name}': ${testResult.error}`);
          this.logger.warn(`Updating anyway - you may need to fix connection settings`);
        } else {
          this.logger.debug(`Connection test passed for '${config.name}'`);
        }

        await this.getApi().updateDownloadClient(server.id!.toString(), payload);
        updated++;
        this.logger.info(`Updated download client: '${config.name}' (${config.type})`);
      } catch (error: any) {
        this.logger.error(`Update download client '${config.name}' failed: ${error.message}`);
        if (error.response?.data) {
          this.logger.debug(`Server response: ${JSON.stringify(error.response.data)}`);
        }
      }
    }

    // Handle unmanaged clients deletion
    if (config.delete_unmanaged_download_clients?.enabled) {
      const unmanagedClients = this.filterUnmanagedClients(serverClients, configClients, config.delete_unmanaged_download_clients);

      this.logger.info(`Found ${unmanagedClients.length} unmanaged download client(s) to delete`);

      for (const client of unmanagedClients) {
        try {
          this.logger.info(`Deleting unmanaged download client: '${client.name ?? "Unknown"}' (${client.implementation})...`);
          await this.getApi().deleteDownloadClient(client.id!.toString());
          removed++;
          this.logger.info(`Deleted unmanaged download client: '${client.name ?? "Unknown"}'`);
        } catch (error: any) {
          this.logger.error(`Delete download client '${client.name ?? "Unknown"}' failed: ${error.message}`);

          // Provide additional diagnostic information for common issues
          if (error.message.includes("in use")) {
            this.logger.warn(`Download client '${client.name ?? "Unknown"}' may be in use by active downloads`);
          }
        }
      }
    }

    if (added > 0 || updated > 0 || removed > 0) {
      this.logger.info(`Download client synchronization complete: +${added} ~${updated} -${removed}`);
    } else {
      this.logger.info("Download client synchronization complete - no changes needed");
    }

    return { added, updated, removed };
  }
}
