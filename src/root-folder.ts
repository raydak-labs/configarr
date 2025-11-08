import { MergedRootFolderResource } from "./__generated__/mergedTypes";
import { InputConfigRootFolder } from "./types/config.types";
import { getUnifiedClient } from "./clients/unified-client";
import { logger } from "./logger";
import { ArrType } from "./types/common.types";
import { ServerCache } from "./cache";
import { loadQualityProfilesFromServer } from "./quality-profiles";
import { compareObjectsCarr } from "./util";

const isRootFolderConfigEqual = (resolvedConfig: any, serverFolder: any): boolean => {
  // Only compare the configurable fields, filter out server-only fields like id, accessible, freeSpace, etc.
  const configFields = {
    name: resolvedConfig.name,
    path: resolvedConfig.path,
    defaultMetadataProfileId: resolvedConfig.defaultMetadataProfileId,
    defaultQualityProfileId: resolvedConfig.defaultQualityProfileId,
    defaultMonitorOption: resolvedConfig.defaultMonitorOption,
    defaultNewItemMonitorOption: resolvedConfig.defaultNewItemMonitorOption,
    defaultTags: resolvedConfig.defaultTags,
  };

  const serverFields = {
    name: serverFolder.name,
    path: serverFolder.path,
    defaultMetadataProfileId: serverFolder.defaultMetadataProfileId,
    defaultQualityProfileId: serverFolder.defaultQualityProfileId,
    defaultMonitorOption: serverFolder.defaultMonitorOption,
    defaultNewItemMonitorOption: serverFolder.defaultNewItemMonitorOption,
    defaultTags: serverFolder.defaultTags,
  };

  return compareObjectsCarr(serverFields, configFields).equal;
};

const loadRootFoldersFromServer = async () => {
  const api = getUnifiedClient();
  const result = await api.getRootfolders();
  return result as MergedRootFolderResource[];
};

export const resolveRootFolderConfig = async (config: InputConfigRootFolder, arrType: ArrType, serverCache: ServerCache) => {
  if (typeof config === "string") {
    if (arrType === "LIDARR") {
      throw new Error(`Lidarr root folders must be objects with name, metadata_profile, and quality_profile. Got string: ${config}`);
    }
    return { path: config };
  }

  if (arrType === "LIDARR") {
    // Load quality profiles and metadata profiles for Lidarr
    const api = getUnifiedClient();
    const [qualityProfiles, metadataProfiles] = await Promise.all([loadQualityProfilesFromServer(), api.getMetadataProfiles()]);

    const qualityProfileMap = new Map<string, number>();
    const metadataProfileMap = new Map<string, number>();

    qualityProfiles.forEach((profile: any) => {
      qualityProfileMap.set(profile.name, profile.id);
    });

    metadataProfiles.forEach((profile: any) => {
      metadataProfileMap.set(profile.name, profile.id);
    });

    const name = config.name;
    const metadataProfileId = config.metadata_profile ? metadataProfileMap.get(config.metadata_profile) : undefined;
    const qualityProfileId = config.quality_profile ? qualityProfileMap.get(config.quality_profile) : undefined;

    if (config.metadata_profile && metadataProfileId === undefined) {
      throw new Error(`Metadata profile '${config.metadata_profile}' not found on Lidarr server`);
    }

    if (config.quality_profile && qualityProfileId === undefined) {
      throw new Error(`Quality profile '${config.quality_profile}' not found on Lidarr server`);
    }

    // Resolve tag names to IDs, creating tags if they don't exist
    const newTags: any[] = [];
    const defaultTags = config.tags
      ? await Promise.all(
          config.tags.map(async (tagName) => {
            const existingTag = serverCache.tags.find((tag) => tag.label === tagName);
            if (existingTag) {
              return existingTag.id;
            } else {
              // Tag doesn't exist, create it
              const newTag = await api.createTag({ label: tagName });
              newTags.push(newTag);
              logger.info(`Created new tag '${tagName}' with ID ${newTag.id}`);
              return newTag.id;
            }
          }),
        )
      : undefined;

    // Update serverCache with new tags
    if (newTags.length > 0) {
      serverCache.tags.push(...newTags);
    }

    const result: any = {
      path: config.path,
      name,
      defaultMetadataProfileId: metadataProfileId,
      defaultQualityProfileId: qualityProfileId,
    };

    if (config.monitor) {
      result.defaultMonitorOption = config.monitor;
    }

    if (config.monitor_new_album) {
      result.defaultNewItemMonitorOption = config.monitor_new_album;
    }

    if (defaultTags) {
      result.defaultTags = defaultTags;
    }

    return result;
  }

  // For other arr types, just return the path
  return { path: config.path };
};

export const calculateRootFolderDiff = async (rootFolders: InputConfigRootFolder[], arrType: ArrType, serverCache: ServerCache) => {
  if (rootFolders == null) {
    logger.debug(`Config 'root_folders' not specified. Ignoring.`);
    return null;
  }

  const serverData = await loadRootFoldersFromServer();

  // If config is empty array, all server folders should be removed
  if (rootFolders.length === 0) {
    const notAvailableAnymore = serverData.map((folder) => (typeof folder === "string" ? folder : folder));
    logger.info(`Found ${notAvailableAnymore.length} differences for root folders.`);

    return {
      missingOnServer: [],
      notAvailableAnymore,
      changed: [],
    };
  }

  const missingOnServer: InputConfigRootFolder[] = [];
  const notAvailableAnymore: MergedRootFolderResource[] = [];
  const changed: Array<{ config: InputConfigRootFolder; server: any }> = [];

  // For Lidarr, we need to compare full configuration, not just paths
  if (arrType === "LIDARR") {
    // Create maps for efficient lookup
    const serverByPath = new Map<string, any>();
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
        const resolvedConfig = await resolveRootFolderConfig(configFolder, arrType, serverCache);
        const isChanged = !isRootFolderConfigEqual(
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
  } else {
    // For other arr types, only compare paths
    const serverDataStrings = serverData
      .map((folder) => (typeof folder === "string" ? folder : folder.path))
      .filter((folder): folder is string => typeof folder === "string" && !!folder);

    const rootFolderPaths = rootFolders.map((folder) => (typeof folder === "string" ? folder : folder.path));

    const rootFoldersSet = new Set(rootFolderPaths);
    const serverDataSet = new Set(serverDataStrings);

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
  }

  logger.debug({ missingOnServer, notAvailableAnymore, changed }, "Root folder comparison");

  if (missingOnServer.length === 0 && notAvailableAnymore.length === 0 && changed.length === 0) {
    logger.debug(`Root folders are in sync`);
    return null;
  }

  logger.info(`Found ${missingOnServer.length + notAvailableAnymore.length + changed.length} differences for root folders.`);

  return {
    missingOnServer,
    notAvailableAnymore,
    changed,
  };
};
