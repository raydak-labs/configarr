import { MonitorTypes, NewItemMonitorTypes, type RootFolderResource } from "../__generated__/readarr/data-contracts";
import type { InputConfigRootFolderReadarr } from "../types/config.types";
import { toEnumOrThrow } from "../util";
import {
  type ProfileAwareRootFolderApi,
  type ProfileAwareRootFolderConfig,
  type ProfileAwareRootFolderFields,
  ProfileAwareRootFolderSync,
} from "./rootFolderBase";

export type ReadarrRootFolderApi<TResource extends RootFolderResource = RootFolderResource> = ProfileAwareRootFolderApi<TResource>;

type ReadarrRootFolderConfig = InputConfigRootFolderReadarr & ProfileAwareRootFolderConfig;

export class ReadarrRootFolderSync<TResource extends RootFolderResource = RootFolderResource> extends ProfileAwareRootFolderSync<
  ReadarrRootFolderConfig,
  TResource
> {
  protected readonly arrName: string;

  constructor(api: ReadarrRootFolderApi<TResource>, arrName = "Readarr") {
    super(api);
    this.arrName = arrName;
  }

  protected buildResource(config: ReadarrRootFolderConfig, fields: ProfileAwareRootFolderFields): TResource {
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

    return result as TResource;
  }

  // Password is excluded since the API returns masked values, not the actual password.
  protected override extraComparableFields(resource: TResource): Record<string, unknown> {
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
