// Copied and modified from here: https://github.com/acacode/swagger-typescript-api/pull/690
import type { BeforeRequestHook, Hooks, KyInstance, Options as KyOptions, NormalizedOptions } from "ky";
import ky from "ky";

type KyResponse<Data> = Response & {
  json<T extends Data = Data>(): Promise<T>;
};

export type ResponsePromise<Data> = {
  arrayBuffer: () => Promise<ArrayBuffer>;
  blob: () => Promise<Blob>;
  formData: () => Promise<FormData>;
  json<T extends Data = Data>(): Promise<T>;
  text: () => Promise<string>;
} & Promise<KyResponse<Data>>;

export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;

// Same as axios. Using provided SearchParamsOption by ky break some typings
export type QueryParamsType = Record<string | number, unknown>;

export interface FullRequestParams extends Omit<KyOptions, "json" | "body" | "searchParams"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
}

export type RequestParams = Omit<FullRequestParams, "body" | "method" | "query" | "path">;

export interface ApiConfig<SecurityDataType = unknown> extends Omit<KyOptions, "data" | "cancelToken"> {
  securityWorker?: (securityData: SecurityDataType | null) => Promise<NormalizedOptions | void> | NormalizedOptions | void;
  secure?: boolean;
  format?: ResponseFormat;
}

export enum ContentType {
  Json = "application/json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public ky: KyInstance;
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private secure?: boolean;
  private format?: ResponseFormat;

  constructor({ securityWorker, secure, format, ...options }: ApiConfig<SecurityDataType> = {}) {
    this.ky = ky.create({ ...options, prefixUrl: options.prefixUrl || "" });
    this.secure = secure;
    this.format = format;
    this.securityWorker = securityWorker;
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected mergeRequestParams(params1: KyOptions, params2?: KyOptions): KyOptions {
    return {
      ...params1,
      ...params2,
      headers: {
        ...params1.headers,
        ...(params2 && params2.headers),
      },
    };
  }

  protected stringifyFormItem(formItem: unknown) {
    if (typeof formItem === "object" && formItem !== null) {
      return JSON.stringify(formItem);
    } else {
      return `${formItem}`;
    }
  }

  protected createFormData(input: Record<string, unknown>): FormData {
    return Object.keys(input || {}).reduce((formData, key) => {
      const property = input[key];
      const propertyContent: unknown[] = property instanceof Array ? property : [property]; // Changed `any[]` to `unknown[]`

      for (const formItem of propertyContent) {
        const isFileType = formItem instanceof Blob || formItem instanceof File;
        formData.append(key, isFileType ? formItem : this.stringifyFormItem(formItem));
      }

      return formData;
    }, new FormData());
  }

  public request = <T = any, _E = any>({
    secure = this.secure,
    path,
    type,
    query,
    format,
    body,
    ...options
  }: FullRequestParams): ResponsePromise<T> => {
    if (body) {
      if (type === ContentType.FormData) {
        body = typeof body === "object" ? this.createFormData(body as Record<string, unknown>) : body;
      } else if (type === ContentType.Text) {
        body = typeof body !== "string" ? JSON.stringify(body) : body;
      }
    }

    let headers: Headers | Record<string, string | undefined> | undefined;
    if (options.headers instanceof Headers) {
      headers = new Headers(options.headers);
      if (type && type !== ContentType.FormData) {
        headers.set("Content-Type", type);
      }
    } else {
      headers = { ...options.headers } as Record<string, string | undefined>;
      if (type && type !== ContentType.FormData) {
        headers["Content-Type"] = type;
      }
    }

    let hooks: Hooks | undefined;
    if (secure && this.securityWorker) {
      const securityWorker: BeforeRequestHook = async (request, options) => {
        const secureOptions = await this.securityWorker!(this.securityData);
        if (secureOptions && typeof secureOptions === "object") {
          let { headers } = options;
          if (secureOptions.headers) {
            const mergedHeaders = new Headers(headers);
            const secureHeaders = new Headers(secureOptions.headers);
            secureHeaders.forEach((value, key) => {
              mergedHeaders.set(key, value);
            });
            headers = mergedHeaders;
          }
          return new Request(request.url, {
            ...options,
            ...secureOptions,
            headers,
          });
        }
      };

      hooks = {
        ...options.hooks,
        beforeRequest: options.hooks && options.hooks.beforeRequest ? [securityWorker, ...options.hooks.beforeRequest] : [securityWorker],
      };
    }

    let searchParams: URLSearchParams | undefined;

    if (query != null) {
      searchParams = new URLSearchParams(query as Record<string, string>);
    }

    // // Workaround for not working POSTs. Use JSON when json type else body
    // const data: any = {};

    // if (type == ContentType.Json) {
    //   data.json = body;
    // } else {
    //   data.body = body as BodyInit;
    // }

    const requestPromise: ResponsePromise<T> = this.ky(path.replace(/^\//, ""), {
      ...options,
      headers,
      searchParams,
      //...data,
      // Use always JSON
      json: body as BodyInit,
      hooks,
    });

    return requestPromise; // Explicitly returning a typed promise
  };
}

export const KyHttpClient = HttpClient;
