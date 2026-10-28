import type { ImportListResource } from "../__generated__/sonarr-v5/data-contracts";
import type { SonarrClient } from "../clients/sonarr-client";
import type { FieldChange } from "../diffReport/diffReport.types";
import type { InputConfigImportList } from "../types/config.types";
import { BaseImportListSync } from "./importListBase";
import { ConfigValidationError } from "../validation";

export class SonarrImportListSync extends BaseImportListSync<ImportListResource> {
  private languages: Array<{ id?: number; name?: string | null }> = [];
  private supportsLanguage = false;

  constructor(private readonly client: SonarrClient) {
    super(client);
  }

  protected validate(config: InputConfigImportList): void {
    if (config.enabled !== undefined) throw new ConfigValidationError("Import list 'enabled' is only supported by Radarr");
  }

  protected async validateItems(items: InputConfigImportList[]): Promise<void> {
    if (!items.length) return;
    this.supportsLanguage = await this.client.supportsImportListLanguage();
    if (!this.supportsLanguage && items.some((item) => item.language !== undefined)) {
      throw new ConfigValidationError("Import list language is only supported by Sonarr v5");
    }
    if (!items.some((item) => item.language !== undefined)) return;
    this.languages = await this.client.getLanguages();
    for (const item of items) {
      if (
        item.language !== undefined &&
        !this.languages.some((language) => language.id && language.name?.toLowerCase() === item.language?.toLowerCase())
      ) {
        throw new ConfigValidationError(`Import list '${item.name}': language not found`);
      }
    }
  }

  protected validateProvider(config: InputConfigImportList, template: ImportListResource, match: ImportListResource | undefined): void {
    if (this.supportsLanguage && !match && config.language === undefined && template.language == null) {
      throw new ConfigValidationError(`Import list '${config.name}': language is required for Sonarr v5`);
    }
  }

  protected async map(
    config: InputConfigImportList,
    schema: ImportListResource,
    fields: NonNullable<ImportListResource["fields"]>,
    profileId: number,
    tags: number[],
  ): Promise<ImportListResource> {
    let language = schema.language;
    if (config.language !== undefined) {
      language = this.languages.find((item) => item.name?.toLowerCase() === config.language?.toLowerCase());
      if (!language?.id) throw new ConfigValidationError(`Import list '${config.name}': language not found`);
    }
    return {
      ...schema,
      name: config.name,
      enableAutomaticAdd: config.enable_auto ?? schema.enableAutomaticAdd,
      searchForMissingEpisodes: config.search_on_add ?? schema.searchForMissingEpisodes,
      qualityProfileId: profileId,
      rootFolderPath: config.root_folder ?? schema.rootFolderPath,
      fields,
      tags,
      language,
    };
  }

  protected specificChanges(config: InputConfigImportList, current: ImportListResource, desired: ImportListResource): FieldChange[] {
    const changes: FieldChange[] = [];
    if (config.enable_auto !== undefined && current.enableAutomaticAdd !== desired.enableAutomaticAdd)
      changes.push({ field: "enable_auto", from: current.enableAutomaticAdd, to: desired.enableAutomaticAdd });
    if (config.search_on_add !== undefined && current.searchForMissingEpisodes !== desired.searchForMissingEpisodes)
      changes.push({ field: "search_on_add", from: current.searchForMissingEpisodes, to: desired.searchForMissingEpisodes });
    if (config.language !== undefined && current.language?.id !== desired.language?.id)
      changes.push({ field: "language", from: current.language?.name, to: desired.language?.name });
    return changes;
  }
}
