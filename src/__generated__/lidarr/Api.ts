/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

import { ContentType, HttpClient, RequestParams } from "./../ky-client";
import {
  AlbumResource,
  AlbumResourcePagingResource,
  AlbumStudioResource,
  AlbumsMonitoredResource,
  ArtistEditorResource,
  ArtistResource,
  AutoTaggingResource,
  BackupResource,
  BlocklistBulkResource,
  BlocklistResourcePagingResource,
  CommandResource,
  CustomFilterResource,
  CustomFormatBulkResource,
  CustomFormatResource,
  DelayProfileResource,
  DiskSpaceResource,
  DownloadClientBulkResource,
  DownloadClientConfigResource,
  DownloadClientResource,
  DownloadProtocol,
  EntityHistoryEventType,
  HealthResource,
  HistoryResource,
  HistoryResourcePagingResource,
  HostConfigResource,
  ImportListBulkResource,
  ImportListExclusionResource,
  ImportListResource,
  IndexerBulkResource,
  IndexerConfigResource,
  IndexerFlagResource,
  IndexerResource,
  LanguageResource,
  LocalizationResource,
  LogFileResource,
  LogResourcePagingResource,
  ManualImportResource,
  ManualImportUpdateResource,
  MediaManagementConfigResource,
  MetadataProfileResource,
  MetadataProviderConfigResource,
  MetadataResource,
  NamingConfigResource,
  NotificationResource,
  ParseResource,
  QualityDefinitionResource,
  QualityProfileResource,
  QueueBulkResource,
  QueueResource,
  QueueResourcePagingResource,
  QueueStatusResource,
  ReleaseProfileResource,
  ReleaseResource,
  RemotePathMappingResource,
  RenameTrackResource,
  RetagTrackResource,
  RootFolderResource,
  SearchResource,
  SortDirection,
  SystemResource,
  TagDetailsResource,
  TagResource,
  TaskResource,
  TrackFileListResource,
  TrackFileResource,
  TrackResource,
  UiConfigResource,
  UpdateResource,
} from "./data-contracts";

