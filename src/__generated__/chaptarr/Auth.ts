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

export class Auth<SecurityDataType = unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  /**
   * No description
   *
   * @tags OidcAuthentication
   * @name OidcList
   * @request GET:/auth/oidc
   * @secure
   */
  oidcList = (
    query?: {
      returnUrl?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/auth/oidc`,
      method: "GET",
      query: query,
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags PlexAuthentication
   * @name PlexList
   * @request GET:/auth/plex
   * @secure
   */
  plexList = (
    query?: {
      returnUrl?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/auth/plex`,
      method: "GET",
      query: query,
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags PlexAuthentication
   * @name PlexCallbackList
   * @request GET:/auth/plex/callback
   * @secure
   */
  plexCallbackList = (
    query?: {
      state?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/auth/plex/callback`,
      method: "GET",
      query: query,
      secure: true,
      ...params,
    });
}
