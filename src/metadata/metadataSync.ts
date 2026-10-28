import type { MetadataClient } from "../clients/capabilities";
import type { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import { getEnvs } from "../env";
import type { MetadataSettings } from "../types/config.types";
import { ConfigValidationError } from "../validation";

type MetadataResource = {
  id?: number;
  name?: string | null;
  implementation?: string | null;
  enable?: boolean;
  fields?: Array<{ name?: string | null; value?: unknown }> | null;
};
type MetadataPlan<T extends MetadataResource> = Array<{ provider: T; changes: FieldChange[]; data: T }>;

const canonical = (name: string) => name.replace(/_/g, "").toLowerCase();

export async function prepareMetadata<T extends MetadataResource>(
  client: MetadataClient<T>,
  config: MetadataSettings,
): Promise<MetadataPlan<T>> {
  if (config.data.length === 0) return [];
  const current = await client.getMetadata();
  const seen = new Set<string>();
  const planned = config.data.map((item) => {
    const key = canonical(item.type);
    if (seen.has(key)) throw new ConfigValidationError(`Duplicate metadata provider '${item.type}'`);
    seen.add(key);
    const matches = current.filter((entry) => entry.implementation && canonical(entry.implementation) === key);
    if (matches.length > 1) throw new ConfigValidationError(`Ambiguous metadata provider '${item.type}'`);
    const provider = matches[0];
    if (!provider?.id) throw new ConfigValidationError(`Metadata provider '${item.type}' not found`);
    const changes: FieldChange[] = [];
    if (item.enable !== undefined && item.enable !== provider.enable)
      changes.push({ field: "enable", from: provider.enable, to: item.enable });
    const configured = new Map<string, unknown>();
    for (const [name, value] of Object.entries(item.fields ?? {})) {
      const field = provider.fields?.find((entry) => entry.name && canonical(entry.name) === canonical(name));
      if (!field?.name) throw new ConfigValidationError(`Metadata provider '${item.type}': unknown field '${name}'`);
      if (configured.has(field.name)) throw new ConfigValidationError(`Metadata provider '${item.type}': duplicate field '${name}'`);
      configured.set(field.name, value);
      if (JSON.stringify(field.value) !== JSON.stringify(value))
        changes.push({ field: `fields.${field.name}`, from: field.value, to: value });
    }
    const fields = provider.fields?.map((field) =>
      field.name && configured.has(field.name) ? { ...field, value: configured.get(field.name) } : field,
    );
    return { provider, changes, data: { ...provider, enable: item.enable ?? provider.enable, fields } };
  });
  return planned;
}

export async function syncMetadata<T extends MetadataResource>(client: MetadataClient<T>, planned: MetadataPlan<T>): Promise<DiffEntry[]> {
  const entries: DiffEntry[] = [];
  for (const { provider, changes, data } of planned) {
    if (!changes.length) continue;
    entries.push({
      resourceType: "Metadata",
      name: provider.name ?? provider.implementation ?? "Metadata",
      action: "update",
      fieldChanges: changes,
    });
    if (!getEnvs().DRY_RUN) await client.updateMetadata(String(provider.id), data);
  }
  return entries;
}
