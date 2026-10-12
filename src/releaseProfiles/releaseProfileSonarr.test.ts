import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { ServerCache } from "../cache";
import { SonarrClient } from "../clients/sonarr-client";
import { ReleaseProfileSonarrSync } from "./releaseProfileSonarr";

vi.mock("../env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../env")>();
  return {
    ...actual,
    getEnvs: vi.fn(() => ({ DRY_RUN: false, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" })),
  };
});

interface WrittenProfile {
  method: string;
  path: string;
  body: Record<string, unknown>;
}

/**
 * Sonarr v5 replaces the release profile's scalar `indexerId` with an `indexerIds` array. These
 * tests run against a real HTTP server with the real generated clients so they exercise the full
 * chain from config through diff to the bytes actually written, and fail if either contract's
 * indexer field is written in the wrong shape.
 */
describe("Sonarr release profile indexer field per contract (real http)", () => {
  let server: Server;
  let baseUrl: string;
  let serverProfiles: Record<string, unknown>[];
  let writes: WrittenProfile[];
  let serveV5: boolean;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        const url = req.url ?? "";
        const raw = Buffer.concat(chunks).toString("utf8");
        const body = raw ? JSON.parse(raw) : {};

        if (url.startsWith("/api/v5") && !serveV5) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end("{}");
          return;
        }

        const isProfile = /\/api\/v[35]\/releaseprofile(\/\d+)?$/.test(url);
        if (req.method === "GET" && isProfile) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(url.endsWith("/releaseprofile") ? serverProfiles : (serverProfiles[0] ?? {})));
          return;
        }

        if ((req.method === "POST" || req.method === "PUT") && isProfile) {
          writes.push({ method: req.method, path: url, body });
          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ...body, id: 1 }));
          return;
        }

        if (req.method === "DELETE" && isProfile) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end("{}");
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(url.includes("indexer") ? [{ id: 7, name: "MyIndexer" }] : []));
      });
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const reset = (withV5: boolean, profiles: Record<string, unknown>[] = []) => {
    serveV5 = withV5;
    serverProfiles = profiles;
    writes = [];
  };

  const syncAndWrite = async (contract: "v3" | "v5") => {
    const client = new SonarrClient(baseUrl, "key", contract);
    if (contract === "v5") {
      await client.probeApiVersion();
    }
    const cache = new ServerCache({ tags: [], indexers: [{ id: 7, name: "MyIndexer" }] });
    await new ReleaseProfileSonarrSync(client as never).sync([{ name: "HEVC", required: ["hevc"], indexer: "MyIndexer" }], cache);
    return writes.at(-1);
  };

  test("writes indexerId as a scalar on the v3 contract", async () => {
    reset(false);
    const write = await syncAndWrite("v3");

    expect(write?.path).toBe("/api/v3/releaseprofile");
    expect(write?.body).toMatchObject({ indexerId: 7 });
    expect(write?.body).not.toHaveProperty("indexerIds");
  });

  test("writes indexerIds as an array on the v5 contract", async () => {
    reset(true);
    const write = await syncAndWrite("v5");

    expect(write?.path).toBe("/api/v5/releaseprofile");
    expect(write?.body).toMatchObject({ indexerIds: [7] });
    expect(write?.body).not.toHaveProperty("indexerId");
  });

  test("matches a nameless profile by content across both indexer shapes", async () => {
    // The server stores the indexer as an array on v5 and as a scalar on v3; the same config has to
    // be recognised as already in sync either way, or every run would report a phantom change.
    for (const [contract, serverProfile] of [
      ["v3", { id: 9, name: "", enabled: true, required: ["hevc"], ignored: [], indexerId: 7, tags: [] }],
      ["v5", { id: 9, name: null, enabled: true, required: ["hevc"], ignored: [], indexerIds: [7], tags: [] }],
    ] as const) {
      reset(contract === "v5", [serverProfile]);
      const client = new SonarrClient(baseUrl, "key", contract);
      const cache = new ServerCache({ tags: [], indexers: [{ id: 7, name: "MyIndexer" }] });
      const result = await new ReleaseProfileSonarrSync(client as never).sync([{ required: ["hevc"], indexer: "MyIndexer" }], cache);

      expect(result.updated, `expected no update on ${contract}`).toBe(0);
      expect(writes, `expected no write on ${contract}`).toHaveLength(0);
    }
  });
});
