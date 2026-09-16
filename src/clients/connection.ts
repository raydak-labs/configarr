import { logger } from "../logger";
import { ArrType } from "../types/common.types";

export const validateClientParams = (url: string, apiKey: string, arrType: ArrType) => {
  const arrLabel = arrType.toLowerCase();

  if (!url) {
    const message = `URL not correctly configured for ${arrLabel} API!`;
    logger.error(message);
    throw new Error(message);
  }
  if (!apiKey) {
    const message = `API Key not correctly configured for ${arrLabel} API!`;
    logger.error(message);
    throw new Error(message);
  }
};

export const selectConnectionErrorDetail = (errorParts: string[]): string | undefined =>
  errorParts.find((part) => part.startsWith("HTTP ") || part.startsWith("Connection test failed")) ?? errorParts[0];

export const logConnectionError = (error: unknown, arrType: ArrType) => {
  const arrLabel = arrType.toLowerCase();
  const errorParts = createConnectionErrorParts(error);

  if (errorParts.length > 0) {
    const bestMessage = selectConnectionErrorDetail(errorParts);
    return `Connection to ${arrLabel} API failed: ${bestMessage}`;
  }

  const httpError = error as {
    cause?: { message?: string; errors?: { message?: string }[] };
    message?: string;
    response?: { status?: number; statusText?: string };
  };
  const causeError = httpError?.cause?.message || httpError?.cause?.errors?.map((e) => e.message).join(";") || undefined;
  const errorMessage = (httpError.message && `Message: ${httpError.message}`) || "";
  const causeMessage = (causeError && `- Cause: ${causeError}`) || "";

  if (httpError.response) {
    return `Unable to retrieve data from ${arrLabel} API. Server responded with status code ${httpError.response.status}: ${httpError.response.statusText}. Please check the API server status or your request parameters.`;
  } else {
    return `An unexpected error occurred while setting up the ${arrLabel} request: ${errorMessage} ${causeMessage}. Please try again.`;
  }
};

/**
 * Create detailed error parts for connection testing and error reporting
 * Returns an array of error messages with structured details and user-friendly messages
 */
export const createConnectionErrorParts = (error: unknown): string[] => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const httpError = error as { response?: { status?: number; data?: unknown } };

  const status = httpError?.response?.status;
  const data = httpError?.response?.data;

  let structuredDetail: string | undefined;

  if (data) {
    if (typeof data === "string") {
      structuredDetail = data;
    } else if (typeof data === "object" && data !== null) {
      const payload = data as { message?: unknown; error?: unknown; errors?: unknown };
      const message = payload.message ?? payload.error;
      const errors = Array.isArray(payload.errors)
        ? payload.errors
            .map((e: unknown) => {
              if (e && typeof e === "object") {
                const item = e as { errorMessage?: unknown; message?: unknown };
                return String(item.errorMessage ?? item.message ?? e);
              }
              return String(e);
            })
            .join("; ")
        : undefined;

      structuredDetail = [message, errors].filter(Boolean).join(" - ") || undefined;
    }
  }

  const statusPrefix = status ? `HTTP ${status}` : "Connection test failed";
  const structuredMessage = structuredDetail ? `${statusPrefix}: ${structuredDetail}` : statusPrefix;

  let friendly: string | undefined;
  if (errorMessage.includes("connection refused") || errorMessage.includes("ECONNREFUSED")) {
    friendly = "Connection refused - check host and port";
  } else if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT")) {
    friendly = "Connection timeout - check network connectivity";
  } else if (errorMessage.includes("unauthorized") || errorMessage.includes("401")) {
    friendly = "Authentication failed - check username/password/API key";
  } else if (errorMessage.includes("not found") || errorMessage.includes("404")) {
    friendly = "Endpoint not found - check URL base path";
  }

  return [friendly, structuredMessage, errorMessage].filter((part, index, self) => part && self.indexOf(part) === index) as string[];
};
