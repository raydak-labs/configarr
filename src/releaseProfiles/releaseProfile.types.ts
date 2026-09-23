import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import { InputConfigReleaseProfile } from "../types/config.types";

export type ReleaseProfileShared = {
  id?: number;
  name?: string | null;
  enabled?: boolean;
  required?: string[] | null;
  ignored?: string[] | null;
  indexerId?: number;
  tags?: number[] | null;
};

export type MappedReleaseProfile = {
  config: InputConfigReleaseProfile;
  mapped: ReleaseProfileShared;
};

export type ReleaseProfilesDiff = {
  create: MappedReleaseProfile[];
  update: Array<{
    config: InputConfigReleaseProfile;
    server: ReleaseProfileShared;
    mapped: ReleaseProfileShared;
    fieldChanges: FieldChange[];
  }>;
  remove: ReleaseProfileShared[];
};

export type ReleaseProfileSyncResult = {
  added: number;
  removed: number;
  updated: number;
  diffEntries: DiffEntry[];
};
