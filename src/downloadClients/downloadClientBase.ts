import { z } from "zod";
import { ServerCache } from "../cache";
import type { DownloadClientsClient, TagsClient } from "../clients/capabilities";
import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import { getEnvs } from "../env";
import { logger } from "../logger";
import { buildTagPlaceholders, ensureTags, resolveTagNames } from "../tags/tags";
import { ArrType } from "../types/common.types";
import { InputConfigDownloadClient, MergedConfigInstance } from "../types/config.types";
import { DownloadClientDiff, DownloadClientShared, DownloadClientSyncResult, ValidationResult } from "./downloadClient.types";
import { camelToSnake, snakeToCamel } from "../util";
import { ConfigValidationError } from "../validation";

// Constants
const PRIORITY_MIN = 1;
const PRIORITY_MAX = 50;
const NAME_MAX_LENGTH = 100;

const DownloadClientConfigSchema = z.object({
  name: z
    .string()
    .min(1, "Download client name is required")
    .max(NAME_MAX_LENGTH, `Download client name must be ${NAME_MAX_LENGTH} characters or less`),
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

export function downloadClientDiffToDiffEntries<T extends DownloadClientShared>(
  diff: DownloadClientDiff<T>,
  unmanagedToDelete: T[],
): DiffEntry[] {
  const entries: DiffEntry[] = diff.create.map((c) => ({
    resourceType: "DownloadClient",
    name: c.name,
    action: "create" as const,
  }));

  for (const { config, fieldChanges } of diff.update) {
    entries.push({ resourceType: "DownloadClient", name: config.name, action: "update", fieldChanges });
  }

  entries.push(
    ...unmanagedToDelete.map((c) => ({
      resourceType: "DownloadClient",
      name: c.name ?? "unknown",
      action: "delete" as const,
    })),
  );

  return entries;
}

export abstract class BaseDownloadClientSync<T extends DownloadClientShared> {
  protected readonly logger = logger;
  private schema: T[] | null = null;

  constructor(protected readonly api: DownloadClientsClient<T> & TagsClient) {}

  protected getApi(): DownloadClientsClient<T> & TagsClient {
    return this.api;
  }

  protected abstract getArrType(): ArrType;

  /** Shared diff: reads no per-arr field, so it lives here and only the comparison hooks stay per-arr. */
  public abstract isDownloadClientEqual(
    config: InputConfigDownloadClient,
    server: T,
    cache: ServerCache,
    updatePassword?: boolean,
  ): { equal: boolean; changes: FieldChange[] };

  public abstract shouldUsePartialUpdate(config: InputConfigDownloadClient): boolean;

  public abstract resolveConfig(
    config: InputConfigDownloadClient,
    cache: ServerCache,
    serverClient?: T,
    partialUpdate?: boolean,
    updatePassword?: boolean,
  ): Promise<T>;

  public normalizeConfigFields(configFields: Record<string, unknown>, arrType: ArrType): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(configFields)) {
      // Convert to camelCase
      const camelKey = snakeToCamel(key);
      normalized[camelKey] = value;

      // Keep original key if different (for backward compatibility with snake_case)
      if (key !== camelKey) {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  /**
   * A tag the server does not have yet is represented by a negative placeholder id while diffing
   * (see `tagPlaceholders`). No *arr ever hands out a negative tag id, so those entries are reported
   * by label instead - the same convention as `providerResourceSync`. Real ids stay as they are.
   */
  private renderTagIds(ids: number[], placeholders?: Map<string, number>): Array<number | string> {
    if (!placeholders || placeholders.size === 0) {
      return ids;
    }

    const byId = new Map(Array.from(placeholders, ([label, id]) => [id, label]));

    return ids.map((id) => (id < 0 ? (byId.get(id) ?? id) : id));
  }
  protected collectSharedFieldChanges(
    config: InputConfigDownloadClient,
    server: T,
    cache: ServerCache,
    updatePassword: boolean,
  ): FieldChange[] {
    const changes: FieldChange[] = [];

    if (config.enable !== undefined && config.enable !== server.enable) {
      changes.push({ field: "enable", from: server.enable, to: config.enable });
    }
    if (config.priority !== undefined && config.priority !== server.priority) {
      changes.push({ field: "priority", from: server.priority, to: config.priority });
    }

    const normalizedConfigFields = this.normalizeConfigFields(config.fields || {}, this.getArrType());
    const serverFields = server.fields || [];

    for (const serverField of serverFields) {
      const fieldName = serverField.name;
      if (!fieldName) continue;

      const configValue = normalizedConfigFields[fieldName];
      const serverValue = serverField.value;

      if (configValue === undefined) continue;

      let valuesMatch = JSON.stringify(configValue) === JSON.stringify(serverValue);

      if (
        !valuesMatch &&
        (fieldName.toLowerCase().includes("password") || fieldName.toLowerCase().includes("apikey")) &&
        serverValue === "********" &&
        typeof configValue === "string" &&
        configValue.length > 0 &&
        !updatePassword
      ) {
        valuesMatch = true;
      }

      if (!valuesMatch) {
        changes.push({ field: `fields.${fieldName}`, from: serverValue, to: configValue });
      }
    }

    const serverFieldNames = new Set(
      serverFields.map((f) => f.name).filter((name): name is string => typeof name === "string" && name.length > 0),
    );

    for (const key of Object.keys(normalizedConfigFields)) {
      if (key !== snakeToCamel(key)) {
        continue;
      }

      if (!serverFieldNames.has(key) && normalizedConfigFields[key] !== undefined) {
        this.logger.warn(`Config field '${key}' does not exist on server`);
        changes.push({ field: `fields.${key}`, from: undefined, to: normalizedConfigFields[key] });
      }
    }

    const configTags = config.tags;
    if (configTags !== undefined) {
      const placeholders = this.tagPlaceholders(configTags, cache);
      const { ids: resolvedTagIds } = resolveTagNames(configTags, cache.tags, { placeholders });
      const serverTags = server.tags ?? [];

      const sortedConfigTagIds = [...resolvedTagIds].sort();
      const sortedServerTags = [...serverTags].sort();

      if (JSON.stringify(sortedConfigTagIds) !== JSON.stringify(sortedServerTags)) {
        changes.push({ field: "tags", from: sortedServerTags, to: this.renderTagIds(sortedConfigTagIds, placeholders) });
      }
    }

    return changes;
  }

  protected resolveDownloadClientTags(config: InputConfigDownloadClient, cache: ServerCache, serverClient?: T): number[] {
    if (config.tags === undefined) {
      return serverClient?.tags ?? [];
    }

    const { ids } = resolveTagNames(config.tags, cache.tags, { placeholders: this.tagPlaceholders(config.tags, cache) });
    return ids;
  }

  protected findImplementationInSchema(schema: T[], implementation: string): T | undefined {
    return schema.find((s) => s.implementation?.toLowerCase() === implementation.toLowerCase());
  }

  protected mergeFieldsWithSchema<F extends { name?: string | null; value?: unknown }>(
    schemaFields: F[],
    configFields: Record<string, unknown>,
    arrType: ArrType,
    serverFields: F[] | null | undefined,
    partialUpdate = false,
    updatePassword = true,
  ): F[] {
    const normalizedFields = this.normalizeConfigFields(configFields, arrType);
    const baseFields = partialUpdate && serverFields ? serverFields : schemaFields;

    return baseFields.map((field) => {
      const fieldName = field.name ?? "";
      const isSecret = fieldName.toLowerCase().includes("password") || fieldName.toLowerCase().includes("apikey");
      if (!updatePassword && isSecret && serverFields) {
        const serverField = serverFields.find((f) => f.name === fieldName);
        if (serverField) {
          return { ...field, value: serverField.value };
        }
      }
      const configValue = normalizedFields[fieldName];
      return configValue !== undefined ? { ...field, value: configValue } : field;
    });
  }

  protected validateDownloadClientConfig(config: unknown): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    data?: z.infer<typeof DownloadClientConfigSchema>;
  } {
    const result = DownloadClientConfigSchema.safeParse(config);

    return result.success
      ? { valid: true, errors: [], warnings: [], data: result.data }
      : {
          valid: false,
          errors: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`),
          warnings: [],
        };
  }

  public validateDownloadClient(config: InputConfigDownloadClient, schema: T[]): ValidationResult {
    const zodValidation = this.validateDownloadClientConfig(config);

    if (!zodValidation.valid) {
      return zodValidation;
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate type exists in server schema
    const template = this.findImplementationInSchema(schema, config.type);
    if (!template) {
      const availableTypes = schema
        .map((s) => s.implementation)
        .filter(Boolean)
        .join(", ");
      errors.push(`Unknown download client type '${config.type}'. Available types: ${availableTypes}`);
    } else {
      // Validate potentially required fields and configured field names.
      const requiredFields = (template.fields ?? []).filter((f) => f.value === undefined || f.value === null || f.value === "");

      // Normalize config fields to check against schema field names.
      const arrType = this.getArrType();
      const normalizedFields = this.normalizeConfigFields(config.fields || {}, arrType);
      const schemaFieldNames = new Set(
        (template.fields ?? []).map((field) => field.name).filter((fieldName): fieldName is string => !!fieldName),
      );

      for (const fieldName of Object.keys(normalizedFields)) {
        if (fieldName === snakeToCamel(fieldName) && !schemaFieldNames.has(fieldName)) {
          errors.push(`Field '${fieldName}' does not exist for download client type '${config.type}'`);
        }
      }

      for (const field of requiredFields) {
        const fieldName = field.name;
        // Check if the field exists in either the original config or normalized fields
        const fieldExists = fieldName && ((config.fields && fieldName in config.fields) || fieldName in normalizedFields);

        if (fieldName && !fieldExists) {
          warnings.push(`Field '${camelToSnake(fieldName)}' may be required for ${config.type}`);
        }
      }
    }

    // Validate priority range
    if (config.priority !== undefined && (config.priority < PRIORITY_MIN || config.priority > PRIORITY_MAX)) {
      warnings.push(`Priority ${config.priority} is outside typical range (${PRIORITY_MIN}-${PRIORITY_MAX})`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public setDownloadClientSchema(schema: T[]): void {
    this.schema = schema;
  }

  protected async getDownloadClientSchema(_cache: ServerCache): Promise<T[]> {
    if (this.schema) {
      return this.schema;
    }

    this.schema = await this.getApi().getDownloadClientSchema();
    return this.schema;
  }

  public filterUnmanagedClients(
    serverClients: T[],
    configClients: InputConfigDownloadClient[],
    deleteConfig: Exclude<MergedConfigInstance["download_clients"], undefined>["delete_unmanaged"],
  ): T[] {
    const { enabled = false, ignore = [] } = deleteConfig ?? {};

    if (!enabled) {
      return [];
    }

    // Create composite keys for managed clients (name + implementation)
    const configKeys = new Set(configClients.filter((c) => c.name && c.type).map((c) => `${c.name}::${c.type.toLowerCase()}`));

    return serverClients.filter((server) => {
      const name = server.name ?? "";
      const implementation = server.implementation?.toLowerCase() ?? "";
      const key = `${name}::${implementation}`;

      return !configKeys.has(key) && !ignore.includes(name);
    });
  }

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

  private async validateConfigClients(
    configClients: InputConfigDownloadClient[],
    schema: T[],
  ): Promise<{
    validClients: InputConfigDownloadClient[];
    hasErrors: boolean;
  }> {
    // Check for duplicate name + type combinations
    const compositeKeyCounts = new Map<string, number>();
    for (const config of configClients) {
      if (config.name && config.type) {
        const key = `${config.name}::${config.type.toLowerCase()}`;
        const current = compositeKeyCounts.get(key) ?? 0;
        compositeKeyCounts.set(key, current + 1);
      }
    }

    const validClients: InputConfigDownloadClient[] = [];
    let hasErrors = false;

    for (const config of configClients) {
      const validation = this.validateDownloadClient(config, schema);
      const compositeKey = config.name && config.type ? `${config.name}::${config.type.toLowerCase()}` : "";
      const duplicateCount = compositeKey ? (compositeKeyCounts.get(compositeKey) ?? 0) : 0;
      const isDuplicateComposite = !!compositeKey && duplicateCount > 1;

      if (!validation.valid) {
        this.logger.error(`Validation failed for download client '${config.name}': ${validation.errors.join(", ")}`);
        hasErrors = true;
      }

      if (isDuplicateComposite) {
        this.logger.error(
          `Validation failed for download client '${config.name}' (${config.type}): name and type combination must be unique (appears ${duplicateCount} times in configuration)`,
        );
        hasErrors = true;
      }

      if (validation.warnings.length > 0) {
        this.logger.warn(`Validation warnings for download client '${config.name}': ${validation.warnings.join(", ")}`);
      }

      if (validation.valid && !isDuplicateComposite) {
        validClients.push(config);
      }
    }

    if (hasErrors) {
      this.logger.warn(
        "One or more download client configurations are invalid and will be skipped. Valid clients will still be processed.",
      );
    }

    return { validClients, hasErrors };
  }

  /** Dry runs create nothing, so synthetic ids keep `tags` visible in the diff. */
  private tagPlaceholders(tagNames: (string | number)[], cache: ServerCache): Map<string, number> | undefined {
    if (!getEnvs().DRY_RUN) {
      return undefined;
    }
    return buildTagPlaceholders(
      tagNames.filter((tag): tag is string => typeof tag === "string"),
      cache.tags,
    );
  }

  private async createMissingTags(configClients: InputConfigDownloadClient[], serverCache: ServerCache): Promise<void> {
    const allMissingTags = new Set<string>();

    for (const config of configClients) {
      if (config.tags) {
        const { missing } = resolveTagNames(config.tags, serverCache.tags);
        missing.forEach((tag) => allMissingTags.add(tag));
      }
    }

    await ensureTags(this.getApi(), serverCache, [...allMissingTags]);
  }

  private async createClients(configs: InputConfigDownloadClient[], serverCache: ServerCache): Promise<InputConfigDownloadClient[]> {
    const created: InputConfigDownloadClient[] = [];

    for (const config of configs) {
      try {
        this.logger.info(`Creating download client: '${config.name}' (${config.type})...`);

        const payload = await this.resolveConfig(config, serverCache);

        await this.getApi().createDownloadClient(payload);
        created.push(config);
        this.logger.info(`Created download client: '${config.name}' (${config.type})`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Create download client '${config.name}' failed: ${errorMessage}`);
      }
    }

    return created;
  }

  private async updateClients(
    updates: DownloadClientDiff<T>["update"],
    serverCache: ServerCache,
    updatePassword: boolean,
  ): Promise<DownloadClientDiff<T>["update"]> {
    const updated: DownloadClientDiff<T>["update"] = [];

    for (const item of updates) {
      const { config, server, partialUpdate } = item;
      try {
        const updateType = partialUpdate ? "partial" : "full";
        this.logger.info(`Updating download client: '${config.name}' (${updateType} update)...`);

        const payload = await this.resolveConfig(config, serverCache, server, partialUpdate, updatePassword);
        payload.id = server.id; // Preserve server ID

        await this.getApi().updateDownloadClient(server.id!.toString(), payload);
        updated.push(item);
        this.logger.info(`Updated download client: '${config.name}' (${config.type})`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Update download client '${config.name}' failed: ${errorMessage}`);
      }
    }

    return updated;
  }

  private async deleteUnmanagedClients(unmanagedClients: T[]): Promise<T[]> {
    const removed: T[] = [];

    for (const client of unmanagedClients) {
      try {
        this.logger.info(`Deleting unmanaged download client: '${client.name ?? "Unknown"}' (${client.implementation})...`);
        await this.getApi().deleteDownloadClient(client.id!.toString());
        removed.push(client);
        this.logger.info(`Deleted unmanaged download client: '${client.name ?? "Unknown"}'`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Delete download client '${client.name ?? "Unknown"}' failed: ${errorMessage}`);

        // Provide additional diagnostic information for common issues
        if (errorMessage.includes("in use")) {
          this.logger.warn(`Download client '${client.name ?? "Unknown"}' may be in use by active downloads`);
        }
      }
    }

    return removed;
  }

  public async syncDownloadClients(
    config: Pick<MergedConfigInstance, "download_clients">,
    serverCache: ServerCache,
  ): Promise<DownloadClientSyncResult> {
    const configClients = config.download_clients?.data ?? [];
    const updatePassword = config.download_clients?.update_password ?? false;

    if (configClients.length === 0 && !config.download_clients?.delete_unmanaged?.enabled) {
      this.logger.info("No download clients configured and delete_unmanaged not enabled, skipping");
      return { added: 0, updated: 0, removed: 0, failed: 0, diffEntries: [] };
    }

    // Get schema and server clients
    this.logger.debug("Fetching download client schema...");
    const schema = await this.getDownloadClientSchema(serverCache);

    this.logger.debug("Fetching existing download clients...");
    const serverClients = await this.getApi().getDownloadClients();

    this.logger.info(`Found ${serverClients.length} download client(s) on server`);

    // Validate configurations
    this.logger.debug("Validating download client configurations...");
    const { validClients, hasErrors } = await this.validateConfigClients(configClients, schema);

    if (hasErrors && getEnvs().CONFIGARR_ENFORCE_CONFIG_VALIDATION) {
      throw new ConfigValidationError("Download client configuration validation failed.");
    }
    // A skipped client is a change that did not happen: it counts as failed so callers can see
    // the server still holds whatever that entry was supposed to manage.
    const skipped = configClients.length - validClients.length;

    // `ensureTags` creates nothing while DRY_RUN is set, and tags that do not exist on the server yet
    // resolve to stable placeholder ids while diffing, so a dry run reports the same counts as a real
    // run without writing anything.
    await this.createMissingTags(validClients, serverCache);

    // Calculate diff
    const diff = await this.calculateDiff(validClients, serverClients, serverCache, updatePassword);

    this.logger.info(
      `Download clients diff - Create: ${diff.create.length}, Update: ${diff.update.length}, Unchanged: ${diff.unchanged.length}`,
    );

    const unmanagedToDelete = config.download_clients?.delete_unmanaged?.enabled
      ? this.filterUnmanagedClients(serverClients, configClients, config.download_clients.delete_unmanaged)
      : [];

    if (getEnvs().DRY_RUN) {
      this.logger.info("DryRun: Would update download clients.");
      return {
        added: diff.create.length,
        updated: diff.update.length,
        removed: unmanagedToDelete.length,
        failed: skipped,
        diffEntries: downloadClientDiffToDiffEntries(diff, unmanagedToDelete),
      };
    }

    const [created, updatedItems] = await Promise.all([
      this.createClients(diff.create, serverCache),
      this.updateClients(diff.update, serverCache, updatePassword),
    ]);

    const deletedItems = config.download_clients?.delete_unmanaged?.enabled ? await this.deleteUnmanagedClients(unmanagedToDelete) : [];

    const added = created.length;
    const updated = updatedItems.length;
    const removed = deletedItems.length;
    const failedCreates = diff.create.length - added;
    const failedUpdates = diff.update.length - updated;
    const failedDeletes = unmanagedToDelete.length - removed;
    const failed = skipped + failedCreates + failedUpdates + failedDeletes;

    if (added > 0 || updated > 0 || removed > 0) {
      this.logger.info(`Download client synchronization complete: +${added} ~${updated} -${removed}`);
    } else if (failed === 0) {
      this.logger.info("Download client synchronization complete - no changes needed");
    }
    if (failed > 0) {
      this.logger.warn(`Download client synchronization complete - ${failed} change(s) failed`);
    }

    return {
      added,
      updated,
      removed,
      failed,
      diffEntries: downloadClientDiffToDiffEntries(
        { create: created, update: updatedItems, unchanged: diff.unchanged, deleted: [] },
        deletedItems,
      ),
    };
  }
}
