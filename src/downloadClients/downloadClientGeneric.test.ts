import { describe, expect, test, vi, beforeEach } from "vitest";
import { GenericDownloadClientSync } from "./downloadClientGeneric";
import type { InputConfigDownloadClient } from "../types/config.types";
import type { DownloadClientResource } from "../types/download-client.types";
import { ServerCache } from "../cache";
import { DownloadProtocol } from "../__generated__/radarr/data-contracts";
import type { TagResource } from "../__generated__/radarr/data-contracts";
import { ArrType } from "../types/common.types";

// Mock the unified client
vi.mock("../clients/unified-client", () => ({
  getUnifiedClient: vi.fn(() => ({
    getDownloadClients: vi.fn(),
    getDownloadClientSchema: vi.fn(),
    createDownloadClient: vi.fn(),
    updateDownloadClient: vi.fn(),
    deleteDownloadClient: vi.fn(),
    testDownloadClient: vi.fn(),
  })),
}));

describe("GenericDownloadClientSync – ARR type handling", () => {
  let sync: GenericDownloadClientSync;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor and ARR type initialization", () => {
    test("creates instance for RADARR", () => {
      sync = new GenericDownloadClientSync("RADARR");
      expect(sync).toBeInstanceOf(GenericDownloadClientSync);
    });

    test("creates instance for SONARR", () => {
      sync = new GenericDownloadClientSync("SONARR");
      expect(sync).toBeInstanceOf(GenericDownloadClientSync);
    });

    test("creates instance for LIDARR", () => {
      sync = new GenericDownloadClientSync("LIDARR");
      expect(sync).toBeInstanceOf(GenericDownloadClientSync);
    });

    test("creates instance for READARR", () => {
      sync = new GenericDownloadClientSync("READARR");
      expect(sync).toBeInstanceOf(GenericDownloadClientSync);
    });

    test("creates instance for WHISPARR", () => {
      sync = new GenericDownloadClientSync("WHISPARR");
      expect(sync).toBeInstanceOf(GenericDownloadClientSync);
    });
  });

  describe("ARR type-specific behavior", () => {
    test("handles category field mapping correctly for different ARR types", () => {
      const testCases: [ArrType, string][] = [
        ["SONARR", "tvCategory"],
        ["LIDARR", "musicCategory"],
        ["RADARR", "movieCategory"],
        ["WHISPARR", "movieCategory"],
        ["READARR", "bookCategory"],
      ];

      testCases.forEach(([arrType, expectedField]) => {
        sync = new GenericDownloadClientSync(arrType);
        const result = sync.normalizeConfigFields({ category: "test" }, arrType);
        expect(result).toHaveProperty(expectedField, "test");
        expect(result).toHaveProperty("category", "test");
      });
    });
  });

  describe("download client comparison logic", () => {
    const makeCache = () => new ServerCache([], [], [], []);

    test("compares clients correctly with omission semantics", () => {
      sync = new GenericDownloadClientSync("RADARR");
      const cache = makeCache();

      const serverClient: DownloadClientResource = {
        id: 1,
        name: "Test Client",
        implementation: "qBittorrent",
        protocol: DownloadProtocol.Torrent,
        enable: true,
        priority: 1,
        fields: [{ name: "host", value: "localhost" }],
        tags: [],
        removeCompletedDownloads: true,
        removeFailedDownloads: true,
        configContract: "",
      };

      const configClient: InputConfigDownloadClient = {
        name: "Test Client",
        type: "qBittorrent",
        fields: { host: "localhost" },
        // enable and priority omitted - should be treated as "do not manage"
      };

      const isEqual = sync.isDownloadClientEqual(configClient, serverClient, cache);
      expect(isEqual).toBe(true);
    });

    test("detects differences in specified fields", () => {
      sync = new GenericDownloadClientSync("RADARR");
      const cache = makeCache();

      const serverClient: DownloadClientResource = {
        id: 1,
        name: "Test Client",
        implementation: "qBittorrent",
        protocol: DownloadProtocol.Torrent,
        enable: true,
        priority: 1,
        fields: [{ name: "host", value: "localhost" }],
        tags: [],
        removeCompletedDownloads: true,
        removeFailedDownloads: true,
        configContract: "",
      };

      const configClient: InputConfigDownloadClient = {
        name: "Test Client",
        type: "qBittorrent",
        enable: false, // explicitly different
        fields: { host: "localhost" },
      };

      const isEqual = sync.isDownloadClientEqual(configClient, serverClient, cache);
      expect(isEqual).toBe(false);
    });

    test("handles exact field name matches", () => {
      sync = new GenericDownloadClientSync("SONARR");
      const cache = makeCache();

      const serverClient: DownloadClientResource = {
        id: 1,
        name: "Test Client",
        implementation: "qBittorrent",
        protocol: DownloadProtocol.Torrent,
        enable: true,
        priority: 1,
        fields: [
          { name: "host", value: "localhost" },
          { name: "port", value: "8080" },
        ],
        tags: [],
        removeCompletedDownloads: true,
        removeFailedDownloads: true,
        configContract: "",
      };

      const configClient: InputConfigDownloadClient = {
        name: "Test Client",
        type: "qBittorrent",
        fields: {
          host: "localhost",
          port: "8080", // exact field name match
        },
      };

      const isEqual = sync.isDownloadClientEqual(configClient, serverClient, cache);
      expect(isEqual).toBe(true);
    });
  });

  describe("partial update logic", () => {
    test("correctly identifies when to use partial updates", () => {
      sync = new GenericDownloadClientSync("RADARR");

      // Config with no properties should not use partial update
      const createConfig: InputConfigDownloadClient = {
        name: "New Client",
        type: "qBittorrent",
      };
      expect(sync.shouldUsePartialUpdate(createConfig)).toBe(false);

      // Config with field overrides should not use partial update (full update)
      const fieldConfig: InputConfigDownloadClient = {
        name: "Field Client",
        type: "qBittorrent",
        fields: { host: "localhost" },
      };
      expect(sync.shouldUsePartialUpdate(fieldConfig)).toBe(false);

      // Config with single top-level property should use partial update
      const partialConfig: InputConfigDownloadClient = {
        name: "Partial Client",
        type: "qBittorrent",
        enable: false,
      };
      expect(sync.shouldUsePartialUpdate(partialConfig)).toBe(true);

      // Config with too many top-level properties should not use partial update
      const fullConfig: InputConfigDownloadClient = {
        name: "Full Client",
        type: "qBittorrent",
        enable: false,
        priority: 1,
        remove_completed_downloads: true,
        remove_failed_downloads: false,
        tags: ["test"],
      };
      expect(sync.shouldUsePartialUpdate(fullConfig)).toBe(false);
    });
  });

  describe("client filtering logic", () => {
    test("correctly identifies unmanaged clients", () => {
      sync = new GenericDownloadClientSync("RADARR");

      const serverClients: DownloadClientResource[] = [
        {
          id: 1,
          name: "Managed Client",
          implementation: "qBittorrent",
          protocol: DownloadProtocol.Torrent,
          enable: true,
          priority: 1,
          fields: [],
          tags: [],
          removeCompletedDownloads: true,
          removeFailedDownloads: true,
          configContract: "",
        },
        {
          id: 2,
          name: "Unmanaged Client",
          implementation: "Transmission",
          protocol: DownloadProtocol.Torrent,
          enable: true,
          priority: 2,
          fields: [],
          tags: [],
          removeCompletedDownloads: true,
          removeFailedDownloads: true,
          configContract: "",
        },
      ];

      const configClients: InputConfigDownloadClient[] = [
        {
          name: "Managed Client",
          type: "qBittorrent",
        },
      ];

      const deleteConfig = { enabled: true, ignore: [] };

      const unmanagedClients = sync.filterUnmanagedClients(serverClients, configClients, deleteConfig);

      expect(unmanagedClients).toHaveLength(1);
      expect(unmanagedClients[0]?.name).toBe("Unmanaged Client");
      expect(unmanagedClients[0]?.implementation).toBe("Transmission");
    });

    test("respects delete unmanaged disabled", () => {
      sync = new GenericDownloadClientSync("RADARR");

      const serverClients: DownloadClientResource[] = [
        {
          id: 1,
          name: "Client",
          implementation: "qBittorrent",
          protocol: DownloadProtocol.Torrent,
          enable: true,
          priority: 1,
          fields: [],
          tags: [],
          removeCompletedDownloads: true,
          removeFailedDownloads: true,
          configContract: "",
        },
      ];

      const configClients: InputConfigDownloadClient[] = [];

      const unmanagedClients = sync.filterUnmanagedClients(serverClients, configClients, false);

      expect(unmanagedClients).toEqual([]);
    });

    test("respects ignore list", () => {
      sync = new GenericDownloadClientSync("RADARR");

      const serverClients: DownloadClientResource[] = [
        {
          id: 1,
          name: "Ignored Client",
          implementation: "qBittorrent",
          protocol: DownloadProtocol.Torrent,
          enable: true,
          priority: 1,
          fields: [],
          tags: [],
          removeCompletedDownloads: true,
          removeFailedDownloads: true,
          configContract: "",
        },
      ];

      const configClients: InputConfigDownloadClient[] = [];

      const deleteConfig = { enabled: true, ignore: ["Ignored Client"] };

      const unmanagedClients = sync.filterUnmanagedClients(serverClients, configClients, deleteConfig);

      expect(unmanagedClients).toEqual([]);
    });
  });
});
