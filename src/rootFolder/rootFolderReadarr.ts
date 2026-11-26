import { MonitorTypes, NewItemMonitorTypes, type RootFolderResource } from "../__generated__/readarr/data-contracts";
import type { InputConfigRootFolderReadarr } from "../types/config.types";
import { toEnumOrThrow } from "../util";
import {
  type ProfileAwareRootFolderApi,
  type ProfileAwareRootFolderConfig,
  type ProfileAwareRootFolderFields,
  ProfileAwareRootFolderSync,
} from "./rootFolderBase";
import { calibreComparableFields, calibreFieldsFromConfig } from "./rootFolderCalibre";

export type ReadarrRootFolderApi = ProfileAwareRootFolderApi<RootFolderResource>;

type ReadarrRootFolderConfig = InputConfigRootFolderReadarr & ProfileAwareRootFolderConfig;

export class ReadarrRootFolderSync extends ProfileAwareRootFolderSync<ReadarrRootFolderConfig, RootFolderResource> {
  protected readonly arrName = "Readarr";

  protected buildResource(config: ReadarrRootFolderConfig, fields: ProfileAwareRootFolderFields): RootFolderResource {
    const result: RootFolderResource = {
      path: fields.path,
      name: fields.name,
      defaultMetadataProfileId: fields.defaultMetadataProfileId,
      defaultQualityProfileId: fields.defaultQualityProfileId,
      defaultTags: fields.defaultTags,
    };

    if (config.monitor) {
      result.defaultMonitorOption = toEnumOrThrow(MonitorTypes, config.monitor, "Readarr monitor");
    }

    if (config.monitor_new_items) {
      result.defaultNewItemMonitorOption = toEnumOrThrow(NewItemMonitorTypes, config.monitor_new_items, "Readarr monitor_new_items");
    }

    Object.assign(result, calibreFieldsFromConfig(config));

    return result;
  }

  protected override extraComparableFields(resource: RootFolderResource): Record<string, unknown> {
    return calibreComparableFields(resource);
  }
}
