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

export class Feed<SecurityDataType = unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  /**
   * No description
   *
   * @tags CalendarFeed
   * @name V1CalendarLidarrIcsList
   * @request GET:/feed/v1/calendar/lidarr.ics
   * @secure
   */
  v1CalendarLidarrIcsList = (
    query?: {
      /**
       * @format int32
       * @default 7
       */
      pastDays?: number;
      /**
       * @format int32
       * @default 28
       */
      futureDays?: number;
      /** @default "" */
      tags?: string;
      /** @default false */
      unmonitored?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/feed/v1/calendar/lidarr.ics`,
      method: "GET",
      query: query,
      secure: true,
      ...params,
    });
}
