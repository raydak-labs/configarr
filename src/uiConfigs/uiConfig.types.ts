import { ArrType } from "../types/common.types";
import { FieldChange } from "../diffReport/diffReport.types";

/**
 * Result of a UI config sync operation
 */
export interface UiConfigSyncResult {
  updated: boolean;
  arrType: ArrType;
  fieldChanges: FieldChange[];
}

/**
 * Minimal UI config resource shape with required fields for sync operations.
 * The actual server response contains many more fields depending on the *arr type.
 */
export interface UiConfigResource {
  id: number;
  [key: string]: unknown;
}
