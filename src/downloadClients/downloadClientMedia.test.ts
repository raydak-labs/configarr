import { describe, expect, test, vi } from "vitest";
vi.mock("../env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../env")>();
  return {
    ...actual,
    getEnvs: vi.fn(() => ({ LOG_LEVEL: "fatal", DRY_RUN: false, CONFIGARR_ENFORCE_CONFIG_VALIDATION: false })),
  };
});

import { DownloadProtocol } from "../__generated__/radarr/data-contracts";
import type { DownloadClientResource } from "../__generated__/radarr/data-contracts";
import type { DownloadClientsClient, TagsClient } from "../clients/capabilities";
import { ServerCache } from "../cache";
import type { DiffEntry } from "../diffReport/diffReport.types";
import { getEnvs } from "../env";
import { MediaArrType } from "../types/common.types";
import type { InputConfigDownloadClient } from "../types/config.types";
import type { DownloadClientSyncResult } from "./downloadClient.types";
import { MediaDownloadClientSync } from "./downloadClientMedia";
import { LidarrDownloadClientSync } from "./downloadClientLidarr";
import { ReadarrDownloadClientSync } from "./downloadClientReadarr";
import { RadarrDownloadClientSync } from "./downloadClientRadarr";
import { SonarrDownloadClientSync } from "./downloadClientSonarr";
import { WhisparrDownloadClientSync } from "./downloadClientWhisparr";

const syncByArrType: Record<MediaArrType, () => MediaDownloadClientSync<DownloadClientResource>> = {
  RADARR: () => new RadarrDownloadClientSync({} as any),
  SONARR: () => new SonarrDownloadClientSync({} as any),
  LIDARR: () => new LidarrDownloadClientSync({} as any),
  READARR: () => new ReadarrDownloadClientSync({} as any),
  WHISPARR: () => new WhisparrDownloadClientSync({} as any),
};

const qbitSchema = (extra: Record<string, unknown> = {}): DownloadClientResource =>
  ({
    implementation: "QBittorrent",
    implementationName: "qBittorrent",
    protocol: DownloadProtocol.Torrent,
    fields: [{ name: "host", value: "" }],
    configContract: "QBittorrentSettings",
    infoLink: "",
    ...extra,
  }) as DownloadClientResource;

