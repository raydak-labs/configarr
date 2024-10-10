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

import { HttpClient, RequestParams } from "./../ky-client";

export class Logout<SecurityDataType = unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  /**
   * No description
   *
   * @tags Authentication
   * @name LogoutList
   * @request GET:/logout
   * @secure
   */
  logoutList = (params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/logout`,
      method: "GET",
      secure: true,
      ...params,
    });
}
