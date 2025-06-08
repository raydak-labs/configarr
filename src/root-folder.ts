import { MergedRootFolderResource } from "./__generated__/mergedTypes";
import { getUnifiedClient } from "./clients/unified-client";
import { logger } from "./logger";

const loadRootFoldersFromServer = async () => {
  const api = getUnifiedClient();
  const result = await api.getRootfolders();
  return result as MergedRootFolderResource[];
};

export const calculateRootFolderDiff = async (rootFolders: string[]) => {
  if (rootFolders == null || rootFolders.length === 0) {
    logger.debug(`Config 'root_folders' not specified. Ignoring.`);
    return null;
  }

  const serverData = await loadRootFoldersFromServer();

  // Convert serverData to string[] for comparison
  const serverDataStrings = serverData
    .map((folder) => (typeof folder === "string" ? folder : folder.path))
    .filter((folder): folder is string => typeof folder === "string" && !!folder);

  // Use Sets for efficient lookups
  const rootFoldersSet = new Set(rootFolders);
  const serverDataSet = new Set(serverDataStrings);

  const missingOnServer: string[] = [];
  const notAvailableAnymore: MergedRootFolderResource[] = [];
  const matching: string[] = [];

  // Single pass over rootFolders to find missingOnServer and matching
  rootFolders.forEach((folder) => {
    if (serverDataSet.has(folder)) {
      matching.push(folder);
    } else {
      missingOnServer.push(folder);
    }
  });

  // Single pass over serverData to find notAvailableAnymore
  serverData.forEach((folder) => {
    const folderPath = typeof folder === "string" ? folder : folder.path;
    if (folderPath && !rootFoldersSet.has(folderPath)) {
      notAvailableAnymore.push(folder);
    }
  });

  logger.debug({ missingOnServer, notAvailableAnymore, matching }, "Root folder comparison");

  if (missingOnServer.length === 0 && notAvailableAnymore.length === 0) {
    logger.debug(`Root folders are in sync`);
    return null;
  }

  logger.info(`Found ${missingOnServer.length + notAvailableAnymore.length} differences for root folders.`);

  return {
    missingOnServer,
    notAvailableAnymore,
  };
};
