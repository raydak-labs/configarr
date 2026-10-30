import { getEnvs } from "../env";
import type { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import type { IndexerConfig } from "../types/config.types";
import type { IndexerConfigClient, IndexerConfigResourceShared } from "../clients/capabilities";

export async function syncIndexerConfig(client: IndexerConfigClient, config: IndexerConfig): Promise<DiffEntry[]> {
  const current = await client.getIndexerConfig();
  const changes: FieldChange[] = [];
  let next = { ...current };

  const fieldMappings: Array<{
    configKey: keyof IndexerConfig;
    serverKey: keyof IndexerConfigResourceShared;
  }> = [
    { configKey: "rss_sync_interval", serverKey: "rssSyncInterval" },
    { configKey: "retention", serverKey: "retention" },
    { configKey: "minimum_age", serverKey: "minimumAge" },
    { configKey: "maximum_size", serverKey: "maximumSize" },
  ];

  for (const { configKey, serverKey } of fieldMappings) {
    const value = config[configKey];
    if (value !== undefined && value !== current[serverKey]) {
      changes.push({ field: serverKey, from: current[serverKey], to: value });
      next = { ...next, [serverKey]: value };
    }
  }

  if (!changes.length) return [];
  if (current.id == null) throw new Error("Indexer config is missing an id");
  if (!getEnvs().DRY_RUN) await client.updateIndexerConfig(String(current.id), next);
  return [{ resourceType: "IndexerConfig", name: "Global", action: "update", fieldChanges: changes }];
}
