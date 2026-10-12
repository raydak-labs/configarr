/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

import { ContentType, HttpClient, RequestParams } from "./../../ky-client";
import {
  ApiInfoResource,
  AutoTaggingResource,
  AutoTaggingSpecificationSchema,
  BackupResource,
  BackupRestoreErrorResource,
  BackupRestoreResource,
  BlocklistBulkResource,
  BlocklistResourcePagingResource,
  CalendarSubresource,
  CommandResource,
  ConnectionResource,
  CustomFilterResource,
  CustomFormatBulkResource,
  CustomFormatResource,
  CustomFormatSpecificationSchema,
  CutoffSubresource,
  DelayProfileResource,
  DiskSpaceResource,
  DownloadClientBulkResource,
  DownloadClientResource,
  DownloadClientSettingsResource,
  DownloadProtocol,
  EpisodeFileListResource,
  EpisodeFileResource,
  EpisodeHistoryEventType,
  EpisodeResource,
  EpisodeResourcePagingResource,
  EpisodeSubresource,
  EpisodesMonitoredResource,
  FileSystemMediaFileResource,
  FileSystemResult,
  FileSystemTypeResource,
  GeneralSettingsResource,
  HealthResource,
  HistoryResource,
  HistoryResourcePagingResource,
  HistorySubresource,
  ImportListBulkResource,
  ImportListExclusionBulkResource,
  ImportListExclusionResource,
  ImportListExclusionResourcePagingResource,
  ImportListResource,
  ImportListSettingsResource,
  IndexerBulkResource,
  IndexerFlagResource,
  IndexerResource,
  IndexerSettingsResource,
  LanguageResource,
  LocalizationLanguageResource,
  LocalizationResource,
  LogFileResource,
  LogResourcePagingResource,
  ManualImportReprocessResource,
  ManualImportResource,
  MediaManagementSettingsResource,
  MetadataResource,
  MetadataSourceSettingsResource,
  MissingSubresource,
  NamingExampleResource,
  NamingSettingsResource,
  ParseResource,
  ProviderTestAllResult,
  QualityDefinitionResource,
  QualityProfileResource,
  QueueBulkResource,
  QueueResource,
  QueueResourcePagingResource,
  QueueStatus,
  QueueStatusResource,
  QueueSubresource,
  ReleaseGrabResource,
  ReleaseProfileResource,
  ReleasePushResource,
  ReleaseResource,
  RemotePathMappingResource,
  RenameEpisodeResource,
  RootFolderResource,
  SeasonPassResource,
  SeasonResource,
  SeriesEditorResource,
  SeriesFolderResource,
  SeriesResource,
  SeriesSubresource,
  SeriesTypes,
  SkipValidation,
  SortDirection,
  StatisticsResource,
  SystemResource,
  SystemRestartResource,
  SystemShutdownResource,
  TagDetailsResource,
  TagResource,
  TaskResource,
  UiSettingsResource,
  UpdateResource,
  UpdateSettingsResource,
} from "./data-contracts";

