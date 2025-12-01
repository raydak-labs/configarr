import { ArrType } from "../types/common.types";
import { InputConfigDownloadClient } from "../types/config.types";
import type { DownloadClientResource, DownloadClientField, DownloadClientTagResource } from "../types/download-client.types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConnectionTestResult {
  success: boolean;
  message?: string;
  error?: string;
}

export type DownloadClientDiff = {
  create: InputConfigDownloadClient[];
  update: { config: InputConfigDownloadClient; server: DownloadClientResource; partialUpdate: boolean }[];
  unchanged: { config: InputConfigDownloadClient; server: DownloadClientResource }[];
  deleted: DownloadClientResource[];
};

export interface DownloadClientSyncResult {
  added: number;
  updated: number;
  removed: number;
}

export type TagLike = { id?: number; label?: string | null };

export type { DownloadClientResource, DownloadClientField, DownloadClientTagResource };
