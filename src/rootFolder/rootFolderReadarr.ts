import { MonitorTypes, NewItemMonitorTypes, RootFolderResource } from "../__generated__/readarr/data-contracts";
import { InputConfigRootFolderReadarr } from "../types/config.types";
import { toEnumOrThrow } from "../util";
import {
  ProfileAwareRootFolderApi,
  ProfileAwareRootFolderConfig,
  ProfileAwareRootFolderFields,
  ProfileAwareRootFolderSync,
} from "./rootFolderBase";

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

    // Calibre integration fields (Readarr-specific)
    if (config.is_calibre_library !== undefined) {
      result.isCalibreLibrary = config.is_calibre_library;
      result.host = config.calibre_host;
      result.port = config.calibre_port;
      result.urlBase = config.calibre_url_base;
      result.username = config.calibre_username;
      result.password = config.calibre_password;
      result.library = config.calibre_library;
      result.outputFormat = config.calibre_output_format;
      result.outputProfile = config.calibre_output_profile;
      result.useSsl = config.calibre_use_ssl;
    }

    return result;
  }

  // Password is excluded since the API returns masked values, not the actual password.
  protected override extraComparableFields(resource: RootFolderResource): Record<string, unknown> {
    return {
      isCalibreLibrary: resource.isCalibreLibrary,
      host: resource.host,
      port: resource.port,
      urlBase: resource.urlBase,
      username: resource.username,
      library: resource.library,
      outputFormat: resource.outputFormat,
      outputProfile: resource.outputProfile,
      useSsl: resource.useSsl,
    };
  }
}
