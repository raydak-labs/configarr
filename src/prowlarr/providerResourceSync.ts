import { z } from "zod";
import { ServerCache } from "../cache";
import { ProwlarrClient } from "../clients/prowlarr-client";
import { getSpecificClient } from "../clients/unified-client";
import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import { getEnvs } from "../env";
import { logger } from "../logger";
import { camelToSnake, snakeToCamel } from "../util";

export type TagLike = { id?: number; label?: string | null };

export type ProviderField = { name?: string | null; value?: any };

/**
 * Common shape of every Prowlarr "provider" resource (applications, indexers,
 * indexer proxies): a named thing backed by an implementation schema with a
 * `fields[]` array and numeric `tags[]`.
 */
export interface ProviderResource {
  id?: number;
  name?: string | null;
  implementation?: string | null;
  implementationName?: string | null;
  configContract?: string | null;
  infoLink?: string | null;
  fields?: ProviderField[] | null;
  tags?: number[] | null;
}

export interface ProviderConfigBase {
  name: string;
  fields?: Record<string, any>;
  tags?: (string | number)[];
}

export type ProviderDeleteUnmanaged = { enabled: boolean; ignore?: string[] } | undefined;

export type ProviderDiff<TConfig, TResource> = {
  create: TConfig[];
  update: { config: TConfig; server: TResource; partialUpdate: boolean; fieldChanges: FieldChange[] }[];
  unchanged: { config: TConfig; server: TResource }[];
  deleted: TResource[];
};

export interface ProviderSyncOutcome {
  added: number;
  updated: number;
  removed: number;
  diffEntries: DiffEntry[];
}

/**
 * One extra top-level property (beyond `fields`/`tags`) that a specific provider
 * resource carries - e.g. an application's `syncLevel`, or an indexer's `enable`
 * / `priority` / `appProfileId`.
 */
export interface ExtraProp<TConfig, TCtx> {
  /** Key on the server resource (camelCase). */
  serverKey: string;
  /** Desired value derived from config; `undefined` means "leave to server default". */
  fromConfig: (config: TConfig, ctx: TCtx) => unknown;
  /** Whether the user explicitly set this (drives the partial-update heuristic). */
  specified: (config: TConfig) => boolean;
}

const NAME_MAX_LENGTH = 100;

/**
 * Generic add/update/delete sync for a Prowlarr provider resource type.
 *
 * Subclasses wire in the client calls, the schema-template lookup, the identity
 * key and any extra top-level properties; everything else (validation, field
 * merge, tag creation, diffing, dry-run, diff entries) lives here.
 */
export abstract class ProviderResourceSync<
  TConfig extends ProviderConfigBase,
  TResource extends ProviderResource,
  TCtx = Record<string, never>,
