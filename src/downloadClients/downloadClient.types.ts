import { ArrType } from "../types/common.types";
import { InputConfigDownloadClient } from "../types/config.types";
import type { DownloadClientResource, DownloadClientField, DownloadClientTagResource } from "../types/download-client.types";

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Validation result for download client configuration
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Connection test result for download client
 */
export interface ConnectionTestResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Download client diff calculation result
 */
export type DownloadClientDiff = {
  create: InputConfigDownloadClient[];
  update: { config: InputConfigDownloadClient; server: DownloadClientResource; partialUpdate: boolean }[];
  unchanged: { config: InputConfigDownloadClient; server: DownloadClientResource }[];
  deleted: DownloadClientResource[];
};

/**
 * Download client synchronization result
 */
export interface DownloadClientSyncResult {
  added: number;
  updated: number;
  removed: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Generic tag type for tag resolution operations
 *
 * This type represents the minimal tag structure needed for tag name/ID resolution,
 * compatible with both DownloadClientTagResource and MergedTagResource.
 */
export type TagLike = { id?: number; label?: string | null };

// ============================================================================
// RE-EXPORTS
// ============================================================================

// Re-export existing types for convenience
export type { DownloadClientResource, DownloadClientField, DownloadClientTagResource };
