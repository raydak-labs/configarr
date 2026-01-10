import { InputConfigRootFolder } from "../types/config.types";
import { MergedRootFolderResource } from "../__generated__/mergedTypes";

// Shared types for root folder operations
export interface RootFolderDiff<TConfig extends InputConfigRootFolder = InputConfigRootFolder> {
  missingOnServer: TConfig[];
  notAvailableAnymore: MergedRootFolderResource[];
  changed: Array<{ config: TConfig; server: MergedRootFolderResource }>;
}

export interface RootFolderSyncResult {
  added: number;
  removed: number;
  updated: number;
}
