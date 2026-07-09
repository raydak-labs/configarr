import { InputConfigRootFolder } from "../types/config.types";
import { MergedRootFolderResource } from "../types/merged.types";
import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";

// Shared types for root folder operations
export interface RootFolderDiff<TConfig extends InputConfigRootFolder = InputConfigRootFolder> {
  missingOnServer: TConfig[];
  notAvailableAnymore: MergedRootFolderResource[];
  changed: Array<{ config: TConfig; server: MergedRootFolderResource; fieldChanges: FieldChange[] }>;
}

export interface RootFolderSyncResult {
  added: number;
  removed: number;
  updated: number;
  diffEntries: DiffEntry[];
}
