import { ServerCache } from "../cache";
import type { MetadataProfilesClient, QualityProfilesClient, RootFoldersClient, TagsClient } from "../clients/capabilities";
import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import { getEnvs } from "../env";
import { logger } from "../logger";
import { InputConfigRootFolder } from "../types/config.types";
import { compareObjectsCarr } from "../util";
import { ConfigValidationError } from "../validation";
import { InputConfigRootFolderObject, RootFolderDiff, RootFolderServerResource, RootFolderSyncResult } from "./rootFolder.types";

export function nameIdMap(profiles: { name?: string | null; id?: number }[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const profile of profiles) {
    if (profile.name && profile.id !== undefined) {
      map.set(profile.name, profile.id);
    }
  }
  return map;
}

/** Drop undefined so compareObjectsCarr does not treat omitted YAML fields as "set to undefined". */
export function definedFields<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as Partial<T>;
}

export function rootFolderDiffToDiffEntries(diff: RootFolderDiff): DiffEntry[] {
  const entries: DiffEntry[] = diff.missingOnServer.map((folder) => ({
    resourceType: "RootFolder",
    name: typeof folder === "string" ? folder : (folder.path ?? "unknown"),
    action: "create" as const,
  }));

  for (const { config, server, fieldChanges } of diff.changed) {
    entries.push({
      resourceType: "RootFolder",
      name: typeof config === "string" ? config : (config.path ?? server.path ?? "unknown"),
      action: "update",
      fieldChanges,
    });
  }

  entries.push(
    ...diff.notAvailableAnymore.map((folder) => ({
      resourceType: "RootFolder",
      name: folder.path ?? "unknown",
      action: "delete" as const,
    })),
  );

  return entries;
}

// Base class for root folder synchronization
export abstract class BaseRootFolderSync<TConfig extends InputConfigRootFolder = InputConfigRootFolder> {
  protected logger = logger;

  constructor(protected readonly api: RootFoldersClient<RootFolderServerResource>) {}

  abstract calculateDiff(rootFolders: TConfig[] | null, serverCache: ServerCache): Promise<RootFolderDiff<TConfig> | null>;
  public abstract resolveRootFolderConfig(config: TConfig, serverCache: ServerCache): Promise<RootFolderServerResource>;

  protected getApi(): RootFoldersClient<RootFolderServerResource> {
    return this.api;
  }

  protected getRootfolders() {
    return this.getApi().getRootfolders();
  }

  protected addRootFolder(data: RootFolderServerResource) {
    return this.getApi().addRootFolder(data);
  }

  protected updateRootFolder(id: string, data: RootFolderServerResource) {
    return this.getApi().updateRootFolder(id, data);
  }

  protected deleteRootFolder(id: string) {
    return this.getApi().deleteRootFolder(id);
  }

  async syncRootFolders(rootFolders: TConfig[], serverCache: ServerCache): Promise<RootFolderSyncResult> {
    const diff = await this.calculateDiff(rootFolders, serverCache);

    if (!diff) {
      return { added: 0, removed: 0, updated: 0, diffEntries: [] };
    }

    const diffEntries = rootFolderDiffToDiffEntries(diff);

    if (getEnvs().DRY_RUN) {
      this.logger.info("DryRun: Would update RootFolders.");
      return { added: diff.missingOnServer.length, removed: diff.notAvailableAnymore.length, updated: diff.changed.length, diffEntries };
    }

    let added = 0,
      removed = 0,
      updated = 0;

    // Must happen after the dry-run guard: persist resolves config against real tag ids.
    await this.createMissingTags(rootFolders, serverCache);

    // Remove folders not in config
    for (const folder of diff.notAvailableAnymore) {
      this.logger.info(`Deleting RootFolder not available anymore: ${folder.path}`);
      await this.deleteRootFolder(`${folder.id}`);
      removed++;
    }

    // Add missing folders
    for (const folder of diff.missingOnServer) {
      this.logger.info(`Adding RootFolder missing on server: ${typeof folder === "string" ? folder : folder.path}`);
      const resolvedConfig = await this.resolveRootFolderConfig(folder, serverCache);
      await this.addRootFolder(resolvedConfig);
      added++;
    }

    // Update changed folders
    for (const { config, server } of diff.changed) {
      this.logger.info(`Updating RootFolder: ${typeof config === "string" ? config : config.path}`);
      const resolvedConfig = await this.resolveRootFolderConfig(config, serverCache);
      await this.updateRootFolder(`${server.id}`, resolvedConfig);
      updated++;
    }

    if (added > 0 || removed > 0 || updated > 0) {
      this.logger.info(`Updated RootFolders: +${added} -${removed} ~${updated}`);
    }

    return { added, removed, updated, diffEntries };
  }