> {
  protected readonly logger = logger;
  private _api: ProwlarrClient | undefined;
  private schemaCache: TResource[] | undefined;

  /** Human label, e.g. "Application" / "Indexer" / "IndexerProxy". */
  protected abstract readonly label: string;
  /** zod schema validating a single config entry. */
  protected abstract readonly configSchema: z.ZodType<any>;
  /** Extra top-level props this resource carries beyond fields/tags. */
  protected readonly extras: ExtraProp<TConfig, TCtx>[] = [];

  protected abstract fetchSchema(): Promise<TResource[]>;
  protected abstract fetchServer(): Promise<TResource[]>;
  protected abstract createResource(payload: TResource): Promise<unknown>;
  protected abstract updateResource(id: string, payload: TResource): Promise<unknown>;
  protected abstract deleteResource(id: string): Promise<unknown>;

  /** Locate the schema entry a config item is based on. */
  protected abstract findTemplate(config: TConfig, schema: TResource[]): TResource | undefined;
  /** Value used to describe the template in errors/logs (implementation or definition name). */
  protected abstract templateHint(config: TConfig): string;
  /** Identity match between a config item and a server resource. */
  protected abstract matches(config: TConfig, server: TResource): boolean;
  /** Stable key for dedupe + delete detection. */
  protected abstract configKey(config: TConfig): string;
  protected abstract serverKey(server: TResource): string;

  /** Optional per-run context (e.g. app profiles) passed to `extras`. */
  protected async loadContext(): Promise<TCtx> {
    return {} as TCtx;
  }

  /** Extra keys copied verbatim from the schema template into a create/update payload. */
  protected readonly templatePassthrough: string[] = [];

  /** Lazily resolved so pure helper methods stay usable without a configured API. */
  protected get apiClient(): ProwlarrClient {
    if (!this._api) {
      this._api = getSpecificClient("PROWLARR");
    }
    return this._api;
  }

  private async getSchema(): Promise<TResource[]> {
    if (!this.schemaCache) {
      this.schemaCache = await this.fetchSchema();
    }
    return this.schemaCache;
  }

  normalizeConfigFields(configFields: Record<string, unknown>): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(configFields)) {
      const camelKey = snakeToCamel(key);
      normalized[camelKey] = value;
      if (key !== camelKey) {
        normalized[key] = value;
      }
    }
    return normalized;
  }

  resolveTagNamesToIds(tagNames: (string | number)[], serverTags: TagLike[]): { ids: number[]; missingTags: string[] } {
    const ids: number[] = [];
    const missingTags: string[] = [];
    for (const tag of tagNames) {
      if (typeof tag === "number") {
        ids.push(tag);
      } else {
        const serverTag = serverTags.find((t) => t.label?.toLowerCase() === tag.toLowerCase());
        if (serverTag?.id) {
          ids.push(serverTag.id);
        } else {
          missingTags.push(tag);
        }
      }
    }
    return { ids, missingTags };
  }

  private mergeFieldsWithSchema(
    schemaFields: ProviderField[],
    configFields: Record<string, unknown>,
    serverFields: ProviderField[] | null | undefined,
    partialUpdate: boolean,
  ): ProviderField[] {
    const normalizedFields = this.normalizeConfigFields(configFields);
    const baseFields = partialUpdate && serverFields ? serverFields : schemaFields;
    return baseFields.map((field) => {
      const fieldName = field.name ?? "";
      const configValue = normalizedFields[fieldName];
      return configValue !== undefined ? { ...field, value: configValue } : field;
    });
  }

  validate(config: TConfig, schema: TResource[]): { valid: boolean; errors: string[]; warnings: string[] } {
    const parsed = this.configSchema.safeParse(config);
    if (!parsed.success) {
      return { valid: false, errors: parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`), warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    const template = this.findTemplate(config, schema);
    if (!template) {
      errors.push(`Unknown ${this.label} '${this.templateHint(config)}' - not found in the Prowlarr schema`);
    } else {
      const requiredFields = (template.fields ?? []).filter((f) => f.value === undefined || f.value === null || f.value === "");
      const normalizedFields = this.normalizeConfigFields(config.fields || {});
      for (const field of requiredFields) {
        const fieldName = field.name;
        const fieldExists = fieldName && ((config.fields && fieldName in config.fields) || fieldName in normalizedFields);
        if (fieldName && !fieldExists) {
          warnings.push(`Field '${camelToSnake(fieldName)}' may be required for ${this.templateHint(config)}`);
        }
      }
    }

    if (config.name && config.name.length > NAME_MAX_LENGTH) {
      errors.push(`${this.label} name must be ${NAME_MAX_LENGTH} characters or less`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  isEqual(config: TConfig, server: TResource, serverTags: TagLike[], ctx: TCtx): { equal: boolean; changes: FieldChange[] } {
    if (!this.matches(config, server)) {
      return { equal: false, changes: [] };
    }

    const changes: FieldChange[] = [];

    for (const extra of this.extras) {
      if (!extra.specified(config)) continue;
      const desired = extra.fromConfig(config, ctx);
      const current = (server as Record<string, unknown>)[extra.serverKey];
      if (desired !== undefined && JSON.stringify(desired) !== JSON.stringify(current)) {
        changes.push({ field: extra.serverKey, from: current, to: desired });
      }
    }

    const normalizedConfigFields = this.normalizeConfigFields(config.fields || {});
    const serverFields = server.fields || [];

    for (const serverField of serverFields) {
      const fieldName = serverField.name;
      if (!fieldName) continue;
      const configValue = normalizedConfigFields[fieldName];
      if (configValue === undefined) continue;

      const serverValue = serverField.value;
      let valuesMatch = JSON.stringify(configValue) === JSON.stringify(serverValue);

      // Server masks secrets as "********"; a non-empty configured secret counts as unchanged.
      if (
        !valuesMatch &&
        (fieldName.toLowerCase().includes("password") || fieldName.toLowerCase().includes("apikey")) &&
        serverValue === "********" &&
        typeof configValue === "string" &&
        configValue.length > 0
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
      if (key !== snakeToCamel(key)) continue;
      if (!serverFieldNames.has(key) && normalizedConfigFields[key] !== undefined) {
        this.logger.warn(`Config field '${key}' does not exist on server`);
        changes.push({ field: `fields.${key}`, from: undefined, to: normalizedConfigFields[key] });
      }
    }

    // Omitted `tags` means "do not manage" - only diff when the user set it explicitly,
    // otherwise an update would wipe tags added on the server.
    if (config.tags !== undefined) {
      const { ids: resolvedTagIds } = this.resolveTagNamesToIds(config.tags, serverTags);
      const sortedConfigTagIds = [...resolvedTagIds].sort();
      const sortedServerTags = [...(server.tags ?? [])].sort();
      if (JSON.stringify(sortedConfigTagIds) !== JSON.stringify(sortedServerTags)) {
        changes.push({ field: "tags", from: sortedServerTags, to: sortedConfigTagIds });
      }
    }

    return { equal: changes.length === 0, changes };
  }

  private shouldUsePartialUpdate(config: TConfig): boolean {
    const hasFieldOverrides = !!(config.fields && Object.keys(config.fields).length > 0);
    if (hasFieldOverrides) {
      return false;
    }
    const hasTags = Array.isArray(config.tags) && config.tags.length > 0;
    const specified = [...this.extras.map((e) => e.specified(config)), hasTags].filter(Boolean).length;
    return specified > 0;
  }

  async calculateDiff(
    configItems: TConfig[],
    serverItems: TResource[],
    serverTags: TagLike[],
    ctx: TCtx,
  ): Promise<ProviderDiff<TConfig, TResource>> {
    const create: TConfig[] = [];
    const update: ProviderDiff<TConfig, TResource>["update"] = [];
    const unchanged: ProviderDiff<TConfig, TResource>["unchanged"] = [];

    for (const config of configItems) {
      const server = serverItems.find((s) => this.matches(config, s));
      if (!server) {
        create.push(config);
        continue;
      }
      const comparison = this.isEqual(config, server, serverTags, ctx);
      if (comparison.equal) {
        unchanged.push({ config, server });
      } else {
        update.push({ config, server, partialUpdate: this.shouldUsePartialUpdate(config), fieldChanges: comparison.changes });
      }
    }

    const configKeys = new Set(configItems.map((c) => this.configKey(c)));
    const deleted = serverItems.filter((s) => !configKeys.has(this.serverKey(s)));

    return { create, update, unchanged, deleted };
  }

  async resolveConfig(config: TConfig, serverTags: TagLike[], ctx: TCtx, server?: TResource, partialUpdate = false): Promise<TResource> {
    const schema = await this.getSchema();
    const template = this.findTemplate(config, schema);
    if (!template) {
      throw new Error(`${this.label} '${this.templateHint(config)}' not found in Prowlarr schema`);
    }

    let tagIds: number[];
    if (config.tags === undefined) {
      // Not managed - keep whatever the server has.
      tagIds = server?.tags ?? [];
    } else {
      const { ids, missingTags } = this.resolveTagNamesToIds(config.tags, serverTags);
      if (missingTags.length > 0) {
        this.logger.warn(
          `Missing tags for ${this.label} '${config.name}': ${missingTags.join(", ")}. These should have been created during batch tag creation.`,
        );
      }
      tagIds = ids;
    }

    const mergedFields = this.mergeFieldsWithSchema(template.fields || [], config.fields || {}, server?.fields ?? undefined, partialUpdate);

    const passthrough: Record<string, unknown> = {};
    for (const key of this.templatePassthrough) {
      const value = (template as Record<string, unknown>)[key];
      if (value !== undefined) passthrough[key] = value;
    }

    const payload: Record<string, unknown> = {
      ...passthrough,
      name: config.name,
      fields: mergedFields,
      implementationName: template.implementationName,
      implementation: template.implementation,
      configContract: template.configContract,
      infoLink: template.infoLink,
      tags: tagIds,
    };

    for (const extra of this.extras) {
      const desired = extra.fromConfig(config, ctx);
      const fallback = (server as Record<string, unknown> | undefined)?.[extra.serverKey];
      payload[extra.serverKey] = desired ?? fallback;
    }

    return payload as TResource;
  }

  private async createMissingTags(configItems: TConfig[], serverCache: ServerCache): Promise<void> {
    const allMissingTags = new Set<string>();
    for (const config of configItems) {
      if (config.tags) {
        const { missingTags } = this.resolveTagNamesToIds(config.tags, serverCache.tags);
        missingTags.forEach((tag) => allMissingTags.add(tag));
      }
    }
    if (allMissingTags.size === 0) return;

    this.logger.info(`Creating missing tags for ${this.label}s: ${Array.from(allMissingTags).join(", ")}`);
    for (const tagName of allMissingTags) {
      try {
        const newTag = await this.apiClient.createTag({ label: tagName });
        serverCache.tags.push(newTag);
        this.logger.debug(`Created tag: '${tagName}' (ID: ${newTag.id})`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to create tag '${tagName}': ${errorMessage}`);
        throw new Error(`Tag creation failed. Cannot proceed with ${this.label} sync.`);
      }
    }
  }

  private filterUnmanaged(server: TResource[], configItems: TConfig[], deleteConfig: ProviderDeleteUnmanaged): TResource[] {
    const { enabled = false, ignore = [] } = deleteConfig ?? {};
    if (!enabled) return [];
    const configKeys = new Set(configItems.map((c) => this.configKey(c)));
    return server.filter((s) => !configKeys.has(this.serverKey(s)) && !ignore.includes(s.name ?? ""));
  }

  private diffToEntries(diff: ProviderDiff<TConfig, TResource>, unmanagedToDelete: TResource[]): DiffEntry[] {
    const entries: DiffEntry[] = diff.create.map((c) => ({ resourceType: this.label, name: c.name, action: "create" as const }));
    for (const { config, fieldChanges } of diff.update) {
      entries.push({ resourceType: this.label, name: config.name, action: "update", fieldChanges });
    }
    entries.push(...unmanagedToDelete.map((c) => ({ resourceType: this.label, name: c.name ?? "unknown", action: "delete" as const })));
    return entries;
  }

  async sync(configItems: TConfig[], deleteUnmanaged: ProviderDeleteUnmanaged, serverCache: ServerCache): Promise<ProviderSyncOutcome> {
    const deleteEnabled = deleteUnmanaged?.enabled ?? false;
    if (configItems.length === 0 && !deleteEnabled) {
      this.logger.debug(`No ${this.label}s configured and delete_unmanaged not enabled, skipping`);
      return { added: 0, updated: 0, removed: 0, diffEntries: [] };
    }

    const schema = configItems.length > 0 ? await this.getSchema() : [];
    const serverItems = await this.fetchServer();
    this.logger.info(`Found ${serverItems.length} ${this.label}(s) on server`);

    const ctx = await this.loadContext();

    // Validate (skip invalid, warn on duplicates)
    const valid: TConfig[] = [];
    const seen = new Map<string, number>();
    for (const c of configItems) {
      const key = this.configKey(c);
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    for (const c of configItems) {
      const validation = this.validate(c, schema);
      const isDuplicate = (seen.get(this.configKey(c)) ?? 0) > 1;
      if (!validation.valid) {
        this.logger.error(`Validation failed for ${this.label} '${c.name}': ${validation.errors.join(", ")}`);
      }
      if (isDuplicate) {
        this.logger.error(`Validation failed for ${this.label} '${c.name}': name must be unique`);
      }
      if (validation.warnings.length > 0) {
        this.logger.warn(`Validation warnings for ${this.label} '${c.name}': ${validation.warnings.join(", ")}`);
      }
      if (validation.valid && !isDuplicate) valid.push(c);
    }

    await this.createMissingTags(valid, serverCache);

    const diff = await this.calculateDiff(valid, serverItems, serverCache.tags, ctx);
    this.logger.info(
      `${this.label}s diff - Create: ${diff.create.length}, Update: ${diff.update.length}, Unchanged: ${diff.unchanged.length}`,
    );

    const unmanagedToDelete = deleteEnabled ? this.filterUnmanaged(serverItems, valid, deleteUnmanaged) : [];
    const diffEntries = this.diffToEntries(diff, unmanagedToDelete);

    if (getEnvs().DRY_RUN) {
      this.logger.info(`DryRun: Would update ${this.label}s.`);
      return { added: diff.create.length, updated: diff.update.length, removed: unmanagedToDelete.length, diffEntries };
    }

    let added = 0;
    for (const config of diff.create) {
      try {
        this.logger.info(`Creating ${this.label}: '${config.name}'...`);
        await this.createResource(await this.resolveConfig(config, serverCache.tags, ctx));
        added++;
      } catch (error) {
        this.logError(`Create ${this.label} '${config.name}' failed`, error);
      }
    }

    let updated = 0;
    for (const { config, server, partialUpdate } of diff.update) {
      try {
        this.logger.info(`Updating ${this.label}: '${config.name}' (${partialUpdate ? "partial" : "full"})...`);
        const payload = await this.resolveConfig(config, serverCache.tags, ctx, server, partialUpdate);
        payload.id = server.id;
        await this.updateResource(server.id!.toString(), payload);
        updated++;
      } catch (error) {
        this.logError(`Update ${this.label} '${config.name}' failed`, error);
      }
    }

    let removed = 0;
    for (const item of unmanagedToDelete) {
      try {
        this.logger.info(`Deleting unmanaged ${this.label}: '${item.name ?? "Unknown"}'...`);
        await this.deleteResource(item.id!.toString());
        removed++;
      } catch (error) {
        this.logError(`Delete ${this.label} '${item.name ?? "Unknown"}' failed`, error);
      }
    }

    if (added > 0 || updated > 0 || removed > 0) {
      this.logger.info(`${this.label} synchronization complete: +${added} ~${updated} -${removed}`);
    } else {
      this.logger.info(`${this.label} synchronization complete - no changes needed`);
    }

    return { added, updated, removed, diffEntries };
  }

  private logError(message: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(`${message}: ${errorMessage}`);
    const httpError = error as any;
    if (httpError?.response?.data) {
      this.logger.debug(`Server response: ${JSON.stringify(httpError.response.data)}`);
    }
  }
}
