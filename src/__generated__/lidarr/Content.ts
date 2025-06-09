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

import { HttpClient, RequestParams } from "./../ky-client";

export class Content<SecurityDataType = unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  /**
   * No description
   *
   * @tags StaticResource
   * @name ContentDetail
   * @request GET:/content/{path}
   * @secure
   */
  contentDetail = (path: string, params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/content/${path}`,
      method: "GET",
      secure: true,
      ...params,
    });
}