describe("MediaDownloadClientSync – ARR type handling", () => {
  describe("constructor and ARR type initialization", () => {
    test("creates instance for RADARR", () => {
      expect(syncByArrType.RADARR()).toBeInstanceOf(MediaDownloadClientSync);
    });

    test("creates instance for SONARR", () => {
      expect(syncByArrType.SONARR()).toBeInstanceOf(MediaDownloadClientSync);
    });

    test("creates instance for LIDARR", () => {
      expect(syncByArrType.LIDARR()).toBeInstanceOf(MediaDownloadClientSync);
    });

    test("creates instance for READARR", () => {
      expect(syncByArrType.READARR()).toBeInstanceOf(MediaDownloadClientSync);
    });

    test("creates instance for WHISPARR", () => {
      expect(syncByArrType.WHISPARR()).toBeInstanceOf(MediaDownloadClientSync);
    });
  });

  describe("ARR type-specific behavior", () => {
    test("normalizes fields consistently across different ARR types", () => {
      const testCases: [MediaArrType][] = [["SONARR"], ["LIDARR"], ["RADARR"], ["WHISPARR"], ["READARR"]];

      testCases.forEach(([arrType]) => {
        const sync = syncByArrType[arrType]();
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
    const makeCache = () => new ServerCache();

    test("compares clients correctly with omission semantics", () => {
      const sync = syncByArrType.RADARR();
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
      };

      const { equal: isEqual } = sync.isDownloadClientEqual(configClient, serverClient, cache);
      expect(isEqual).toBe(true);
    });

    test("detects differences in specified fields", () => {
      const sync = syncByArrType.RADARR();
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

      const { equal: isEqual } = sync.isDownloadClientEqual(configClient, serverClient, cache);
      expect(isEqual).toBe(false);
    });

    test("handles exact field name matches", () => {
      const sync = syncByArrType.SONARR();
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
          port: "8080",
        },
      };

      const { equal: isEqual } = sync.isDownloadClientEqual(configClient, serverClient, cache);
      expect(isEqual).toBe(true);
    });

    test("handles password and apiKey masking without false diff", () => {
      const sync = syncByArrType.RADARR();
      const cache = new ServerCache();

      // Server with masked password
      const serverClient: DownloadClientResource = {
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
      const sync = syncByArrType.RADARR();
      const cache = new ServerCache();
      cache.tags = [
        { id: 2, label: "4K" },
        { id: 3, label: "Anime" },
      ];

      // EXACT server data from your JSON
      const serverClient: DownloadClientResource = {
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
      const sync = syncByArrType.RADARR();
      const cache = new ServerCache();

      // Server with masked password
      const serverClient: DownloadClientResource = {
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
      const sync = syncByArrType.RADARR();

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
      const sync = syncByArrType.RADARR();

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
      const sync = syncByArrType.RADARR();

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

      const unmanagedClients = sync.filterUnmanagedClients(serverClients, configClients, { enabled: false });

      expect(unmanagedClients).toEqual([]);
    });

    test("respects ignore list", () => {
      const sync = syncByArrType.RADARR();

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

  describe("resolveConfig", () => {
    const config: InputConfigDownloadClient = {
      name: "qBittorrent",
      type: "qbittorrent",
      enable: false,
      fields: { host: "qbittorrent" },
    };

    test("RADARR create does not set categories", async () => {
      const sync = syncByArrType.RADARR();
      const cache = new ServerCache();
      sync.setDownloadClientSchema([qbitSchema({ categories: [] })]);

      const payload = await sync.resolveConfig(config, cache);
      expect(payload).not.toHaveProperty("categories");
    });

    test("preserves masked server secrets when updatePassword is false", async () => {
      const sync = syncByArrType.RADARR();
      const cache = new ServerCache();
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
        fields: [
          { name: "host", value: "old-host" },
          { name: "password", value: "********" },
        ],
      });

      const payload = await sync.resolveConfig(
        {
          name: "qBittorrent",
          type: "qbittorrent",
          fields: { host: "new-host", password: "from-config" },
        },
        cache,
        server,
        false,
        false,
      );

      expect(payload.fields).toEqual([
        { name: "host", value: "new-host" },
        { name: "password", value: "********" },
      ]);
    });

    test("keeps server tags when config.tags is omitted", async () => {
      const sync = syncByArrType.RADARR();
      const cache = new ServerCache();
      sync.setDownloadClientSchema([qbitSchema()]);
      const server = qbitSchema({ id: 1, name: "qBittorrent", tags: [4, 5] });

      const payload = await sync.resolveConfig({ name: "qBittorrent", type: "qbittorrent", enable: false }, cache, server, true);

      expect(payload.tags).toEqual([4, 5]);
    });
  });
});

describe("MediaDownloadClientSync – syncDownloadClients tags", () => {
  const serverClient = (tags: number[]): DownloadClientResource =>
    qbitSchema({
      id: 1,
      name: "qBittorrent",
      fields: [{ name: "host", value: "qbittorrent" }],
      tags,
    });

  const api = (serverClients: DownloadClientResource[]) => ({
    getDownloadClientSchema: vi.fn(async () => [qbitSchema()]),
    getDownloadClients: vi.fn(async () => serverClients),
    createTag: vi.fn(async (tag: { label: string }) => ({ id: 5, label: tag.label })),
    createDownloadClient: vi.fn(),
    updateDownloadClient: vi.fn(),
    deleteDownloadClient: vi.fn(),
  });

  const syncWith = (clientApi: ReturnType<typeof api>) =>
    new RadarrDownloadClientSync(clientApi as unknown as DownloadClientsClient<DownloadClientResource> & TagsClient);

  const setDryRun = (DRY_RUN: boolean) =>
    vi
      .mocked(getEnvs)
      .mockReturnValue({ LOG_LEVEL: "fatal", DRY_RUN, CONFIGARR_ENFORCE_CONFIG_VALIDATION: false } as ReturnType<typeof getEnvs>);

  const configWithMissingTag = {
    download_clients: {
      data: [{ name: "qBittorrent", type: "qbittorrent", tags: ["existing", "brand-new"], fields: { host: "qbittorrent" } }],
    },
  };

  test("dry run does not create tags missing from the server", async () => {
    setDryRun(true);
    const clientApi = api([serverClient([1])]);
    const cache = new ServerCache({ tags: [{ id: 1, label: "existing" }] });

    const result = await syncWith(clientApi).syncDownloadClients(configWithMissingTag, cache);

    expect(clientApi.createTag).not.toHaveBeenCalled();
    expect(clientApi.createDownloadClient).not.toHaveBeenCalled();
    expect(clientApi.updateDownloadClient).not.toHaveBeenCalled();
    expect(clientApi.deleteDownloadClient).not.toHaveBeenCalled();
    expect(cache.tags).toEqual([{ id: 1, label: "existing" }]);
    // Same counts the real run reports: the tag is missing but the client still needs updating.
    expect(result).toMatchObject({ added: 0, updated: 1, removed: 0, failed: 0 });
    // The new tag has no server ID yet, so it is listed by name - never by the internal
    // placeholder id the diff compared with.
    expect(result.diffEntries).toEqual([
      {
        resourceType: "DownloadClient",
        name: "qBittorrent",
        action: "update",
        fieldChanges: [{ field: "tags", from: [1], to: ["brand-new", 1] }],
      },
    ]);
  });

  test("dry run and a real run report the same tag values", async () => {
    const tagChangeOf = (result: DownloadClientSyncResult) => {
      const entry = result.diffEntries.find((e: DiffEntry) => e.fieldChanges?.some((change) => change.field === "tags"));
      return entry?.fieldChanges?.find((change) => change.field === "tags");
    };

    // Labels known to the server plus the id `createTag` hands out for a tag created mid-run.
    const knownLabels = new Map([
      [1, "existing"],
      [5, "brand-new"],
    ]);
    const reportedLabels = (result: DownloadClientSyncResult) =>
      ((tagChangeOf(result)?.to as unknown[]) ?? []).map((value) => (typeof value === "number" ? knownLabels.get(value) : value));

    const cache = () => new ServerCache({ tags: [{ id: 1, label: "existing" }] });

    setDryRun(true);
    const dryRunResult = await syncWith(api([serverClient([1])])).syncDownloadClients(configWithMissingTag, cache());

    setDryRun(false);
    const realResult = await syncWith(api([serverClient([1])])).syncDownloadClients(configWithMissingTag, cache());

    expect(tagChangeOf(dryRunResult)?.from).toEqual([1]);
    expect(tagChangeOf(realResult)?.from).toEqual([1]);
    expect(reportedLabels(dryRunResult).sort()).toEqual(["brand-new", "existing"]);
    expect(reportedLabels(realResult).sort()).toEqual(reportedLabels(dryRunResult).sort());
    // The placeholder id is internal bookkeeping and must never reach the report.
    expect(JSON.stringify(dryRunResult.diffEntries)).not.toContain("-1");
  });

  test("dry run reports the same counts as a real run for a missing client", async () => {
    const config = {
      download_clients: { data: [{ name: "qBittorrent", type: "qbittorrent", tags: ["brand-new"], fields: { host: "qbittorrent" } }] },
    };

    setDryRun(true);
    const dryRunApi = api([]);
    const dryRunResult = await syncWith(dryRunApi).syncDownloadClients(config, new ServerCache());
    expect(dryRunApi.createTag).not.toHaveBeenCalled();
    expect(dryRunResult).toMatchObject({ added: 1, updated: 0, removed: 0, failed: 0 });

    setDryRun(false);
    const realApi = api([]);
    const realResult = await syncWith(realApi).syncDownloadClients(config, new ServerCache());

    expect(realApi.createTag).toHaveBeenCalledWith({ label: "brand-new" });
    expect(realResult).toMatchObject({ added: 1, updated: 0, removed: 0, failed: 0 });
  });

  test("real run creates missing tags before the diff", async () => {
    setDryRun(false);
    const clientApi = api([serverClient([1])]);
    const cache = new ServerCache({ tags: [{ id: 1, label: "existing" }] });

    const result = await syncWith(clientApi).syncDownloadClients(configWithMissingTag, cache);

    expect(clientApi.createTag).toHaveBeenCalledWith({ label: "brand-new" });
    expect(clientApi.updateDownloadClient).toHaveBeenCalledWith("1", expect.objectContaining({ tags: [1, 5] }));
    expect(result).toMatchObject({ added: 0, updated: 1, removed: 0, failed: 0 });
  });
});