  /** Creates tags the config references but the server does not have yet. Called after the dry-run guard. No-op for path-only arrs. */
  protected async createMissingTags(_rootFolders: TConfig[], _serverCache: ServerCache): Promise<void> {}

  protected async loadRootFoldersFromServer(): Promise<RootFolderServerResource[]> {
    return this.getRootfolders();
  }
}

export type NamedProfile = { name?: string | null; id?: number };

export type ProfileAwareRootFolderApi<TResource extends RootFolderServerResource> = RootFoldersClient<TResource> &
  Pick<QualityProfilesClient<NamedProfile>, "getQualityProfiles"> &
  Pick<MetadataProfilesClient<NamedProfile>, "getMetadataProfiles"> &
  Pick<TagsClient, "createTag">;

/**
 * YAML fields every profile-aware (Lidarr/Readarr) root folder entry carries.
 * The per-arr new-item monitor key (monitor_new_album / monitor_new_items) stays on the arr's config type.
 */
export type ProfileAwareRootFolderConfig = {
  path: string;
  name: string;
  metadata_profile: string;
  quality_profile: string;
  monitor?: string;
  tags?: string[];
};

/** Server fields every profile-aware (Lidarr/Readarr) root folder resource carries. */
export type ProfileAwareRootFolderResource = RootFolderServerResource & {
  name?: string | null;
  defaultMetadataProfileId?: number;
  defaultQualityProfileId?: number;
  defaultMonitorOption?: string;
  defaultNewItemMonitorOption?: string;
  defaultTags?: number[] | null;
};

export type ProfileAwareRootFolderFields = {
  name: string;
  path: string;
  defaultMetadataProfileId?: number;
  defaultQualityProfileId?: number;
  defaultTags: number[];
};

const sharedComparableFields = (folder: ProfileAwareRootFolderResource) => ({
  name: folder.name,
  path: folder.path,
  defaultMetadataProfileId: folder.defaultMetadataProfileId,
  defaultQualityProfileId: folder.defaultQualityProfileId,
  defaultMonitorOption: folder.defaultMonitorOption,
  defaultNewItemMonitorOption: folder.defaultNewItemMonitorOption,
  defaultTags: folder.defaultTags,
});

/**
 * Shared lifecycle for arrs whose root folders carry profiles, monitor options and tags
 * (Lidarr, Readarr). Per-arr classes only own their generated resource: enum mapping and extra fields.
 */
export abstract class ProfileAwareRootFolderSync<
  TConfig extends InputConfigRootFolderObject & ProfileAwareRootFolderConfig,
  TResource extends ProfileAwareRootFolderResource,
