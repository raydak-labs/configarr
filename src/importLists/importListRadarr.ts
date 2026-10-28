import type { ImportListResource } from "../__generated__/radarr/data-contracts";
import type { RadarrClient } from "../clients/radarr-client";
import type { FieldChange } from "../diffReport/diffReport.types";
import type { InputConfigImportList } from "../types/config.types";
import { BaseImportListSync } from "./importListBase";
import { ConfigValidationError } from "../validation";

export class RadarrImportListSync extends BaseImportListSync<ImportListResource> {
  constructor(client: RadarrClient) {
    super(client);
  }

  protected validate(config: InputConfigImportList): void {
    if (config.language !== undefined) throw new ConfigValidationError("Import list 'language' is only supported by Sonarr v5");
  }

  protected map(
    config: InputConfigImportList,
    schema: ImportListResource,
    fields: NonNullable<ImportListResource["fields"]>,
    profileId: number,
    tags: number[],
  ): ImportListResource {
    return {
      ...schema,
      name: config.name,
      enabled: config.enabled ?? schema.enabled,
      enableAuto: config.enable_auto ?? schema.enableAuto,
      searchOnAdd: config.search_on_add ?? schema.searchOnAdd,
      qualityProfileId: profileId,
      rootFolderPath: config.root_folder ?? schema.rootFolderPath,
      fields,
      tags,
    };
  }

  protected specificChanges(config: InputConfigImportList, current: ImportListResource, desired: ImportListResource): FieldChange[] {
    const changes: FieldChange[] = [];
    if (config.enabled !== undefined && current.enabled !== desired.enabled)
      changes.push({ field: "enabled", from: current.enabled, to: desired.enabled });
    if (config.enable_auto !== undefined && current.enableAuto !== desired.enableAuto)
      changes.push({ field: "enable_auto", from: current.enableAuto, to: desired.enableAuto });
    if (config.search_on_add !== undefined && current.searchOnAdd !== desired.searchOnAdd)
      changes.push({ field: "search_on_add", from: current.searchOnAdd, to: desired.searchOnAdd });
    return changes;
  }
}