export class Api<SecurityDataType = unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  /**
   * No description
   *
   * @tags Album
   * @name V1AlbumList
   * @request GET:/api/v1/album
   * @secure
   */
  v1AlbumList = (
    query?: {
      /** @format int32 */
      artistId?: number;
      albumIds?: number[];
      foreignAlbumId?: string;
      /** @default false */
      includeAllArtistAlbums?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<AlbumResource[], any>({
      path: `/api/v1/album`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Album
   * @name V1AlbumCreate
   * @request POST:/api/v1/album
   * @secure
   */
  v1AlbumCreate = (data: AlbumResource, params: RequestParams = {}) =>
    this.http.request<AlbumResource, any>({
      path: `/api/v1/album`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Album
   * @name V1AlbumUpdate
   * @request PUT:/api/v1/album/{id}
   * @secure
   */
  v1AlbumUpdate = (id: string, data: AlbumResource, params: RequestParams = {}) =>
    this.http.request<AlbumResource, any>({
      path: `/api/v1/album/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Album
   * @name V1AlbumDelete
   * @request DELETE:/api/v1/album/{id}
   * @secure
   */
  v1AlbumDelete = (
    id: number,
    query?: {
      /** @default false */
      deleteFiles?: boolean;
      /** @default false */
      addImportListExclusion?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/api/v1/album/${id}`,
      method: "DELETE",
      query: query,
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Album
   * @name V1AlbumDetail
   * @request GET:/api/v1/album/{id}
   * @secure
   */
  v1AlbumDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<AlbumResource, any>({
      path: `/api/v1/album/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Album
   * @name V1AlbumMonitorUpdate
   * @request PUT:/api/v1/album/monitor
   * @secure
   */
  v1AlbumMonitorUpdate = (data: AlbumsMonitoredResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/album/monitor`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags AlbumLookup
   * @name V1AlbumLookupList
   * @request GET:/api/v1/album/lookup
   * @secure
   */
  v1AlbumLookupList = (
    query?: {
      term?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<AlbumResource[], any>({
      path: `/api/v1/album/lookup`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags AlbumStudio
   * @name V1AlbumstudioCreate
   * @request POST:/api/v1/albumstudio
   * @secure
   */
  v1AlbumstudioCreate = (data: AlbumStudioResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/albumstudio`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags ApiInfo
   * @name GetApi
   * @request GET:/api
   * @secure
   */
  getApi = (params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api`,
      method: "GET",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Artist
   * @name V1ArtistDetail
   * @request GET:/api/v1/artist/{id}
   * @secure
   */
  v1ArtistDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<ArtistResource, any>({
      path: `/api/v1/artist/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Artist
   * @name V1ArtistUpdate
   * @request PUT:/api/v1/artist/{id}
   * @secure
   */
  v1ArtistUpdate = (
    id: string,
    data: ArtistResource,
    query?: {
      /** @default false */
      moveFiles?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<ArtistResource, any>({
      path: `/api/v1/artist/${id}`,
      method: "PUT",
      query: query,
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Artist
   * @name V1ArtistDelete
   * @request DELETE:/api/v1/artist/{id}
   * @secure
   */
  v1ArtistDelete = (
    id: number,
    query?: {
      /** @default false */
      deleteFiles?: boolean;
      /** @default false */
      addImportListExclusion?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/api/v1/artist/${id}`,
      method: "DELETE",
      query: query,
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Artist
   * @name V1ArtistList
   * @request GET:/api/v1/artist
   * @secure
   */
  v1ArtistList = (
    query?: {
      /** @format uuid */
      mbId?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<ArtistResource[], any>({
      path: `/api/v1/artist`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Artist
   * @name V1ArtistCreate
   * @request POST:/api/v1/artist
   * @secure
   */
  v1ArtistCreate = (data: ArtistResource, params: RequestParams = {}) =>
    this.http.request<ArtistResource, any>({
      path: `/api/v1/artist`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ArtistEditor
   * @name V1ArtistEditorUpdate
   * @request PUT:/api/v1/artist/editor
   * @secure
   */
  v1ArtistEditorUpdate = (data: ArtistEditorResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/artist/editor`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags ArtistEditor
   * @name V1ArtistEditorDelete
   * @request DELETE:/api/v1/artist/editor
   * @secure
   */
  v1ArtistEditorDelete = (data: ArtistEditorResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/artist/editor`,
      method: "DELETE",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags ArtistLookup
   * @name V1ArtistLookupList
   * @request GET:/api/v1/artist/lookup
   * @secure
   */
  v1ArtistLookupList = (
    query?: {
      term?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<ArtistResource[], any>({
      path: `/api/v1/artist/lookup`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags AutoTagging
   * @name V1AutotaggingDetail
   * @request GET:/api/v1/autotagging/{id}
   * @secure
   */
  v1AutotaggingDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<AutoTaggingResource, any>({
      path: `/api/v1/autotagging/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags AutoTagging
   * @name V1AutotaggingUpdate
   * @request PUT:/api/v1/autotagging/{id}
   * @secure
   */
  v1AutotaggingUpdate = (id: string, data: AutoTaggingResource, params: RequestParams = {}) =>
    this.http.request<AutoTaggingResource, any>({
      path: `/api/v1/autotagging/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags AutoTagging
   * @name V1AutotaggingDelete
   * @request DELETE:/api/v1/autotagging/{id}
   * @secure
   */
  v1AutotaggingDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/autotagging/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags AutoTagging
   * @name V1AutotaggingCreate
   * @request POST:/api/v1/autotagging
   * @secure
   */
  v1AutotaggingCreate = (data: AutoTaggingResource, params: RequestParams = {}) =>
    this.http.request<AutoTaggingResource, any>({
      path: `/api/v1/autotagging`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags AutoTagging
   * @name V1AutotaggingList
   * @request GET:/api/v1/autotagging
   * @secure
   */
  v1AutotaggingList = (params: RequestParams = {}) =>
    this.http.request<AutoTaggingResource[], any>({
      path: `/api/v1/autotagging`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags AutoTagging
   * @name V1AutotaggingSchemaList
   * @request GET:/api/v1/autotagging/schema
   * @secure
   */
  v1AutotaggingSchemaList = (params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/autotagging/schema`,
      method: "GET",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Backup
   * @name V1SystemBackupList
   * @request GET:/api/v1/system/backup
   * @secure
   */
  v1SystemBackupList = (params: RequestParams = {}) =>
    this.http.request<BackupResource[], any>({
      path: `/api/v1/system/backup`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Backup
   * @name V1SystemBackupDelete
   * @request DELETE:/api/v1/system/backup/{id}
   * @secure
   */
  v1SystemBackupDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/system/backup/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Backup
   * @name V1SystemBackupRestoreCreate
   * @request POST:/api/v1/system/backup/restore/{id}
   * @secure
   */
  v1SystemBackupRestoreCreate = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/system/backup/restore/${id}`,
      method: "POST",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Backup
   * @name V1SystemBackupRestoreUploadCreate
   * @request POST:/api/v1/system/backup/restore/upload
   * @secure
   */
  v1SystemBackupRestoreUploadCreate = (params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/system/backup/restore/upload`,
      method: "POST",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Blocklist
   * @name V1BlocklistList
   * @request GET:/api/v1/blocklist
   * @secure
   */
  v1BlocklistList = (
    query?: {
      /**
       * @format int32
       * @default 1
       */
      page?: number;
      /**
       * @format int32
       * @default 10
       */
      pageSize?: number;
      sortKey?: string;
      sortDirection?: SortDirection;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<BlocklistResourcePagingResource, any>({
      path: `/api/v1/blocklist`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Blocklist
   * @name V1BlocklistDelete
   * @request DELETE:/api/v1/blocklist/{id}
   * @secure
   */
  v1BlocklistDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/blocklist/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Blocklist
   * @name V1BlocklistBulkDelete
   * @request DELETE:/api/v1/blocklist/bulk
   * @secure
   */
  v1BlocklistBulkDelete = (data: BlocklistBulkResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/blocklist/bulk`,
      method: "DELETE",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags Calendar
   * @name V1CalendarList
   * @request GET:/api/v1/calendar
   * @secure
   */
  v1CalendarList = (
    query?: {
      /** @format date-time */
      start?: string;
      /** @format date-time */
      end?: string;
      /** @default false */
      unmonitored?: boolean;
      /** @default false */
      includeArtist?: boolean;
      /** @default "" */
      tags?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<AlbumResource[], any>({
      path: `/api/v1/calendar`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Calendar
   * @name V1CalendarDetail
   * @request GET:/api/v1/calendar/{id}
   * @secure
   */
  v1CalendarDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<AlbumResource, any>({
      path: `/api/v1/calendar/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Command
   * @name V1CommandDetail
   * @request GET:/api/v1/command/{id}
   * @secure
   */
  v1CommandDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<CommandResource, any>({
      path: `/api/v1/command/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Command
   * @name V1CommandDelete
   * @request DELETE:/api/v1/command/{id}
   * @secure
   */
  v1CommandDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/command/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Command
   * @name V1CommandCreate
   * @request POST:/api/v1/command
   * @secure
   */
  v1CommandCreate = (data: CommandResource, params: RequestParams = {}) =>
    this.http.request<CommandResource, any>({
      path: `/api/v1/command`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Command
   * @name V1CommandList
   * @request GET:/api/v1/command
   * @secure
   */
  v1CommandList = (params: RequestParams = {}) =>
    this.http.request<CommandResource[], any>({
      path: `/api/v1/command`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags CustomFilter
   * @name V1CustomfilterDetail
   * @request GET:/api/v1/customfilter/{id}
   * @secure
   */
  v1CustomfilterDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<CustomFilterResource, any>({
      path: `/api/v1/customfilter/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags CustomFilter
   * @name V1CustomfilterUpdate
   * @request PUT:/api/v1/customfilter/{id}
   * @secure
   */
  v1CustomfilterUpdate = (id: string, data: CustomFilterResource, params: RequestParams = {}) =>
    this.http.request<CustomFilterResource, any>({
      path: `/api/v1/customfilter/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags CustomFilter
   * @name V1CustomfilterDelete
   * @request DELETE:/api/v1/customfilter/{id}
   * @secure
   */
  v1CustomfilterDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/customfilter/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags CustomFilter
   * @name V1CustomfilterList
   * @request GET:/api/v1/customfilter
   * @secure
   */
  v1CustomfilterList = (params: RequestParams = {}) =>
    this.http.request<CustomFilterResource[], any>({
      path: `/api/v1/customfilter`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags CustomFilter
   * @name V1CustomfilterCreate
   * @request POST:/api/v1/customfilter
   * @secure
   */
  v1CustomfilterCreate = (data: CustomFilterResource, params: RequestParams = {}) =>
    this.http.request<CustomFilterResource, any>({
      path: `/api/v1/customfilter`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags CustomFormat
   * @name V1CustomformatDetail
   * @request GET:/api/v1/customformat/{id}
   * @secure
   */
  v1CustomformatDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<CustomFormatResource, any>({
      path: `/api/v1/customformat/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags CustomFormat
   * @name V1CustomformatUpdate
   * @request PUT:/api/v1/customformat/{id}
   * @secure
   */
  v1CustomformatUpdate = (id: string, data: CustomFormatResource, params: RequestParams = {}) =>
    this.http.request<CustomFormatResource, any>({
      path: `/api/v1/customformat/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags CustomFormat
   * @name V1CustomformatDelete
   * @request DELETE:/api/v1/customformat/{id}
   * @secure
   */
  v1CustomformatDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/customformat/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags CustomFormat
   * @name V1CustomformatList
   * @request GET:/api/v1/customformat
   * @secure
   */
  v1CustomformatList = (params: RequestParams = {}) =>
    this.http.request<CustomFormatResource[], any>({
      path: `/api/v1/customformat`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags CustomFormat
   * @name V1CustomformatCreate
   * @request POST:/api/v1/customformat
   * @secure
   */
  v1CustomformatCreate = (data: CustomFormatResource, params: RequestParams = {}) =>
    this.http.request<CustomFormatResource, any>({
      path: `/api/v1/customformat`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags CustomFormat
   * @name V1CustomformatBulkUpdate
   * @request PUT:/api/v1/customformat/bulk
   * @secure
   */
  v1CustomformatBulkUpdate = (data: CustomFormatBulkResource, params: RequestParams = {}) =>
    this.http.request<CustomFormatResource, any>({
      path: `/api/v1/customformat/bulk`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags CustomFormat
   * @name V1CustomformatBulkDelete
   * @request DELETE:/api/v1/customformat/bulk
   * @secure
   */
  v1CustomformatBulkDelete = (data: CustomFormatBulkResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/customformat/bulk`,
      method: "DELETE",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags CustomFormat
   * @name V1CustomformatSchemaList
   * @request GET:/api/v1/customformat/schema
   * @secure
   */
  v1CustomformatSchemaList = (params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/customformat/schema`,
      method: "GET",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Cutoff
   * @name V1WantedCutoffList
   * @request GET:/api/v1/wanted/cutoff
   * @secure
   */
  v1WantedCutoffList = (
    query?: {
      /**
       * @format int32
       * @default 1
       */
      page?: number;
      /**
       * @format int32
       * @default 10
       */
      pageSize?: number;
      sortKey?: string;
      sortDirection?: SortDirection;
      /** @default false */
      includeArtist?: boolean;
      /** @default true */
      monitored?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<AlbumResourcePagingResource, any>({
      path: `/api/v1/wanted/cutoff`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Cutoff
   * @name V1WantedCutoffDetail
   * @request GET:/api/v1/wanted/cutoff/{id}
   * @secure
   */
  v1WantedCutoffDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<AlbumResource, any>({
      path: `/api/v1/wanted/cutoff/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DelayProfile
   * @name V1DelayprofileCreate
   * @request POST:/api/v1/delayprofile
   * @secure
   */
  v1DelayprofileCreate = (data: DelayProfileResource, params: RequestParams = {}) =>
    this.http.request<DelayProfileResource, any>({
      path: `/api/v1/delayprofile`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DelayProfile
   * @name V1DelayprofileList
   * @request GET:/api/v1/delayprofile
   * @secure
   */
  v1DelayprofileList = (params: RequestParams = {}) =>
    this.http.request<DelayProfileResource[], any>({
      path: `/api/v1/delayprofile`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DelayProfile
   * @name V1DelayprofileDelete
   * @request DELETE:/api/v1/delayprofile/{id}
   * @secure
   */
  v1DelayprofileDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/delayprofile/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags DelayProfile
   * @name V1DelayprofileUpdate
   * @request PUT:/api/v1/delayprofile/{id}
   * @secure
   */
  v1DelayprofileUpdate = (id: string, data: DelayProfileResource, params: RequestParams = {}) =>
    this.http.request<DelayProfileResource, any>({
      path: `/api/v1/delayprofile/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DelayProfile
   * @name V1DelayprofileDetail
   * @request GET:/api/v1/delayprofile/{id}
   * @secure
   */
  v1DelayprofileDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<DelayProfileResource, any>({
      path: `/api/v1/delayprofile/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DelayProfile
   * @name V1DelayprofileReorderUpdate
   * @request PUT:/api/v1/delayprofile/reorder/{id}
   * @secure
   */
  v1DelayprofileReorderUpdate = (
    id: number,
    query?: {
      /** @format int32 */
      afterId?: number;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/api/v1/delayprofile/reorder/${id}`,
      method: "PUT",
      query: query,
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags DiskSpace
   * @name V1DiskspaceList
   * @request GET:/api/v1/diskspace
   * @secure
   */
  v1DiskspaceList = (params: RequestParams = {}) =>
    this.http.request<DiskSpaceResource[], any>({
      path: `/api/v1/diskspace`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DownloadClient
   * @name V1DownloadclientDetail
   * @request GET:/api/v1/downloadclient/{id}
   * @secure
   */
  v1DownloadclientDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<DownloadClientResource, any>({
      path: `/api/v1/downloadclient/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DownloadClient
   * @name V1DownloadclientUpdate
   * @request PUT:/api/v1/downloadclient/{id}
   * @secure
   */
  v1DownloadclientUpdate = (
    id: number,
    data: DownloadClientResource,
    query?: {
      /** @default false */
      forceSave?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<DownloadClientResource, any>({
      path: `/api/v1/downloadclient/${id}`,
      method: "PUT",
      query: query,
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DownloadClient
   * @name V1DownloadclientDelete
   * @request DELETE:/api/v1/downloadclient/{id}
   * @secure
   */
  v1DownloadclientDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/downloadclient/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags DownloadClient
   * @name V1DownloadclientList
   * @request GET:/api/v1/downloadclient
   * @secure
   */
  v1DownloadclientList = (params: RequestParams = {}) =>
    this.http.request<DownloadClientResource[], any>({
      path: `/api/v1/downloadclient`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DownloadClient
   * @name V1DownloadclientCreate
   * @request POST:/api/v1/downloadclient
   * @secure
   */
  v1DownloadclientCreate = (
    data: DownloadClientResource,
    query?: {
      /** @default false */
      forceSave?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<DownloadClientResource, any>({
      path: `/api/v1/downloadclient`,
      method: "POST",
      query: query,
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DownloadClient
   * @name V1DownloadclientBulkUpdate
   * @request PUT:/api/v1/downloadclient/bulk
   * @secure
   */
  v1DownloadclientBulkUpdate = (data: DownloadClientBulkResource, params: RequestParams = {}) =>
    this.http.request<DownloadClientResource, any>({
      path: `/api/v1/downloadclient/bulk`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DownloadClient
   * @name V1DownloadclientBulkDelete
   * @request DELETE:/api/v1/downloadclient/bulk
   * @secure
   */
  v1DownloadclientBulkDelete = (data: DownloadClientBulkResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/downloadclient/bulk`,
      method: "DELETE",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags DownloadClient
   * @name V1DownloadclientSchemaList
   * @request GET:/api/v1/downloadclient/schema
   * @secure
   */
  v1DownloadclientSchemaList = (params: RequestParams = {}) =>
    this.http.request<DownloadClientResource[], any>({
      path: `/api/v1/downloadclient/schema`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DownloadClient
   * @name V1DownloadclientTestCreate
   * @request POST:/api/v1/downloadclient/test
   * @secure
   */
  v1DownloadclientTestCreate = (
    data: DownloadClientResource,
    query?: {
      /** @default false */
      forceTest?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/api/v1/downloadclient/test`,
      method: "POST",
      query: query,
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags DownloadClient
   * @name V1DownloadclientTestallCreate
   * @request POST:/api/v1/downloadclient/testall
   * @secure
   */
  v1DownloadclientTestallCreate = (params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/downloadclient/testall`,
      method: "POST",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags DownloadClient
   * @name V1DownloadclientActionCreate
   * @request POST:/api/v1/downloadclient/action/{name}
   * @secure
   */
  v1DownloadclientActionCreate = (name: string, data: DownloadClientResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/downloadclient/action/${name}`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags DownloadClientConfig
   * @name V1ConfigDownloadclientDetail
   * @request GET:/api/v1/config/downloadclient/{id}
   * @secure
   */
  v1ConfigDownloadclientDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<DownloadClientConfigResource, any>({
      path: `/api/v1/config/downloadclient/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DownloadClientConfig
   * @name V1ConfigDownloadclientUpdate
   * @request PUT:/api/v1/config/downloadclient/{id}
   * @secure
   */
  v1ConfigDownloadclientUpdate = (id: string, data: DownloadClientConfigResource, params: RequestParams = {}) =>
    this.http.request<DownloadClientConfigResource, any>({
      path: `/api/v1/config/downloadclient/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DownloadClientConfig
   * @name V1ConfigDownloadclientList
   * @request GET:/api/v1/config/downloadclient
   * @secure
   */
  v1ConfigDownloadclientList = (params: RequestParams = {}) =>
    this.http.request<DownloadClientConfigResource, any>({
      path: `/api/v1/config/downloadclient`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags FileSystem
   * @name V1FilesystemList
   * @request GET:/api/v1/filesystem
   * @secure
   */
  v1FilesystemList = (
    query?: {
      path?: string;
      /** @default false */
      includeFiles?: boolean;
      /** @default false */
      allowFoldersWithoutTrailingSlashes?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/api/v1/filesystem`,
      method: "GET",
      query: query,
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags FileSystem
   * @name V1FilesystemTypeList
   * @request GET:/api/v1/filesystem/type
   * @secure
   */
  v1FilesystemTypeList = (
    query?: {
      path?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/api/v1/filesystem/type`,
      method: "GET",
      query: query,
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags FileSystem
   * @name V1FilesystemMediafilesList
   * @request GET:/api/v1/filesystem/mediafiles
   * @secure
   */
  v1FilesystemMediafilesList = (
    query?: {
      path?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/api/v1/filesystem/mediafiles`,
      method: "GET",
      query: query,
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Health
   * @name V1HealthList
   * @request GET:/api/v1/health
   * @secure
   */
  v1HealthList = (params: RequestParams = {}) =>
    this.http.request<HealthResource[], any>({
      path: `/api/v1/health`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags History
   * @name V1HistoryList
   * @request GET:/api/v1/history
   * @secure
   */
  v1HistoryList = (
    query?: {
      /**
       * @format int32
       * @default 1
       */
      page?: number;
      /**
       * @format int32
       * @default 10
       */
      pageSize?: number;
      sortKey?: string;
      sortDirection?: SortDirection;
      includeArtist?: boolean;
      includeAlbum?: boolean;
      includeTrack?: boolean;
      eventType?: number[];
      /** @format int32 */
      albumId?: number;
      downloadId?: string;
      artistIds?: number[];
      quality?: number[];
    },
    params: RequestParams = {},
  ) =>
    this.http.request<HistoryResourcePagingResource, any>({
      path: `/api/v1/history`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags History
   * @name V1HistorySinceList
   * @request GET:/api/v1/history/since
   * @secure
   */
  v1HistorySinceList = (
    query?: {
      /** @format date-time */
      date?: string;
      eventType?: EntityHistoryEventType;
      /** @default false */
      includeArtist?: boolean;
      /** @default false */
      includeAlbum?: boolean;
      /** @default false */
      includeTrack?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<HistoryResource[], any>({
      path: `/api/v1/history/since`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags History
   * @name V1HistoryArtistList
   * @request GET:/api/v1/history/artist
   * @secure
   */
  v1HistoryArtistList = (
    query?: {
      /** @format int32 */
      artistId?: number;
      /** @format int32 */
      albumId?: number;
      eventType?: EntityHistoryEventType;
      /** @default false */
      includeArtist?: boolean;
      /** @default false */
      includeAlbum?: boolean;
      /** @default false */
      includeTrack?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<HistoryResource[], any>({
      path: `/api/v1/history/artist`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags History
   * @name V1HistoryFailedCreate
   * @request POST:/api/v1/history/failed/{id}
   * @secure
   */
  v1HistoryFailedCreate = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/history/failed/${id}`,
      method: "POST",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags HostConfig
   * @name V1ConfigHostDetail
   * @request GET:/api/v1/config/host/{id}
   * @secure
   */
  v1ConfigHostDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<HostConfigResource, any>({
      path: `/api/v1/config/host/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags HostConfig
   * @name V1ConfigHostUpdate
   * @request PUT:/api/v1/config/host/{id}
   * @secure
   */
  v1ConfigHostUpdate = (id: string, data: HostConfigResource, params: RequestParams = {}) =>
    this.http.request<HostConfigResource, any>({
      path: `/api/v1/config/host/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags HostConfig
   * @name V1ConfigHostList
   * @request GET:/api/v1/config/host
   * @secure
   */
  v1ConfigHostList = (params: RequestParams = {}) =>
    this.http.request<HostConfigResource, any>({
      path: `/api/v1/config/host`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportList
   * @name V1ImportlistDetail
   * @request GET:/api/v1/importlist/{id}
   * @secure
   */
  v1ImportlistDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<ImportListResource, any>({
      path: `/api/v1/importlist/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportList
   * @name V1ImportlistUpdate
   * @request PUT:/api/v1/importlist/{id}
   * @secure
   */
  v1ImportlistUpdate = (
    id: number,
    data: ImportListResource,
    query?: {
      /** @default false */
      forceSave?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<ImportListResource, any>({
      path: `/api/v1/importlist/${id}`,
      method: "PUT",
      query: query,
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportList
   * @name V1ImportlistDelete
   * @request DELETE:/api/v1/importlist/{id}
   * @secure
   */
  v1ImportlistDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/importlist/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportList
   * @name V1ImportlistList
   * @request GET:/api/v1/importlist
   * @secure
   */
  v1ImportlistList = (params: RequestParams = {}) =>
    this.http.request<ImportListResource[], any>({
      path: `/api/v1/importlist`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportList
   * @name V1ImportlistCreate
   * @request POST:/api/v1/importlist
   * @secure
   */
  v1ImportlistCreate = (
    data: ImportListResource,
    query?: {
      /** @default false */
      forceSave?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<ImportListResource, any>({
      path: `/api/v1/importlist`,
      method: "POST",
      query: query,
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportList
   * @name V1ImportlistBulkUpdate
   * @request PUT:/api/v1/importlist/bulk
   * @secure
   */
  v1ImportlistBulkUpdate = (data: ImportListBulkResource, params: RequestParams = {}) =>
    this.http.request<ImportListResource, any>({
      path: `/api/v1/importlist/bulk`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportList
   * @name V1ImportlistBulkDelete
   * @request DELETE:/api/v1/importlist/bulk
   * @secure
   */
  v1ImportlistBulkDelete = (data: ImportListBulkResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/importlist/bulk`,
      method: "DELETE",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportList
   * @name V1ImportlistSchemaList
   * @request GET:/api/v1/importlist/schema
   * @secure
   */
  v1ImportlistSchemaList = (params: RequestParams = {}) =>
    this.http.request<ImportListResource[], any>({
      path: `/api/v1/importlist/schema`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportList
   * @name V1ImportlistTestCreate
   * @request POST:/api/v1/importlist/test
   * @secure
   */
  v1ImportlistTestCreate = (
    data: ImportListResource,
    query?: {
      /** @default false */
      forceTest?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/api/v1/importlist/test`,
      method: "POST",
      query: query,
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportList
   * @name V1ImportlistTestallCreate
   * @request POST:/api/v1/importlist/testall
   * @secure
   */
  v1ImportlistTestallCreate = (params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/importlist/testall`,
      method: "POST",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportList
   * @name V1ImportlistActionCreate
   * @request POST:/api/v1/importlist/action/{name}
   * @secure
   */
  v1ImportlistActionCreate = (name: string, data: ImportListResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/importlist/action/${name}`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportListExclusion
   * @name V1ImportlistexclusionDetail
   * @request GET:/api/v1/importlistexclusion/{id}
   * @secure
   */
  v1ImportlistexclusionDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<ImportListExclusionResource, any>({
      path: `/api/v1/importlistexclusion/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportListExclusion
   * @name V1ImportlistexclusionUpdate
   * @request PUT:/api/v1/importlistexclusion/{id}
   * @secure
   */
  v1ImportlistexclusionUpdate = (id: string, data: ImportListExclusionResource, params: RequestParams = {}) =>
    this.http.request<ImportListExclusionResource, any>({
      path: `/api/v1/importlistexclusion/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportListExclusion
   * @name V1ImportlistexclusionDelete
   * @request DELETE:/api/v1/importlistexclusion/{id}
   * @secure
   */
  v1ImportlistexclusionDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/importlistexclusion/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportListExclusion
   * @name V1ImportlistexclusionList
   * @request GET:/api/v1/importlistexclusion
   * @secure
   */
  v1ImportlistexclusionList = (params: RequestParams = {}) =>
    this.http.request<ImportListExclusionResource[], any>({
      path: `/api/v1/importlistexclusion`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportListExclusion
   * @name V1ImportlistexclusionCreate
   * @request POST:/api/v1/importlistexclusion
   * @secure
   */
  v1ImportlistexclusionCreate = (data: ImportListExclusionResource, params: RequestParams = {}) =>
    this.http.request<ImportListExclusionResource, any>({
      path: `/api/v1/importlistexclusion`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Indexer
   * @name V1IndexerDetail
   * @request GET:/api/v1/indexer/{id}
   * @secure
   */
  v1IndexerDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<IndexerResource, any>({
      path: `/api/v1/indexer/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Indexer
   * @name V1IndexerUpdate
   * @request PUT:/api/v1/indexer/{id}
   * @secure
   */
  v1IndexerUpdate = (
    id: number,
    data: IndexerResource,
    query?: {
      /** @default false */
      forceSave?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<IndexerResource, any>({
      path: `/api/v1/indexer/${id}`,
      method: "PUT",
      query: query,
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Indexer
   * @name V1IndexerDelete
   * @request DELETE:/api/v1/indexer/{id}
   * @secure
   */
  v1IndexerDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/indexer/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Indexer
   * @name V1IndexerList
   * @request GET:/api/v1/indexer
   * @secure
   */
  v1IndexerList = (params: RequestParams = {}) =>
    this.http.request<IndexerResource[], any>({
      path: `/api/v1/indexer`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Indexer
   * @name V1IndexerCreate
   * @request POST:/api/v1/indexer
   * @secure
   */
  v1IndexerCreate = (
    data: IndexerResource,
    query?: {
      /** @default false */
      forceSave?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<IndexerResource, any>({
      path: `/api/v1/indexer`,
      method: "POST",
      query: query,
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Indexer
   * @name V1IndexerBulkUpdate
   * @request PUT:/api/v1/indexer/bulk
   * @secure
   */
  v1IndexerBulkUpdate = (data: IndexerBulkResource, params: RequestParams = {}) =>
    this.http.request<IndexerResource, any>({
      path: `/api/v1/indexer/bulk`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Indexer
   * @name V1IndexerBulkDelete
   * @request DELETE:/api/v1/indexer/bulk
   * @secure
   */
  v1IndexerBulkDelete = (data: IndexerBulkResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/indexer/bulk`,
      method: "DELETE",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags Indexer
   * @name V1IndexerSchemaList
   * @request GET:/api/v1/indexer/schema
   * @secure
   */
  v1IndexerSchemaList = (params: RequestParams = {}) =>
    this.http.request<IndexerResource[], any>({
      path: `/api/v1/indexer/schema`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Indexer
   * @name V1IndexerTestCreate
   * @request POST:/api/v1/indexer/test
   * @secure
   */
  v1IndexerTestCreate = (
    data: IndexerResource,
    query?: {
      /** @default false */
      forceTest?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/api/v1/indexer/test`,
      method: "POST",
      query: query,
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags Indexer
   * @name V1IndexerTestallCreate
   * @request POST:/api/v1/indexer/testall
   * @secure
   */
  v1IndexerTestallCreate = (params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/indexer/testall`,
      method: "POST",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Indexer
   * @name V1IndexerActionCreate
   * @request POST:/api/v1/indexer/action/{name}
   * @secure
   */
  v1IndexerActionCreate = (name: string, data: IndexerResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/indexer/action/${name}`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags IndexerConfig
   * @name V1ConfigIndexerDetail
   * @request GET:/api/v1/config/indexer/{id}
   * @secure
   */
  v1ConfigIndexerDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<IndexerConfigResource, any>({
      path: `/api/v1/config/indexer/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags IndexerConfig
   * @name V1ConfigIndexerUpdate
   * @request PUT:/api/v1/config/indexer/{id}
   * @secure
   */
  v1ConfigIndexerUpdate = (id: string, data: IndexerConfigResource, params: RequestParams = {}) =>
    this.http.request<IndexerConfigResource, any>({
      path: `/api/v1/config/indexer/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags IndexerConfig
   * @name V1ConfigIndexerList
   * @request GET:/api/v1/config/indexer
   * @secure
   */
  v1ConfigIndexerList = (params: RequestParams = {}) =>
    this.http.request<IndexerConfigResource, any>({
      path: `/api/v1/config/indexer`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags IndexerFlag
   * @name V1IndexerflagList
   * @request GET:/api/v1/indexerflag
   * @secure
   */
  v1IndexerflagList = (params: RequestParams = {}) =>
    this.http.request<IndexerFlagResource[], any>({
      path: `/api/v1/indexerflag`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Language
   * @name V1LanguageDetail
   * @request GET:/api/v1/language/{id}
   * @secure
   */
  v1LanguageDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<LanguageResource, any>({
      path: `/api/v1/language/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Language
   * @name V1LanguageList
   * @request GET:/api/v1/language
   * @secure
   */
  v1LanguageList = (params: RequestParams = {}) =>
    this.http.request<LanguageResource[], any>({
      path: `/api/v1/language`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Localization
   * @name V1LocalizationList
   * @request GET:/api/v1/localization
   * @secure
   */
  v1LocalizationList = (params: RequestParams = {}) =>
    this.http.request<LocalizationResource, any>({
      path: `/api/v1/localization`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Log
   * @name V1LogList
   * @request GET:/api/v1/log
   * @secure
   */
  v1LogList = (
    query?: {
      /**
       * @format int32
       * @default 1
       */
      page?: number;
      /**
       * @format int32
       * @default 10
       */
      pageSize?: number;
      sortKey?: string;
      sortDirection?: SortDirection;
      level?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<LogResourcePagingResource, any>({
      path: `/api/v1/log`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags LogFile
   * @name V1LogFileList
   * @request GET:/api/v1/log/file
   * @secure
   */
  v1LogFileList = (params: RequestParams = {}) =>
    this.http.request<LogFileResource[], any>({
      path: `/api/v1/log/file`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags LogFile
   * @name V1LogFileDetail
   * @request GET:/api/v1/log/file/{filename}
   * @secure
   */
  v1LogFileDetail = (filename: string, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/log/file/${filename}`,
      method: "GET",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags ManualImport
   * @name V1ManualimportCreate
   * @request POST:/api/v1/manualimport
   * @secure
   */
  v1ManualimportCreate = (data: ManualImportUpdateResource[], params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/manualimport`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags ManualImport
   * @name V1ManualimportList
   * @request GET:/api/v1/manualimport
   * @secure
   */
  v1ManualimportList = (
    query?: {
      folder?: string;
      downloadId?: string;
      /** @format int32 */
      artistId?: number;
      /** @default true */
      filterExistingFiles?: boolean;
      /** @default true */
      replaceExistingFiles?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<ManualImportResource[], any>({
      path: `/api/v1/manualimport`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags MediaCover
   * @name V1MediacoverArtistDetail
   * @request GET:/api/v1/mediacover/artist/{artistId}/{filename}
   * @secure
   */
  v1MediacoverArtistDetail = (artistId: number, filename: string, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/mediacover/artist/${artistId}/${filename}`,
      method: "GET",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags MediaCover
   * @name V1MediacoverAlbumDetail
   * @request GET:/api/v1/mediacover/album/{albumId}/{filename}
   * @secure
   */
  v1MediacoverAlbumDetail = (albumId: number, filename: string, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/mediacover/album/${albumId}/${filename}`,
      method: "GET",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags MediaManagementConfig
   * @name V1ConfigMediamanagementDetail
   * @request GET:/api/v1/config/mediamanagement/{id}
   * @secure
   */
  v1ConfigMediamanagementDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<MediaManagementConfigResource, any>({
      path: `/api/v1/config/mediamanagement/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags MediaManagementConfig
   * @name V1ConfigMediamanagementUpdate
   * @request PUT:/api/v1/config/mediamanagement/{id}
   * @secure
   */
  v1ConfigMediamanagementUpdate = (id: string, data: MediaManagementConfigResource, params: RequestParams = {}) =>
    this.http.request<MediaManagementConfigResource, any>({
      path: `/api/v1/config/mediamanagement/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags MediaManagementConfig
   * @name V1ConfigMediamanagementList
   * @request GET:/api/v1/config/mediamanagement
   * @secure
   */
  v1ConfigMediamanagementList = (params: RequestParams = {}) =>
    this.http.request<MediaManagementConfigResource, any>({
      path: `/api/v1/config/mediamanagement`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Metadata
   * @name V1MetadataDetail
   * @request GET:/api/v1/metadata/{id}
   * @secure
   */
  v1MetadataDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<MetadataResource, any>({
      path: `/api/v1/metadata/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Metadata
   * @name V1MetadataUpdate
   * @request PUT:/api/v1/metadata/{id}
   * @secure
   */
  v1MetadataUpdate = (
    id: number,
    data: MetadataResource,
    query?: {
      /** @default false */
      forceSave?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<MetadataResource, any>({
      path: `/api/v1/metadata/${id}`,
      method: "PUT",
      query: query,
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Metadata
   * @name V1MetadataDelete
   * @request DELETE:/api/v1/metadata/{id}
   * @secure
   */
  v1MetadataDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/metadata/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Metadata
   * @name V1MetadataList
   * @request GET:/api/v1/metadata
   * @secure
   */
  v1MetadataList = (params: RequestParams = {}) =>
    this.http.request<MetadataResource[], any>({
      path: `/api/v1/metadata`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Metadata
   * @name V1MetadataCreate
   * @request POST:/api/v1/metadata
   * @secure
   */
  v1MetadataCreate = (
    data: MetadataResource,
    query?: {
      /** @default false */
      forceSave?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<MetadataResource, any>({
      path: `/api/v1/metadata`,
      method: "POST",
      query: query,
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Metadata
   * @name V1MetadataSchemaList
   * @request GET:/api/v1/metadata/schema
   * @secure
   */
  v1MetadataSchemaList = (params: RequestParams = {}) =>
    this.http.request<MetadataResource[], any>({
      path: `/api/v1/metadata/schema`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Metadata
   * @name V1MetadataTestCreate
   * @request POST:/api/v1/metadata/test
   * @secure
   */
  v1MetadataTestCreate = (
    data: MetadataResource,
    query?: {
      /** @default false */
      forceTest?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/api/v1/metadata/test`,
      method: "POST",
      query: query,
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags Metadata
   * @name V1MetadataTestallCreate
   * @request POST:/api/v1/metadata/testall
   * @secure
   */
  v1MetadataTestallCreate = (params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/metadata/testall`,
      method: "POST",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Metadata
   * @name V1MetadataActionCreate
   * @request POST:/api/v1/metadata/action/{name}
   * @secure
   */
  v1MetadataActionCreate = (name: string, data: MetadataResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/metadata/action/${name}`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags MetadataProfile
   * @name V1MetadataprofileCreate
   * @request POST:/api/v1/metadataprofile
   * @secure
   */
  v1MetadataprofileCreate = (data: MetadataProfileResource, params: RequestParams = {}) =>
    this.http.request<MetadataProfileResource, any>({
      path: `/api/v1/metadataprofile`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags MetadataProfile
   * @name V1MetadataprofileList
   * @request GET:/api/v1/metadataprofile
   * @secure
   */
  v1MetadataprofileList = (params: RequestParams = {}) =>
    this.http.request<MetadataProfileResource[], any>({
      path: `/api/v1/metadataprofile`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags MetadataProfile
   * @name V1MetadataprofileDelete
   * @request DELETE:/api/v1/metadataprofile/{id}
   * @secure
   */
  v1MetadataprofileDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/metadataprofile/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags MetadataProfile
   * @name V1MetadataprofileUpdate
   * @request PUT:/api/v1/metadataprofile/{id}
   * @secure
   */
  v1MetadataprofileUpdate = (id: string, data: MetadataProfileResource, params: RequestParams = {}) =>
    this.http.request<MetadataProfileResource, any>({
      path: `/api/v1/metadataprofile/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags MetadataProfile
   * @name V1MetadataprofileDetail
   * @request GET:/api/v1/metadataprofile/{id}
   * @secure
   */
  v1MetadataprofileDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<MetadataProfileResource, any>({
      path: `/api/v1/metadataprofile/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags MetadataProfileSchema
   * @name V1MetadataprofileSchemaList
   * @request GET:/api/v1/metadataprofile/schema
   * @secure
   */
  v1MetadataprofileSchemaList = (params: RequestParams = {}) =>
    this.http.request<MetadataProfileResource, any>({
      path: `/api/v1/metadataprofile/schema`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags MetadataProviderConfig
   * @name V1ConfigMetadataproviderDetail
   * @request GET:/api/v1/config/metadataprovider/{id}
   * @secure
   */
  v1ConfigMetadataproviderDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<MetadataProviderConfigResource, any>({
      path: `/api/v1/config/metadataprovider/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags MetadataProviderConfig
   * @name V1ConfigMetadataproviderUpdate
   * @request PUT:/api/v1/config/metadataprovider/{id}
   * @secure
   */
  v1ConfigMetadataproviderUpdate = (id: string, data: MetadataProviderConfigResource, params: RequestParams = {}) =>
    this.http.request<MetadataProviderConfigResource, any>({
      path: `/api/v1/config/metadataprovider/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags MetadataProviderConfig
   * @name V1ConfigMetadataproviderList
   * @request GET:/api/v1/config/metadataprovider
   * @secure
   */
  v1ConfigMetadataproviderList = (params: RequestParams = {}) =>
    this.http.request<MetadataProviderConfigResource, any>({
      path: `/api/v1/config/metadataprovider`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Missing
   * @name V1WantedMissingList
   * @request GET:/api/v1/wanted/missing
   * @secure
   */
  v1WantedMissingList = (
    query?: {
      /**
       * @format int32
       * @default 1
       */
      page?: number;
      /**
       * @format int32
       * @default 10
       */
      pageSize?: number;
      sortKey?: string;
      sortDirection?: SortDirection;
      /** @default false */
      includeArtist?: boolean;
      /** @default true */
      monitored?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<AlbumResourcePagingResource, any>({
      path: `/api/v1/wanted/missing`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Missing
   * @name V1WantedMissingDetail
   * @request GET:/api/v1/wanted/missing/{id}
   * @secure
   */
  v1WantedMissingDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<AlbumResource, any>({
      path: `/api/v1/wanted/missing/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags NamingConfig
   * @name V1ConfigNamingDetail
   * @request GET:/api/v1/config/naming/{id}
   * @secure
   */
  v1ConfigNamingDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<NamingConfigResource, any>({
      path: `/api/v1/config/naming/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags NamingConfig
   * @name V1ConfigNamingUpdate
   * @request PUT:/api/v1/config/naming/{id}
   * @secure
   */
  v1ConfigNamingUpdate = (id: string, data: NamingConfigResource, params: RequestParams = {}) =>
    this.http.request<NamingConfigResource, any>({
      path: `/api/v1/config/naming/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags NamingConfig
   * @name V1ConfigNamingList
   * @request GET:/api/v1/config/naming
   * @secure
   */
  v1ConfigNamingList = (params: RequestParams = {}) =>
    this.http.request<NamingConfigResource, any>({
      path: `/api/v1/config/naming`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags NamingConfig
   * @name V1ConfigNamingExamplesList
   * @request GET:/api/v1/config/naming/examples
   * @secure
   */
  v1ConfigNamingExamplesList = (
    query?: {
      renameTracks?: boolean;
      replaceIllegalCharacters?: boolean;
      /** @format int32 */
      colonReplacementFormat?: number;
      standardTrackFormat?: string;
      multiDiscTrackFormat?: string;
      artistFolderFormat?: string;
      includeArtistName?: boolean;
      includeAlbumTitle?: boolean;
      includeQuality?: boolean;
      replaceSpaces?: boolean;
      separator?: string;
      numberStyle?: string;
      /** @format int32 */
      id?: number;
      resourceName?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/api/v1/config/naming/examples`,
      method: "GET",
      query: query,
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Notification
   * @name V1NotificationDetail
   * @request GET:/api/v1/notification/{id}
   * @secure
   */
  v1NotificationDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<NotificationResource, any>({
      path: `/api/v1/notification/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Notification
   * @name V1NotificationUpdate
   * @request PUT:/api/v1/notification/{id}
   * @secure
   */
  v1NotificationUpdate = (
    id: number,
    data: NotificationResource,
    query?: {
      /** @default false */
      forceSave?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<NotificationResource, any>({
      path: `/api/v1/notification/${id}`,
      method: "PUT",
      query: query,
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Notification
   * @name V1NotificationDelete
   * @request DELETE:/api/v1/notification/{id}
   * @secure
   */
  v1NotificationDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/notification/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Notification
   * @name V1NotificationList
   * @request GET:/api/v1/notification
   * @secure
   */
  v1NotificationList = (params: RequestParams = {}) =>
    this.http.request<NotificationResource[], any>({
      path: `/api/v1/notification`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Notification
   * @name V1NotificationCreate
   * @request POST:/api/v1/notification
   * @secure
   */
  v1NotificationCreate = (
    data: NotificationResource,
    query?: {
      /** @default false */
      forceSave?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<NotificationResource, any>({
      path: `/api/v1/notification`,
      method: "POST",
      query: query,
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Notification
   * @name V1NotificationSchemaList
   * @request GET:/api/v1/notification/schema
   * @secure
   */
  v1NotificationSchemaList = (params: RequestParams = {}) =>
    this.http.request<NotificationResource[], any>({
      path: `/api/v1/notification/schema`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Notification
   * @name V1NotificationTestCreate
   * @request POST:/api/v1/notification/test
   * @secure
   */
  v1NotificationTestCreate = (
    data: NotificationResource,
    query?: {
      /** @default false */
      forceTest?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/api/v1/notification/test`,
      method: "POST",
      query: query,
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags Notification
   * @name V1NotificationTestallCreate
   * @request POST:/api/v1/notification/testall
   * @secure
   */
  v1NotificationTestallCreate = (params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/notification/testall`,
      method: "POST",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Notification
   * @name V1NotificationActionCreate
   * @request POST:/api/v1/notification/action/{name}
   * @secure
   */
  v1NotificationActionCreate = (name: string, data: NotificationResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/notification/action/${name}`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags Parse
   * @name V1ParseList
   * @request GET:/api/v1/parse
   * @secure
   */
  v1ParseList = (
    query?: {
      title?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<ParseResource, any>({
      path: `/api/v1/parse`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags QualityDefinition
   * @name V1QualitydefinitionUpdate
   * @request PUT:/api/v1/qualitydefinition/{id}
   * @secure
   */
  v1QualitydefinitionUpdate = (id: string, data: QualityDefinitionResource, params: RequestParams = {}) =>
    this.http.request<QualityDefinitionResource, any>({
      path: `/api/v1/qualitydefinition/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags QualityDefinition
   * @name V1QualitydefinitionDetail
   * @request GET:/api/v1/qualitydefinition/{id}
   * @secure
   */
  v1QualitydefinitionDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<QualityDefinitionResource, any>({
      path: `/api/v1/qualitydefinition/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags QualityDefinition
   * @name V1QualitydefinitionList
   * @request GET:/api/v1/qualitydefinition
   * @secure
   */
  v1QualitydefinitionList = (params: RequestParams = {}) =>
    this.http.request<QualityDefinitionResource[], any>({
      path: `/api/v1/qualitydefinition`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags QualityDefinition
   * @name V1QualitydefinitionUpdateUpdate
   * @request PUT:/api/v1/qualitydefinition/update
   * @secure
   */
  v1QualitydefinitionUpdateUpdate = (data: QualityDefinitionResource[], params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/qualitydefinition/update`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags QualityProfile
   * @name V1QualityprofileCreate
   * @request POST:/api/v1/qualityprofile
   * @secure
   */
  v1QualityprofileCreate = (data: QualityProfileResource, params: RequestParams = {}) =>
    this.http.request<QualityProfileResource, any>({
      path: `/api/v1/qualityprofile`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags QualityProfile
   * @name V1QualityprofileList
   * @request GET:/api/v1/qualityprofile
   * @secure
   */
  v1QualityprofileList = (params: RequestParams = {}) =>
    this.http.request<QualityProfileResource[], any>({
      path: `/api/v1/qualityprofile`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags QualityProfile
   * @name V1QualityprofileDelete
   * @request DELETE:/api/v1/qualityprofile/{id}
   * @secure
   */
  v1QualityprofileDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/qualityprofile/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags QualityProfile
   * @name V1QualityprofileUpdate
   * @request PUT:/api/v1/qualityprofile/{id}
   * @secure
   */
  v1QualityprofileUpdate = (id: string, data: QualityProfileResource, params: RequestParams = {}) =>
    this.http.request<QualityProfileResource, any>({
      path: `/api/v1/qualityprofile/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags QualityProfile
   * @name V1QualityprofileDetail
   * @request GET:/api/v1/qualityprofile/{id}
   * @secure
   */
  v1QualityprofileDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<QualityProfileResource, any>({
      path: `/api/v1/qualityprofile/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags QualityProfileSchema
   * @name V1QualityprofileSchemaList
   * @request GET:/api/v1/qualityprofile/schema
   * @secure
   */
  v1QualityprofileSchemaList = (params: RequestParams = {}) =>
    this.http.request<QualityProfileResource, any>({
      path: `/api/v1/qualityprofile/schema`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Queue
   * @name V1QueueDelete
   * @request DELETE:/api/v1/queue/{id}
   * @secure
   */
  v1QueueDelete = (
    id: number,
    query?: {
      /** @default true */
      removeFromClient?: boolean;
      /** @default false */
      blocklist?: boolean;
      /** @default false */
      skipRedownload?: boolean;
      /** @default false */
      changeCategory?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/api/v1/queue/${id}`,
      method: "DELETE",
      query: query,
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Queue
   * @name V1QueueBulkDelete
   * @request DELETE:/api/v1/queue/bulk
   * @secure
   */
  v1QueueBulkDelete = (
    data: QueueBulkResource,
    query?: {
      /** @default true */
      removeFromClient?: boolean;
      /** @default false */
      blocklist?: boolean;
      /** @default false */
      skipRedownload?: boolean;
      /** @default false */
      changeCategory?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/api/v1/queue/bulk`,
      method: "DELETE",
      query: query,
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags Queue
   * @name V1QueueList
   * @request GET:/api/v1/queue
   * @secure
   */
  v1QueueList = (
    query?: {
      /**
       * @format int32
       * @default 1
       */
      page?: number;
      /**
       * @format int32
       * @default 10
       */
      pageSize?: number;
      sortKey?: string;
      sortDirection?: SortDirection;
      /** @default false */
      includeUnknownArtistItems?: boolean;
      /** @default false */
      includeArtist?: boolean;
      /** @default false */
      includeAlbum?: boolean;
      artistIds?: number[];
      protocol?: DownloadProtocol;
      quality?: number[];
    },
    params: RequestParams = {},
  ) =>
    this.http.request<QueueResourcePagingResource, any>({
      path: `/api/v1/queue`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags QueueAction
   * @name V1QueueGrabCreate
   * @request POST:/api/v1/queue/grab/{id}
   * @secure
   */
  v1QueueGrabCreate = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/queue/grab/${id}`,
      method: "POST",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags QueueAction
   * @name V1QueueGrabBulkCreate
   * @request POST:/api/v1/queue/grab/bulk
   * @secure
   */
  v1QueueGrabBulkCreate = (data: QueueBulkResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/queue/grab/bulk`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags QueueDetails
   * @name V1QueueDetailsList
   * @request GET:/api/v1/queue/details
   * @secure
   */
  v1QueueDetailsList = (
    query?: {
      /** @format int32 */
      artistId?: number;
      albumIds?: number[];
      /** @default false */
      includeArtist?: boolean;
      /** @default true */
      includeAlbum?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<QueueResource[], any>({
      path: `/api/v1/queue/details`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags QueueStatus
   * @name V1QueueStatusList
   * @request GET:/api/v1/queue/status
   * @secure
   */
  v1QueueStatusList = (params: RequestParams = {}) =>
    this.http.request<QueueStatusResource, any>({
      path: `/api/v1/queue/status`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Release
   * @name V1ReleaseCreate
   * @request POST:/api/v1/release
   * @secure
   */
  v1ReleaseCreate = (data: ReleaseResource, params: RequestParams = {}) =>
    this.http.request<ReleaseResource, any>({
      path: `/api/v1/release`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Release
   * @name V1ReleaseList
   * @request GET:/api/v1/release
   * @secure
   */
  v1ReleaseList = (
    query?: {
      /** @format int32 */
      albumId?: number;
      /** @format int32 */
      artistId?: number;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<ReleaseResource[], any>({
      path: `/api/v1/release`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ReleaseProfile
   * @name V1ReleaseprofileDetail
   * @request GET:/api/v1/releaseprofile/{id}
   * @secure
   */
  v1ReleaseprofileDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<ReleaseProfileResource, any>({
      path: `/api/v1/releaseprofile/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ReleaseProfile
   * @name V1ReleaseprofileUpdate
   * @request PUT:/api/v1/releaseprofile/{id}
   * @secure
   */
  v1ReleaseprofileUpdate = (id: string, data: ReleaseProfileResource, params: RequestParams = {}) =>
    this.http.request<ReleaseProfileResource, any>({
      path: `/api/v1/releaseprofile/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ReleaseProfile
   * @name V1ReleaseprofileDelete
   * @request DELETE:/api/v1/releaseprofile/{id}
   * @secure
   */
  v1ReleaseprofileDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/releaseprofile/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags ReleaseProfile
   * @name V1ReleaseprofileList
   * @request GET:/api/v1/releaseprofile
   * @secure
   */
  v1ReleaseprofileList = (params: RequestParams = {}) =>
    this.http.request<ReleaseProfileResource[], any>({
      path: `/api/v1/releaseprofile`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ReleaseProfile
   * @name V1ReleaseprofileCreate
   * @request POST:/api/v1/releaseprofile
   * @secure
   */
  v1ReleaseprofileCreate = (data: ReleaseProfileResource, params: RequestParams = {}) =>
    this.http.request<ReleaseProfileResource, any>({
      path: `/api/v1/releaseprofile`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ReleasePush
   * @name V1ReleasePushCreate
   * @request POST:/api/v1/release/push
   * @secure
   */
  v1ReleasePushCreate = (data: ReleaseResource, params: RequestParams = {}) =>
    this.http.request<ReleaseResource, any>({
      path: `/api/v1/release/push`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags RemotePathMapping
   * @name V1RemotepathmappingDetail
   * @request GET:/api/v1/remotepathmapping/{id}
   * @secure
   */
  v1RemotepathmappingDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<RemotePathMappingResource, any>({
      path: `/api/v1/remotepathmapping/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags RemotePathMapping
   * @name V1RemotepathmappingDelete
   * @request DELETE:/api/v1/remotepathmapping/{id}
   * @secure
   */
  v1RemotepathmappingDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/remotepathmapping/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags RemotePathMapping
   * @name V1RemotepathmappingUpdate
   * @request PUT:/api/v1/remotepathmapping/{id}
   * @secure
   */
  v1RemotepathmappingUpdate = (id: string, data: RemotePathMappingResource, params: RequestParams = {}) =>
    this.http.request<RemotePathMappingResource, any>({
      path: `/api/v1/remotepathmapping/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags RemotePathMapping
   * @name V1RemotepathmappingCreate
   * @request POST:/api/v1/remotepathmapping
   * @secure
   */
  v1RemotepathmappingCreate = (data: RemotePathMappingResource, params: RequestParams = {}) =>
    this.http.request<RemotePathMappingResource, any>({
      path: `/api/v1/remotepathmapping`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags RemotePathMapping
   * @name V1RemotepathmappingList
   * @request GET:/api/v1/remotepathmapping
   * @secure
   */
  v1RemotepathmappingList = (params: RequestParams = {}) =>
    this.http.request<RemotePathMappingResource[], any>({
      path: `/api/v1/remotepathmapping`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags RenameTrack
   * @name V1RenameList
   * @request GET:/api/v1/rename
   * @secure
   */
  v1RenameList = (
    query?: {
      /** @format int32 */
      artistId?: number;
      /** @format int32 */
      albumId?: number;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<RenameTrackResource[], any>({
      path: `/api/v1/rename`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags RetagTrack
   * @name V1RetagList
   * @request GET:/api/v1/retag
   * @secure
   */
  v1RetagList = (
    query?: {
      /** @format int32 */
      artistId?: number;
      /** @format int32 */
      albumId?: number;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<RetagTrackResource[], any>({
      path: `/api/v1/retag`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags RootFolder
   * @name V1RootfolderDetail
   * @request GET:/api/v1/rootfolder/{id}
   * @secure
   */
  v1RootfolderDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<RootFolderResource, any>({
      path: `/api/v1/rootfolder/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags RootFolder
   * @name V1RootfolderUpdate
   * @request PUT:/api/v1/rootfolder/{id}
   * @secure
   */
  v1RootfolderUpdate = (id: string, data: RootFolderResource, params: RequestParams = {}) =>
    this.http.request<RootFolderResource, any>({
      path: `/api/v1/rootfolder/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags RootFolder
   * @name V1RootfolderDelete
   * @request DELETE:/api/v1/rootfolder/{id}
   * @secure
   */
  v1RootfolderDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/rootfolder/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags RootFolder
   * @name V1RootfolderCreate
   * @request POST:/api/v1/rootfolder
   * @secure
   */
  v1RootfolderCreate = (data: RootFolderResource, params: RequestParams = {}) =>
    this.http.request<RootFolderResource, any>({
      path: `/api/v1/rootfolder`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags RootFolder
   * @name V1RootfolderList
   * @request GET:/api/v1/rootfolder
   * @secure
   */
  v1RootfolderList = (params: RequestParams = {}) =>
    this.http.request<RootFolderResource[], any>({
      path: `/api/v1/rootfolder`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Search
   * @name V1SearchList
   * @request GET:/api/v1/search
   * @secure
   */
  v1SearchList = (
    query?: {
      term?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<SearchResource[], any>({
      path: `/api/v1/search`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags System
   * @name V1SystemStatusList
   * @request GET:/api/v1/system/status
   * @secure
   */
  v1SystemStatusList = (params: RequestParams = {}) =>
    this.http.request<SystemResource, any>({
      path: `/api/v1/system/status`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags System
   * @name V1SystemRoutesList
   * @request GET:/api/v1/system/routes
   * @secure
   */
  v1SystemRoutesList = (params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/system/routes`,
      method: "GET",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags System
   * @name V1SystemRoutesDuplicateList
   * @request GET:/api/v1/system/routes/duplicate
   * @secure
   */
  v1SystemRoutesDuplicateList = (params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/system/routes/duplicate`,
      method: "GET",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags System
   * @name V1SystemShutdownCreate
   * @request POST:/api/v1/system/shutdown
   * @secure
   */
  v1SystemShutdownCreate = (params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/system/shutdown`,
      method: "POST",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags System
   * @name V1SystemRestartCreate
   * @request POST:/api/v1/system/restart
   * @secure
   */
  v1SystemRestartCreate = (params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/system/restart`,
      method: "POST",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Tag
   * @name V1TagDetail
   * @request GET:/api/v1/tag/{id}
   * @secure
   */
  v1TagDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<TagResource, any>({
      path: `/api/v1/tag/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Tag
   * @name V1TagUpdate
   * @request PUT:/api/v1/tag/{id}
   * @secure
   */
  v1TagUpdate = (id: string, data: TagResource, params: RequestParams = {}) =>
    this.http.request<TagResource, any>({
      path: `/api/v1/tag/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Tag
   * @name V1TagDelete
   * @request DELETE:/api/v1/tag/{id}
   * @secure
   */
  v1TagDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/tag/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Tag
   * @name V1TagList
   * @request GET:/api/v1/tag
   * @secure
   */
  v1TagList = (params: RequestParams = {}) =>
    this.http.request<TagResource[], any>({
      path: `/api/v1/tag`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Tag
   * @name V1TagCreate
   * @request POST:/api/v1/tag
   * @secure
   */
  v1TagCreate = (data: TagResource, params: RequestParams = {}) =>
    this.http.request<TagResource, any>({
      path: `/api/v1/tag`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags TagDetails
   * @name V1TagDetailDetail
   * @request GET:/api/v1/tag/detail/{id}
   * @secure
   */
  v1TagDetailDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<TagDetailsResource, any>({
      path: `/api/v1/tag/detail/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags TagDetails
   * @name V1TagDetailList
   * @request GET:/api/v1/tag/detail
   * @secure
   */
  v1TagDetailList = (params: RequestParams = {}) =>
    this.http.request<TagDetailsResource[], any>({
      path: `/api/v1/tag/detail`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Task
   * @name V1SystemTaskList
   * @request GET:/api/v1/system/task
   * @secure
   */
  v1SystemTaskList = (params: RequestParams = {}) =>
    this.http.request<TaskResource[], any>({
      path: `/api/v1/system/task`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Task
   * @name V1SystemTaskDetail
   * @request GET:/api/v1/system/task/{id}
   * @secure
   */
  v1SystemTaskDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<TaskResource, any>({
      path: `/api/v1/system/task/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Track
   * @name V1TrackList
   * @request GET:/api/v1/track
   * @secure
   */
  v1TrackList = (
    query?: {
      /** @format int32 */
      artistId?: number;
      /** @format int32 */
      albumId?: number;
      /** @format int32 */
      albumReleaseId?: number;
      trackIds?: number[];
    },
    params: RequestParams = {},
  ) =>
    this.http.request<TrackResource[], any>({
      path: `/api/v1/track`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Track
   * @name V1TrackDetail
   * @request GET:/api/v1/track/{id}
   * @secure
   */
  v1TrackDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<TrackResource, any>({
      path: `/api/v1/track/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags TrackFile
   * @name V1TrackfileDetail
   * @request GET:/api/v1/trackfile/{id}
   * @secure
   */
  v1TrackfileDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<TrackFileResource, any>({
      path: `/api/v1/trackfile/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags TrackFile
   * @name V1TrackfileUpdate
   * @request PUT:/api/v1/trackfile/{id}
   * @secure
   */
  v1TrackfileUpdate = (id: string, data: TrackFileResource, params: RequestParams = {}) =>
    this.http.request<TrackFileResource, any>({
      path: `/api/v1/trackfile/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags TrackFile
   * @name V1TrackfileDelete
   * @request DELETE:/api/v1/trackfile/{id}
   * @secure
   */
  v1TrackfileDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/trackfile/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags TrackFile
   * @name V1TrackfileList
   * @request GET:/api/v1/trackfile
   * @secure
   */
  v1TrackfileList = (
    query?: {
      /** @format int32 */
      artistId?: number;
      trackFileIds?: number[];
      albumId?: number[];
      unmapped?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<TrackFileResource[], any>({
      path: `/api/v1/trackfile`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags TrackFile
   * @name V1TrackfileEditorUpdate
   * @request PUT:/api/v1/trackfile/editor
   * @secure
   */
  v1TrackfileEditorUpdate = (data: TrackFileListResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/trackfile/editor`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags TrackFile
   * @name V1TrackfileBulkDelete
   * @request DELETE:/api/v1/trackfile/bulk
   * @secure
   */
  v1TrackfileBulkDelete = (data: TrackFileListResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/trackfile/bulk`,
      method: "DELETE",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags UiConfig
   * @name V1ConfigUiUpdate
   * @request PUT:/api/v1/config/ui/{id}
   * @secure
   */
  v1ConfigUiUpdate = (id: string, data: UiConfigResource, params: RequestParams = {}) =>
    this.http.request<UiConfigResource, any>({
      path: `/api/v1/config/ui/${id}`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags UiConfig
   * @name V1ConfigUiDetail
   * @request GET:/api/v1/config/ui/{id}
   * @secure
   */
  v1ConfigUiDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<UiConfigResource, any>({
      path: `/api/v1/config/ui/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags UiConfig
   * @name V1ConfigUiList
   * @request GET:/api/v1/config/ui
   * @secure
   */
  v1ConfigUiList = (params: RequestParams = {}) =>
    this.http.request<UiConfigResource, any>({
      path: `/api/v1/config/ui`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Update
   * @name V1UpdateList
   * @request GET:/api/v1/update
   * @secure
   */
  v1UpdateList = (params: RequestParams = {}) =>
    this.http.request<UpdateResource[], any>({
      path: `/api/v1/update`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags UpdateLogFile
   * @name V1LogFileUpdateList
   * @request GET:/api/v1/log/file/update
   * @secure
   */
  v1LogFileUpdateList = (params: RequestParams = {}) =>
    this.http.request<LogFileResource[], any>({
      path: `/api/v1/log/file/update`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags UpdateLogFile
   * @name V1LogFileUpdateDetail
   * @request GET:/api/v1/log/file/update/{filename}
   * @secure
   */
  v1LogFileUpdateDetail = (filename: string, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/log/file/update/${filename}`,
      method: "GET",
      secure: true,
      ...params,
    });
}
