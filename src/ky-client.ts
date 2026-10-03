// Copied and modified from here: https://github.com/acacode/swagger-typescript-api/pull/690
import type { AfterResponseHook, BeforeRequestHook, Hooks, KyInstance, Options as KyOptions, NormalizedOptions } from "ky";
import ky, { HTTPError } from "ky";
import { logger } from "./logger";
import { createConnectionErrorParts, selectConnectionErrorDetail } from "./clients/connection";

/** Upper bound on an error body kept for the user-facing message. *arr error bodies are small. */
const MAX_ERROR_BODY_BYTES = 64 * 1024;

/**
 * How long the error-body capture may wait before the request gives up on it.
 *
 * Ky bounds its own error-body read, but that read happens after `afterResponse` hooks, so a server that
 * sends error headers and then keeps the body open would otherwise stall the request indefinitely.
 */
const ERROR_BODY_CAPTURE_TIMEOUT_MS = 5_000;

/**
 * Read a response body for diagnostics only, bounded in both time and size.
 *
 * Reads through a reader instead of `response.text()`: the text helpers buffer the whole body before any
 * limit applies, and a body without a `Content-Length` would slip past a header check. Chunks are counted as
 * they arrive and the reader is cancelled the moment either limit is hit, so a stalled or oversized body
 * stops being read instead of lingering in memory. Returns `undefined` when the body is unusable; the
 * caller then reports an empty body.
 */
async function readErrorBodyBounded(response: Response): Promise<string | undefined> {
  if (!response.body) {
    return undefined;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  let timer: NodeJS.Timeout | undefined;

  const timedOut = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), ERROR_BODY_CAPTURE_TIMEOUT_MS);
    timer.unref?.();
  });

  try {
    for (;;) {
      const step = await Promise.race([reader.read(), timedOut]);

      if (step === TIMED_OUT) {
        void reader.cancel().catch(() => {});
        return undefined;
      }

      if (step.done) {
        break;
      }

      received += step.value.byteLength;

      if (received > MAX_ERROR_BODY_BYTES) {
        // Fire and forget: awaiting a cancel on a tee branch can stay pending forever.
        void reader.cancel().catch(() => {});
        return undefined;
      }

      chunks.push(step.value);
    }

    return new TextDecoder().decode(concatChunks(chunks));
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

const TIMED_OUT = Symbol("timedOut");

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return out;
}

function toErrorMessage(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

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
    this.ky = ky.create({ ...options, prefix: options.prefix || "" });
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

  public request = async <T = any, _E = any>({
    secure = this.secure,
    path,
    type,
    query,
    format,
    body,
    ...options
  }: FullRequestParams): Promise<T> => {
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

    // ky 2.x consumes the response body into `HTTPError.data` before throwing, so `error.response` can no longer be read.
    // The body text therefore has to be captured while the response is still unconsumed: `afterResponse` hooks receive a clone.
    let capturedErrorBody: string | undefined;
    const captureErrorBody: AfterResponseHook = async ({ response }) => {
      if (!response.ok) {
        capturedErrorBody = await readErrorBodyBounded(response.clone());
      }
    };

    let hooks: Hooks | undefined;
    if (secure && this.securityWorker) {
      const securityWorker: BeforeRequestHook = async ({ request, options }) => {
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

    // Ky replaces the response with whatever an `afterResponse` hook returns, so the capture hook goes last:
    // it then sees the response Ky actually rejects rather than the one an earlier hook replaced.
    hooks = { ...hooks, afterResponse: [...(hooks?.afterResponse ?? []), captureErrorBody] };

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

    try {
      const requestPromise = await this.ky<T>(path.replace(/^\//, ""), {
        ...options,
        headers,
        searchParams,
        //...data,
        // Use always JSON
        json: body as BodyInit,
        hooks,
      });

      // 2025-02-09: Added workaround for delete stuff
      if (options.method === "DELETE") {
        if (requestPromise.headers.get("Content-Type")?.includes("application/json")) {
          return requestPromise.json();
        } else {
          return requestPromise.statusText as T;
        }
      }

      return requestPromise.json();
    } catch (error: any) {
      logger.debug(`Error during request with error: ${error?.name}`);

      // Use createConnectionErrorParts for consistent error handling
      const enhancedMessage = selectConnectionErrorDetail(createConnectionErrorParts(error));

      if (error instanceof HTTPError) {
        const { response, request } = error;

        if (response) {
          const contentType = response.headers.get("content-type");

          if (contentType && contentType.includes("application/json")) {
            const text = capturedErrorBody ?? "";

            let errorJson: unknown;
            try {
              errorJson = text ? JSON.parse(text) : undefined;
            } catch {
              const snippet = text.length > 500 ? `${text.slice(0, 500)}…` : text;
              const message = `HTTP Error: ${response.status} ${response.statusText}.${snippet ? ` ${snippet}` : " empty body"}`;
              logger.error(message);
              throw new Error(message, { cause: error });
            }

            if (errorJson === undefined) {
              const message = `HTTP Error: ${response.status} ${response.statusText}. empty body`;
              logger.error(message);
              throw new Error(message, { cause: error });
            }

            let errorMessage = "unknown error";

            if (Array.isArray(errorJson)) {
              const messages = (errorJson as Array<Record<string, unknown>>)
                .map((e) => {
                  const msg = e["message"] ?? e["errorMessage"];
                  return typeof msg === "string" && msg ? msg : undefined;
                })
                .filter((m): m is string => m !== undefined);
              errorMessage = messages.length > 0 ? messages.join(", ") : JSON.stringify(errorJson);
            } else if (errorJson && typeof errorJson === "object") {
              const errObj = errorJson as Record<string, unknown>;
              const msg = errObj["message"] ?? errObj["errorMessage"];
              if (typeof msg === "string" && msg) errorMessage = msg;
            }

            // Only the selected message is logged, never the parsed payload: a server can echo submitted
            // values back in its validation response, and this line runs at error level on every failure.
            logger.error(`Failed executing request: '${errorMessage}'`);
            throw new Error(errorMessage, { cause: error });
          } else {
            const messageParts = [`HTTP Error: ${response.status} ${response.statusText}`];
            if (enhancedMessage) messageParts.push(enhancedMessage);
            const message = messageParts.join(". ");
            logger.error(message);
            throw new Error(message, { cause: error });
          }
        } else if (request) {
          const message = `Request failed (no response). ${enhancedMessage || "Probably connection issues."}`;
          logger.error(message);
          throw new Error(message, { cause: error });
        } else {
          const message = `Request setup failed: ${enhancedMessage || "Unknown error"}`;
          logger.error(message);
          throw new Error(message, { cause: error });
        }
      } else if (error instanceof TypeError) {
        let errorMessage = "Probably some connection issues. If not, feel free to open an issue with details to improve handling.";

        if (error.cause && error.cause instanceof Error) {
          errorMessage += ` Caused by: '${error.cause.message}'.`;

          if ("code" in error.cause) {
            errorMessage += ` Error code: '${error.cause.code}'.`;
          }
        }

        if (enhancedMessage && !errorMessage.includes(enhancedMessage)) {
          errorMessage += ` ${enhancedMessage}`;
        }

        logger.error(errorMessage);
        throw new Error(errorMessage, { cause: error });
      } else {
        const message = `Unexpected error: ${enhancedMessage || toErrorMessage(error)}`;
        logger.error(message);
        throw new Error(message);
      }
    }
  };
}

export const KyHttpClient = HttpClient;
