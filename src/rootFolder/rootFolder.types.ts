import { InputConfigRootFolder } from "../types/config.types";
import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";

export type RootFolderServerResource = {
  id?: number;
  path?: string | null;
};

export type GenericRootFolderArrType = "SONARR" | "RADARR" | "WHISPARR";

export interface RootFolderDiff<TConfig extends InputConfigRootFolder = InputConfigRootFolder> {
  missingOnServer: TConfig[];
  notAvailableAnymore: RootFolderServerResource[];
  changed: Array<{ config: TConfig; server: RootFolderServerResource; fieldChanges: FieldChange[] }>;
}

export interface RootFolderSyncResult {
  added: number;
  removed: number;
  updated: number;
  diffEntries: DiffEntry[];
}
