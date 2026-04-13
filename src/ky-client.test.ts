import { beforeEach, describe, expect, test, vi } from "vitest";
import kyDefault, { HTTPError, NormalizedOptions } from "ky";
import { HttpClient } from "./ky-client";

vi.mock("ky", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ky")>();
  return {
    ...actual,
    default: {
      create: vi.fn(),
    },
  };
});

vi.mock("./logger", () => ({
  logger: { debug: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("./clients/unified-client", () => ({
  createConnectionErrorParts: vi.fn().mockReturnValue([]),
}));

const makeHTTPError = (status: number, statusText: string, body: string, contentType: string) => {
  const response = new Response(body, { status, statusText, headers: { "Content-Type": contentType } });
  return new HTTPError(response, new Request("http://localhost/test"), {} as NormalizedOptions);
};

describe("HttpClient error handling", () => {
  let mockKyFn: ReturnType<typeof vi.fn>;
  let client: HttpClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockKyFn = vi.fn();
    vi.mocked(kyDefault.create).mockReturnValue(mockKyFn as any);
    client = new HttpClient({ prefixUrl: "http://localhost:7878" });
  });

  describe("JSON error responses", () => {
    test("extracts messages from array response", async () => {
      const error = makeHTTPError(
        400,
        "Bad Request",
        JSON.stringify([{ message: "First error" }, { message: "Second error" }]),
        "application/json",
      );
      mockKyFn.mockRejectedValueOnce(error);

      await expect(client.request({ path: "/api/test", method: "GET" })).rejects.toThrow("First error, Second error");
    });

    test("extracts errorMessage field from array items", async () => {
      const error = makeHTTPError(422, "Unprocessable Entity", JSON.stringify([{ errorMessage: "Validation failed" }]), "application/json");
      mockKyFn.mockRejectedValueOnce(error);

      await expect(client.request({ path: "/api/test", method: "GET" })).rejects.toThrow("Validation failed");
    });

    test("falls back to JSON dump when array items have no message fields (no 'undefined' in output)", async () => {
      const body = JSON.stringify([{ code: 123 }, { code: 456 }]);
      const error = makeHTTPError(400, "Bad Request", body, "application/json");
      mockKyFn.mockRejectedValueOnce(error);

      await expect(client.request({ path: "/api/test", method: "GET" })).rejects.toThrow('[{"code":123},{"code":456}]');
    });

    test("extracts message from object response", async () => {
      const error = makeHTTPError(401, "Unauthorized", JSON.stringify({ message: "Invalid API key" }), "application/json");
      mockKyFn.mockRejectedValueOnce(error);

      await expect(client.request({ path: "/api/test", method: "GET" })).rejects.toThrow("Invalid API key");
    });

    test("extracts errorMessage field from object response", async () => {
      const error = makeHTTPError(400, "Bad Request", JSON.stringify({ errorMessage: "Resource not found" }), "application/json");
      mockKyFn.mockRejectedValueOnce(error);

      await expect(client.request({ path: "/api/test", method: "GET" })).rejects.toThrow("Resource not found");
    });

    test("handles invalid JSON despite application/json content-type", async () => {
      const error = makeHTTPError(500, "Internal Server Error", "not valid json {{{", "application/json");
      mockKyFn.mockRejectedValueOnce(error);

      await expect(client.request({ path: "/api/test", method: "GET" })).rejects.toThrow("Failed to read response body");
    });
  });

  describe("non-JSON HTTP errors", () => {
    test("includes HTTP status in message for non-JSON responses", async () => {
      const error = makeHTTPError(503, "Service Unavailable", "<html>Down</html>", "text/html");
      mockKyFn.mockRejectedValueOnce(error);

      await expect(client.request({ path: "/api/test", method: "GET" })).rejects.toThrow("HTTP Error: 503 Service Unavailable");
    });

    test("no trailing punctuation when no additional context", async () => {
      const error = makeHTTPError(404, "Not Found", "Not found", "text/plain");
      mockKyFn.mockRejectedValueOnce(error);

      const thrown = await client.request({ path: "/api/test", method: "GET" }).catch((e: Error) => e);
      expect((thrown as Error).message).toBe("HTTP Error: 404 Not Found");
    });
  });

  describe("connection errors", () => {
    test("TypeError produces a user-friendly message", async () => {
      const typeError = new TypeError("fetch failed");
      mockKyFn.mockRejectedValueOnce(typeError);

      await expect(client.request({ path: "/api/test", method: "GET" })).rejects.toThrow(/connection issues/i);
    });

    test("TypeError includes cause details when available", async () => {
      const cause = new Error("connect ECONNREFUSED 127.0.0.1:7878");
      const typeError = new TypeError("fetch failed", { cause });
      mockKyFn.mockRejectedValueOnce(typeError);

      await expect(client.request({ path: "/api/test", method: "GET" })).rejects.toThrow(/ECONNREFUSED/);
    });
  });
});
