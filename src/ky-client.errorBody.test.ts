import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { HttpClient } from "./ky-client";

/**
 * Regression coverage for the ky 2.x behavior where the response body is consumed before the `HTTPError`
 * is thrown. These tests run against a real HTTP server with the real ky instance, so they fail whenever
 * the *arr error body is no longer part of the user facing message.
 */
describe("HttpClient error body (real ky + local server)", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const body = req.method === "GET" ? undefined : "{}";

      if (req.url === "/api/v3/rootfolder") {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Root folder path is not valid" }));
        return;
      }
      if (req.url === "/api/v3/validation") {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify([{ propertyName: "Path", errorMessage: "Path is not valid" }]));
        return;
      }
      if (req.url === "/api/v3/htmlerror") {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end("<html>Boom</html>");
        return;
      }

      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  });

  const createClient = () => new HttpClient({ prefix: baseUrl });

  test("surfaces the *arr validation message of a JSON error body", async () => {
    const client = createClient();

    const thrown = await client
      .request({ path: "/api/v3/rootfolder", method: "POST", type: undefined, body: { path: "/invalid" } })
      .catch((e: Error) => e);

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe("Root folder path is not valid");
  });

  test("joins validation messages of an array error body", async () => {
    const client = createClient();

    await expect(client.request({ path: "/api/v3/validation", method: "POST", body: {} })).rejects.toThrow("Path is not valid");
  });

  test("keeps the status based message for non-JSON responses", async () => {
    const client = createClient();

    await expect(client.request({ path: "/api/v3/htmlerror", method: "GET" })).rejects.toThrow("HTTP Error: 500");
  });

  test("successful responses are unaffected", async () => {
    const server = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ id: 1, name: "test" }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;

    try {
      const client = new HttpClient({ prefix: `http://127.0.0.1:${port}` });
      await expect(client.request<{ id: number }>({ path: "/api/v3/ok", method: "GET" })).resolves.toEqual({ id: 1, name: "test" });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
  });
});
