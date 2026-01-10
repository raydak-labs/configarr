import { z } from "zod";
import { ArrType } from "../types/common.types";
import { InputConfigRemotePath } from "../types/config.types";

/**
 * Zod schema for validating remote path configuration
 */
export const RemotePathConfigSchema = z.object({
  host: z.string().min(1, "Host is required"),
  remote_path: z
    .string()
    .min(1, "Remote path is required")
    .regex(/^([a-zA-Z]:|\/)/, "Remote path must be an absolute path (start with / or X:/ for Windows)"),
  local_path: z
    .string()
    .min(1, "Local path is required")
    .regex(/^([a-zA-Z]:|\/)/, "Local path must be an absolute path (start with / or X:/ for Windows)"),
});

/**
 * Result of a remote path mapping sync operation
 */
export interface RemotePathSyncResult {
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
  arrType: ArrType;
}

/**
 * Remote path mapping resource (common interface used by syncer)
 * Individual clients use their specific generated types
 */
export interface RemotePathMappingResource {
  id?: number;
  host?: string | null;
  remotePath?: string | null;
  localPath?: string | null;
}

/**
 * Internal diff calculation result
 */
export interface RemotePathDiff {
  toCreate: InputConfigRemotePath[];
  toUpdate: Array<{ id: number; config: InputConfigRemotePath }>;
  toDelete: Array<{ id: number }>;
  unchanged: number;
}
