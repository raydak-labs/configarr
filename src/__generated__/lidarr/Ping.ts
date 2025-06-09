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
import { PingResource } from "./data-contracts";

export class Ping<SecurityDataType = unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  /**
   * No description
   *
   * @tags Ping
   * @name PingList
   * @request GET:/ping
   * @secure
   */
  pingList = (params: RequestParams = {}) =>
    this.http.request<PingResource, any>({
      path: `/ping`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Ping
   * @name HeadPing
   * @request HEAD:/ping
   * @secure
   */
  headPing = (params: RequestParams = {}) =>
    this.http.request<PingResource, any>({
      path: `/ping`,
      method: "HEAD",
      secure: true,
      format: "json",
      ...params,
    });
}
