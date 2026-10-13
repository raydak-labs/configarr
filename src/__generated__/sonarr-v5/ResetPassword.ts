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

import { ContentType, HttpClient, RequestParams } from "./../../ky-client";

export class ResetPassword<SecurityDataType = unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  /**
   * No description
   *
   * @tags Authentication
   * @name RequestCreate
   * @request POST:/reset-password/request
   * @secure
   */
  requestCreate = (params: RequestParams = {}) =>
    this.http.request<any, void>({
      path: `/reset-password/request`,
      method: "POST",
      secure: true,
      ...params,
    });
  /**
   * No description
   *
   * @tags Authentication
   * @name ResetPasswordCreate
   * @request POST:/reset-password
   * @secure
   */
  resetPasswordCreate = (
    data: {
      token?: string;
      username?: string;
      password?: string;
      passwordConfirmation?: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<any, void>({
      path: `/reset-password`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.FormData,
      ...params,
    });
}
