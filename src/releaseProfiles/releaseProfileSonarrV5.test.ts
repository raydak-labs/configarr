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
 * Sonarr v5 added air-date restriction, excluded tags and a multi-indexer form to release profiles.
 * These run against a real HTTP server with the real generated clients so they exercise the whole
 * chain from config through diff to the bytes written, and fail if a field is dropped, written in the
 * wrong shape, or never reconciled on a profile that already exists.
 */
describe("Sonarr release profile v5 fields (real http)", () => {
  let server: Server;
  let baseUrl: string;
  let serverProfiles: Record<string, unknown>[];
  let writes: WrittenProfile[];
  let serveV5: boolean;
  /** Server major version the status endpoint reports. */
  let serverMajor: number;
  /** Tags the fixture has created, so a mid-run create is visible to the next diff pass. */
  let createdTags: { id: number; label: string }[];

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

        if (url.endsWith("/system/status")) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ version: `${serverMajor}.0.0.2569` }));
          return;
        }

        const isProfile = /\/api\/v[35]\/releaseprofile(\/\d+)?$/.test(url);
        const isTag = url === "/api/v3/tag" || url === "/api/v5/tag";
        if (req.method === "GET" && isProfile) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(url.endsWith("/releaseprofile") ? serverProfiles : (serverProfiles[0] ?? {})));
          return;
        }

        if (req.method === "POST" && isTag) {
          // Echo a stable id so a tag created mid-run can be resolved on the next diff pass.
          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ id: 1, label: body.label }));
          return;
        }

        if (req.method === "GET" && isTag) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(createdTags));
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

  const reset = (options: { v5: boolean; major: number; profiles?: Record<string, unknown>[] }) => {
    serveV5 = options.v5;
    serverMajor = options.major;
    serverProfiles = options.profiles ?? [];
    createdTags = [];
    writes = [];
  };

  const sync = async (contract: "v3" | "v5", config: Record<string, unknown>) => {
    const client = new SonarrClient(baseUrl, "key", contract);
    await client.resolveApiVersion(contract);
    const cache = new ServerCache({
      tags: [],
      indexers: [
        { id: 7, name: "MyIndexer" },
        { id: 9, name: "OtherIndexer" },
      ],
    });
    return new ReleaseProfileSonarrSync(client as never).sync([config as never], cache);
  };

  const v5Fields = {
    name: "e2e-hevc",
    required: ["hevc"],
    air_date_restriction: true,
    air_date_grace_period: 14,
    allow_season_pack_without_all_episodes_aired: true,
    excluded_tags: ["anime"],
  };

  describe("v5 server", () => {
    test("writes the air-date and excluded-tag fields on create", async () => {
      reset({ v5: false, major: 5 });
      const result = await sync("v3", v5Fields);

      expect(result.added).toBe(1);
      expect(writes.at(-1)?.body).toMatchObject({
        name: "e2e-hevc",
        airDateRestriction: true,
        airDateGracePeriod: 14,
        allowSeasonPackWithoutAllEpisodesAired: true,
        // The label resolves to the id the fixture assigned when it created the missing tag.
        excludedTags: [1],
      });
    });

    test("reconciles the new fields on a profile that already exists", async () => {
      // The diff is a hand-written field list, so a field missing from it is written on create only
      // and never reported or fixed on an existing profile.
      reset({
        v5: false,
        major: 5,
        profiles: [{ id: 9, name: "e2e-hevc", enabled: true, required: ["hevc"], ignored: [], indexerId: 0, tags: [] }],
      });
      const result = await sync("v3", v5Fields);

      expect(result.updated).toBe(1);
      const write = writes.find((w) => w.method === "PUT");
      expect(write?.body).toMatchObject({
        id: 9,
        airDateRestriction: true,
        airDateGracePeriod: 14,
        allowSeasonPackWithoutAllEpisodesAired: true,
      });
      expect(result.diffEntries[0]).toMatchObject({ action: "update" });
      expect(result.diffEntries[0]?.fieldChanges?.map((c) => c.field)).toEqual(
        expect.arrayContaining(["airDateRestriction", "airDateGracePeriod", "allowSeasonPackWithoutAllEpisodesAired"]),
      );
    });

    test("reports no change on a second run", async () => {
      reset({
        v5: false,
        major: 5,
        profiles: [
          {
            id: 9,
            name: "e2e-hevc",
            enabled: true,
            required: ["hevc"],
            ignored: [],
            indexerId: 0,
            tags: [],
            airDateRestriction: true,
            airDateGracePeriod: 14,
            allowSeasonPackWithoutAllEpisodesAired: true,
            // The id the fixture assigns to the "anime" tag the config excludes.
            excludedTags: [1],
          },
        ],
      });
      const result = await sync("v3", v5Fields);

      expect(result.updated).toBe(0);
      expect(result.added).toBe(0);
      expect(writes).toHaveLength(0);
    });

    test("resolves excluded tag labels into ids", async () => {
      reset({ v5: false, major: 5 });
      const cache = new ServerCache({ tags: [{ id: 42, label: "anime" }] });
      const client = new SonarrClient(baseUrl, "key", "v3");
      await client.resolveApiVersion("v3");
      await new ReleaseProfileSonarrSync(client as never).sync([v5Fields as never], cache);

      expect(writes.at(-1)?.body).toMatchObject({ excludedTags: [42] });
    });

    test("creates an excluded tag that does not exist yet", async () => {
      reset({ v5: false, major: 5 });
      const result = await sync("v3", { ...v5Fields, excluded_tags: ["anime"] });

      expect(result.added).toBe(1);
      // Without scanning excluded_tags for missing labels, an unconfigured-server tag resolves to no
      // ids and the profile is written as if it excluded nothing. The id is whatever the server
      // assigned on create, which this fixture echoes back as 1.
      expect(writes.at(-1)?.body).toMatchObject({ excludedTags: [1] });
    });
  });

  describe("v4 server", () => {
    test("rejects the v5-only fields rather than dropping them", async () => {
      reset({ v5: false, major: 4 });
      await expect(sync("v3", v5Fields)).rejects.toThrow(/need a Sonarr v5 server/);
    });
  });

  describe("multiple indexers", () => {
    test("writes indexerIds as an array on the v5 contract", async () => {
      reset({ v5: true, major: 5 });
      const result = await sync("v5", { name: "e2e-multi", required: ["hevc"], indexer: ["MyIndexer", "OtherIndexer"] });

      expect(result.added).toBe(1);
      expect(writes.at(-1)?.body).toMatchObject({ indexerIds: [7, 9] });
    });

    test("keeps writing a single indexerId on the v3 contract", async () => {
      reset({ v5: false, major: 5 });
      const result = await sync("v3", { name: "e2e-single", required: ["hevc"], indexer: "MyIndexer" });

      expect(result.added).toBe(1);
      expect(writes.at(-1)?.body).toMatchObject({ indexerId: 7 });
      expect(writes.at(-1)?.body).not.toHaveProperty("indexerIds");
    });

    test("rejects a list of indexers on a contract with no indexerIds", async () => {
      // Only the v5 contract has the array field, so the list cannot be expressed on v3.
      reset({ v5: false, major: 5 });
      await expect(sync("v3", { name: "e2e-multi", required: ["hevc"], indexer: ["MyIndexer", "OtherIndexer"] })).rejects.toThrow(
        /lists more than one indexer/,
      );
    });
  });
});
