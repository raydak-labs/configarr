import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { SonarrClient } from "./sonarr-client";

interface Request {
  method: string;
  url: string;
  body: unknown;
}

/**
 * Routing coverage for the two Sonarr API contracts. These run against a real HTTP server with the
 * real generated clients, so they fail when a route actually moves or a guard stops firing, rather
 * than when a mock is re-shaped.
 */
describe("SonarrClient contract routing (real http + real generated clients)", () => {
  let server: Server;
  let baseUrl: string;
  let requests: Request[];
  /** Set false to make the server refuse /api/v5/*, simulating a Sonarr v4 instance. */
  let serveV5: boolean;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        const url = req.url ?? "";
        const raw = Buffer.concat(chunks).toString("utf8");
        requests.push({ method: req.method ?? "", url, body: raw ? JSON.parse(raw) : undefined });

        const isV5 = url.startsWith("/api/v5");
        if (isV5 && !serveV5) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ message: "Not found" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ id: 1 }));
      });
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const lastRequest = () => {
    const request = requests.at(-1);
    expect(request).toBeDefined();
    return request as Request;
  };

  const reset = (withV5: boolean) => {
    requests = [];
    serveV5 = withV5;
  };

  describe("probeApiVersion", () => {
    test("resolves v3 when the v5 route is absent, as on Sonarr v4", async () => {
      reset(false);
      const client = new SonarrClient(baseUrl, "key");
      expect(await client.resolveApiVersion()).toBe("v3");
      expect(client.apiVersion).toBe("v3");
    });

    test("resolves v5 when the v5 route answers, as on Sonarr v5", async () => {
      reset(true);
      const client = new SonarrClient(baseUrl, "key");
      expect(await client.resolveApiVersion()).toBe("v5");
      expect(client.apiVersion).toBe("v5");
    });

    test("an explicit override wins without probing the instance", async () => {
      // The override is the escape hatch for an instance where the probe would guess wrong, so it
      // has to take precedence over what the server actually answers.
      reset(true);
      const client = new SonarrClient(baseUrl, "key", "v3");
      expect(await client.resolveApiVersion("v3")).toBe("v3");
      expect(client.apiVersion).toBe("v3");

      await client.updateMediamanagement("1", { id: 1 });
      expect(lastRequest().url).toBe("/api/v3/config/mediamanagement/1");
    });

    test("an explicit v5 override binds the contract on an instance that only serves v3", async () => {
      // The override is honoured even against an instance that does not answer v5, so the request
      // is attempted at the v5 path and fails there rather than quietly succeeding elsewhere.
      reset(false);
      const client = new SonarrClient(baseUrl, "key", "v5");
      expect(await client.resolveApiVersion("v5")).toBe("v5");

      await expect(client.updateMediamanagement("1", { id: 1 })).rejects.toThrow(/Not found/);
      expect(lastRequest().url).toBe("/api/v5/settings/mediamanagement/1");
    });
  });

  describe("settings group routing", () => {
    test("media management writes to /api/v3/config/mediamanagement on a v3 contract", async () => {
      reset(false);
      const client = new SonarrClient(baseUrl, "key");
      await client.updateMediamanagement("1", { id: 1, recycleBin: "/tmp" });
      expect(lastRequest().url).toBe("/api/v3/config/mediamanagement/1");
    });

    test("media management writes to /api/v5/settings/mediamanagement on a v5 contract", async () => {
      reset(true);
      const client = new SonarrClient(baseUrl, "key", "v5");
      await client.updateMediamanagement("1", { id: 1, recycleBin: "/tmp" });
      expect(lastRequest().url).toBe("/api/v5/settings/mediamanagement/1");
    });

    test("naming and ui config move to the settings group with the contract", async () => {
      reset(true);
      const client = new SonarrClient(baseUrl, "key", "v5");
      await client.updateNaming("1", { id: 1 });
      expect(lastRequest().url).toBe("/api/v5/settings/naming/1");
      await client.updateUiConfig("1", { id: 1 });
      expect(lastRequest().url).toBe("/api/v5/settings/ui/1");
      await client.updateDownloadClientConfig("1", { id: 1 });
      expect(lastRequest().url).toBe("/api/v5/settings/downloadclient/1");
    });
  });

  describe("operations the v5 contract cannot serve", () => {
    test("rejects quality definition size limits on v5 instead of dropping them", async () => {
      reset(true);
      const client = new SonarrClient(baseUrl, "key", "v5");
      await expect(
        client.updateQualityDefinitions([{ id: 1, quality: { id: 1, name: "WEBDL-1080p" }, preferredSize: 50 }]),
      ).rejects.toThrow(/size limits .* are not supported on the Sonarr v5 API/);
    });

    test("still writes quality definitions without size limits on v5", async () => {
      reset(true);
      const client = new SonarrClient(baseUrl, "key", "v5");
      await client.updateQualityDefinitions([{ id: 1, quality: { id: 1, name: "WEBDL-1080p" }, title: "WEBDL-1080p" }]);

      // The write is followed by a re-read, so assert on the write rather than the last request.
      const write = requests.find((request) => request.method === "PUT");
      expect(write?.url).toBe("/api/v5/qualitydefinition");
    });

    test("rejects root folder updates on v5, where the contract has no PUT", async () => {
      reset(true);
      const client = new SonarrClient(baseUrl, "key", "v5");
      await expect(client.updateRootFolder("1", { id: 1, path: "/data" })).rejects.toThrow(
        /Updating root folders is not supported on the Sonarr v5 API/,
      );
    });

    test("rejects root folder updates on v3 as well, unchanged from before", async () => {
      reset(false);
      const client = new SonarrClient(baseUrl, "key");
      await expect(client.updateRootFolder("1", { id: 1, path: "/data" })).rejects.toThrow(/Sonarr does not support updating root folders/);
    });
  });

  describe("cross-contract request mapping", () => {
    test("fills the specification fields v5 requires but v3 leaves optional", async () => {
      reset(true);
      const client = new SonarrClient(baseUrl, "key", "v5");
      await client.createCustomFormat({ name: "CF", specifications: [{ implementation: "SizeSpecification" }] });

      const body = lastRequest().body as { specifications: Array<Record<string, unknown>> };
      expect(body.specifications[0]).toMatchObject({
        implementation: "SizeSpecification",
        name: null,
        implementationName: null,
        infoLink: null,
        fields: null,
      });
    });

    test("leaves the v3 custom format request body untouched", async () => {
      reset(false);
      const client = new SonarrClient(baseUrl, "key");
      await client.createCustomFormat({ name: "CF", specifications: [{ implementation: "SizeSpecification" }] });

      const body = lastRequest().body as { specifications: Array<Record<string, unknown>> };
      expect(body.specifications[0]).toEqual({ implementation: "SizeSpecification" });
    });
  });
});
