import { getEnvs } from "../env";
import { logger } from "../logger";
import type { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import type { IndexerSettings, MergedConfigInstance } from "../types/config.types";
import { ConfigValidationError } from "../validation";

type Field = { name?: string | null; value?: unknown; selectOptions?: Array<{ name?: string | null; value?: number }> | null };
export type Indexer = { id?: number; name?: string | null; fields?: Field[] | null; downloadClientId?: number };
export interface IndexerSettingsClient {
  getIndexers(): Promise<Indexer[]>;
  updateIndexer(id: string, indexer: Indexer): Promise<unknown>;
  getDownloadClients(): Promise<Array<{ id?: number; name?: string | null; implementation?: string | null }>>;
}

const same = (a: unknown, b: unknown) =>
  Array.isArray(a) && Array.isArray(b) ? JSON.stringify([...a].sort()) === JSON.stringify([...b].sort()) : a === b;

export async function prepareIndexerSettings(
  client: IndexerSettingsClient,
  config: IndexerSettings,
  instance: MergedConfigInstance,
  preflight: boolean,
) {
  if (!config.data.length) return [];
  const [indexers, clients] = await Promise.all([client.getIndexers(), client.getDownloadClients()]);
  const seen = new Set<string>();
  return config.data.flatMap((item) => {
    const key = item.name.toLowerCase();
    if (seen.has(key)) throw new ConfigValidationError(`Duplicate indexer '${item.name}'`);
    seen.add(key);
    const matches = indexers.filter((indexer) => indexer.name?.toLowerCase() === key);
    if (matches.length > 1) throw new ConfigValidationError(`Ambiguous indexer '${item.name}'`);
    const indexer = matches[0];
    if (!indexer) {
      if (!preflight) logger.warn(`Indexer '${item.name}' not found; skipping until a later run`);
      return [];
    }
    if (indexer.id == null) throw new ConfigValidationError(`Indexer '${item.name}' has no id`);
    if (preflight && instance.download_clients?.delete_unmanaged?.enabled) {
      const cleanup = instance.download_clients.delete_unmanaged;
      const willDelete = (entry: (typeof clients)[number]) =>
        !cleanup.ignore?.includes(entry.name ?? "") &&
        !instance.download_clients?.data?.some(
          (configured) => configured.name === entry.name && configured.type.toLowerCase() === entry.implementation?.toLowerCase(),
        );
      const referenced = clients.filter(
        (entry) =>
          entry.id === indexer.downloadClientId ||
          (item.download_client != null && entry.name?.toLowerCase() === item.download_client.toLowerCase()),
      );
      if (referenced.some(willDelete)) throw new ConfigValidationError(`Indexer '${item.name}': download client is scheduled for removal`);
    }
    const changes: FieldChange[] = [];
    let downloadClientId = indexer.downloadClientId;
    if (item.download_client !== undefined) {
      const named =
        item.download_client === null ? [] : clients.filter((entry) => entry.name?.toLowerCase() === item.download_client?.toLowerCase());
      if (named.length > 1) throw new ConfigValidationError(`Indexer '${item.name}': ambiguous download client`);
      const planned =
        (preflight || getEnvs().DRY_RUN) &&
        item.download_client !== null &&
        instance.download_clients?.data?.some((entry) => entry.name.toLowerCase() === item.download_client?.toLowerCase());
      if (item.download_client !== null && named[0]?.id == null && !planned)
        throw new ConfigValidationError(`Indexer '${item.name}': download client not found`);
      downloadClientId = item.download_client === null ? 0 : named[0]?.id;
      if (downloadClientId !== undefined && downloadClientId !== indexer.downloadClientId)
        changes.push({ field: "download_client", from: indexer.downloadClientId, to: downloadClientId });
      else if (downloadClientId === undefined && planned && !preflight)
        changes.push({ field: "download_client", from: indexer.downloadClientId, to: item.download_client });
    }
    const fields = indexer.fields?.map((field) => {
      const names =
        field.name === "multiLanguages" ? item.multi_languages : field.name === "failDownloads" ? item.fail_downloads : undefined;
      if (names === undefined) return field;
      const values = names.map((name) => {
        const option = field.selectOptions?.find((entry) => entry.name?.toLowerCase() === name.toLowerCase());
        if (option?.value == null) throw new ConfigValidationError(`Indexer '${item.name}': unknown ${field.name} option '${name}'`);
        return option.value;
      });
      if (!same(field.value, values)) changes.push({ field: field.name!, from: field.value, to: values });
      return { ...field, value: values };
    });
    for (const [name, value] of [
      ["multiLanguages", item.multi_languages],
      ["failDownloads", item.fail_downloads],
    ] as const) {
      if (value !== undefined && !indexer.fields?.some((field) => field.name === name))
        throw new ConfigValidationError(`Indexer '${item.name}': field '${name}' is not supported`);
    }
    return [{ indexer, data: { ...indexer, downloadClientId, fields }, changes }];
  });
}

export async function syncIndexerSettings(
  client: IndexerSettingsClient,
  config: IndexerSettings,
  instance: MergedConfigInstance,
): Promise<DiffEntry[]> {
  const plan = await prepareIndexerSettings(client, config, instance, false);
  const entries: DiffEntry[] = [];
  for (const { indexer, data, changes } of plan) {
    if (!changes.length) continue;
    entries.push({ resourceType: "Indexer", name: indexer.name ?? "Indexer", action: "update", fieldChanges: changes });
    if (!getEnvs().DRY_RUN) await client.updateIndexer(String(indexer.id), data);
  }
  return entries;
}
