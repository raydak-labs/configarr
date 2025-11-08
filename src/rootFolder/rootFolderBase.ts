import { MergedRootFolderResource } from "../__generated__/mergedTypes";
import { ServerCache } from "../cache";
import { getUnifiedClient, IArrClient } from "../clients/unified-client";
import { getEnvs } from "../env";
import { logger } from "../logger";
import { ArrType } from "../types/common.types";
import { InputConfigRootFolder } from "../types/config.types";
import { RootFolderDiff, RootFolderSyncResult } from "./rootFolder.types";

// Base class for root folder synchronization
export abstract class BaseRootFolderSync {
  protected api: IArrClient = getUnifiedClient();
  protected logger = logger;

  abstract calculateDiff(rootFolders: InputConfigRootFolder[], serverCache: ServerCache): Promise<RootFolderDiff | null>;
  public abstract resolveRootFolderConfig(config: InputConfigRootFolder, serverCache: ServerCache): Promise<MergedRootFolderResource>;

  async syncRootFolders(rootFolders: InputConfigRootFolder[], serverCache: ServerCache): Promise<RootFolderSyncResult> {
    const diff = await this.calculateDiff(rootFolders, serverCache);

    if (!diff) {
      return { added: 0, removed: 0, updated: 0 };
    }

    if (getEnvs().DRY_RUN) {
      this.logger.info("DryRun: Would update RootFolders.");
      return { added: diff.missingOnServer.length, removed: diff.notAvailableAnymore.length, updated: diff.changed.length };
    }

    let added = 0,
      removed = 0,
      updated = 0;

    // Remove folders not in config
    for (const folder of diff.notAvailableAnymore) {
      this.logger.info(`Deleting RootFolder not available anymore: ${folder.path}`);
      await this.api.deleteRootFolder(`${folder.id}`);
      removed++;
    }

    // Add missing folders
    for (const folder of diff.missingOnServer) {
      this.logger.info(`Adding RootFolder missing on server: ${typeof folder === "string" ? folder : folder.path}`);
      const resolvedConfig = await this.resolveRootFolderConfig(folder, serverCache);
      await this.api.addRootFolder(resolvedConfig);
      added++;
    }

    // Update changed folders
    for (const { config, server } of diff.changed) {
      this.logger.info(`Updating RootFolder: ${typeof config === "string" ? config : config.path}`);
      const resolvedConfig = await this.resolveRootFolderConfig(config, serverCache);
      await this.api.updateRootFolder(`${server.id}`, resolvedConfig);
      updated++;
    }

    if (added > 0 || removed > 0 || updated > 0) {
      this.logger.info(`Updated RootFolders: +${added} -${removed} ~${updated}`);
    }

    return { added, removed, updated };
  }

  protected async loadRootFoldersFromServer(): Promise<MergedRootFolderResource[]> {
    const result = await this.api.getRootfolders();
    return result as MergedRootFolderResource[];
  }

  protected abstract getArrType(): ArrType;
}

// Generic sync for most arr types (Radarr, Sonarr, etc.)
export class GenericRootFolderSync extends BaseRootFolderSync {
  constructor(private arrType: ArrType) {
    super();
  }

  protected getArrType(): ArrType {
    return this.arrType;
  }

  public async resolveRootFolderConfig(config: InputConfigRootFolder, serverCache: ServerCache): Promise<MergedRootFolderResource> {
    if (typeof config === "string") {
      return { path: config };
    }

    // For non-Lidarr types, just return the path
    return { path: config.path };
  }

  async calculateDiff(rootFolders: InputConfigRootFolder[], serverCache: ServerCache): Promise<RootFolderDiff | null> {
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

    // For generic arr types, only compare paths
    const serverDataStrings = serverData
      .map((folder) => (typeof folder === "string" ? folder : folder.path))
      .filter((folder): folder is string => typeof folder === "string" && !!folder);

    const rootFolderPaths = rootFolders.map((folder) => (typeof folder === "string" ? folder : folder.path));

    const rootFoldersSet = new Set(rootFolderPaths);
    const serverDataSet = new Set(serverDataStrings);

    const missingOnServer: InputConfigRootFolder[] = [];
    const notAvailableAnymore: MergedRootFolderResource[] = [];

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

  protected async loadRootFoldersFromServer(): Promise<MergedRootFolderResource[]> {
    return super.loadRootFoldersFromServer();
  }
}
