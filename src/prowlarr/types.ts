import type {
  ApplicationResource as ProwlarrApplicationResource,
  ApplicationSyncLevel,
  IndexerProxyResource as ProwlarrIndexerProxyResource,
  IndexerResource as ProwlarrIndexerResource,
} from "../__generated__/prowlarr/data-contracts";
import type { DiffEntry } from "../diffReport/diffReport.types";

export type ApplicationResource = ProwlarrApplicationResource;
export type IndexerResource = ProwlarrIndexerResource;
export type IndexerProxyResource = ProwlarrIndexerProxyResource;
export { ApplicationSyncLevel };

/** Aggregate result of syncing a single Prowlarr instance. */
export interface ProwlarrSyncResult {
  tags: { added: number; removed: number };
  indexerProxies: { added: number; updated: number; removed: number };
  indexers: { added: number; updated: number; removed: number };
  applications: { added: number; updated: number; removed: number };
  downloadClients: { added: number; updated: number; removed: number };
  indexersSynced: boolean;
  diffEntries: DiffEntry[];
}
