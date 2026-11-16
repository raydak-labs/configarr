import type { FieldChange } from "../diffReport/diffReport.types";
import type { ArrType } from "../types/common.types";

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