> extends BaseRootFolderSync<TConfig> {
  private profileIdMaps: { quality: Map<string, number>; metadata: Map<string, number> } | null = null;

  constructor(protected readonly api: ProfileAwareRootFolderApi<TResource>) {
    super(api);
  }

  /** Used in validation messages, e.g. "Lidarr". */
  protected abstract readonly arrName: string;

  /**
   * Maps the shared fields onto this arr's generated resource. Per-arr because the monitor options are
   * generated string enums (Lidarr: monitor_new_album, Readarr: monitor_new_items) and Readarr adds Calibre fields.
   */
  protected abstract buildResource(config: TConfig, fields: ProfileAwareRootFolderFields): TResource;

  /** Fields compared in addition to the shared ones. Readarr adds its Calibre fields here. */
  protected extraComparableFields(_resource: TResource): Record<string, unknown> {
    return {};
  }

  protected override loadRootFoldersFromServer(): Promise<TResource[]> {
    return this.api.getRootfolders();
  }

  private async getProfileIdMaps(serverCache: ServerCache) {
    if (this.profileIdMaps) {
      return this.profileIdMaps;
    }

    const quality =
      serverCache.qualityProfiles.length > 0 ? nameIdMap(serverCache.qualityProfiles) : nameIdMap(await this.api.getQualityProfiles());
    const metadata = nameIdMap(await this.api.getMetadataProfiles());
    this.profileIdMaps = { quality, metadata };
    return this.profileIdMaps;
  }

  /** Ids for the configured tags. Names missing server-side get a negative placeholder that never matches a real id. */
  protected resolveTagIds(tagNames: string[] | undefined, serverCache: ServerCache): { ids: number[]; missing: string[] } {
    const ids: number[] = [];
    const missing: string[] = [];
    const placeholders = new Map<string, number>();

    for (const label of tagNames ?? []) {
      const existingTag = serverCache.tags.find((tag) => tag.label === label);
      if (existingTag) {
        if (existingTag.id != null) {
          ids.push(existingTag.id);
        }
        continue;
      }

      if (!missing.includes(label)) {
        missing.push(label);
      }
      const placeholder = placeholders.get(label) ?? -missing.length;
      placeholders.set(label, placeholder);
      ids.push(placeholder);
    }

    return { ids, missing };
  }

  public async resolveRootFolderConfig(config: TConfig, serverCache: ServerCache): Promise<TResource> {
    if (typeof config === "string") {
      throw new ConfigValidationError(
        `${this.arrName} root folders must be objects with name, metadata_profile, and quality_profile. Got string: ${config}`,
      );
    }

    const { quality: qualityProfileMap, metadata: metadataProfileMap } = await this.getProfileIdMaps(serverCache);

    const metadataProfileId = config.metadata_profile ? metadataProfileMap.get(config.metadata_profile) : undefined;
    const qualityProfileId = config.quality_profile ? qualityProfileMap.get(config.quality_profile) : undefined;

    if (config.metadata_profile && metadataProfileId === undefined) {
      throw new ConfigValidationError(`Metadata profile '${config.metadata_profile}' not found on ${this.arrName} server`);
    }

    if (config.quality_profile && qualityProfileId === undefined) {
      throw new ConfigValidationError(`Quality profile '${config.quality_profile}' not found on ${this.arrName} server`);
    }

    const { ids } = this.resolveTagIds(config.tags, serverCache);

    return this.buildResource(config, {
      name: config.name,
      path: config.path,
      defaultMetadataProfileId: metadataProfileId,
      defaultQualityProfileId: qualityProfileId,
      defaultTags: ids,
    });
  }

  protected override async createMissingTags(rootFolders: TConfig[], serverCache: ServerCache): Promise<void> {
    const missingTags = new Set<string>();
    for (const config of rootFolders) {
      this.resolveTagIds(config.tags, serverCache).missing.forEach((tag) => missingTags.add(tag));
    }

    if (missingTags.size === 0) {
      return;
    }

    this.logger.info(`Creating missing tags on server: ${[...missingTags].join(", ")}`);
    for (const label of missingTags) {
      serverCache.tags.push(await this.api.createTag({ label }));
    }
  }

  private compareRootFolderConfig(resolvedConfig: TResource, serverFolder: TResource): { equal: boolean; changes: FieldChange[] } {
    // Only compare the configurable fields, filter out server-only fields like id, accessible, freeSpace, etc.
    const configFields = { ...sharedComparableFields(resolvedConfig), ...this.extraComparableFields(resolvedConfig) };
    const serverFields = { ...sharedComparableFields(serverFolder), ...this.extraComparableFields(serverFolder) };

    return compareObjectsCarr(serverFields, definedFields(configFields));
  }

  async calculateDiff(rootFolders: TConfig[] | null, serverCache: ServerCache): Promise<RootFolderDiff<TConfig> | null> {
    if (rootFolders == null) {
      this.logger.debug(`Config 'root_folders' not specified. Ignoring.`);
      return null;
    }

    const serverData = await this.loadRootFoldersFromServer();

    // If config is empty array, all server folders should be removed
    if (rootFolders.length === 0) {
      this.logger.info(`Found ${serverData.length} differences for root folders.`);

      return {
        missingOnServer: [],
        notAvailableAnymore: serverData,
        changed: [],
      };
    }

    const missingOnServer: TConfig[] = [];
    const notAvailableAnymore: TResource[] = [];
    const changed: Array<{ config: TConfig; server: TResource; fieldChanges: FieldChange[] }> = [];

    // Create maps for efficient lookup
    const serverByPath = new Map<string, TResource>();
    serverData.forEach((folder) => {
      if (folder.path) {
        serverByPath.set(folder.path, folder);
      }
    });

    // Process each config folder
    for (const configFolder of rootFolders) {
      const configPath = typeof configFolder === "string" ? configFolder : configFolder.path;
      const serverFolder = serverByPath.get(configPath);

      if (!serverFolder) {
        // Folder doesn't exist on server
        missingOnServer.push(configFolder);
      } else {
        // Folder exists, check if configuration matches
        const resolvedConfig = await this.resolveRootFolderConfig(configFolder, serverCache);
        const comparison = this.compareRootFolderConfig(resolvedConfig, serverFolder);
        if (!comparison.equal) {
          changed.push({ config: configFolder, server: serverFolder, fieldChanges: comparison.changes });
        }
        // Remove from serverByPath so it won't be considered "not available anymore"
        serverByPath.delete(configPath);
      }
    }

    // Any remaining server folders are not in config
    serverByPath.forEach((folder) => {
      notAvailableAnymore.push(folder);
    });

    this.logger.debug({ missingOnServer, notAvailableAnymore, changed }, "Root folder comparison");

    if (missingOnServer.length === 0 && notAvailableAnymore.length === 0 && changed.length === 0) {
      this.logger.debug(`Root folders are in sync`);
      return null;
    }

    this.logger.info(`Found ${missingOnServer.length + notAvailableAnymore.length + changed.length} differences for root folders.`);

    return {
      missingOnServer,
      notAvailableAnymore,
      changed,
    };
  }
}

