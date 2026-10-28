import type { ServerCache } from "../cache";
import type { ImportListsClient, QualityProfilesClient, RootFoldersClient, TagsClient } from "../clients/capabilities";
import type { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
import { getEnvs } from "../env";
import { areTagsEqual } from "../delayProfiles/delayProfileBase";
import { isSecretFieldName, SECRET_MASK } from "../diffReport/redactSecrets";
import { buildTagPlaceholders, ensureTags } from "../tags/tags";
import type { InputConfigImportList, MergedConfigInstance } from "../types/config.types";
import { ConfigValidationError } from "../validation";

type ListField = { name?: string | null; value?: unknown; hidden?: string | null; privacy?: string };
type ListResource = {
  id?: number;
  name?: string | null;
  implementation?: string | null;
  fields?: ListField[] | null;
  qualityProfileId?: number;
  rootFolderPath?: string | null;
  tags?: number[] | null;
};
type ListApi<T extends ListResource> = ImportListsClient<T> &
  TagsClient &
  QualityProfilesClient<{ id?: number; name?: string | null }> &
  RootFoldersClient;
type ListConfig = NonNullable<MergedConfigInstance["import_lists"]>;

const canonical = (value: string) => value.replace(/_/g, "").toLowerCase();

export abstract class BaseImportListSync<T extends ListResource> {
  constructor(protected readonly api: ListApi<T>) {}

  protected abstract map(
    config: InputConfigImportList,
    schema: T,
    fields: NonNullable<T["fields"]>,
    profileId: number,
    tags: number[],
  ): T | Promise<T>;
  protected abstract specificChanges(config: InputConfigImportList, current: T, desired: T): FieldChange[];
  protected validate(config: InputConfigImportList): void {
    void config;
  }

  protected async validateItems(items: InputConfigImportList[]): Promise<void> {
    void items;
  }

  protected validateProvider(config: InputConfigImportList, template: T, match: T | undefined): void {
    void config;
    void template;
    void match;
  }

  async validateConfig(block: ListConfig, instance: MergedConfigInstance): Promise<void> {
    await this.prepare(block, instance, true);
  }

  private async prepare(block: ListConfig, instance: MergedConfigInstance, allowPlanned: boolean) {
    const items = block.data ?? [];
    if (!items.length && !block.delete_unmanaged?.enabled) return { current: [], prepared: [] };
    await this.validateItems(items);
    const [schema, current, profiles, roots] = await Promise.all([
      items.length ? this.api.getImportListSchema() : Promise.resolve([]),
      this.api.getImportLists(),
      items.length ? this.api.getQualityProfiles() : Promise.resolve([]),
      items.length ? this.api.getRootfolders() : Promise.resolve([]),
    ]);
    const names = new Set<string>();
    const prepared = items.map((config) => {
      this.validate(config);
      const normalizedName = config.name.toLowerCase();
      if (names.has(normalizedName)) throw new ConfigValidationError(`Duplicate import list name '${config.name}'`);
      names.add(normalizedName);
      const match = current.find((item) => item.name?.toLowerCase() === normalizedName);
      const template = schema.find((item) => item.implementation?.toLowerCase() === config.type.toLowerCase());
      if (!template) throw new ConfigValidationError(`Unknown import list type '${config.type}'`);
      if (match && match.implementation?.toLowerCase() !== template.implementation?.toLowerCase()) {
        throw new ConfigValidationError(`Import list '${config.name}': changing provider type is not supported`);
      }
      this.validateProvider(config, template, match);
      const profileId =
        config.quality_profile !== undefined ? profiles.find((item) => item.name === config.quality_profile)?.id : match?.qualityProfileId;
      const plannedProfile = allowPlanned && instance.quality_profiles?.some((profile) => profile.name === config.quality_profile);
      if ((profileId == null || profileId <= 0) && !plannedProfile)
        throw new ConfigValidationError(`Import list '${config.name}': quality profile not found`);
      const profileName = config.quality_profile ?? profiles.find((profile) => profile.id === profileId)?.name;
      const currentProfileName =
        match?.qualityProfileId == null ? undefined : profiles.find((profile) => profile.id === match.qualityProfileId)?.name;
      if (
        allowPlanned &&
        instance.delete_unmanaged_quality_profiles?.enabled &&
        [profileName, currentProfileName].some(
          (name) =>
            name &&
            !instance.quality_profiles?.some((profile) => profile.name === name) &&
            !instance.delete_unmanaged_quality_profiles?.ignore?.includes(name),
        )
      ) {
        throw new ConfigValidationError(`Import list '${config.name}': quality profile is scheduled for removal`);
      }
      const rootFolder = config.root_folder ?? match?.rootFolderPath;
      const plannedRoots = allowPlanned ? (instance.root_folders ?? []).map((root) => (typeof root === "string" ? root : root.path)) : [];
      if (
        !rootFolder ||
        ![...roots.map((root) => root.path), ...plannedRoots].some((root) => root?.replace(/\/+$/, "") === rootFolder.replace(/\/+$/, ""))
      ) {
        throw new ConfigValidationError(`Import list '${config.name}': root folder not found`);
      }
      if (allowPlanned && instance.root_folders !== undefined) {
        const targetRetained = plannedRoots.some((root) => root?.replace(/\/+$/, "") === rootFolder.replace(/\/+$/, ""));
        const currentRoot = match?.rootFolderPath;
        const candidates = currentRoot ? roots.filter((root) => root.path?.replace(/\/+$/, "") === currentRoot.replace(/\/+$/, "")) : [];
        const exactRoot = candidates.find((root) => root.path === currentRoot);
        // Root-folder sync uses exact paths when deciding what to delete.
        const currentRetained =
          exactRoot?.path != null
            ? plannedRoots.includes(exactRoot.path)
            : candidates.length === 0 || candidates.some((root) => root.path != null && plannedRoots.includes(root.path));
        if (!targetRetained || !currentRetained) {
          throw new ConfigValidationError(`Import list '${config.name}': root folder is scheduled for removal`);
        }
      }
      const schemaFields = template.fields ?? [];
      const configured = new Map<string, unknown>();
      for (const [name, value] of Object.entries(config.fields ?? {})) {
        const key = canonical(name);
        const field = schemaFields.find((item) => item.name && canonical(item.name) === key);
        if (!field?.name) throw new ConfigValidationError(`Import list '${config.name}': unknown field '${name}'`);
        if (key === "signin") throw new ConfigValidationError("Interactive OAuth actions cannot be configured as import list fields");
        // Tokens may have been refreshed by the server since the configuration was written.
        if (match && ["accesstoken", "refreshtoken", "expires", "authuser"].includes(key)) continue;
        const existing = match?.fields?.find((entry) => entry.name && canonical(entry.name) === key);
        const metadata = { ...field, ...existing };
        const protectedField =
          isSecretFieldName(field.name) || !!metadata.hidden || (metadata.privacy != null && metadata.privacy !== "normal");
        if (protectedField && existing?.value === SECRET_MASK && typeof value === "string" && value.length > 0) continue;
        configured.set(field.name, value);
      }
      const fields = schemaFields.map((field) => {
        const existing = match?.fields?.find((entry) => entry.name && field.name && canonical(entry.name) === canonical(field.name));
        const base = { ...field, ...existing };
        return field.name && configured.has(field.name) ? { ...base, value: configured.get(field.name) } : base;
      });
      return { config, match, template, profileId: profileId ?? 0, configured, fields };
    });
    return { current, prepared };
  }

  async sync(block: ListConfig, cache: ServerCache, instance: MergedConfigInstance): Promise<DiffEntry[]> {
    const items = block.data ?? [];
    const { current, prepared } = await this.prepare(block, instance, getEnvs().DRY_RUN);
    const entries: DiffEntry[] = [];
    for (const { config, match, template, profileId, configured, fields } of prepared) {
      const tags = config.tags ?? [];
      const placeholders = getEnvs().DRY_RUN
        ? buildTagPlaceholders(
            tags.filter((tag): tag is string => typeof tag === "string"),
            cache.tags,
          )
        : undefined;
      const resolved = await ensureTags(this.api, cache, tags, { placeholders });
      const tagIds = config.tags === undefined ? (match?.tags ?? []) : resolved.ids;
      const payload = await this.map(config, match ?? template, fields, profileId, tagIds);
      if (!match) {
        entries.push({ resourceType: "ImportList", name: config.name, action: "create" });
        if (!getEnvs().DRY_RUN) await this.api.createImportList(payload);
        continue;
      }
      const changes = this.specificChanges(config, match, payload);
      if (config.quality_profile !== undefined && match.qualityProfileId !== profileId)
        changes.push({ field: "quality_profile", from: match.qualityProfileId, to: profileId });
      if (config.root_folder !== undefined && match.rootFolderPath?.replace(/\/+$/, "") !== config.root_folder.replace(/\/+$/, ""))
        changes.push({ field: "root_folder", from: match.rootFolderPath, to: config.root_folder });
      if (config.tags !== undefined && !areTagsEqual(match.tags ?? [], tagIds))
        changes.push({ field: "tags", from: match.tags, to: tagIds });
      for (const [field, value] of configured) {
        const existing = match.fields?.find((entry) => entry.name && canonical(entry.name) === canonical(field));
        const metadata = fields.find((entry) => entry.name && canonical(entry.name) === canonical(field));
        if (JSON.stringify(existing?.value) !== JSON.stringify(value)) {
          changes.push(
            isSecretFieldName(field) ||
              (metadata?.hidden != null && metadata.hidden !== "") ||
              (metadata?.privacy != null && metadata.privacy !== "normal")
              ? { field: `fields.${field}`, from: SECRET_MASK, to: SECRET_MASK }
              : { field: `fields.${field}`, from: existing?.value, to: value },
          );
        }
      }
      if (changes.length) {
        if (match.id == null) throw new ConfigValidationError(`Import list '${config.name}' has no id`);
        entries.push({ resourceType: "ImportList", name: config.name, action: "update", fieldChanges: changes });
        if (!getEnvs().DRY_RUN) await this.api.updateImportList(String(match.id), payload);
      }
    }
    if (block.delete_unmanaged?.enabled) {
      const keep = new Set([...items.map((item) => item.name), ...(block.delete_unmanaged.ignore ?? [])].map((name) => name.toLowerCase()));
      for (const item of current) {
        if (!item.name || keep.has(item.name.toLowerCase())) continue;
        if (item.id == null) throw new ConfigValidationError(`Import list '${item.name}' has no id`);
        entries.push({ resourceType: "ImportList", name: item.name, action: "delete" });
        if (!getEnvs().DRY_RUN) await this.api.deleteImportList(String(item.id));
      }
    }
    return entries;
  }
}
