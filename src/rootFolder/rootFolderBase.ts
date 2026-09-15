import { ServerCache } from "../cache";
import type { RootFoldersClient } from "../clients/capabilities";
import { DiffEntry } from "../diffReport/diffReport.types";
import { getEnvs } from "../env";
import { logger } from "../logger";
import { InputConfigRootFolder } from "../types/config.types";
import { RootFolderDiff, RootFolderServerResource, RootFolderSyncResult } from "./rootFolder.types";

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

  abstract calculateDiff(rootFolders: TConfig[], serverCache: ServerCache): Promise<RootFolderDiff<TConfig> | null>;
  public abstract resolveRootFolderConfig(config: TConfig, serverCache: ServerCache): Promise<RootFolderServerResource>;
  protected abstract getApi(): RootFoldersClient<RootFolderServerResource>;

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

  protected async loadRootFoldersFromServer(): Promise<RootFolderServerResource[]> {
    return this.getRootfolders();
  }
}

export abstract class PathRootFolderSync extends BaseRootFolderSync<InputConfigRootFolder> {
  public async resolveRootFolderConfig(config: InputConfigRootFolder, _serverCache: ServerCache): Promise<RootFolderServerResource> {
    if (typeof config === "string") {
      return { path: config };
    }

    return { path: config.path };
  }

  async calculateDiff(
    rootFolders: InputConfigRootFolder[],
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
