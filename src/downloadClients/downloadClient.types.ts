import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import { InputConfigDownloadClient } from "../types/config.types";

export type DownloadClientField = {
  name?: string | null;
  value?: unknown;
  order?: number;
  label?: string | null;
  unit?: string | null;
  helpText?: string | null;
  helpTextWarning?: string | null;
  helpLink?: string | null;
  type?: string | null;
  advanced?: boolean;
  selectOptions?: unknown;
  selectOptionsProviderAction?: string | null;
  section?: string | null;
  hidden?: string | null;
  privacy?: string;
  placeholder?: string | null;
  isFloat?: boolean;
};

export type DownloadClientShared = {
  id?: number;
  name?: string | null;
  fields?: DownloadClientField[] | null;
  implementationName?: string | null;
  implementation?: string | null;
  configContract?: string | null;
  infoLink?: string | null;
  tags?: number[] | null;
  enable?: boolean;
  protocol?: string;
  priority?: number;
};

export type MediaDownloadClientResource = DownloadClientShared & {
  removeCompletedDownloads?: boolean;
  removeFailedDownloads?: boolean;
};

export type ProwlarrDownloadClientCategory = {
  clientCategory?: string | null;
  categories?: number[] | null;
};

export type ProwlarrDownloadClientResource = DownloadClientShared & {
  categories?: ProwlarrDownloadClientCategory[] | null;
  supportsCategories?: boolean;
};

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

export type DownloadClientDiff<T extends DownloadClientShared> = {
  create: InputConfigDownloadClient[];
  update: { config: InputConfigDownloadClient; server: T; partialUpdate: boolean; fieldChanges: FieldChange[] }[];
  unchanged: { config: InputConfigDownloadClient; server: T }[];
  deleted: T[];
};

export interface DownloadClientSyncResult {
  added: number;
  updated: number;
  removed: number;
  diffEntries: DiffEntry[];
}
