import { InputConfigRootFolder } from "../types/config.types";
import { MergedRootFolderResource } from "../__generated__/mergedTypes";

// Shared types for root folder operations
export interface RootFolderDiff {
  missingOnServer: InputConfigRootFolder[];
  notAvailableAnymore: MergedRootFolderResource[];
  changed: Array<{ config: InputConfigRootFolder; server: MergedRootFolderResource }>;
}

export interface RootFolderSyncResult {
  added: number;
  removed: number;
  updated: number;
}
