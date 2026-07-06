import { FieldChange } from "../diffReport/diffReport.types";

/**
 * Download Client Configuration sync types
 * Handles instance-specific configuration for download clients
 */
export type DownloadClientConfigSyncResult = {
  updated: boolean;
  arrType: string;
  fieldChanges: FieldChange[];
};
