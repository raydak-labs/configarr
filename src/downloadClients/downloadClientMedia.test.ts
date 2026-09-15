import { describe, expect, test } from "vitest";
import { DownloadProtocol } from "../__generated__/radarr/data-contracts";
import { ServerCache } from "../cache";
import { MediaArrType } from "../types/common.types";
import type { InputConfigDownloadClient } from "../types/config.types";
import { MediaDownloadClientResource } from "./downloadClient.types";
import { MediaDownloadClientSync } from "./downloadClientMedia";

const qbitSchema = (extra: Record<string, unknown> = {}): MediaDownloadClientResource =>
  ({
    implementation: "QBittorrent",
    implementationName: "qBittorrent",
    protocol: DownloadProtocol.Torrent,
    fields: [{ name: "host", value: "" }],
    configContract: "QBittorrentSettings",
    infoLink: "",
    ...extra,
  }) as MediaDownloadClientResource;

describe("MediaDownloadClientSync – ARR type handling", () => {
  let sync: MediaDownloadClientSync;

  describe("constructor and ARR type initialization", () => {
    test("creates instance for RADARR", () => {
      sync = new MediaDownloadClientSync("RADARR");
      expect(sync).toBeInstanceOf(MediaDownloadClientSync);
    });

    test("creates instance for SONARR", () => {
      sync = new MediaDownloadClientSync("SONARR");
      expect(sync).toBeInstanceOf(MediaDownloadClientSync);
    });

    test("creates instance for LIDARR", () => {
      sync = new MediaDownloadClientSync("LIDARR");
      expect(sync).toBeInstanceOf(MediaDownloadClientSync);
    });

    test("creates instance for READARR", () => {
      sync = new MediaDownloadClientSync("READARR");
      expect(sync).toBeInstanceOf(MediaDownloadClientSync);
    });

    test("creates instance for WHISPARR", () => {
      sync = new MediaDownloadClientSync("WHISPARR");
      expect(sync).toBeInstanceOf(MediaDownloadClientSync);
    });
  });

  describe("ARR type-specific behavior", () => {
    test("normalizes fields consistently across different ARR types", () => {
      const testCases: [MediaArrType][] = [["SONARR"], ["LIDARR"], ["RADARR"], ["WHISPARR"], ["READARR"]];

      testCases.forEach(([arrType]) => {
        sync = new MediaDownloadClientSync(arrType);
        // Test snake_case to camelCase normalization (no category handling)
        const result = sync.normalizeConfigFields(
          {
            use_ssl: true,
            api_key: "test",
            movie_imported_category: "test",
          },
          arrType,
        );

        expect(result).toHaveProperty("useSsl", true);
        expect(result).toHaveProperty("apiKey", "test");
        expect(result).toHaveProperty("movieImportedCategory", "test");
        // Backward compatibility
        expect(result).toHaveProperty("use_ssl", true);
        expect(result).toHaveProperty("api_key", "test");
        expect(result).toHaveProperty("movie_imported_category", "test");
      });
    });
  });

  describe("download client comparison logic", () => {
    const makeCache = () => new ServerCache([], [], [], []);

    test("compares clients correctly with omission semantics", () => {
      sync = new MediaDownloadClientSync("RADARR");
      const cache = makeCache();

      const serverClient: MediaDownloadClientResource = {
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
      };

      const { equal: isEqual } = sync.isDownloadClientEqual(configClient, serverClient, cache);
      expect(isEqual).toBe(true);
    });

    test("detects differences in specified fields", () => {
      sync = new MediaDownloadClientSync("RADARR");
      const cache = makeCache();

      const serverClient: MediaDownloadClientResource = {
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

      const { equal: isEqual } = sync.isDownloadClientEqual(configClient, serverClient, cache);
      expect(isEqual).toBe(false);
    });

    test("handles exact field name matches", () => {
      sync = new MediaDownloadClientSync("SONARR");
      const cache = makeCache();

      const serverClient: MediaDownloadClientResource = {
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
          port: "8080",
        },
      };

      const { equal: isEqual } = sync.isDownloadClientEqual(configClient, serverClient, cache);
      expect(isEqual).toBe(true);
    });

    test("handles password and apiKey masking without false diff", () => {
      sync = new MediaDownloadClientSync("RADARR");
      const cache = new ServerCache([], [], [], []);

      // Server with masked password
      const serverClient: MediaDownloadClientResource = {
        id: 2,
        name: "qBit 4K",
        enable: false,
        protocol: DownloadProtocol.Torrent,
        priority: 1,
        removeCompletedDownloads: true,
        removeFailedDownloads: true,
        implementation: "qBittorrent",
        fields: [
          { name: "host", value: "qbittorrent" },
          { name: "port", value: 8080 },
          { name: "password", value: "********" }, // Masked password from server
          { name: "apiKey", value: "********" }, // Masked api_key from server
        ],
        tags: [],
      };

      // Config with actual password
      const configClient: InputConfigDownloadClient = {
        name: "qBit 4K",
        type: "qbittorrent",
        enable: false,
        priority: 1,
        fields: {
          host: "qbittorrent",
          port: 8080,
          password: "changeme_p", // Actual password in config
          api_key: "changeme_k", // Actual api_key in config
        },
      };

      const { equal: isEqual } = sync.isDownloadClientEqual(configClient, serverClient, cache);
      expect(isEqual).toBe(true); // Should NOT detect changes due to password masking
    });

    test("uses exact field names without false diff", () => {
      sync = new MediaDownloadClientSync("RADARR");
      const cache = new ServerCache([], [], [], []);
      cache.tags = [
        { id: 2, label: "4K" },
        { id: 3, label: "Anime" },
      ];

      // EXACT server data from your JSON
      const serverClient: MediaDownloadClientResource = {
        enable: false,
        protocol: DownloadProtocol.Torrent,
        priority: 1,
        removeCompletedDownloads: true,
        removeFailedDownloads: true,
        name: "qBit 4K",
        fields: [
          { name: "host", value: "qbittorrent" },
          { name: "port", value: 8080 },
          { name: "useSsl", value: false },
          { name: "urlBase", value: "/" },
          { name: "username", value: "sonarr" },
          { name: "password", value: "changeme" },
          { name: "movieCategory", value: "radarr" },
          { name: "movieImportedCategory", value: "series-4k" },
          { name: "recentMoviePriority", value: 0 },
          { name: "olderMoviePriority", value: 0 },
          { name: "initialState", value: 0 },
          { name: "sequentialOrder", value: false },
          { name: "firstAndLast", value: false },
          { name: "contentLayout", value: 0 },
        ],
        implementationName: "qBittorrent",
        implementation: "QBittorrent",
        configContract: "QBittorrentSettings",
        infoLink: "https://wiki.servarr.com/radarr/supported#qbittorrent",
        tags: [2, 3],
        id: 2,
      };

      // Config should use the exact field name from server schema
      const configClient: InputConfigDownloadClient = {
        name: "qBit 4K",
        type: "qbittorrent",
        enable: false,
        priority: 1,
        remove_completed_downloads: true,
        remove_failed_downloads: true,
        tags: ["4K", "Anime"],
        fields: {
          host: "qbittorrent",
          port: 8080,
          use_ssl: false,
          url_base: "/",
          username: "sonarr",
          password: "changeme",
          movieImportedCategory: "series-4k", // Use exact field name required by qBittorrent in Radarr
        },
      };

      const { equal: isEqual } = sync.isDownloadClientEqual(configClient, serverClient, cache);

      // Now it should be true since we have the right field mapping
      expect(isEqual).toBe(true); // Should NOT detect changes anymore
    });

    test("update_password forces password comparison", () => {
      sync = new MediaDownloadClientSync("RADARR");
      const cache = new ServerCache([], [], [], []);

      // Server with masked password
      const serverClient: MediaDownloadClientResource = {
        id: 2,
        name: "qBit 4K",
        enable: false,
        protocol: DownloadProtocol.Torrent,
        priority: 1,
        implementation: "qBittorrent",
        fields: [
          { name: "host", value: "qbittorrent" },
          { name: "port", value: 8080 },
          { name: "password", value: "********" }, // Masked password from server
        ],
        tags: [],
      };

      // Config with different password
      const configClient: InputConfigDownloadClient = {
        name: "qBit 4K",
        type: "qbittorrent",
        enable: false,
        priority: 1,
        fields: {
          host: "qbittorrent",
          port: 8080,
          password: "different-password", // Different password in config
        },
      };

      // Without update_password, should be equal (password masked)
      const { equal: isEqualWithoutUpdate } = sync.isDownloadClientEqual(configClient, serverClient, cache, false);
      expect(isEqualWithoutUpdate).toBe(true);

      // With update_password, should NOT be equal (different passwords)
      const { equal: isEqualWithUpdate } = sync.isDownloadClientEqual(configClient, serverClient, cache, true);
      expect(isEqualWithUpdate).toBe(false);
    });
  });

  describe("partial update logic", () => {
    test("correctly identifies when to use partial updates", () => {
      sync = new MediaDownloadClientSync("RADARR");

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
      sync = new MediaDownloadClientSync("RADARR");

      const serverClients: MediaDownloadClientResource[] = [
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
      sync = new MediaDownloadClientSync("RADARR");

      const serverClients: MediaDownloadClientResource[] = [
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

      const unmanagedClients = sync.filterUnmanagedClients(serverClients, configClients, { enabled: false });

      expect(unmanagedClients).toEqual([]);
    });

    test("respects ignore list", () => {
      sync = new MediaDownloadClientSync("RADARR");

      const serverClients: MediaDownloadClientResource[] = [
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

  describe("resolveConfig", () => {
    const config: InputConfigDownloadClient = {
      name: "qBittorrent",
      type: "qbittorrent",
      enable: false,
      fields: { host: "qbittorrent" },
    };

    test("RADARR create does not set categories", async () => {
      const sync = new MediaDownloadClientSync("RADARR");
      const cache = new ServerCache([], [], [], []);
      cache.setDownloadClientSchema([qbitSchema({ categories: [] })]);

      const payload = await sync.resolveConfig(config, cache);
      expect(payload).not.toHaveProperty("categories");
    });
  });
});
