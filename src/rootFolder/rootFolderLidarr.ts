import { MonitorTypes, NewItemMonitorTypes, RootFolderResource } from "../__generated__/lidarr/data-contracts";
import { InputConfigRootFolderLidarr } from "../types/config.types";
import { toEnumOrThrow } from "../util";
import {
  ProfileAwareRootFolderApi,
  ProfileAwareRootFolderConfig,
  ProfileAwareRootFolderFields,
  ProfileAwareRootFolderSync,
} from "./rootFolderBase";

export type LidarrRootFolderApi = ProfileAwareRootFolderApi<RootFolderResource>;

type LidarrRootFolderConfig = InputConfigRootFolderLidarr & ProfileAwareRootFolderConfig;

export class LidarrRootFolderSync extends ProfileAwareRootFolderSync<LidarrRootFolderConfig, RootFolderResource> {
  protected readonly arrName = "Lidarr";

  protected buildResource(config: LidarrRootFolderConfig, fields: ProfileAwareRootFolderFields): RootFolderResource {
    const result: RootFolderResource = {
      path: fields.path,
      name: fields.name,
      defaultMetadataProfileId: fields.defaultMetadataProfileId,
      defaultQualityProfileId: fields.defaultQualityProfileId,
      defaultTags: fields.defaultTags,
    };

    if (config.monitor) {
      result.defaultMonitorOption = toEnumOrThrow(MonitorTypes, config.monitor, "Lidarr monitor");
    }

    if (config.monitor_new_album) {
      result.defaultNewItemMonitorOption = toEnumOrThrow(NewItemMonitorTypes, config.monitor_new_album, "Lidarr monitor_new_album");
    }

    return result;
  }
}
