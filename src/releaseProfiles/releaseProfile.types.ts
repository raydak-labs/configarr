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

export type MappedReleaseProfile<T extends ReleaseProfileShared = ReleaseProfileShared> = {
  config: InputConfigReleaseProfile;
  mapped: T;
};

export type ReleaseProfilesDiff<
  Server extends ReleaseProfileShared = ReleaseProfileShared,
  Request extends ReleaseProfileShared = ReleaseProfileShared,
> = {
  create: MappedReleaseProfile<Request>[];
  update: Array<{
    config: InputConfigReleaseProfile;
    server: Server;
    mapped: Request;
    fieldChanges: FieldChange[];
  }>;
  remove: Server[];
};

export type ReleaseProfileSyncResult = {
  added: number;
  removed: number;
  updated: number;
  diffEntries: DiffEntry[];
};
