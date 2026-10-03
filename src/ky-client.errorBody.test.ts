import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { HttpClient } from "./ky-client";

const logged = vi.hoisted(() => ({ args: [] as unknown[][] }));

vi.mock("./logger", () => ({
  logger: {
    error: (...args: unknown[]) => {
      logged.args.push(args);
    },
    warn: () => {},
    info: () => {},
    debug: () => {},
    trace: () => {},
  },
}));

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

      if (req.url === "/api/v3/huge") {
        res.writeHead(400, { "Content-Type": "application/json", "Content-Length": String(1024 * 1024) });
        res.write(JSON.stringify({ message: "x".repeat(1024 * 1024) }));
        return;
      }
      if (req.url === "/api/v3/huge-chunked") {
        // No Content-Length: a header check alone cannot bound this one.
        res.writeHead(400, { "Content-Type": "application/json" });
        res.write('{"message":"');
        res.write("x".repeat(64 * 1024));
        // Several chunks, so the limit has to be hit while reading rather than up front.
        for (let i = 0; i < 16; i++) {
          res.write("y".repeat(64 * 1024));
        }
        res.end('"}');
        return;
      }
      if (req.url === "/api/v3/stalled") {
        // Headers say it failed, the body never finishes: the capture must not wait for it.
        res.writeHead(400, { "Content-Type": "application/json" });
        res.write("{");
        return;
      }

      if (req.url === "/api/v3/echo") {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Path is not valid", fields: { password: "SUPERSECRET123" } }));
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
    // The stalled and oversized responses are deliberately left unfinished, so their sockets have to go
    // before close() can resolve.
    server.closeAllConnections();
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

  test("does not buffer an oversized error body", async () => {
    const client = createClient();

    const thrown = await client.request({ path: "/api/v3/huge", method: "POST", type: undefined, body: {} }).catch((e: Error) => e);

    expect(thrown.message).toContain("empty body");
    expect(thrown.message).not.toContain("xxxx");
  });

  test("does not buffer an oversized error body that declares no length", async () => {
    const client = createClient();

    const thrown = await client.request({ path: "/api/v3/huge-chunked", method: "POST", type: undefined, body: {} }).catch((e: Error) => e);

    expect(thrown.message).toContain("empty body");
    expect(thrown.message).not.toContain("yyyy");
  });

  test("settles when the server sends error headers and never finishes the body", async () => {
    const client = createClient();

    const thrown = await Promise.race([
      client.request({ path: "/api/v3/stalled", method: "POST", type: undefined, body: {} }).catch((e: Error) => e),
      new Promise((resolve) => setTimeout(() => resolve(new Error("client never settled")), 20_000)),
    ]);

    expect(thrown.message).not.toBe("client never settled");
    expect(thrown.message).toContain("empty body");
  }, 30_000);

  test("does not log the parsed error payload", async () => {
    logged.args.length = 0;
    const client = createClient();

    await client.request({ path: "/api/v3/echo", method: "POST", type: undefined, body: {} }).catch(() => undefined);

    const dumped = logged.args
      .flat()
      .map((arg) => JSON.stringify(arg) ?? String(arg))
      .join("\n");

    expect(dumped).toContain("Path is not valid");
    expect(dumped).not.toContain("SUPERSECRET123");
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
