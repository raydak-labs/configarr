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

export class Loggedout<SecurityDataType = unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  /**
   * No description
   *
   * @tags StaticResource
   * @name LoggedoutList
   * @request GET:/loggedout
   * @secure
   */
  loggedoutList = (params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/loggedout`,
      method: "GET",
      secure: true,
      ...params,
    });
}
