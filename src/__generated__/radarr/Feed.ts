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
import { CalendarReleaseType } from "./data-contracts";

export class Feed<SecurityDataType = unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  /**
   * No description
   *
   * @tags CalendarFeed
   * @name V3CalendarRadarrIcsList
   * @request GET:/feed/v3/calendar/radarr.ics
   * @secure
   */
  v3CalendarRadarrIcsList = (
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
      releaseTypes?: CalendarReleaseType[];
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/feed/v3/calendar/radarr.ics`,
      method: "GET",
      query: query,
      secure: true,
      ...params,
    });
}
