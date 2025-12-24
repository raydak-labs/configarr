import {
  MetadataProfileResource,
  MonitorTypes,
  NewItemMonitorTypes,
  QualityProfileResource,
  RootFolderResource,
  TagResource,
} from "../__generated__/readarr/data-contracts";
import { ServerCache } from "../cache";
import { ReadarrClient } from "../clients/readarr-client";
import { getUnifiedClient } from "../clients/unified-client";
import { loadQualityProfilesFromServer } from "../quality-profiles";
import { InputConfigRootFolder } from "../types/config.types";
import { compareObjectsCarr } from "../util";
import { RootFolderDiff } from "./rootFolder.types";
import { BaseRootFolderSync } from "./rootFolderBase";

export class ReadarrRootFolderSync extends BaseRootFolderSync {
  protected api: ReadarrClient = getUnifiedClient().getSpecificClient();

  protected getArrType(): "READARR" {
    return "READARR";
  }

  public async resolveRootFolderConfig(config: InputConfigRootFolder, serverCache: ServerCache): Promise<RootFolderResource> {
    if (typeof config === "string") {
      throw new Error(`Readarr root folders must be objects with name, metadata_profile, and quality_profile. Got string: ${config}`);
    }

    // Load quality profiles and metadata profiles for Readarr
    const [qualityProfiles, metadataProfiles] = await Promise.all([loadQualityProfilesFromServer(), this.api.getMetadataProfiles()]);

    const qualityProfileMap = new Map<string, number>();
    const metadataProfileMap = new Map<string, number>();

    qualityProfiles.forEach((profile: QualityProfileResource) => {
      if (profile.name && profile.id !== undefined) {
        qualityProfileMap.set(profile.name, profile.id);
      }
    });

    metadataProfiles.forEach((profile: MetadataProfileResource) => {
      if (profile.id !== undefined && profile.name) {
        metadataProfileMap.set(profile.name, profile.id);
      }
    });

    const name = config.name;
    const metadataProfileId = config.metadata_profile ? metadataProfileMap.get(config.metadata_profile) : undefined;
    const qualityProfileId = config.quality_profile ? qualityProfileMap.get(config.quality_profile) : undefined;

    if (config.metadata_profile && metadataProfileId === undefined) {
      throw new Error(`Metadata profile '${config.metadata_profile}' not found on Readarr server`);
    }

    if (config.quality_profile && qualityProfileId === undefined) {
      throw new Error(`Quality profile '${config.quality_profile}' not found on Readarr server`);
    }

    // Resolve tag names to IDs, creating tags if they don't exist
    const newTags: TagResource[] = [];
    const defaultTags = config.tags
      ? await Promise.all(
          config.tags.map(async (tagName) => {
            const existingTag = serverCache.tags.find((tag) => tag.label === tagName);
            if (existingTag) {
              return existingTag.id;
            } else {
              // Tag doesn't exist, create it
              const newTag = await this.api.createTag({ label: tagName });
              newTags.push(newTag);
              this.logger.info(`Created new tag '${tagName}' with ID ${newTag.id}`);
              return newTag.id!;
            }
          }),
        )
      : [];

    // Update serverCache with new tags
    if (newTags.length > 0) {
      serverCache.tags.push(...newTags);
    }

    const result: RootFolderResource = {
      path: config.path,
      name,
      defaultMetadataProfileId: metadataProfileId,
      defaultQualityProfileId: qualityProfileId,
      defaultTags: defaultTags.filter((id: number | undefined): id is number => id !== undefined),
    };

    if (config.monitor) {
      result.defaultMonitorOption = config.monitor as MonitorTypes;
    }

    if ("monitor_new_items" in config && config.monitor_new_items) {
      result.defaultNewItemMonitorOption = config.monitor_new_items as NewItemMonitorTypes;
    }

    // Calibre integration fields (Readarr-specific)
    if ("is_calibre_library" in config) {
      result.isCalibreLibrary = config.is_calibre_library;
      result.host = config.calibre_host;
      result.port = config.calibre_port;
      result.urlBase = config.calibre_url_base;
      result.username = config.calibre_username;
      result.password = config.calibre_password;
      result.library = config.calibre_library;
      result.outputFormat = config.calibre_output_format;
      result.outputProfile = config.calibre_output_profile;
      result.useSsl = config.calibre_use_ssl;
    }

    return result;
  }

  private isRootFolderConfigEqual(resolvedConfig: RootFolderResource, serverFolder: RootFolderResource): boolean {
    // Compare only configurable fields; server-only fields like id, accessible, freeSpace are excluded.
    // Password is excluded since the API returns masked values, not the actual password.
    const configFields = {
      name: resolvedConfig.name,
      path: resolvedConfig.path,
      defaultMetadataProfileId: resolvedConfig.defaultMetadataProfileId,
      defaultQualityProfileId: resolvedConfig.defaultQualityProfileId,
      defaultMonitorOption: resolvedConfig.defaultMonitorOption,
      defaultNewItemMonitorOption: resolvedConfig.defaultNewItemMonitorOption,
      defaultTags: resolvedConfig.defaultTags,
      // Calibre fields
      isCalibreLibrary: resolvedConfig.isCalibreLibrary,
      host: resolvedConfig.host,
      port: resolvedConfig.port,
      urlBase: resolvedConfig.urlBase,
      username: resolvedConfig.username,
      library: resolvedConfig.library,
      outputFormat: resolvedConfig.outputFormat,
      outputProfile: resolvedConfig.outputProfile,
      useSsl: resolvedConfig.useSsl,
    };

    const serverFields = {
      name: serverFolder.name,
      path: serverFolder.path,
      defaultMetadataProfileId: serverFolder.defaultMetadataProfileId,
      defaultQualityProfileId: serverFolder.defaultQualityProfileId,
      defaultMonitorOption: serverFolder.defaultMonitorOption,
      defaultNewItemMonitorOption: serverFolder.defaultNewItemMonitorOption,
      defaultTags: serverFolder.defaultTags,
      // Calibre fields
      isCalibreLibrary: serverFolder.isCalibreLibrary,
      host: serverFolder.host,
      port: serverFolder.port,
      urlBase: serverFolder.urlBase,
      username: serverFolder.username,
      library: serverFolder.library,
      outputFormat: serverFolder.outputFormat,
      outputProfile: serverFolder.outputProfile,
      useSsl: serverFolder.useSsl,
    };

    return compareObjectsCarr(serverFields, configFields).equal;
  }

  async calculateDiff(rootFolders: InputConfigRootFolder[], serverCache: ServerCache): Promise<RootFolderDiff | null> {
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

    const missingOnServer: InputConfigRootFolder[] = [];
    const notAvailableAnymore: RootFolderResource[] = [];
    const changed: Array<{ config: InputConfigRootFolder; server: RootFolderResource }> = [];

    // Create maps for efficient lookup
    const serverByPath = new Map<string, RootFolderResource>();
    serverData.forEach((folder) => {
      const path = typeof folder === "string" ? folder : folder.path;
      if (path) {
        serverByPath.set(path, folder);
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
        const isChanged = !this.isRootFolderConfigEqual(
          resolvedConfig,
          typeof serverFolder === "string" ? { path: serverFolder } : serverFolder,
        );
        if (isChanged) {
          changed.push({ config: configFolder, server: serverFolder });
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