export class PathRootFolderSync extends BaseRootFolderSync<InputConfigRootFolder> {
  public async resolveRootFolderConfig(config: InputConfigRootFolder, _serverCache: ServerCache): Promise<RootFolderServerResource> {
    if (typeof config === "string") {
      return { path: config };
    }

    return { path: config.path };
  }

  async calculateDiff(
    rootFolders: InputConfigRootFolder[] | null,
    _serverCache: ServerCache,
  ): Promise<RootFolderDiff<InputConfigRootFolder> | null> {
    if (rootFolders == null) {
      this.logger.debug(`Config 'root_folders' not specified. Ignoring.`);
      return null;
    }

    const serverData = await this.loadRootFoldersFromServer();

    // If config is empty array, all server folders should be removed
    if (rootFolders.length === 0) {
      const notAvailableAnymore = serverData.map((folder) => (typeof folder === "string" ? folder : folder));
      this.logger.info(`Found ${notAvailableAnymore.length} differences for root folders.`);

      return {
        missingOnServer: [],
        notAvailableAnymore,
        changed: [],
      };
    }

    // Path-only arrs compare folder paths, not Lidarr/Readarr metadata.
    const serverDataStrings = serverData
      .map((folder) => (typeof folder === "string" ? folder : folder.path))
      .filter((folder): folder is string => typeof folder === "string" && !!folder);

    const rootFolderPaths = rootFolders.map((folder) => (typeof folder === "string" ? folder : folder.path));

    const rootFoldersSet = new Set(rootFolderPaths);
    const serverDataSet = new Set(serverDataStrings);

    const missingOnServer: InputConfigRootFolder[] = [];
    const notAvailableAnymore: RootFolderServerResource[] = [];

    rootFolders.forEach((folder) => {
      const folderPath = typeof folder === "string" ? folder : folder.path;
      if (!serverDataSet.has(folderPath)) {
        missingOnServer.push(folder);
      }
    });

    serverData.forEach((folder) => {
      const folderPath = typeof folder === "string" ? folder : folder.path;
      if (folderPath && !rootFoldersSet.has(folderPath)) {
        notAvailableAnymore.push(folder);
      }
    });

    this.logger.debug({ missingOnServer, notAvailableAnymore }, "Root folder comparison");

    if (missingOnServer.length === 0 && notAvailableAnymore.length === 0) {
      this.logger.debug(`Root folders are in sync`);
      return null;
    }

    this.logger.info(`Found ${missingOnServer.length + notAvailableAnymore.length} differences for root folders.`);

    return {
      missingOnServer,
      notAvailableAnymore,
      changed: [],
    };
  }
}
