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
  AppProfileResource,
  ApplicationBulkResource,
  ApplicationResource,
  BackupResource,
  CommandResource,
  CustomFilterResource,
  DevelopmentConfigResource,
  DownloadClientBulkResource,
  DownloadClientConfigResource,
  DownloadClientResource,
  HealthResource,
  HistoryEventType,
  HistoryResource,
  HistoryResourcePagingResource,
  HostConfigResource,
  IActionResult,
  IndexerBulkResource,
  IndexerCategory,
  IndexerProxyResource,
  IndexerResource,
  IndexerStatsResource,
  IndexerStatusResource,
  LocalizationOption,
  LogFileResource,
  LogResourcePagingResource,
  NotificationResource,
  ReleaseResource,
  SortDirection,
  SystemResource,
  TagDetailsResource,
  TagResource,
  TaskResource,
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
   * @tags Application
   * @name V1ApplicationsDetail
   * @request GET:/api/v1/applications/{id}
   * @secure
   */
  v1ApplicationsDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<ApplicationResource, any>({
      path: `/api/v1/applications/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Application
   * @name V1ApplicationsUpdate
   * @request PUT:/api/v1/applications/{id}
   * @secure
   */
  v1ApplicationsUpdate = (
    id: string,
    data: ApplicationResource,
    query?: {
      /** @default false */
      forceSave?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<ApplicationResource, any>({
      path: `/api/v1/applications/${id}`,
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
   * @tags Application
   * @name V1ApplicationsDelete
   * @request DELETE:/api/v1/applications/{id}
   * @secure
   */
  v1ApplicationsDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/applications/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Application
   * @name V1ApplicationsList
   * @request GET:/api/v1/applications
   * @secure
   */
  v1ApplicationsList = (params: RequestParams = {}) =>
    this.http.request<ApplicationResource[], any>({
      path: `/api/v1/applications`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Application
   * @name V1ApplicationsCreate
   * @request POST:/api/v1/applications
   * @secure
   */
  v1ApplicationsCreate = (
    data: ApplicationResource,
    query?: {
      /** @default false */
      forceSave?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<ApplicationResource, any>({
      path: `/api/v1/applications`,
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
   * @tags Application
   * @name V1ApplicationsBulkUpdate
   * @request PUT:/api/v1/applications/bulk
   * @secure
   */
  v1ApplicationsBulkUpdate = (data: ApplicationBulkResource, params: RequestParams = {}) =>
    this.http.request<ApplicationResource, any>({
      path: `/api/v1/applications/bulk`,
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
   * @tags Application
   * @name V1ApplicationsBulkDelete
   * @request DELETE:/api/v1/applications/bulk
   * @secure
   */
  v1ApplicationsBulkDelete = (data: ApplicationBulkResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/applications/bulk`,
      method: "DELETE",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags Application
   * @name V1ApplicationsSchemaList
   * @request GET:/api/v1/applications/schema
   * @secure
   */
  v1ApplicationsSchemaList = (params: RequestParams = {}) =>
    this.http.request<ApplicationResource[], any>({
      path: `/api/v1/applications/schema`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Application
   * @name V1ApplicationsTestCreate
   * @request POST:/api/v1/applications/test
   * @secure
   */
  v1ApplicationsTestCreate = (
    data: ApplicationResource,
    query?: {
      /** @default false */
      forceTest?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/api/v1/applications/test`,
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
   * @tags Application
   * @name V1ApplicationsTestallCreate
   * @request POST:/api/v1/applications/testall
   * @secure
   */
  v1ApplicationsTestallCreate = (params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/applications/testall`,
      method: "POST",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Application
   * @name V1ApplicationsActionCreate
   * @request POST:/api/v1/applications/action/{name}
   * @secure
   */
  v1ApplicationsActionCreate = (name: string, data: ApplicationResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/applications/action/${name}`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags AppProfile
   * @name V1AppprofileCreate
   * @request POST:/api/v1/appprofile
   * @secure
   */
  v1AppprofileCreate = (data: AppProfileResource, params: RequestParams = {}) =>
    this.http.request<AppProfileResource, any>({
      path: `/api/v1/appprofile`,
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
   * @tags AppProfile
   * @name V1AppprofileList
   * @request GET:/api/v1/appprofile
   * @secure
   */
  v1AppprofileList = (params: RequestParams = {}) =>
    this.http.request<AppProfileResource[], any>({
      path: `/api/v1/appprofile`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags AppProfile
   * @name V1AppprofileDelete
   * @request DELETE:/api/v1/appprofile/{id}
   * @secure
   */
  v1AppprofileDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/appprofile/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags AppProfile
   * @name V1AppprofileUpdate
   * @request PUT:/api/v1/appprofile/{id}
   * @secure
   */
  v1AppprofileUpdate = (id: string, data: AppProfileResource, params: RequestParams = {}) =>
    this.http.request<AppProfileResource, any>({
      path: `/api/v1/appprofile/${id}`,
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
   * @tags AppProfile
   * @name V1AppprofileDetail
   * @request GET:/api/v1/appprofile/{id}
   * @secure
   */
  v1AppprofileDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<AppProfileResource, Record<string, string> | void>({
      path: `/api/v1/appprofile/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags AppProfile
   * @name V1AppprofileSchemaList
   * @request GET:/api/v1/appprofile/schema
   * @secure
   */
  v1AppprofileSchemaList = (params: RequestParams = {}) =>
    this.http.request<AppProfileResource, any>({
      path: `/api/v1/appprofile/schema`,
      method: "GET",
      secure: true,
      format: "json",
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
   * @tags DevelopmentConfig
   * @name V1ConfigDevelopmentUpdate
   * @request PUT:/api/v1/config/development/{id}
   * @secure
   */
  v1ConfigDevelopmentUpdate = (id: string, data: DevelopmentConfigResource, params: RequestParams = {}) =>
    this.http.request<DevelopmentConfigResource, any>({
      path: `/api/v1/config/development/${id}`,
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
   * @tags DevelopmentConfig
   * @name V1ConfigDevelopmentDetail
   * @request GET:/api/v1/config/development/{id}
   * @secure
   */
  v1ConfigDevelopmentDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<DevelopmentConfigResource, any>({
      path: `/api/v1/config/development/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags DevelopmentConfig
   * @name V1ConfigDevelopmentList
   * @request GET:/api/v1/config/development
   * @secure
   */
  v1ConfigDevelopmentList = (params: RequestParams = {}) =>
    this.http.request<DevelopmentConfigResource, any>({
      path: `/api/v1/config/development`,
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
    id: string,
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
      eventType?: number[];
      successful?: boolean;
      downloadId?: string;
      indexerIds?: number[];
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
      eventType?: HistoryEventType;
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
   * @name V1HistoryIndexerList
   * @request GET:/api/v1/history/indexer
   * @secure
   */
  v1HistoryIndexerList = (
    query?: {
      /** @format int32 */
      indexerId?: number;
      eventType?: HistoryEventType;
      /** @format int32 */
      limit?: number;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<HistoryResource[], any>({
      path: `/api/v1/history/indexer`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
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
    id: string,
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
   * @tags IndexerDefaultCategories
   * @name V1IndexerCategoriesList
   * @request GET:/api/v1/indexer/categories
   * @secure
   */
  v1IndexerCategoriesList = (params: RequestParams = {}) =>
    this.http.request<IndexerCategory[], any>({
      path: `/api/v1/indexer/categories`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags IndexerProxy
   * @name V1IndexerproxyDetail
   * @request GET:/api/v1/indexerproxy/{id}
   * @secure
   */
  v1IndexerproxyDetail = (id: number, params: RequestParams = {}) =>
    this.http.request<IndexerProxyResource, any>({
      path: `/api/v1/indexerproxy/${id}`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags IndexerProxy
   * @name V1IndexerproxyUpdate
   * @request PUT:/api/v1/indexerproxy/{id}
   * @secure
   */
  v1IndexerproxyUpdate = (
    id: string,
    data: IndexerProxyResource,
    query?: {
      /** @default false */
      forceSave?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<IndexerProxyResource, any>({
      path: `/api/v1/indexerproxy/${id}`,
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
   * @tags IndexerProxy
   * @name V1IndexerproxyDelete
   * @request DELETE:/api/v1/indexerproxy/{id}
   * @secure
   */
  v1IndexerproxyDelete = (id: number, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/indexerproxy/${id}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags IndexerProxy
   * @name V1IndexerproxyList
   * @request GET:/api/v1/indexerproxy
   * @secure
   */
  v1IndexerproxyList = (params: RequestParams = {}) =>
    this.http.request<IndexerProxyResource[], any>({
      path: `/api/v1/indexerproxy`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags IndexerProxy
   * @name V1IndexerproxyCreate
   * @request POST:/api/v1/indexerproxy
   * @secure
   */
  v1IndexerproxyCreate = (
    data: IndexerProxyResource,
    query?: {
      /** @default false */
      forceSave?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<IndexerProxyResource, any>({
      path: `/api/v1/indexerproxy`,
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
   * @tags IndexerProxy
   * @name V1IndexerproxySchemaList
   * @request GET:/api/v1/indexerproxy/schema
   * @secure
   */
  v1IndexerproxySchemaList = (params: RequestParams = {}) =>
    this.http.request<IndexerProxyResource[], any>({
      path: `/api/v1/indexerproxy/schema`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags IndexerProxy
   * @name V1IndexerproxyTestCreate
   * @request POST:/api/v1/indexerproxy/test
   * @secure
   */
  v1IndexerproxyTestCreate = (
    data: IndexerProxyResource,
    query?: {
      /** @default false */
      forceTest?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/api/v1/indexerproxy/test`,
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
   * @tags IndexerProxy
   * @name V1IndexerproxyTestallCreate
   * @request POST:/api/v1/indexerproxy/testall
   * @secure
   */
  v1IndexerproxyTestallCreate = (params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/indexerproxy/testall`,
      method: "POST",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags IndexerProxy
   * @name V1IndexerproxyActionCreate
   * @request POST:/api/v1/indexerproxy/action/{name}
   * @secure
   */
  v1IndexerproxyActionCreate = (name: string, data: IndexerProxyResource, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/api/v1/indexerproxy/action/${name}`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags IndexerStats
   * @name V1IndexerstatsList
   * @request GET:/api/v1/indexerstats
   * @secure
   */
  v1IndexerstatsList = (
    query?: {
      /** @format date-time */
      startDate?: string;
      /** @format date-time */
      endDate?: string;
      indexers?: string;
      protocols?: string;
      tags?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<IndexerStatsResource, any>({
      path: `/api/v1/indexerstats`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags IndexerStatus
   * @name V1IndexerstatusList
   * @request GET:/api/v1/indexerstatus
   * @secure
   */
  v1IndexerstatusList = (params: RequestParams = {}) =>
    this.http.request<IndexerStatusResource[], any>({
      path: `/api/v1/indexerstatus`,
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
    this.http.request<void, any>({
      path: `/api/v1/localization`,
      method: "GET",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Localization
   * @name V1LocalizationOptionsList
   * @request GET:/api/v1/localization/options
   * @secure
   */
  v1LocalizationOptionsList = (params: RequestParams = {}) =>
    this.http.request<LocalizationOption[], any>({
      path: `/api/v1/localization/options`,
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
    this.http.request<IActionResult, any>({
      path: `/api/v1/log/file/${filename}`,
      method: "GET",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Newznab
   * @name V1IndexerNewznabList
   * @request GET:/api/v1/indexer/{id}/newznab
   * @secure
   */
  v1IndexerNewznabList = (
    id: number,
    query?: {
      t?: string;
      q?: string;
      cat?: string;
      imdbid?: string;
      /** @format int32 */
      tmdbid?: number;
      extended?: string;
      /** @format int32 */
      limit?: number;
      /** @format int32 */
      offset?: number;
      /** @format int32 */
      minage?: number;
      /** @format int32 */
      maxage?: number;
      /** @format int64 */
      minsize?: number;
      /** @format int64 */
      maxsize?: number;
      /** @format int32 */
      rid?: number;
      /** @format int32 */
      tvmazeid?: number;
      /** @format int32 */
      traktid?: number;
      /** @format int32 */
      tvdbid?: number;
      /** @format int32 */
      doubanid?: number;
      /** @format int32 */
      season?: number;
      ep?: string;
      album?: string;
      artist?: string;
      label?: string;
      track?: string;
      /** @format int32 */
      year?: number;
      genre?: string;
      author?: string;
      title?: string;
      publisher?: string;
      configured?: string;
      source?: string;
      host?: string;
      server?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/api/v1/indexer/${id}/newznab`,
      method: "GET",
      query: query,
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Newznab
   * @name V1IndexerDownloadList
   * @request GET:/api/v1/indexer/{id}/download
   * @secure
   */
  v1IndexerDownloadList = (
    id: number,
    query?: {
      link?: string;
      file?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/api/v1/indexer/${id}/download`,
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
    id: string,
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
   * @tags Search
   * @name V1SearchCreate
   * @request POST:/api/v1/search
   * @secure
   */
  v1SearchCreate = (data: ReleaseResource, params: RequestParams = {}) =>
    this.http.request<ReleaseResource, any>({
      path: `/api/v1/search`,
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
   * @tags Search
   * @name V1SearchList
   * @request GET:/api/v1/search
   * @secure
   */
  v1SearchList = (
    query?: {
      query?: string;
      type?: string;
      indexerIds?: number[];
      categories?: number[];
      /** @format int32 */
      limit?: number;
      /** @format int32 */
      offset?: number;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<ReleaseResource[], any>({
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
   * @tags Search
   * @name V1SearchBulkCreate
   * @request POST:/api/v1/search/bulk
   * @secure
   */
  v1SearchBulkCreate = (data: ReleaseResource[], params: RequestParams = {}) =>
    this.http.request<ReleaseResource, any>({
      path: `/api/v1/search/bulk`,
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
    this.http.request<IActionResult, any>({
      path: `/api/v1/log/file/update/${filename}`,
      method: "GET",
      secure: true,
      ...params,
    });
}
