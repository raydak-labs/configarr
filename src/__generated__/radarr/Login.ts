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

export class Login<SecurityDataType = unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  /**
   * No description
   *
   * @tags Authentication
   * @name LoginCreate
   * @request POST:/login
   * @secure
   */
  loginCreate = (
    data: {
      username?: string;
      password?: string;
      rememberMe?: string;
    },
    query?: {
      returnUrl?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/login`,
      method: "POST",
      query: query,
      body: data,
      secure: true,
      type: ContentType.FormData,
      ...params,
    });
  /**
   * No description
   *
   * @tags StaticResource
   * @name LoginList
   * @request GET:/login
   * @secure
   */
  loginList = (params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/login`,
      method: "GET",
      secure: true,
      ...params,
    });
}
