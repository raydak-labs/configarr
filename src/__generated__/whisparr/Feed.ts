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
   * @name V3CalendarWhisparrIcsList
   * @request GET:/feed/v3/calendar/whisparr.ics
   * @secure
   */
  v3CalendarWhisparrIcsList = (
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
      /** @default false */
      premieresOnly?: boolean;
      /** @default false */
      asAllDay?: boolean;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/feed/v3/calendar/whisparr.ics`,
      method: "GET",
      query: query,
      secure: true,
      ...params,
    });
}
