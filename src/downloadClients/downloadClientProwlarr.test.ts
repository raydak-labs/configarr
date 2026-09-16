import { beforeEach, describe, expect, test, vi } from "vitest";
import { ServerCache } from "../cache";
import { getClient } from "../clients/client";
import { logger } from "../logger";
import type { InputConfigDownloadClient } from "../types/config.types";
import type { DownloadClientResource } from "../__generated__/prowlarr/data-contracts";
import { ProwlarrDownloadClientSync } from "./downloadClientProwlarr";

vi.mock("../clients/client", () => ({
  getClient: vi.fn(() => ({
    getDownloadClients: vi.fn(),
    getDownloadClientSchema: vi.fn(),
    createDownloadClient: vi.fn(),
    updateDownloadClient: vi.fn(),
    deleteDownloadClient: vi.fn(),
    testDownloadClient: vi.fn(),
  })),
}));

const qbitSchema = (extra: Record<string, unknown> = {}): DownloadClientResource =>
  ({
    implementation: "QBittorrent",
    implementationName: "qBittorrent",
    protocol: "torrent",
    fields: [{ name: "host", value: "" }],
    configContract: "QBittorrentSettings",
    infoLink: "",
    ...extra,
  }) as DownloadClientResource;

describe("ProwlarrDownloadClientSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveConfig categories", () => {
    const config: InputConfigDownloadClient = {
      name: "qBittorrent",
      type: "qbittorrent",
      enable: false,
      fields: { host: "qbittorrent" },
    };

    test("PROWLARR create uses schema categories (default [])", async () => {
      const sync = new ProwlarrDownloadClientSync();
      const cache = new ServerCache();
      sync.setDownloadClientSchema([qbitSchema({ categories: [] })]);

      const payload = await sync.resolveConfig(config, cache);
      expect(payload.categories).toEqual([]);
      expect(payload).not.toHaveProperty("removeCompletedDownloads");
      expect(payload).not.toHaveProperty("removeFailedDownloads");
    });

    test("PROWLARR create uses [] when schema omits categories", async () => {
      const sync = new ProwlarrDownloadClientSync();
      const cache = new ServerCache();
      sync.setDownloadClientSchema([qbitSchema()]);

      const payload = await sync.resolveConfig(config, cache);
      expect(payload.categories).toEqual([]);
      expect(payload).not.toHaveProperty("removeCompletedDownloads");
    });

    test("PROWLARR update keeps server categories", async () => {
      const sync = new ProwlarrDownloadClientSync();
      const cache = new ServerCache();
      sync.setDownloadClientSchema([qbitSchema({ categories: [] })]);
      const server = qbitSchema({
        id: 1,
        name: "qBittorrent",
        categories: [{ clientCategory: "tv", categories: [5000] }],
      });

      const payload = await sync.resolveConfig(config, cache, server);
      expect(payload.categories).toEqual([{ clientCategory: "tv", categories: [5000] }]);
      expect(payload).not.toHaveProperty("removeCompletedDownloads");
    });
  });

  describe("partial update", () => {
    test("keeps server fields when enable, priority, and tags are all set", async () => {
      const sync = new ProwlarrDownloadClientSync();
      const cache = new ServerCache({ tags: [{ id: 3, label: "tv" }] });
      sync.setDownloadClientSchema([
        qbitSchema({
          fields: [
            { name: "host", value: "" },
            { name: "password", value: "" },
          ],
        }),
      ]);
      const server = qbitSchema({
        id: 1,
        name: "qBittorrent",
        enable: true,
        priority: 1,
        tags: [3],
        fields: [
          { name: "host", value: "keep-me" },
          { name: "password", value: "********" },
        ],
      });
      const config: InputConfigDownloadClient = {
        name: "qBittorrent",
        type: "qbittorrent",
        enable: false,
        priority: 10,
        tags: ["tv"],
      };

      expect(sync.shouldUsePartialUpdate(config)).toBe(true);

      const payload = await sync.resolveConfig(config, cache, server, true, false);
      expect(payload.fields).toEqual([
        { name: "host", value: "keep-me" },
        { name: "password", value: "********" },
      ]);
      expect(payload.enable).toBe(false);
      expect(payload.priority).toBe(10);
      expect(payload.tags).toEqual([3]);
    });
  });

  describe("syncDownloadClients failed create", () => {
    const mockClient = (createDownloadClient: ReturnType<typeof vi.fn>) => {
      vi.mocked(getClient).mockReturnValue({
        getDownloadClients: vi.fn(async () => []),
        getDownloadClientSchema: vi.fn(async () => [qbitSchema({ categories: [] }), qbitSchema({ implementation: "Transmission" })]),
        createDownloadClient,
        updateDownloadClient: vi.fn(),
        deleteDownloadClient: vi.fn(),
        testDownloadClient: vi.fn(),
      } as never);
    };

    test("failed create does not throw, omits create from diff, and does not log no changes needed", async () => {
      mockClient(
        vi.fn(async () => {
          throw new Error("HTTP Error: 409 Conflict. NOT NULL constraint failed: DownloadClients.Categories");
        }),
      );

      const infoSpy = vi.spyOn(logger, "info");
      const warnSpy = vi.spyOn(logger, "warn");
      try {
        const sync = new ProwlarrDownloadClientSync();
        const result = await sync.syncDownloadClients(
          { download_clients: { data: [{ name: "qBittorrent", type: "qbittorrent", fields: { host: "qbittorrent" } }] } },
          new ServerCache(),
        );

        expect(result.added).toBe(0);
        expect(result.diffEntries).toEqual([]);
        expect(infoSpy.mock.calls.flat().join("\n")).not.toMatch(/no changes needed/);
        expect(warnSpy.mock.calls.flat().join("\n")).toMatch(/1 change\(s\) failed/);
      } finally {
        infoSpy.mockRestore();
        warnSpy.mockRestore();
      }
    });

    test("mixed create success and failure reports success and warns about the failure", async () => {
      mockClient(
        vi.fn(async (payload: { name?: string }) => {
          if (payload.name === "Broken") {
            throw new Error("HTTP Error: 409 Conflict");
          }
          return payload;
        }),
      );

      const infoSpy = vi.spyOn(logger, "info");
      const warnSpy = vi.spyOn(logger, "warn");
      try {
        const sync = new ProwlarrDownloadClientSync();
        const result = await sync.syncDownloadClients(
          {
            download_clients: {
              data: [
                { name: "qBittorrent", type: "qbittorrent", fields: { host: "qbittorrent" } },
                { name: "Broken", type: "transmission", fields: { host: "x" } },
              ],
            },
          },
          new ServerCache(),
        );

        expect(result.added).toBe(1);
        expect(result.diffEntries).toEqual([{ resourceType: "DownloadClient", name: "qBittorrent", action: "create" }]);
        expect(infoSpy.mock.calls.flat().join("\n")).toMatch(/\+1 ~/);
        expect(warnSpy.mock.calls.flat().join("\n")).toMatch(/1 change\(s\) failed/);
      } finally {
        infoSpy.mockRestore();
        warnSpy.mockRestore();
      }
    });

    test("successful create is reported in diffEntries", async () => {
      mockClient(vi.fn(async (c) => c));

      const sync = new ProwlarrDownloadClientSync();
      const result = await sync.syncDownloadClients(
        { download_clients: { data: [{ name: "qBittorrent", type: "qbittorrent", fields: { host: "qbittorrent" } }] } },
        new ServerCache(),
      );

      expect(result.added).toBe(1);
      expect(result.diffEntries).toEqual([{ resourceType: "DownloadClient", name: "qBittorrent", action: "create" }]);
    });
  });
});
