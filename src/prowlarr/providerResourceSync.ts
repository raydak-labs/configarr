import { z } from "zod";
import { ServerCache } from "../cache";
import { ProwlarrClient } from "../clients/prowlarr-client";
import { getSpecificClient } from "../clients/unified-client";
import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import { getEnvs } from "../env";
import { logger } from "../logger";
import type { TagLike } from "../types/download-client.types";
import { camelToSnake, snakeToCamel } from "../util";

export type { TagLike };

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
 *
 * A payload value is resolved as `fromConfig() ?? server[serverKey] ?? fallback()`.
 */
export interface ExtraProp<TConfig, TCtx> {
  serverKey: string;
  fromConfig: (config: TConfig, ctx: TCtx) => unknown;
  /** Whether the user explicitly set this (drives the partial-update heuristic). */
  specified: (config: TConfig) => boolean;
  /** Value for a create when neither the config nor the server supplies one. */
  fallback?: (config: TConfig, ctx: TCtx) => unknown;
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
  protected abstract readonly configSchema: z.ZodType<any>;
  protected readonly extras: ExtraProp<TConfig, TCtx>[] = [];

  protected abstract fetchSchema(): Promise<TResource[]>;
  protected abstract fetchServer(): Promise<TResource[]>;
  protected abstract createResource(payload: TResource): Promise<unknown>;
  protected abstract updateResource(id: string, payload: TResource): Promise<unknown>;
  protected abstract deleteResource(id: string): Promise<unknown>;

  protected abstract findTemplate(config: TConfig, schema: TResource[]): TResource | undefined;
  /** Value used to describe the template in errors/logs (implementation or definition name). */
  protected abstract templateHint(config: TConfig): string;
  /** Stable identity key, used for matching, dedupe and detecting unmanaged server entries. */
  protected abstract configKey(config: TConfig): string;
  protected abstract serverKey(server: TResource): string;

  protected matches(config: TConfig, server: TResource): boolean {
    return this.configKey(config) === this.serverKey(server);
  }

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
        if (fieldName && !(fieldName in normalizedFields)) {
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
      const { ids, missingTags } = this.resolveTagNamesToIds(config.tags, serverTags);
      // A tag with no id yet is one a dry run would create. Listing it by name keeps the report
      // honest; dropping it would show an unchanged resource that a real run would retag.
      const desiredTags = [...[...ids].sort(), ...missingTags];
      const sortedServerTags = [...(server.tags ?? [])].sort();
      if (JSON.stringify(desiredTags) !== JSON.stringify(sortedServerTags)) {
        changes.push({ field: "tags", from: sortedServerTags, to: desiredTags });
      }
    }

    return { equal: changes.length === 0, changes };
  }

  /** A config that only tweaks top-level props is merged onto the server resource, not the schema. */
  private shouldUsePartialUpdate(config: TConfig): boolean {
    if (config.fields && Object.keys(config.fields).length > 0) {
      return false;
    }
    return this.extras.some((e) => e.specified(config)) || (config.tags?.length ?? 0) > 0;
  }

  calculateDiff(configItems: TConfig[], serverItems: TResource[], serverTags: TagLike[], ctx: TCtx): ProviderDiff<TConfig, TResource> {
    // First match wins, as a linear scan would.
    const byKey = new Map<string, TResource>();
    for (const server of serverItems) {
      const key = this.serverKey(server);
      if (!byKey.has(key)) byKey.set(key, server);
    }

    const diff: ProviderDiff<TConfig, TResource> = { create: [], update: [], unchanged: [] };

    for (const config of configItems) {
      const server = byKey.get(this.configKey(config));
      if (!server) {
        diff.create.push(config);
        continue;
      }
      const { equal, changes } = this.isEqual(config, server, serverTags, ctx);
      if (equal) {
        diff.unchanged.push({ config, server });
      } else {
        diff.update.push({ config, server, partialUpdate: this.shouldUsePartialUpdate(config), fieldChanges: changes });
      }
    }

    return diff;
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
      // An update starts from the server resource so top-level props configarr does not manage
      // survive the round trip. Prowlarr's PUT replaces the whole resource, so anything left out
      // is reset to its type default - which is how an indexer's `added` timestamp became
      // 0001-01-01 and its `downloadClientId` was cleared (issue #528).
      ...server,
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
      const fromServer = (server as Record<string, unknown> | undefined)?.[extra.serverKey];
      payload[extra.serverKey] = extra.fromConfig(config, ctx) ?? fromServer ?? extra.fallback?.(config, ctx);
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

    const names = Array.from(allMissingTags);
    if (getEnvs().DRY_RUN) {
      this.logger.info(`DryRun: Would create missing tags for ${this.label}s: ${names.join(", ")}`);
      return;
    }

    this.logger.info(`Creating missing tags for ${this.label}s: ${names.join(", ")}`);
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

    const [schema, serverItems, ctx] = await Promise.all([
      configItems.length > 0 ? this.getSchema() : Promise.resolve([] as TResource[]),
      this.fetchServer(),
      this.loadContext(),
    ]);
    this.logger.info(`Found ${serverItems.length} ${this.label}(s) on server`);

    const keys = configItems.map((c) => this.configKey(c));
    const duplicates = new Set(keys.filter((key, i) => keys.indexOf(key) !== i));

    const valid: TConfig[] = [];
    for (const [i, c] of configItems.entries()) {
      const validation = this.validate(c, schema);
      const isDuplicate = duplicates.has(keys[i]!);
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

    const diff = this.calculateDiff(valid, serverItems, serverCache.tags, ctx);
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
        throw this.toError(`Create ${this.label} '${config.name}' failed`, error);
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
        throw this.toError(`Update ${this.label} '${config.name}' failed`, error);
      }
    }

    let removed = 0;
    for (const item of unmanagedToDelete) {
      try {
        this.logger.info(`Deleting unmanaged ${this.label}: '${item.name ?? "Unknown"}'...`);
        await this.deleteResource(item.id!.toString());
        removed++;
      } catch (error) {
        throw this.toError(`Delete ${this.label} '${item.name ?? "Unknown"}' failed`, error);
      }
    }

    if (added > 0 || updated > 0 || removed > 0) {
      this.logger.info(`${this.label} synchronization complete: +${added} ~${updated} -${removed}`);
    } else {
      this.logger.info(`${this.label} synchronization complete - no changes needed`);
    }

    return { added, updated, removed, diffEntries };
  }

  private toError(message: string, error: unknown): Error {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(`${message}: ${errorMessage}`);
    const httpError = error as any;
    if (httpError?.response?.data) {
      this.logger.debug(`Server response: ${JSON.stringify(httpError.response.data)}`);
    }
    return new Error(`${message}: ${errorMessage}`);
  }
}
