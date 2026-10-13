import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import { ReleaseProfileResource } from "../__generated__/sonarr/data-contracts";
import { ReleaseProfileResource as ReleaseProfileResourceV5 } from "../__generated__/sonarrV5/data-contracts";
import { InputConfigReleaseProfile } from "../types/config.types";

export type SonarrReleaseProfileResource = ReleaseProfileResource | ReleaseProfileResourceV5;

export type ReleaseProfileShared = {
  id?: number;
  name?: string | null;
  enabled?: boolean;
  required?: string[] | null;
  ignored?: string[] | null;
  indexerId?: number;
  indexerIds?: number[] | null;
  tags?: number[] | null;
  // Sonarr v5 only. A v4 resource has no field for either of these, so a config that sets them is
  // rejected rather than written and dropped.
  excludedTags?: number[] | null;
  airDateRestriction?: boolean;
  airDateGracePeriod?: number | null;
  allowSeasonPackWithoutAllEpisodesAired?: boolean;
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