export class Api<SecurityDataType = unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  /**
   * No description
   *
   * @tags ApiInfo
   * @name GetApi
   * @request GET:/api
   * @secure
   */
  getApi = (params: RequestParams = {}) =>
    this.http.request<ApiInfoResource, any>({
      path: `/api`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags AutoTagging
   * @name V5AutotaggingList
   * @request GET:/api/v5/autotagging
   * @secure
   */
  v5AutotaggingList = (params: RequestParams = {}) =>
    this.http.request<AutoTaggingResource[], any>({
      path: `/api/v5/autotagging`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags AutoTagging
   * @name V5AutotaggingCreate
   * @request POST:/api/v5/autotagging
   * @secure
   */
  v5AutotaggingCreate = (data: AutoTaggingResource, params: RequestParams = {}) =>
    this.http.request<AutoTaggingResource, void>({
      path: `/api/v5/autotagging`,
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
   * @name V5AutotaggingUpdate
   * @request PUT:/api/v5/autotagging/{id}
   * @secure
   */
  v5AutotaggingUpdate = (id: string, data: AutoTaggingResource, params: RequestParams = {}) =>
    this.http.request<AutoTaggingResource, void>({
      path: `/api/v5/autotagging/${id}`,
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
   * @name V5AutotaggingDelete
   * @request DELETE:/api/v5/autotagging/{id}
   * @secure
   */
  v5AutotaggingDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/autotagging/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags AutoTagging
   * @name V5AutotaggingDetail
   * @request GET:/api/v5/autotagging/{id}
   * @secure
   */
  v5AutotaggingDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<AutoTaggingResource, void>({
      path: `/api/v5/autotagging/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags AutoTagging
   * @name V5AutotaggingSchemaList
   * @request GET:/api/v5/autotagging/schema
   * @secure
   */
  v5AutotaggingSchemaList = (params: RequestParams = {}) =>
    this.http.request<AutoTaggingSpecificationSchema[], any>({
      path: `/api/v5/autotagging/schema`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Backup
   * @name V5SystemBackupList
   * @request GET:/api/v5/system/backup
   * @secure
   */
  v5SystemBackupList = (params: RequestParams = {}) =>
    this.http.request<BackupResource[], any>({
      path: `/api/v5/system/backup`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Backup
   * @name V5SystemBackupDelete
   * @request DELETE:/api/v5/system/backup/{id}
   * @secure
   */
  v5SystemBackupDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, void>({
      path: `/api/v5/system/backup/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Backup
   * @name V5SystemBackupRestoreCreate
   * @request POST:/api/v5/system/backup/restore/{id}
   * @secure
   */
  v5SystemBackupRestoreCreate = (id: number, params: RequestParams = {}) =>
    this.http.request<BackupRestoreResource, void>({
      path: `/api/v5/system/backup/restore/${id}`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Backup
   * @name V5SystemBackupRestoreUploadCreate
   * @request POST:/api/v5/system/backup/restore/upload
   * @secure
   */
  v5SystemBackupRestoreUploadCreate = (params: RequestParams = {}) =>
    this.http.request<BackupRestoreResource, BackupRestoreErrorResource>({
      path: `/api/v5/system/backup/restore/upload`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Blocklist
   * @name V5BlocklistList
   * @request GET:/api/v5/blocklist
   * @secure
   */
  v5BlocklistList = (
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
      seriesIds?: number[];
      protocols?: DownloadProtocol[];
    },
    params: RequestParams = {},
  ) =>
    this.http.request<BlocklistResourcePagingResource, any>({
      path: `/api/v5/blocklist`,
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
   * @name V5BlocklistDelete
   * @request DELETE:/api/v5/blocklist/{id}
   * @secure
   */
  v5BlocklistDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/blocklist/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Blocklist
   * @name V5BlocklistBulkDelete
   * @request DELETE:/api/v5/blocklist/bulk
   * @secure
   */
  v5BlocklistBulkDelete = (data: BlocklistBulkResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/blocklist/bulk`,
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
   * @name V5CalendarList
   * @request GET:/api/v5/calendar
   * @secure
   */
  v5CalendarList = (
    query?: {
      /** @format date-time */
      start?: string;
      /** @format date-time */
      end?: string;
      /** @default false */
      includeUnmonitored?: boolean;
      /** @default true */
      includeSpecials?: boolean;
      /** @default "" */
      tags?: string;
      includeSubresources?: CalendarSubresource[];
    },
    params: RequestParams = {},
  ) =>
    this.http.request<EpisodeResource[], any>({
      path: `/api/v5/calendar`,
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
   * @name V5CalendarDetail
   * @request GET:/api/v5/calendar/{id}
   * @secure
   */
  v5CalendarDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<EpisodeResource, void>({
      path: `/api/v5/calendar/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Command
   * @name V5CommandCreate
   * @request POST:/api/v5/command
   * @secure
   */
  v5CommandCreate = (data: CommandResource, params: RequestParams = {}) =>
    this.http.request<CommandResource, void>({
      path: `/api/v5/command`,
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
   * @name V5CommandList
   * @request GET:/api/v5/command
   * @secure
   */
  v5CommandList = (params: RequestParams = {}) =>
    this.http.request<CommandResource[], any>({
      path: `/api/v5/command`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Command
   * @name V5CommandDelete
   * @request DELETE:/api/v5/command/{id}
   * @secure
   */
  v5CommandDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/command/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Command
   * @name V5CommandDetail
   * @request GET:/api/v5/command/{id}
   * @secure
   */
  v5CommandDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<CommandResource, void>({
      path: `/api/v5/command/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Connection
   * @name V5ConnectionList
   * @request GET:/api/v5/connection
   * @secure
   */
  v5ConnectionList = (params: RequestParams = {}) =>
    this.http.request<ConnectionResource[], any>({
      path: `/api/v5/connection`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Connection
   * @name V5ConnectionCreate
   * @request POST:/api/v5/connection
   * @secure
   */
  v5ConnectionCreate = (
    data: ConnectionResource,
    query?: {
      /** @default false */
      skipTesting?: boolean;
      skipValidation?: SkipValidation;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<ConnectionResource, void>({
      path: `/api/v5/connection`,
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
   * @tags Connection
   * @name V5ConnectionUpdate
   * @request PUT:/api/v5/connection/{id}
   * @secure
   */
  v5ConnectionUpdate = (
    id: number,
    data: ConnectionResource,
    query?: {
      /** @default false */
      skipTesting?: boolean;
      skipValidation?: SkipValidation;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<ConnectionResource, void>({
      path: `/api/v5/connection/${id}`,
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
   * @tags Connection
   * @name V5ConnectionDelete
   * @request DELETE:/api/v5/connection/{id}
   * @secure
   */
  v5ConnectionDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/connection/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Connection
   * @name V5ConnectionDetail
   * @request GET:/api/v5/connection/{id}
   * @secure
   */
  v5ConnectionDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<ConnectionResource, void>({
      path: `/api/v5/connection/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Connection
   * @name V5ConnectionSchemaList
   * @request GET:/api/v5/connection/schema
   * @secure
   */
  v5ConnectionSchemaList = (params: RequestParams = {}) =>
    this.http.request<ConnectionResource[], any>({
      path: `/api/v5/connection/schema`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Connection
   * @name V5ConnectionTestCreate
   * @request POST:/api/v5/connection/test
   * @secure
   */
  v5ConnectionTestCreate = (
    data: ConnectionResource,
    query?: {
      skipValidation?: SkipValidation;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/api/v5/connection/test`,
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
   * @tags Connection
   * @name V5ConnectionTestallCreate
   * @request POST:/api/v5/connection/testall
   * @secure
   */
  v5ConnectionTestallCreate = (params: RequestParams = {}) =>
    this.http.request<ProviderTestAllResult[], ProviderTestAllResult[]>({
      path: `/api/v5/connection/testall`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Connection
   * @name V5ConnectionActionCreate
   * @request POST:/api/v5/connection/action/{name}
   * @secure
   */
  v5ConnectionActionCreate = (name: string, data: ConnectionResource, params: RequestParams = {}) =>
    this.http.request<any, void>({
      path: `/api/v5/connection/action/${name}`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags CustomFilter
   * @name V5CustomfilterList
   * @request GET:/api/v5/customfilter
   * @secure
   */
  v5CustomfilterList = (params: RequestParams = {}) =>
    this.http.request<CustomFilterResource[], any>({
      path: `/api/v5/customfilter`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags CustomFilter
   * @name V5CustomfilterCreate
   * @request POST:/api/v5/customfilter
   * @secure
   */
  v5CustomfilterCreate = (data: CustomFilterResource, params: RequestParams = {}) =>
    this.http.request<CustomFilterResource, void>({
      path: `/api/v5/customfilter`,
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
   * @tags CustomFilter
   * @name V5CustomfilterUpdate
   * @request PUT:/api/v5/customfilter/{id}
   * @secure
   */
  v5CustomfilterUpdate = (id: string, data: CustomFilterResource, params: RequestParams = {}) =>
    this.http.request<CustomFilterResource, void>({
      path: `/api/v5/customfilter/${id}`,
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
   * @name V5CustomfilterDelete
   * @request DELETE:/api/v5/customfilter/{id}
   * @secure
   */
  v5CustomfilterDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/customfilter/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags CustomFilter
   * @name V5CustomfilterDetail
   * @request GET:/api/v5/customfilter/{id}
   * @secure
   */
  v5CustomfilterDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<CustomFilterResource, void>({
      path: `/api/v5/customfilter/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags CustomFormat
   * @name V5CustomformatList
   * @request GET:/api/v5/customformat
   * @secure
   */
  v5CustomformatList = (params: RequestParams = {}) =>
    this.http.request<CustomFormatResource[], any>({
      path: `/api/v5/customformat`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags CustomFormat
   * @name V5CustomformatCreate
   * @request POST:/api/v5/customformat
   * @secure
   */
  v5CustomformatCreate = (data: CustomFormatResource, params: RequestParams = {}) =>
    this.http.request<CustomFormatResource, void>({
      path: `/api/v5/customformat`,
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
   * @name V5CustomformatUpdate
   * @request PUT:/api/v5/customformat/{id}
   * @secure
   */
  v5CustomformatUpdate = (id: string, data: CustomFormatResource, params: RequestParams = {}) =>
    this.http.request<CustomFormatResource, void>({
      path: `/api/v5/customformat/${id}`,
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
   * @name V5CustomformatDelete
   * @request DELETE:/api/v5/customformat/{id}
   * @secure
   */
  v5CustomformatDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/customformat/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags CustomFormat
   * @name V5CustomformatDetail
   * @request GET:/api/v5/customformat/{id}
   * @secure
   */
  v5CustomformatDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<CustomFormatResource, void>({
      path: `/api/v5/customformat/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags CustomFormat
   * @name V5CustomformatBulkUpdate
   * @request PUT:/api/v5/customformat/bulk
   * @secure
   */
  v5CustomformatBulkUpdate = (data: CustomFormatBulkResource, params: RequestParams = {}) =>
    this.http.request<CustomFormatResource[], any>({
      path: `/api/v5/customformat/bulk`,
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
   * @name V5CustomformatBulkDelete
   * @request DELETE:/api/v5/customformat/bulk
   * @secure
   */
  v5CustomformatBulkDelete = (data: CustomFormatBulkResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/customformat/bulk`,
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
   * @name V5CustomformatSchemaList
   * @request GET:/api/v5/customformat/schema
   * @secure
   */
  v5CustomformatSchemaList = (params: RequestParams = {}) =>
    this.http.request<CustomFormatSpecificationSchema[], any>({
      path: `/api/v5/customformat/schema`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Cutoff
   * @name V5WantedCutoffList
   * @request GET:/api/v5/wanted/cutoff
   * @secure
   */
  v5WantedCutoffList = (
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
      /** @default true */
      monitored?: boolean;
      seriesIds?: number[];
      qualityProfileIds?: number[];
      seriesType?: SeriesTypes[];
      /** @uniqueItems true */
      seriesTags?: number[];
      quality?: number[];
      includeSubresources?: CutoffSubresource[];
    },
    params: RequestParams = {},
  ) =>
    this.http.request<EpisodeResourcePagingResource, any>({
      path: `/api/v5/wanted/cutoff`,
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
   * @name V5WantedCutoffDetail
   * @request GET:/api/v5/wanted/cutoff/{id}
   * @secure
   */
  v5WantedCutoffDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<EpisodeResource, void>({
      path: `/api/v5/wanted/cutoff/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DelayProfile
   * @name V5DelayprofileCreate
   * @request POST:/api/v5/delayprofile
   * @secure
   */
  v5DelayprofileCreate = (data: DelayProfileResource, params: RequestParams = {}) =>
    this.http.request<DelayProfileResource, void>({
      path: `/api/v5/delayprofile`,
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
   * @name V5DelayprofileList
   * @request GET:/api/v5/delayprofile
   * @secure
   */
  v5DelayprofileList = (params: RequestParams = {}) =>
    this.http.request<DelayProfileResource[], any>({
      path: `/api/v5/delayprofile`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DelayProfile
   * @name V5DelayprofileDelete
   * @request DELETE:/api/v5/delayprofile/{id}
   * @secure
   */
  v5DelayprofileDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/delayprofile/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags DelayProfile
   * @name V5DelayprofileUpdate
   * @request PUT:/api/v5/delayprofile/{id}
   * @secure
   */
  v5DelayprofileUpdate = (id: string, data: DelayProfileResource, params: RequestParams = {}) =>
    this.http.request<DelayProfileResource, void>({
      path: `/api/v5/delayprofile/${id}`,
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
   * @name V5DelayprofileDetail
   * @request GET:/api/v5/delayprofile/{id}
   * @secure
   */
  v5DelayprofileDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<DelayProfileResource, void>({
      path: `/api/v5/delayprofile/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DelayProfile
   * @name V5DelayprofileReorderUpdate
   * @request PUT:/api/v5/delayprofile/reorder/{id}
   * @secure
   */
  v5DelayprofileReorderUpdate = (
    id: number,
    query?: {
      /** @format int32 */
      after?: number;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<DelayProfileResource[], any>({
      path: `/api/v5/delayprofile/reorder/${id}`,
      method: "PUT",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DiskSpace
   * @name V5DiskspaceList
   * @request GET:/api/v5/diskspace
   * @secure
   */
  v5DiskspaceList = (params: RequestParams = {}) =>
    this.http.request<DiskSpaceResource[], any>({
      path: `/api/v5/diskspace`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DownloadClient
   * @name V5DownloadclientList
   * @request GET:/api/v5/downloadclient
   * @secure
   */
  v5DownloadclientList = (params: RequestParams = {}) =>
    this.http.request<DownloadClientResource[], any>({
      path: `/api/v5/downloadclient`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DownloadClient
   * @name V5DownloadclientCreate
   * @request POST:/api/v5/downloadclient
   * @secure
   */
  v5DownloadclientCreate = (
    data: DownloadClientResource,
    query?: {
      /** @default false */
      skipTesting?: boolean;
      skipValidation?: SkipValidation;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<DownloadClientResource, void>({
      path: `/api/v5/downloadclient`,
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
   * @name V5DownloadclientUpdate
   * @request PUT:/api/v5/downloadclient/{id}
   * @secure
   */
  v5DownloadclientUpdate = (
    id: number,
    data: DownloadClientResource,
    query?: {
      /** @default false */
      skipTesting?: boolean;
      skipValidation?: SkipValidation;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<DownloadClientResource, void>({
      path: `/api/v5/downloadclient/${id}`,
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
   * @name V5DownloadclientDelete
   * @request DELETE:/api/v5/downloadclient/{id}
   * @secure
   */
  v5DownloadclientDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/downloadclient/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags DownloadClient
   * @name V5DownloadclientDetail
   * @request GET:/api/v5/downloadclient/{id}
   * @secure
   */
  v5DownloadclientDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<DownloadClientResource, void>({
      path: `/api/v5/downloadclient/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DownloadClient
   * @name V5DownloadclientBulkUpdate
   * @request PUT:/api/v5/downloadclient/bulk
   * @secure
   */
  v5DownloadclientBulkUpdate = (data: DownloadClientBulkResource, params: RequestParams = {}) =>
    this.http.request<DownloadClientResource[], void>({
      path: `/api/v5/downloadclient/bulk`,
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
   * @name V5DownloadclientBulkDelete
   * @request DELETE:/api/v5/downloadclient/bulk
   * @secure
   */
  v5DownloadclientBulkDelete = (data: DownloadClientBulkResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/downloadclient/bulk`,
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
   * @name V5DownloadclientSchemaList
   * @request GET:/api/v5/downloadclient/schema
   * @secure
   */
  v5DownloadclientSchemaList = (params: RequestParams = {}) =>
    this.http.request<DownloadClientResource[], any>({
      path: `/api/v5/downloadclient/schema`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DownloadClient
   * @name V5DownloadclientTestCreate
   * @request POST:/api/v5/downloadclient/test
   * @secure
   */
  v5DownloadclientTestCreate = (
    data: DownloadClientResource,
    query?: {
      skipValidation?: SkipValidation;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/api/v5/downloadclient/test`,
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
   * @name V5DownloadclientTestallCreate
   * @request POST:/api/v5/downloadclient/testall
   * @secure
   */
  v5DownloadclientTestallCreate = (params: RequestParams = {}) =>
    this.http.request<ProviderTestAllResult[], ProviderTestAllResult[]>({
      path: `/api/v5/downloadclient/testall`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DownloadClient
   * @name V5DownloadclientActionCreate
   * @request POST:/api/v5/downloadclient/action/{name}
   * @secure
   */
  v5DownloadclientActionCreate = (name: string, data: DownloadClientResource, params: RequestParams = {}) =>
    this.http.request<any, void>({
      path: `/api/v5/downloadclient/action/${name}`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags DownloadClientSettings
   * @name V5SettingsDownloadclientList
   * @request GET:/api/v5/settings/downloadclient
   * @secure
   */
  v5SettingsDownloadclientList = (params: RequestParams = {}) =>
    this.http.request<DownloadClientSettingsResource, any>({
      path: `/api/v5/settings/downloadclient`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DownloadClientSettings
   * @name V5SettingsDownloadclientUpdate
   * @request PUT:/api/v5/settings/downloadclient/{id}
   * @secure
   */
  v5SettingsDownloadclientUpdate = (id: string, data: DownloadClientSettingsResource, params: RequestParams = {}) =>
    this.http.request<DownloadClientSettingsResource, void>({
      path: `/api/v5/settings/downloadclient/${id}`,
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
   * @tags DownloadClientSettings
   * @name V5SettingsDownloadclientDetail
   * @request GET:/api/v5/settings/downloadclient/{id}
   * @secure
   */
  v5SettingsDownloadclientDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<DownloadClientSettingsResource, void>({
      path: `/api/v5/settings/downloadclient/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Episode
   * @name V5EpisodeList
   * @request GET:/api/v5/episode
   * @secure
   */
  v5EpisodeList = (
    query?: {
      /** @format int32 */
      seriesId?: number;
      /** @format int32 */
      seasonNumber?: number;
      episodeIds?: number[];
      /** @format int32 */
      episodeFileId?: number;
      includeSubresources?: EpisodeSubresource[];
    },
    params: RequestParams = {},
  ) =>
    this.http.request<EpisodeResource[], void>({
      path: `/api/v5/episode`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Episode
   * @name V5EpisodeUpdate
   * @request PUT:/api/v5/episode/{id}
   * @secure
   */
  v5EpisodeUpdate = (id: number, data: EpisodeResource, params: RequestParams = {}) =>
    this.http.request<EpisodeResource, any>({
      path: `/api/v5/episode/${id}`,
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
   * @tags Episode
   * @name V5EpisodeDetail
   * @request GET:/api/v5/episode/{id}
   * @secure
   */
  v5EpisodeDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<EpisodeResource, void>({
      path: `/api/v5/episode/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Episode
   * @name V5EpisodeMonitorUpdate
   * @request PUT:/api/v5/episode/monitor
   * @secure
   */
  v5EpisodeMonitorUpdate = (
    data: EpisodesMonitoredResource,
    query?: {
      includeSubresources?: EpisodeSubresource[];
    },
    params: RequestParams = {},
  ) =>
    this.http.request<EpisodeResource[], any>({
      path: `/api/v5/episode/monitor`,
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
   * @tags EpisodeFile
   * @name V5EpisodefileList
   * @request GET:/api/v5/episodefile
   * @secure
   */
  v5EpisodefileList = (
    query?: {
      /** @format int32 */
      seriesId?: number;
      episodeFileIds?: number[];
    },
    params: RequestParams = {},
  ) =>
    this.http.request<EpisodeFileResource[], void>({
      path: `/api/v5/episodefile`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags EpisodeFile
   * @name V5EpisodefileUpdate
   * @request PUT:/api/v5/episodefile/{id}
   * @secure
   */
  v5EpisodefileUpdate = (id: string, data: EpisodeFileResource, params: RequestParams = {}) =>
    this.http.request<EpisodeFileResource, void>({
      path: `/api/v5/episodefile/${id}`,
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
   * @tags EpisodeFile
   * @name V5EpisodefileDelete
   * @request DELETE:/api/v5/episodefile/{id}
   * @secure
   */
  v5EpisodefileDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, void>({
      path: `/api/v5/episodefile/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags EpisodeFile
   * @name V5EpisodefileDetail
   * @request GET:/api/v5/episodefile/{id}
   * @secure
   */
  v5EpisodefileDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<EpisodeFileResource, void>({
      path: `/api/v5/episodefile/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags EpisodeFile
   * @name V5EpisodefileBulkDelete
   * @request DELETE:/api/v5/episodefile/bulk
   * @secure
   */
  v5EpisodefileBulkDelete = (data: EpisodeFileListResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/episodefile/bulk`,
      method: "DELETE",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags EpisodeFile
   * @name V5EpisodefileBulkUpdate
   * @request PUT:/api/v5/episodefile/bulk
   * @secure
   */
  v5EpisodefileBulkUpdate = (data: EpisodeFileResource[], params: RequestParams = {}) =>
    this.http.request<EpisodeFileResource[], any>({
      path: `/api/v5/episodefile/bulk`,
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
   * @tags FileSystem
   * @name V5FilesystemList
   * @request GET:/api/v5/filesystem
   * @secure
   */
  v5FilesystemList = (
    query?: {
      path?: string;
      /** @default false */
      includeFiles?: boolean;
      /** @default false */
      allowFoldersWithoutTrailingSlashes?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<FileSystemResult, any>({
      path: `/api/v5/filesystem`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags FileSystem
   * @name V5FilesystemTypeList
   * @request GET:/api/v5/filesystem/type
   * @secure
   */
  v5FilesystemTypeList = (
    query?: {
      path?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<FileSystemTypeResource, any>({
      path: `/api/v5/filesystem/type`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags FileSystem
   * @name V5FilesystemMediafilesList
   * @request GET:/api/v5/filesystem/mediafiles
   * @secure
   */
  v5FilesystemMediafilesList = (
    query?: {
      path?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<FileSystemMediaFileResource[], any>({
      path: `/api/v5/filesystem/mediafiles`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags GeneralSettings
   * @name V5SettingsGeneralUpdate
   * @request PUT:/api/v5/settings/general/{id}
   * @secure
   */
  v5SettingsGeneralUpdate = (id: string, data: GeneralSettingsResource, params: RequestParams = {}) =>
    this.http.request<GeneralSettingsResource, void>({
      path: `/api/v5/settings/general/${id}`,
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
   * @tags GeneralSettings
   * @name V5SettingsGeneralDetail
   * @request GET:/api/v5/settings/general/{id}
   * @secure
   */
  v5SettingsGeneralDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<GeneralSettingsResource, void>({
      path: `/api/v5/settings/general/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags GeneralSettings
   * @name V5SettingsGeneralList
   * @request GET:/api/v5/settings/general
   * @secure
   */
  v5SettingsGeneralList = (params: RequestParams = {}) =>
    this.http.request<GeneralSettingsResource, any>({
      path: `/api/v5/settings/general`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Health
   * @name V5HealthList
   * @request GET:/api/v5/health
   * @secure
   */
  v5HealthList = (params: RequestParams = {}) =>
    this.http.request<HealthResource[], any>({
      path: `/api/v5/health`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags History
   * @name V5HistoryList
   * @request GET:/api/v5/history
   * @secure
   */
  v5HistoryList = (
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
      eventType?: number[];
      /** @format int32 */
      episodeId?: number;
      downloadId?: string;
      seriesIds?: number[];
      languages?: number[];
      quality?: number[];
      includeSubresources?: HistorySubresource[];
    },
    params: RequestParams = {},
  ) =>
    this.http.request<HistoryResourcePagingResource, any>({
      path: `/api/v5/history`,
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
   * @name V5HistorySinceList
   * @request GET:/api/v5/history/since
   * @secure
   */
  v5HistorySinceList = (
    query?: {
      /** @format date-time */
      date?: string;
      eventType?: EpisodeHistoryEventType;
      includeSubresources?: HistorySubresource[];
    },
    params: RequestParams = {},
  ) =>
    this.http.request<HistoryResource[], any>({
      path: `/api/v5/history/since`,
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
   * @name V5HistorySeriesList
   * @request GET:/api/v5/history/series
   * @secure
   */
  v5HistorySeriesList = (
    query?: {
      /** @format int32 */
      seriesId?: number;
      eventType?: EpisodeHistoryEventType;
      includeSubresources?: HistorySubresource[];
    },
    params: RequestParams = {},
  ) =>
    this.http.request<HistoryResource[], any>({
      path: `/api/v5/history/series`,
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
   * @name V5HistorySeasonList
   * @request GET:/api/v5/history/season
   * @secure
   */
  v5HistorySeasonList = (
    query?: {
      /** @format int32 */
      seriesId?: number;
      /** @format int32 */
      seasonNumber?: number;
      eventType?: EpisodeHistoryEventType;
      includeSubresources?: HistorySubresource[];
    },
    params: RequestParams = {},
  ) =>
    this.http.request<HistoryResource[], any>({
      path: `/api/v5/history/season`,
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
   * @name V5HistoryEpisodeList
   * @request GET:/api/v5/history/episode
   * @secure
   */
  v5HistoryEpisodeList = (
    query?: {
      /** @format int32 */
      episodeId?: number;
      eventType?: EpisodeHistoryEventType;
      includeSubresources?: HistorySubresource[];
    },
    params: RequestParams = {},
  ) =>
    this.http.request<HistoryResource[], any>({
      path: `/api/v5/history/episode`,
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
   * @name V5HistoryFailedCreate
   * @request POST:/api/v5/history/failed/{id}
   * @secure
   */
  v5HistoryFailedCreate = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/history/failed/${id}`,
      method: "POST",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportList
   * @name V5ImportlistList
   * @request GET:/api/v5/importlist
   * @secure
   */
  v5ImportlistList = (params: RequestParams = {}) =>
    this.http.request<ImportListResource[], any>({
      path: `/api/v5/importlist`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportList
   * @name V5ImportlistCreate
   * @request POST:/api/v5/importlist
   * @secure
   */
  v5ImportlistCreate = (
    data: ImportListResource,
    query?: {
      /** @default false */
      skipTesting?: boolean;
      skipValidation?: SkipValidation;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<ImportListResource, void>({
      path: `/api/v5/importlist`,
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
   * @name V5ImportlistUpdate
   * @request PUT:/api/v5/importlist/{id}
   * @secure
   */
  v5ImportlistUpdate = (
    id: number,
    data: ImportListResource,
    query?: {
      /** @default false */
      skipTesting?: boolean;
      skipValidation?: SkipValidation;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<ImportListResource, void>({
      path: `/api/v5/importlist/${id}`,
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
   * @name V5ImportlistDelete
   * @request DELETE:/api/v5/importlist/{id}
   * @secure
   */
  v5ImportlistDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/importlist/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportList
   * @name V5ImportlistDetail
   * @request GET:/api/v5/importlist/{id}
   * @secure
   */
  v5ImportlistDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<ImportListResource, void>({
      path: `/api/v5/importlist/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportList
   * @name V5ImportlistBulkUpdate
   * @request PUT:/api/v5/importlist/bulk
   * @secure
   */
  v5ImportlistBulkUpdate = (data: ImportListBulkResource, params: RequestParams = {}) =>
    this.http.request<ImportListResource[], void>({
      path: `/api/v5/importlist/bulk`,
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
   * @name V5ImportlistBulkDelete
   * @request DELETE:/api/v5/importlist/bulk
   * @secure
   */
  v5ImportlistBulkDelete = (data: ImportListBulkResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/importlist/bulk`,
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
   * @name V5ImportlistSchemaList
   * @request GET:/api/v5/importlist/schema
   * @secure
   */
  v5ImportlistSchemaList = (params: RequestParams = {}) =>
    this.http.request<ImportListResource[], any>({
      path: `/api/v5/importlist/schema`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportList
   * @name V5ImportlistTestCreate
   * @request POST:/api/v5/importlist/test
   * @secure
   */
  v5ImportlistTestCreate = (
    data: ImportListResource,
    query?: {
      skipValidation?: SkipValidation;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/api/v5/importlist/test`,
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
   * @name V5ImportlistTestallCreate
   * @request POST:/api/v5/importlist/testall
   * @secure
   */
  v5ImportlistTestallCreate = (params: RequestParams = {}) =>
    this.http.request<ProviderTestAllResult[], ProviderTestAllResult[]>({
      path: `/api/v5/importlist/testall`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportList
   * @name V5ImportlistActionCreate
   * @request POST:/api/v5/importlist/action/{name}
   * @secure
   */
  v5ImportlistActionCreate = (name: string, data: ImportListResource, params: RequestParams = {}) =>
    this.http.request<any, void>({
      path: `/api/v5/importlist/action/${name}`,
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
   * @name V5ImportlistexclusionList
   * @request GET:/api/v5/importlistexclusion
   * @secure
   */
  v5ImportlistexclusionList = (
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
    this.http.request<ImportListExclusionResourcePagingResource, any>({
      path: `/api/v5/importlistexclusion`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportListExclusion
   * @name V5ImportlistexclusionCreate
   * @request POST:/api/v5/importlistexclusion
   * @secure
   */
  v5ImportlistexclusionCreate = (data: ImportListExclusionResource, params: RequestParams = {}) =>
    this.http.request<ImportListExclusionResource, void>({
      path: `/api/v5/importlistexclusion`,
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
   * @tags ImportListExclusion
   * @name V5ImportlistexclusionUpdate
   * @request PUT:/api/v5/importlistexclusion/{id}
   * @secure
   */
  v5ImportlistexclusionUpdate = (id: string, data: ImportListExclusionResource, params: RequestParams = {}) =>
    this.http.request<ImportListExclusionResource, void>({
      path: `/api/v5/importlistexclusion/${id}`,
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
   * @name V5ImportlistexclusionDelete
   * @request DELETE:/api/v5/importlistexclusion/{id}
   * @secure
   */
  v5ImportlistexclusionDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/importlistexclusion/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportListExclusion
   * @name V5ImportlistexclusionDetail
   * @request GET:/api/v5/importlistexclusion/{id}
   * @secure
   */
  v5ImportlistexclusionDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<ImportListExclusionResource, void>({
      path: `/api/v5/importlistexclusion/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportListExclusion
   * @name V5ImportlistexclusionBulkDelete
   * @request DELETE:/api/v5/importlistexclusion/bulk
   * @secure
   */
  v5ImportlistexclusionBulkDelete = (data: ImportListExclusionBulkResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/importlistexclusion/bulk`,
      method: "DELETE",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportListSettings
   * @name V5SettingsImportlistList
   * @request GET:/api/v5/settings/importlist
   * @secure
   */
  v5SettingsImportlistList = (params: RequestParams = {}) =>
    this.http.request<ImportListSettingsResource, any>({
      path: `/api/v5/settings/importlist`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ImportListSettings
   * @name V5SettingsImportlistUpdate
   * @request PUT:/api/v5/settings/importlist/{id}
   * @secure
   */
  v5SettingsImportlistUpdate = (id: string, data: ImportListSettingsResource, params: RequestParams = {}) =>
    this.http.request<ImportListSettingsResource, void>({
      path: `/api/v5/settings/importlist/${id}`,
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
   * @tags ImportListSettings
   * @name V5SettingsImportlistDetail
   * @request GET:/api/v5/settings/importlist/{id}
   * @secure
   */
  v5SettingsImportlistDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<ImportListSettingsResource, void>({
      path: `/api/v5/settings/importlist/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Indexer
   * @name V5IndexerList
   * @request GET:/api/v5/indexer
   * @secure
   */
  v5IndexerList = (params: RequestParams = {}) =>
    this.http.request<IndexerResource[], any>({
      path: `/api/v5/indexer`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Indexer
   * @name V5IndexerCreate
   * @request POST:/api/v5/indexer
   * @secure
   */
  v5IndexerCreate = (
    data: IndexerResource,
    query?: {
      /** @default false */
      skipTesting?: boolean;
      skipValidation?: SkipValidation;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<IndexerResource, void>({
      path: `/api/v5/indexer`,
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
   * @name V5IndexerUpdate
   * @request PUT:/api/v5/indexer/{id}
   * @secure
   */
  v5IndexerUpdate = (
    id: number,
    data: IndexerResource,
    query?: {
      /** @default false */
      skipTesting?: boolean;
      skipValidation?: SkipValidation;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<IndexerResource, void>({
      path: `/api/v5/indexer/${id}`,
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
   * @name V5IndexerDelete
   * @request DELETE:/api/v5/indexer/{id}
   * @secure
   */
  v5IndexerDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/indexer/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Indexer
   * @name V5IndexerDetail
   * @request GET:/api/v5/indexer/{id}
   * @secure
   */
  v5IndexerDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<IndexerResource, void>({
      path: `/api/v5/indexer/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Indexer
   * @name V5IndexerBulkUpdate
   * @request PUT:/api/v5/indexer/bulk
   * @secure
   */
  v5IndexerBulkUpdate = (data: IndexerBulkResource, params: RequestParams = {}) =>
    this.http.request<IndexerResource[], void>({
      path: `/api/v5/indexer/bulk`,
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
   * @name V5IndexerBulkDelete
   * @request DELETE:/api/v5/indexer/bulk
   * @secure
   */
  v5IndexerBulkDelete = (data: IndexerBulkResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/indexer/bulk`,
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
   * @name V5IndexerSchemaList
   * @request GET:/api/v5/indexer/schema
   * @secure
   */
  v5IndexerSchemaList = (params: RequestParams = {}) =>
    this.http.request<IndexerResource[], any>({
      path: `/api/v5/indexer/schema`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Indexer
   * @name V5IndexerTestCreate
   * @request POST:/api/v5/indexer/test
   * @secure
   */
  v5IndexerTestCreate = (
    data: IndexerResource,
    query?: {
      skipValidation?: SkipValidation;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/api/v5/indexer/test`,
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
   * @name V5IndexerTestallCreate
   * @request POST:/api/v5/indexer/testall
   * @secure
   */
  v5IndexerTestallCreate = (params: RequestParams = {}) =>
    this.http.request<ProviderTestAllResult[], ProviderTestAllResult[]>({
      path: `/api/v5/indexer/testall`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Indexer
   * @name V5IndexerActionCreate
   * @request POST:/api/v5/indexer/action/{name}
   * @secure
   */
  v5IndexerActionCreate = (name: string, data: IndexerResource, params: RequestParams = {}) =>
    this.http.request<any, void>({
      path: `/api/v5/indexer/action/${name}`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags IndexerFlag
   * @name V5IndexerflagList
   * @request GET:/api/v5/indexerflag
   * @secure
   */
  v5IndexerflagList = (params: RequestParams = {}) =>
    this.http.request<IndexerFlagResource[], any>({
      path: `/api/v5/indexerflag`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags IndexerSettings
   * @name V5SettingsIndexerList
   * @request GET:/api/v5/settings/indexer
   * @secure
   */
  v5SettingsIndexerList = (params: RequestParams = {}) =>
    this.http.request<IndexerSettingsResource, any>({
      path: `/api/v5/settings/indexer`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags IndexerSettings
   * @name V5SettingsIndexerUpdate
   * @request PUT:/api/v5/settings/indexer/{id}
   * @secure
   */
  v5SettingsIndexerUpdate = (id: string, data: IndexerSettingsResource, params: RequestParams = {}) =>
    this.http.request<IndexerSettingsResource, void>({
      path: `/api/v5/settings/indexer/${id}`,
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
   * @tags IndexerSettings
   * @name V5SettingsIndexerDetail
   * @request GET:/api/v5/settings/indexer/{id}
   * @secure
   */
  v5SettingsIndexerDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<IndexerSettingsResource, void>({
      path: `/api/v5/settings/indexer/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Language
   * @name V5LanguageList
   * @request GET:/api/v5/language
   * @secure
   */
  v5LanguageList = (params: RequestParams = {}) =>
    this.http.request<LanguageResource[], any>({
      path: `/api/v5/language`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Language
   * @name V5LanguageDetail
   * @request GET:/api/v5/language/{id}
   * @secure
   */
  v5LanguageDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<LanguageResource, void>({
      path: `/api/v5/language/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Localization
   * @name V5LocalizationList
   * @request GET:/api/v5/localization
   * @secure
   */
  v5LocalizationList = (params: RequestParams = {}) =>
    this.http.request<LocalizationResource, any>({
      path: `/api/v5/localization`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Localization
   * @name V5LocalizationLanguageList
   * @request GET:/api/v5/localization/language
   * @secure
   */
  v5LocalizationLanguageList = (params: RequestParams = {}) =>
    this.http.request<LocalizationLanguageResource, any>({
      path: `/api/v5/localization/language`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Localization
   * @name V5LocalizationDetail
   * @request GET:/api/v5/localization/{id}
   * @secure
   */
  v5LocalizationDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<LocalizationResource, void>({
      path: `/api/v5/localization/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Log
   * @name V5LogList
   * @request GET:/api/v5/log
   * @secure
   */
  v5LogList = (
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
      path: `/api/v5/log`,
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
   * @name V5LogFileList
   * @request GET:/api/v5/log/file
   * @secure
   */
  v5LogFileList = (params: RequestParams = {}) =>
    this.http.request<LogFileResource[], any>({
      path: `/api/v5/log/file`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags LogFile
   * @name V5LogFileDetail
   * @request GET:/api/v5/log/file/{filename}
   * @secure
   */
  v5LogFileDetail = (filename: string, params: RequestParams = {}) =>
    this.http.request<string, void>({
      path: `/api/v5/log/file/${filename}`,
      method: "GET",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags ManualImport
   * @name V5ManualimportList
   * @request GET:/api/v5/manualimport
   * @secure
   */
  v5ManualimportList = (
    query?: {
      folder?: string;
      /** @format int32 */
      seriesId?: number;
      /** @format int32 */
      seasonNumber?: number;
      downloadIds?: string[];
      /** @default true */
      filterExistingFiles?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<ManualImportResource[], any>({
      path: `/api/v5/manualimport`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ManualImport
   * @name V5ManualimportCreate
   * @request POST:/api/v5/manualimport
   * @secure
   */
  v5ManualimportCreate = (data: ManualImportReprocessResource[], params: RequestParams = {}) =>
    this.http.request<ManualImportResource[], void>({
      path: `/api/v5/manualimport`,
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
   * @tags MediaCover
   * @name V5MediacoverDetail
   * @request GET:/api/v5/mediacover/{seriesId}/{filename}
   * @secure
   */
  v5MediacoverDetail = (seriesId: number, filename: string, params: RequestParams = {}) =>
    this.http.request<any, void>({
      path: `/api/v5/mediacover/${seriesId}/${filename}`,
      method: "GET",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags MediaManagementSettings
   * @name V5SettingsMediamanagementList
   * @request GET:/api/v5/settings/mediamanagement
   * @secure
   */
  v5SettingsMediamanagementList = (params: RequestParams = {}) =>
    this.http.request<MediaManagementSettingsResource, any>({
      path: `/api/v5/settings/mediamanagement`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags MediaManagementSettings
   * @name V5SettingsMediamanagementUpdate
   * @request PUT:/api/v5/settings/mediamanagement/{id}
   * @secure
   */
  v5SettingsMediamanagementUpdate = (id: string, data: MediaManagementSettingsResource, params: RequestParams = {}) =>
    this.http.request<MediaManagementSettingsResource, void>({
      path: `/api/v5/settings/mediamanagement/${id}`,
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
   * @tags MediaManagementSettings
   * @name V5SettingsMediamanagementDetail
   * @request GET:/api/v5/settings/mediamanagement/{id}
   * @secure
   */
  v5SettingsMediamanagementDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<MediaManagementSettingsResource, void>({
      path: `/api/v5/settings/mediamanagement/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Metadata
   * @name V5MetadataList
   * @request GET:/api/v5/metadata
   * @secure
   */
  v5MetadataList = (params: RequestParams = {}) =>
    this.http.request<MetadataResource[], any>({
      path: `/api/v5/metadata`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Metadata
   * @name V5MetadataCreate
   * @request POST:/api/v5/metadata
   * @secure
   */
  v5MetadataCreate = (
    data: MetadataResource,
    query?: {
      /** @default false */
      skipTesting?: boolean;
      skipValidation?: SkipValidation;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<MetadataResource, void>({
      path: `/api/v5/metadata`,
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
   * @name V5MetadataUpdate
   * @request PUT:/api/v5/metadata/{id}
   * @secure
   */
  v5MetadataUpdate = (
    id: number,
    data: MetadataResource,
    query?: {
      /** @default false */
      skipTesting?: boolean;
      skipValidation?: SkipValidation;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<MetadataResource, void>({
      path: `/api/v5/metadata/${id}`,
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
   * @name V5MetadataDelete
   * @request DELETE:/api/v5/metadata/{id}
   * @secure
   */
  v5MetadataDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/metadata/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Metadata
   * @name V5MetadataDetail
   * @request GET:/api/v5/metadata/{id}
   * @secure
   */
  v5MetadataDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<MetadataResource, void>({
      path: `/api/v5/metadata/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Metadata
   * @name V5MetadataSchemaList
   * @request GET:/api/v5/metadata/schema
   * @secure
   */
  v5MetadataSchemaList = (params: RequestParams = {}) =>
    this.http.request<MetadataResource[], any>({
      path: `/api/v5/metadata/schema`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Metadata
   * @name V5MetadataTestCreate
   * @request POST:/api/v5/metadata/test
   * @secure
   */
  v5MetadataTestCreate = (
    data: MetadataResource,
    query?: {
      skipValidation?: SkipValidation;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/api/v5/metadata/test`,
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
   * @name V5MetadataTestallCreate
   * @request POST:/api/v5/metadata/testall
   * @secure
   */
  v5MetadataTestallCreate = (params: RequestParams = {}) =>
    this.http.request<ProviderTestAllResult[], ProviderTestAllResult[]>({
      path: `/api/v5/metadata/testall`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Metadata
   * @name V5MetadataActionCreate
   * @request POST:/api/v5/metadata/action/{name}
   * @secure
   */
  v5MetadataActionCreate = (name: string, data: MetadataResource, params: RequestParams = {}) =>
    this.http.request<any, void>({
      path: `/api/v5/metadata/action/${name}`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags MetadataSourceSettings
   * @name V5SettingsMetadataList
   * @request GET:/api/v5/settings/metadata
   * @secure
   */
  v5SettingsMetadataList = (params: RequestParams = {}) =>
    this.http.request<MetadataSourceSettingsResource, any>({
      path: `/api/v5/settings/metadata`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags MetadataSourceSettings
   * @name V5SettingsMetadataUpdate
   * @request PUT:/api/v5/settings/metadata/{id}
   * @secure
   */
  v5SettingsMetadataUpdate = (id: string, data: MetadataSourceSettingsResource, params: RequestParams = {}) =>
    this.http.request<MetadataSourceSettingsResource, void>({
      path: `/api/v5/settings/metadata/${id}`,
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
   * @tags MetadataSourceSettings
   * @name V5SettingsMetadataDetail
   * @request GET:/api/v5/settings/metadata/{id}
   * @secure
   */
  v5SettingsMetadataDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<MetadataSourceSettingsResource, void>({
      path: `/api/v5/settings/metadata/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Missing
   * @name V5WantedMissingList
   * @request GET:/api/v5/wanted/missing
   * @secure
   */
  v5WantedMissingList = (
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
      /** @default true */
      monitored?: boolean;
      /** @default true */
      includeSpecials?: boolean;
      seriesIds?: number[];
      qualityProfileIds?: number[];
      seriesType?: SeriesTypes[];
      /** @uniqueItems true */
      seriesTags?: number[];
      includeSubresources?: MissingSubresource[];
    },
    params: RequestParams = {},
  ) =>
    this.http.request<EpisodeResourcePagingResource, any>({
      path: `/api/v5/wanted/missing`,
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
   * @name V5WantedMissingDetail
   * @request GET:/api/v5/wanted/missing/{id}
   * @secure
   */
  v5WantedMissingDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<EpisodeResource, void>({
      path: `/api/v5/wanted/missing/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags NamingSettings
   * @name V5SettingsNamingList
   * @request GET:/api/v5/settings/naming
   * @secure
   */
  v5SettingsNamingList = (params: RequestParams = {}) =>
    this.http.request<NamingSettingsResource, any>({
      path: `/api/v5/settings/naming`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags NamingSettings
   * @name V5SettingsNamingUpdate
   * @request PUT:/api/v5/settings/naming/{id}
   * @secure
   */
  v5SettingsNamingUpdate = (id: string, data: NamingSettingsResource, params: RequestParams = {}) =>
    this.http.request<NamingSettingsResource, void>({
      path: `/api/v5/settings/naming/${id}`,
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
   * @tags NamingSettings
   * @name V5SettingsNamingDetail
   * @request GET:/api/v5/settings/naming/{id}
   * @secure
   */
  v5SettingsNamingDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<NamingSettingsResource, void>({
      path: `/api/v5/settings/naming/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags NamingSettings
   * @name V5SettingsNamingExamplesList
   * @request GET:/api/v5/settings/naming/examples
   * @secure
   */
  v5SettingsNamingExamplesList = (
    query?: {
      renameEpisodes?: boolean;
      replaceIllegalCharacters?: boolean;
      /** @format int32 */
      colonReplacementFormat?: number;
      customColonReplacementFormat?: string;
      /** @format int32 */
      multiEpisodeStyle?: number;
      standardEpisodeFormat?: string;
      dailyEpisodeFormat?: string;
      animeEpisodeFormat?: string;
      seriesFolderFormat?: string;
      seasonFolderFormat?: string;
      specialsFolderFormat?: string;
      /** @format int32 */
      id?: number;
      resourceName?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<NamingExampleResource, any>({
      path: `/api/v5/settings/naming/examples`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Parse
   * @name V5ParseList
   * @request GET:/api/v5/parse
   * @secure
   */
  v5ParseList = (
    query?: {
      title?: string;
      path?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<ParseResource, any>({
      path: `/api/v5/parse`,
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
   * @name V5QualitydefinitionUpdate
   * @request PUT:/api/v5/qualitydefinition/{id}
   * @secure
   */
  v5QualitydefinitionUpdate = (id: string, data: QualityDefinitionResource, params: RequestParams = {}) =>
    this.http.request<QualityDefinitionResource, void>({
      path: `/api/v5/qualitydefinition/${id}`,
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
   * @name V5QualitydefinitionDetail
   * @request GET:/api/v5/qualitydefinition/{id}
   * @secure
   */
  v5QualitydefinitionDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<QualityDefinitionResource, void>({
      path: `/api/v5/qualitydefinition/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags QualityDefinition
   * @name V5QualitydefinitionList
   * @request GET:/api/v5/qualitydefinition
   * @secure
   */
  v5QualitydefinitionList = (params: RequestParams = {}) =>
    this.http.request<QualityDefinitionResource[], any>({
      path: `/api/v5/qualitydefinition`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags QualityDefinition
   * @name V5QualitydefinitionUpdate2
   * @request PUT:/api/v5/qualitydefinition
   * @originalName v5QualitydefinitionUpdate
   * @duplicate
   * @secure
   */
  v5QualitydefinitionUpdate2 = (data: QualityDefinitionResource[], params: RequestParams = {}) =>
    this.http.request<QualityDefinitionResource[], any>({
      path: `/api/v5/qualitydefinition`,
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
   * @name V5QualityprofileCreate
   * @request POST:/api/v5/qualityprofile
   * @secure
   */
  v5QualityprofileCreate = (data: QualityProfileResource, params: RequestParams = {}) =>
    this.http.request<QualityProfileResource, void>({
      path: `/api/v5/qualityprofile`,
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
   * @name V5QualityprofileList
   * @request GET:/api/v5/qualityprofile
   * @secure
   */
  v5QualityprofileList = (params: RequestParams = {}) =>
    this.http.request<QualityProfileResource[], any>({
      path: `/api/v5/qualityprofile`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags QualityProfile
   * @name V5QualityprofileDelete
   * @request DELETE:/api/v5/qualityprofile/{id}
   * @secure
   */
  v5QualityprofileDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/qualityprofile/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags QualityProfile
   * @name V5QualityprofileUpdate
   * @request PUT:/api/v5/qualityprofile/{id}
   * @secure
   */
  v5QualityprofileUpdate = (id: string, data: QualityProfileResource, params: RequestParams = {}) =>
    this.http.request<QualityProfileResource, void>({
      path: `/api/v5/qualityprofile/${id}`,
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
   * @name V5QualityprofileDetail
   * @request GET:/api/v5/qualityprofile/{id}
   * @secure
   */
  v5QualityprofileDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<QualityProfileResource, void>({
      path: `/api/v5/qualityprofile/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags QualityProfileSchema
   * @name V5QualityprofileSchemaList
   * @request GET:/api/v5/qualityprofile/schema
   * @secure
   */
  v5QualityprofileSchemaList = (params: RequestParams = {}) =>
    this.http.request<QualityProfileResource, any>({
      path: `/api/v5/qualityprofile/schema`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Queue
   * @name V5QueueDelete
   * @request DELETE:/api/v5/queue/{id}
   * @secure
   */
  v5QueueDelete = (
    id: number,
    query?: {
      message?: string;
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
    this.http.request<void, void>({
      path: `/api/v5/queue/${id}`,
      method: "DELETE",
      query: query,
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Queue
   * @name V5QueueBulkDelete
   * @request DELETE:/api/v5/queue/bulk
   * @secure
   */
  v5QueueBulkDelete = (
    data: QueueBulkResource,
    query?: {
      message?: string;
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
      path: `/api/v5/queue/bulk`,
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
   * @name V5QueueList
   * @request GET:/api/v5/queue
   * @secure
   */
  v5QueueList = (
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
      /** @default true */
      includeUnknownSeriesItems?: boolean;
      seriesIds?: number[];
      protocol?: DownloadProtocol;
      languages?: number[];
      quality?: number[];
      status?: QueueStatus[];
      includeSubresources?: QueueSubresource[];
    },
    params: RequestParams = {},
  ) =>
    this.http.request<QueueResourcePagingResource, any>({
      path: `/api/v5/queue`,
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
   * @name V5QueueGrabCreate
   * @request POST:/api/v5/queue/grab/{id}
   * @secure
   */
  v5QueueGrabCreate = (id: number, params: RequestParams = {}) =>
    this.http.request<void, void>({
      path: `/api/v5/queue/grab/${id}`,
      method: "POST",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags QueueAction
   * @name V5QueueGrabBulkCreate
   * @request POST:/api/v5/queue/grab/bulk
   * @secure
   */
  v5QueueGrabBulkCreate = (data: QueueBulkResource, params: RequestParams = {}) =>
    this.http.request<void, void>({
      path: `/api/v5/queue/grab/bulk`,
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
   * @name V5QueueDetailsList
   * @request GET:/api/v5/queue/details
   * @secure
   */
  v5QueueDetailsList = (
    query?: {
      /** @format int32 */
      seriesId?: number;
      episodeIds?: number[];
      includeSubresources?: QueueSubresource[];
    },
    params: RequestParams = {},
  ) =>
    this.http.request<QueueResource[], any>({
      path: `/api/v5/queue/details`,
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
   * @name V5QueueStatusList
   * @request GET:/api/v5/queue/status
   * @secure
   */
  v5QueueStatusList = (params: RequestParams = {}) =>
    this.http.request<QueueStatusResource, any>({
      path: `/api/v5/queue/status`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Release
   * @name V5ReleaseCreate
   * @request POST:/api/v5/release
   * @secure
   */
  v5ReleaseCreate = (data: ReleaseGrabResource, params: RequestParams = {}) =>
    this.http.request<ReleaseGrabResource, void>({
      path: `/api/v5/release`,
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
   * @name V5ReleaseList
   * @request GET:/api/v5/release
   * @secure
   */
  v5ReleaseList = (
    query?: {
      /** @format int32 */
      seriesId?: number;
      /** @format int32 */
      episodeId?: number;
      /** @format int32 */
      seasonNumber?: number;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<ReleaseResource[], void>({
      path: `/api/v5/release`,
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
   * @name V5ReleaseprofileCreate
   * @request POST:/api/v5/releaseprofile
   * @secure
   */
  v5ReleaseprofileCreate = (data: ReleaseProfileResource, params: RequestParams = {}) =>
    this.http.request<ReleaseProfileResource, void>({
      path: `/api/v5/releaseprofile`,
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
   * @tags ReleaseProfile
   * @name V5ReleaseprofileList
   * @request GET:/api/v5/releaseprofile
   * @secure
   */
  v5ReleaseprofileList = (params: RequestParams = {}) =>
    this.http.request<ReleaseProfileResource[], any>({
      path: `/api/v5/releaseprofile`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ReleaseProfile
   * @name V5ReleaseprofileDelete
   * @request DELETE:/api/v5/releaseprofile/{id}
   * @secure
   */
  v5ReleaseprofileDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/releaseprofile/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags ReleaseProfile
   * @name V5ReleaseprofileUpdate
   * @request PUT:/api/v5/releaseprofile/{id}
   * @secure
   */
  v5ReleaseprofileUpdate = (id: string, data: ReleaseProfileResource, params: RequestParams = {}) =>
    this.http.request<ReleaseProfileResource, void>({
      path: `/api/v5/releaseprofile/${id}`,
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
   * @name V5ReleaseprofileDetail
   * @request GET:/api/v5/releaseprofile/{id}
   * @secure
   */
  v5ReleaseprofileDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<ReleaseProfileResource, void>({
      path: `/api/v5/releaseprofile/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags ReleasePush
   * @name V5ReleasePushCreate
   * @request POST:/api/v5/release/push
   * @secure
   */
  v5ReleasePushCreate = (data: ReleasePushResource, params: RequestParams = {}) =>
    this.http.request<ReleaseResource, void>({
      path: `/api/v5/release/push`,
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
   * @name V5ReleasePushDetail
   * @request GET:/api/v5/release/push/{id}
   * @secure
   */
  v5ReleasePushDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<ReleasePushResource, void>({
      path: `/api/v5/release/push/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags RemotePathMapping
   * @name V5RemotepathmappingCreate
   * @request POST:/api/v5/remotepathmapping
   * @secure
   */
  v5RemotepathmappingCreate = (data: RemotePathMappingResource, params: RequestParams = {}) =>
    this.http.request<RemotePathMappingResource, void>({
      path: `/api/v5/remotepathmapping`,
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
   * @name V5RemotepathmappingList
   * @request GET:/api/v5/remotepathmapping
   * @secure
   */
  v5RemotepathmappingList = (params: RequestParams = {}) =>
    this.http.request<RemotePathMappingResource[], any>({
      path: `/api/v5/remotepathmapping`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags RemotePathMapping
   * @name V5RemotepathmappingDelete
   * @request DELETE:/api/v5/remotepathmapping/{id}
   * @secure
   */
  v5RemotepathmappingDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/remotepathmapping/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags RemotePathMapping
   * @name V5RemotepathmappingUpdate
   * @request PUT:/api/v5/remotepathmapping/{id}
   * @secure
   */
  v5RemotepathmappingUpdate = (id: string, data: RemotePathMappingResource, params: RequestParams = {}) =>
    this.http.request<RemotePathMappingResource, void>({
      path: `/api/v5/remotepathmapping/${id}`,
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
   * @name V5RemotepathmappingDetail
   * @request GET:/api/v5/remotepathmapping/{id}
   * @secure
   */
  v5RemotepathmappingDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<RemotePathMappingResource, void>({
      path: `/api/v5/remotepathmapping/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags RenameEpisode
   * @name V5RenameList
   * @request GET:/api/v5/rename
   * @secure
   */
  v5RenameList = (
    query?: {
      /** @format int32 */
      seriesId?: number;
      /** @format int32 */
      seasonNumber?: number;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<RenameEpisodeResource[], any>({
      path: `/api/v5/rename`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags RenameEpisode
   * @name V5RenameBulkList
   * @request GET:/api/v5/rename/bulk
   * @secure
   */
  v5RenameBulkList = (
    query?: {
      seriesIds?: number[];
    },
    params: RequestParams = {},
  ) =>
    this.http.request<RenameEpisodeResource[], void>({
      path: `/api/v5/rename/bulk`,
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
   * @name V5RootfolderCreate
   * @request POST:/api/v5/rootfolder
   * @secure
   */
  v5RootfolderCreate = (data: RootFolderResource, params: RequestParams = {}) =>
    this.http.request<RootFolderResource, void>({
      path: `/api/v5/rootfolder`,
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
   * @name V5RootfolderList
   * @request GET:/api/v5/rootfolder
   * @secure
   */
  v5RootfolderList = (params: RequestParams = {}) =>
    this.http.request<RootFolderResource[], any>({
      path: `/api/v5/rootfolder`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags RootFolder
   * @name V5RootfolderDelete
   * @request DELETE:/api/v5/rootfolder/{id}
   * @secure
   */
  v5RootfolderDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/rootfolder/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags RootFolder
   * @name V5RootfolderDetail
   * @request GET:/api/v5/rootfolder/{id}
   * @secure
   */
  v5RootfolderDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<RootFolderResource, void>({
      path: `/api/v5/rootfolder/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags SeasonPass
   * @name V5SeasonpassCreate
   * @request POST:/api/v5/seasonpass
   * @secure
   */
  v5SeasonpassCreate = (data: SeasonPassResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/seasonpass`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags Series
   * @name V5SeriesList
   * @request GET:/api/v5/series
   * @secure
   */
  v5SeriesList = (
    query?: {
      /** @format int32 */
      tvdbId?: number;
      includeSubresources?: SeriesSubresource[];
    },
    params: RequestParams = {},
  ) =>
    this.http.request<SeriesResource[], any>({
      path: `/api/v5/series`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Series
   * @name V5SeriesCreate
   * @request POST:/api/v5/series
   * @secure
   */
  v5SeriesCreate = (data: SeriesResource, params: RequestParams = {}) =>
    this.http.request<SeriesResource, void>({
      path: `/api/v5/series`,
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
   * @tags Series
   * @name V5SeriesDetail
   * @request GET:/api/v5/series/{id}
   * @secure
   */
  v5SeriesDetail = (
    id: number,
    query?: {
      includeSubresources?: SeriesSubresource[];
    },
    params: RequestParams = {},
  ) =>
    this.http.request<SeriesResource, void>({
      path: `/api/v5/series/${id}`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Series
   * @name V5SeriesUpdate
   * @request PUT:/api/v5/series/{id}
   * @secure
   */
  v5SeriesUpdate = (
    id: string,
    data: SeriesResource,
    query?: {
      /** @default false */
      moveFiles?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<SeriesResource, void>({
      path: `/api/v5/series/${id}`,
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
   * @tags Series
   * @name V5SeriesDelete
   * @request DELETE:/api/v5/series/{id}
   * @secure
   */
  v5SeriesDelete = (
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
      path: `/api/v5/series/${id}`,
      method: "DELETE",
      query: query,
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Series
   * @name V5SeriesSeasonUpdate
   * @request PUT:/api/v5/series/{id}/season
   * @secure
   */
  v5SeriesSeasonUpdate = (id: number, data: SeasonResource, params: RequestParams = {}) =>
    this.http.request<SeasonResource, void>({
      path: `/api/v5/series/${id}/season`,
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
   * @tags SeriesEditor
   * @name V5SeriesEditorUpdate
   * @request PUT:/api/v5/series/editor
   * @secure
   */
  v5SeriesEditorUpdate = (data: SeriesEditorResource, params: RequestParams = {}) =>
    this.http.request<SeriesResource[], void>({
      path: `/api/v5/series/editor`,
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
   * @tags SeriesEditor
   * @name V5SeriesEditorDelete
   * @request DELETE:/api/v5/series/editor
   * @secure
   */
  v5SeriesEditorDelete = (data: SeriesEditorResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/series/editor`,
      method: "DELETE",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags SeriesFolder
   * @name V5SeriesFolderList
   * @request GET:/api/v5/series/{id}/folder
   * @secure
   */
  v5SeriesFolderList = (
    id: number,
    query?: {
      /** @format int32 */
      language?: number;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<SeriesFolderResource, any>({
      path: `/api/v5/series/${id}/folder`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags SeriesImport
   * @name V5SeriesImportCreate
   * @request POST:/api/v5/series/import
   * @secure
   */
  v5SeriesImportCreate = (data: SeriesResource[], params: RequestParams = {}) =>
    this.http.request<SeriesResource[], any>({
      path: `/api/v5/series/import`,
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
   * @tags SeriesLookup
   * @name V5SeriesLookupList
   * @request GET:/api/v5/series/lookup
   * @secure
   */
  v5SeriesLookupList = (
    query?: {
      term?: string;
      /** @format int32 */
      language?: number;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<SeriesResource[], any>({
      path: `/api/v5/series/lookup`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Statistics
   * @name V5StatisticsList
   * @request GET:/api/v5/statistics
   * @secure
   */
  v5StatisticsList = (
    query?: {
      rootFolderPaths?: string[];
      rootFolderPathsNot?: boolean;
      tagIds?: number[];
      tagIdsNot?: boolean;
      qualityProfileIds?: number[];
      qualityProfileIdsNot?: boolean;
      monitored?: boolean;
      seriesTypes?: SeriesTypes[];
      seriesTypesNot?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<StatisticsResource, any>({
      path: `/api/v5/statistics`,
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
   * @name V5SystemStatusList
   * @request GET:/api/v5/system/status
   * @secure
   */
  v5SystemStatusList = (params: RequestParams = {}) =>
    this.http.request<SystemResource, any>({
      path: `/api/v5/system/status`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags System
   * @name V5SystemRoutesList
   * @request GET:/api/v5/system/routes
   * @secure
   */
  v5SystemRoutesList = (params: RequestParams = {}) =>
    this.http.request<string, any>({
      path: `/api/v5/system/routes`,
      method: "GET",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags System
   * @name V5SystemRoutesDuplicateList
   * @request GET:/api/v5/system/routes/duplicate
   * @secure
   */
  v5SystemRoutesDuplicateList = (params: RequestParams = {}) =>
    this.http.request<Record<string, string[]>, any>({
      path: `/api/v5/system/routes/duplicate`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags System
   * @name V5SystemShutdownCreate
   * @request POST:/api/v5/system/shutdown
   * @secure
   */
  v5SystemShutdownCreate = (params: RequestParams = {}) =>
    this.http.request<SystemShutdownResource, any>({
      path: `/api/v5/system/shutdown`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags System
   * @name V5SystemRestartCreate
   * @request POST:/api/v5/system/restart
   * @secure
   */
  v5SystemRestartCreate = (params: RequestParams = {}) =>
    this.http.request<SystemRestartResource, any>({
      path: `/api/v5/system/restart`,
      method: "POST",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Tag
   * @name V5TagList
   * @request GET:/api/v5/tag
   * @secure
   */
  v5TagList = (params: RequestParams = {}) =>
    this.http.request<TagResource[], any>({
      path: `/api/v5/tag`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Tag
   * @name V5TagCreate
   * @request POST:/api/v5/tag
   * @secure
   */
  v5TagCreate = (data: TagResource, params: RequestParams = {}) =>
    this.http.request<TagResource, void>({
      path: `/api/v5/tag`,
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
   * @tags Tag
   * @name V5TagUpdate
   * @request PUT:/api/v5/tag/{id}
   * @secure
   */
  v5TagUpdate = (id: string, data: TagResource, params: RequestParams = {}) =>
    this.http.request<TagResource, void>({
      path: `/api/v5/tag/${id}`,
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
   * @name V5TagDelete
   * @request DELETE:/api/v5/tag/{id}
   * @secure
   */
  v5TagDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v5/tag/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Tag
   * @name V5TagDetail
   * @request GET:/api/v5/tag/{id}
   * @secure
   */
  v5TagDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<TagResource, void>({
      path: `/api/v5/tag/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags TagDetails
   * @name V5TagDetailList
   * @request GET:/api/v5/tag/detail
   * @secure
   */
  v5TagDetailList = (params: RequestParams = {}) =>
    this.http.request<TagDetailsResource[], any>({
      path: `/api/v5/tag/detail`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags TagDetails
   * @name V5TagDetailDetail
   * @request GET:/api/v5/tag/detail/{id}
   * @secure
   */
  v5TagDetailDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<TagDetailsResource, void>({
      path: `/api/v5/tag/detail/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Task
   * @name V5SystemTaskList
   * @request GET:/api/v5/system/task
   * @secure
   */
  v5SystemTaskList = (params: RequestParams = {}) =>
    this.http.request<TaskResource[], any>({
      path: `/api/v5/system/task`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Task
   * @name V5SystemTaskDetail
   * @request GET:/api/v5/system/task/{id}
   * @secure
   */
  v5SystemTaskDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<TaskResource, void>({
      path: `/api/v5/system/task/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags UiSettings
   * @name V5SettingsUiList
   * @request GET:/api/v5/settings/ui
   * @secure
   */
  v5SettingsUiList = (params: RequestParams = {}) =>
    this.http.request<UiSettingsResource, any>({
      path: `/api/v5/settings/ui`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags UiSettings
   * @name V5SettingsUiUpdate
   * @request PUT:/api/v5/settings/ui/{id}
   * @secure
   */
  v5SettingsUiUpdate = (id: string, data: UiSettingsResource, params: RequestParams = {}) =>
    this.http.request<UiSettingsResource, void>({
      path: `/api/v5/settings/ui/${id}`,
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
   * @tags UiSettings
   * @name V5SettingsUiDetail
   * @request GET:/api/v5/settings/ui/{id}
   * @secure
   */
  v5SettingsUiDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<UiSettingsResource, void>({
      path: `/api/v5/settings/ui/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Update
   * @name V5UpdateList
   * @request GET:/api/v5/update
   * @secure
   */
  v5UpdateList = (params: RequestParams = {}) =>
    this.http.request<UpdateResource[], any>({
      path: `/api/v5/update`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags UpdateLogFile
   * @name V5LogFileUpdateList
   * @request GET:/api/v5/log/file/update
   * @secure
   */
  v5LogFileUpdateList = (params: RequestParams = {}) =>
    this.http.request<LogFileResource[], any>({
      path: `/api/v5/log/file/update`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags UpdateLogFile
   * @name V5LogFileUpdateDetail
   * @request GET:/api/v5/log/file/update/{filename}
   * @secure
   */
  v5LogFileUpdateDetail = (filename: string, params: RequestParams = {}) =>
    this.http.request<string, void>({
      path: `/api/v5/log/file/update/${filename}`,
      method: "GET",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags UpdateSettings
   * @name V5SettingsUpdateList
   * @request GET:/api/v5/settings/update
   * @secure
   */
  v5SettingsUpdateList = (params: RequestParams = {}) =>
    this.http.request<UpdateSettingsResource, any>({
      path: `/api/v5/settings/update`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags UpdateSettings
   * @name V5SettingsUpdateUpdate
   * @request PUT:/api/v5/settings/update/{id}
   * @secure
   */
  v5SettingsUpdateUpdate = (id: string, data: UpdateSettingsResource, params: RequestParams = {}) =>
    this.http.request<UpdateSettingsResource, void>({
      path: `/api/v5/settings/update/${id}`,
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
   * @tags UpdateSettings
   * @name V5SettingsUpdateDetail
   * @request GET:/api/v5/settings/update/{id}
   * @secure
   */
  v5SettingsUpdateDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<UpdateSettingsResource, void>({
      path: `/api/v5/settings/update/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
}
