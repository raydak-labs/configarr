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

import { HttpClient, RequestParams } from "./../../ky-client";

export class Id<SecurityDataType = unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  /**
   * No description
   *
   * @tags Newznab
   * @name GetId
   * @request GET:/{id}/api
   * @secure
   */
  getId = (
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
      path: `/${id}/api`,
      method: "GET",
      query: query,
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Newznab
   * @name DownloadList
   * @request GET:/{id}/download
   * @secure
   */
  downloadList = (
    id: number,
    query?: {
      link?: string;
      file?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/${id}/download`,
      method: "GET",
      query: query,
      secure: true,
      ...params,
    });
}
