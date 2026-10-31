import { describe, expect, test, beforeEach, vi } from "vitest";
vi.mock("../env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../env")>();
  return {
    ...actual,
    getEnvs: vi.fn(() => ({ LOG_LEVEL: "fatal", CONFIGARR_ENFORCE_CONFIG_VALIDATION: false })),
  };
});

import { BaseDownloadClientSync } from "./downloadClientBase";
import {
  InputConfigArrInstanceSchema,
  InputConfigProwlarrDownloadClientsSchema,
  UpdatePasswordSchema,
  type InputConfigDownloadClient,
} from "../types/config.types";
import type { ServerCache } from "../cache";
import type { DownloadClientsClient, TagsClient } from "../clients/capabilities";
import { getClient } from "../clients/client";
import type { TagResource, DownloadClientResource } from "../__generated__/radarr/data-contracts";
import { DownloadProtocol } from "../__generated__/radarr/data-contracts";
import { ArrType } from "../types/common.types";
import { MediaDownloadClientResource } from "./downloadClient.types";
import { getEnvs } from "../env";
import { logger } from "../logger";
import { SECRET_MASK } from "../diffReport/redactSecrets";
import { ConfigValidationError } from "../validation";
import { RadarrDownloadClientSync } from "./downloadClientRadarr";

class MockDownloadClientSync extends BaseDownloadClientSync<MediaDownloadClientResource> {
  public testValidateDownloadClient(config: InputConfigDownloadClient, schema: MediaDownloadClientResource[]) {
    return this.validateDownloadClient(config, schema);
  }

  public testNormalizeConfigFields(configFields: Record<string, any>, arrType: ArrType) {
    return this.normalizeConfigFields(configFields, arrType);
  }

  public testGetApi(): DownloadClientsClient<MediaDownloadClientResource> & TagsClient {
    return this.getApi();
  }

  public get testInjectedApi(): DownloadClientsClient<MediaDownloadClientResource> & TagsClient {
    return this.api;
  }

  public isDownloadClientEqual() {
    return { equal: true, changes: [] };
  }

  public shouldUsePartialUpdate() {
    return false;
  }

  protected getArrType(): ArrType {
    return "RADARR";
  }

  public async resolveConfig(
    config: InputConfigDownloadClient,
    cache: ServerCache,
    serverClient?: MediaDownloadClientResource,
    partialUpdate?: boolean,
  ) {
    return {} as MediaDownloadClientResource;
  }
}

describe("BaseDownloadClientSync – sync accounting", () => {
  const api = {
    getDownloadClientSchema: vi.fn(async () => [
      {
        implementation: "TorrentBlackhole",
        implementationName: "Torrent Blackhole",
        configContract: "TorrentBlackholeSettings",
        fields: [{ name: "watchFolder", value: "" }],
      },
    ]),
    getDownloadClients: vi.fn(async () => []),
    createDownloadClient: vi.fn(async (client) => client),
    getTags: vi.fn(async () => []),
    createTag: vi.fn(),
    deleteTag: vi.fn(),
  };

  class SyncingMock extends MockDownloadClientSync {
    constructor() {
      super(api as unknown as DownloadClientsClient<MediaDownloadClientResource> & TagsClient);
    }
  }

  const cache = () => ({ tags: [] }) as unknown as ServerCache;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEnvs).mockReturnValue({ LOG_LEVEL: "fatal", CONFIGARR_ENFORCE_CONFIG_VALIDATION: false } as ReturnType<typeof getEnvs>);
    api.getDownloadClientSchema.mockResolvedValue([
      {
        implementation: "TorrentBlackhole",
        implementationName: "Torrent Blackhole",
        configContract: "TorrentBlackholeSettings",
        fields: [{ name: "watchFolder", value: "" }],
      },
    ]);
    api.getDownloadClients.mockResolvedValue([]);
  });

  test("reports a config skipped by validation as failed", async () => {
    const result = await new SyncingMock().syncDownloadClients(
      { download_clients: { data: [{ name: "broken", type: "" } as InputConfigDownloadClient] } },
      cache(),
    );

    expect(result).toMatchObject({ added: 0, updated: 0, removed: 0, failed: 1 });
  });

  test("reports no failures for a valid config", async () => {
    const result = await new SyncingMock().syncDownloadClients(
      { download_clients: { data: [{ name: "bh", type: "TorrentBlackhole", fields: { watchFolder: "/data" } }] } },
      cache(),
    );

    expect(result.failed).toBe(0);
  });

  test("does not create missing tags during a dry run", async () => {
    vi.mocked(getEnvs).mockReturnValue({ DRY_RUN: true, LOG_LEVEL: "fatal" } as ReturnType<typeof getEnvs>);
    api.createTag.mockResolvedValue({ id: 5, label: "brand-new" });
    const serverCache = cache();

    const result = await new SyncingMock().syncDownloadClients(
      { download_clients: { data: [{ name: "bh", type: "TorrentBlackhole", fields: { watchFolder: "/data" }, tags: ["brand-new"] }] } },
      serverCache,
    );

    expect(api.createTag).not.toHaveBeenCalled();
    // The client is not on the server, so a dry run still reports the create it would perform. The tag
    // it carries resolves to a placeholder id rather than a real one, which is what keeps the report
    // honest about what does not exist yet.
    expect(result).toMatchObject({ added: 1, updated: 0, removed: 0, failed: 0 });
    // Asserted on the very cache handed to the sync: a fresh `cache()` would pass even if the run had
    // written a tag into this one.
    expect(serverCache.tags).toEqual([]);
  });

  test("stops download client synchronization on invalid fields", async () => {
    vi.mocked(getEnvs).mockReturnValue({ LOG_LEVEL: "fatal", CONFIGARR_ENFORCE_CONFIG_VALIDATION: true } as ReturnType<typeof getEnvs>);
    api.getDownloadClientSchema.mockResolvedValue([
      {
        implementation: "rtorrent",
        implementationName: "rTorrent",
        configContract: "RTorrentSettings",
        fields: [{ name: "host", value: "localhost" }],
      },
    ]);

    await expect(
      new SyncingMock().syncDownloadClients(
        { download_clients: { data: [{ name: "ruTorrent movies", type: "rtorrent", fields: { asd: 1 } }] } },
        cache(),
      ),
    ).rejects.toBeInstanceOf(ConfigValidationError);
  });

  test("allows advisory missing-field warnings under strict validation", async () => {
    vi.mocked(getEnvs).mockReturnValue({ LOG_LEVEL: "fatal", CONFIGARR_ENFORCE_CONFIG_VALIDATION: true } as ReturnType<typeof getEnvs>);
    const sync = new SyncingMock();
    const client = { name: "bh", type: "TorrentBlackhole", fields: {} };
    expect(sync.testValidateDownloadClient(client, await api.getDownloadClientSchema()).warnings).toContain(
      "Field 'watch_folder' may be required for TorrentBlackhole",
    );
    const result = await sync.syncDownloadClients({ download_clients: { data: [client] } }, cache());

    expect(result).toMatchObject({ added: 1, failed: 0 });
    expect(api.createDownloadClient).toHaveBeenCalledOnce();
  });
});

describe("BaseDownloadClientSync – utility methods", () => {
  let sync: MockDownloadClientSync;

  beforeEach(() => {
    vi.mocked(getEnvs).mockReturnValue({ LOG_LEVEL: "fatal", CONFIGARR_ENFORCE_CONFIG_VALIDATION: false } as ReturnType<typeof getEnvs>);
    sync = new MockDownloadClientSync({} as DownloadClientsClient<MediaDownloadClientResource> & TagsClient);
  });

  describe("field normalization", () => {
    test("normalizes snake_case fields to camelCase", () => {
      const result = sync.testNormalizeConfigFields(
        {
          use_ssl: true,
          api_key: "test123",
          recent_priority: 5,
          normal_field: "value",
        },
        "RADARR",
      );

      expect(result).toHaveProperty("useSsl", true);
      expect(result).toHaveProperty("apiKey", "test123");
      expect(result).toHaveProperty("recentPriority", 5);
      expect(result).toHaveProperty("normalField", "value");

      // Should keep original fields for backward compatibility
      expect(result).toHaveProperty("use_ssl", true);
      expect(result).toHaveProperty("api_key", "test123");
      expect(result).toHaveProperty("recent_priority", 5);
      expect(result).toHaveProperty("normal_field", "value");
    });

    test("handles empty config", () => {
      const result = sync.testNormalizeConfigFields({}, "RADARR");
      expect(result).toEqual({});
    });

    test("handles nested objects", () => {
      const result = sync.testNormalizeConfigFields(
        {
          nested_obj: {
            inner_field: "value",
          },
        },
        "RADARR",
      );

      expect(result).toHaveProperty("nestedObj");
      expect(result.nestedObj).toEqual({ inner_field: "value" });
      expect(result).toHaveProperty("nested_obj");
    });
  });

  describe("validation", () => {
    test("validates valid configuration", () => {
      const mockSchema: MediaDownloadClientResource[] = [
        {
          id: 0,
          name: "TestClient",
          implementation: "TestImplementation",
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

      const config: InputConfigDownloadClient = {
        name: "Valid Client",
        type: "TestImplementation",
        priority: 5,
      };

      const result = sync.testValidateDownloadClient(config, mockSchema);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("rejects fields that are absent from the server schema", () => {
      const mockSchema: MediaDownloadClientResource[] = [
        {
          implementation: "rtorrent",
          fields: [{ name: "host", value: "localhost" }],
        },
      ];

      const result = sync.testValidateDownloadClient({ name: "ruTorrent movies", type: "rtorrent", fields: { asd: 1 } }, mockSchema);

      expect(result).toMatchObject({
        valid: false,
        errors: ["Field 'asd' does not exist for download client type 'rtorrent'"],
      });
    });

    test("accepts snake_case aliases for server schema fields", () => {
      const mockSchema: MediaDownloadClientResource[] = [
        {
          implementation: "rtorrent",
          fields: [{ name: "movieImportedCategory", value: "movies" }],
        },
      ];

      const result = sync.testValidateDownloadClient(
        { name: "ruTorrent movies", type: "rtorrent", fields: { movie_imported_category: "movies" } },
        mockSchema,
      );

      expect(result.errors).toEqual([]);
    });

    test("rejects configuration with missing name", () => {
      const mockSchema: MediaDownloadClientResource[] = [
        {
          id: 0,
          name: "TestClient",
          implementation: "TestImplementation",
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

      const config = {
        type: "TestImplementation",
      } as any;

      const result = sync.testValidateDownloadClient(config, mockSchema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("rejects configuration with missing type", () => {
      const mockSchema: MediaDownloadClientResource[] = [
        {
          id: 0,
          name: "TestClient",
          implementation: "TestImplementation",
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

      const config = {
        name: "Test",
      } as any;

      const result = sync.testValidateDownloadClient(config, mockSchema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("API injection", () => {
    test("getApi() returns the client handed to the constructor", () => {
      expect(sync.testGetApi()).toBe(sync.testInjectedApi);
    });
  });
});

describe("update_password schema validation", () => {
  test.each([
    { value: true, valid: true },
    { value: false, valid: true },
    { value: "on_test_failure", valid: true },
    { value: "other_string", valid: false },
    { value: "always", valid: false },
    { value: 123, valid: false },
  ])("validates update_password=$value (valid=$valid)", ({ value, valid }) => {
    const arrResult = InputConfigArrInstanceSchema.shape.download_clients.unwrap().safeParse({
      update_password: value,
    });
    expect(arrResult.success).toBe(valid);

    const prowlarrResult = InputConfigProwlarrDownloadClientsSchema.safeParse({
      update_password: value,
    });
    expect(prowlarrResult.success).toBe(valid);

    const directResult = UpdatePasswordSchema.safeParse(value);
    expect(directResult.success).toBe(valid);
  });
});

describe("BaseDownloadClientSync - update_password: 'on_test_failure'", () => {
  const schemaClient: DownloadClientResource = {
    id: 0,
    name: "qBittorrent",
    implementation: "qBittorrent",
    protocol: DownloadProtocol.Torrent,
    enable: true,
    priority: 1,
    fields: [
      { name: "host", value: "" },
      { name: "password", value: "" },
    ],
    tags: [],
    removeCompletedDownloads: true,
    removeFailedDownloads: true,
    configContract: "QBittorrentSettings",
  };

  const createServerClient = (overrides: Partial<DownloadClientResource> = {}): DownloadClientResource => ({
    id: 1,
    name: "qBit",
    implementation: "qBittorrent",
    protocol: DownloadProtocol.Torrent,
    enable: true,
    priority: 1,
    fields: [
      { name: "host", value: "127.0.0.1" },
      { name: "password", value: "********" },
    ],
    tags: [],
    removeCompletedDownloads: true,
    removeFailedDownloads: true,
    configContract: "QBittorrentSettings",
    ...overrides,
  });

  let api: any;
  let cache: ServerCache;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEnvs).mockReturnValue({ LOG_LEVEL: "fatal", CONFIGARR_ENFORCE_CONFIG_VALIDATION: false } as ReturnType<typeof getEnvs>);
    cache = { tags: [] } as unknown as ServerCache;
    api = {
      getDownloadClientSchema: vi.fn(async () => [schemaClient]),
      getDownloadClients: vi.fn(async () => [createServerClient()]),
      createDownloadClient: vi.fn(async (client) => client),
      updateDownloadClient: vi.fn(async (_id, client) => client),
      deleteDownloadClient: vi.fn(async () => {}),
      testDownloadClient: vi.fn(async () => {}),
      getTags: vi.fn(async () => []),
      createTag: vi.fn(),
      deleteTag: vi.fn(),
    };
  });

  test("on_test_failure + test passes -> no update, test called once with the server resource", async () => {
    api.testDownloadClient.mockResolvedValueOnce(undefined);
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient();
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password: "on_test_failure",
          data: [
            {
              name: "qBit",
              type: "qbittorrent",
              fields: { host: "127.0.0.1", password: "NEW_CONFIG_SECRET" },
            },
          ],
        },
      },
      cache,
    );

    expect(api.testDownloadClient).toHaveBeenCalledTimes(1);
    expect(api.testDownloadClient).toHaveBeenCalledWith(serverClient);
    expect(api.updateDownloadClient).not.toHaveBeenCalled();
    expect(result.updated).toBe(0);
    expect(result.diffEntries.filter((e) => e.action === "update")).toHaveLength(0);
  });

  test("on_test_failure + test throws -> one update whose payload carries the CONFIG secret; diff entry secret masked; log line has no secret value", async () => {
    const secret = "SUPER_SECRET_NEW_PASSWORD";
    api.testDownloadClient.mockRejectedValueOnce(new Error("Connection refused: bad credentials"));
    const infoSpy = vi.spyOn(logger, "info");
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient();
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password: "on_test_failure",
          data: [
            {
              name: "qBit",
              type: "qbittorrent",
              fields: { host: "127.0.0.1", password: secret },
            },
          ],
        },
      },
      cache,
    );

    expect(api.testDownloadClient).toHaveBeenCalledTimes(1);
    expect(api.testDownloadClient).toHaveBeenCalledWith(serverClient);
    expect(result.updated).toBe(1);
    expect(api.updateDownloadClient).toHaveBeenCalledTimes(1);

    const [calledId, updatePayload] = api.updateDownloadClient.mock.calls[0];
    expect(calledId).toBe("1");
    const passwordField = updatePayload.fields?.find((f: any) => f.name === "password");
    expect(passwordField?.value).toBe(secret);

    const updateEntry = result.diffEntries.find((e) => e.name === "qBit" && e.action === "update");
    expect(updateEntry).toBeDefined();
    expect(updateEntry?.fieldChanges).toEqual([{ field: "fields.password", from: SECRET_MASK, to: SECRET_MASK }]);
    expect(JSON.stringify(result.diffEntries)).not.toContain(secret);

    const logged = infoSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(logged).toContain('Download client "qBit": connection test failed, updating secret fields');
    expect(logged).not.toContain(secret);
  });

  test("on_test_failure + disabled server client -> no test call, no update", async () => {
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient({ enable: false });
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password: "on_test_failure",
          data: [
            {
              name: "qBit",
              type: "qbittorrent",
              enable: false,
              fields: { host: "127.0.0.1", password: "NEW_CONFIG_SECRET" },
            },
          ],
        },
      },
      cache,
    );

    expect(api.testDownloadClient).not.toHaveBeenCalled();
    expect(api.updateDownloadClient).not.toHaveBeenCalled();
    expect(result.updated).toBe(0);
  });

  test("on_test_failure + non-secret change -> update as with false (stored secret kept), no test call", async () => {
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient();
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password: "on_test_failure",
          data: [
            {
              name: "qBit",
              type: "qbittorrent",
              fields: { host: "different-host", password: "NEW_CONFIG_SECRET" },
            },
          ],
        },
      },
      cache,
    );

    expect(api.testDownloadClient).not.toHaveBeenCalled();
    expect(result.updated).toBe(1);
    expect(api.updateDownloadClient).toHaveBeenCalledTimes(1);

    const updatePayload = api.updateDownloadClient.mock.calls[0][1];
    expect(updatePayload.fields?.find((f: any) => f.name === "host")?.value).toBe("different-host");
    expect(updatePayload.fields?.find((f: any) => f.name === "password")?.value).toBe("********");
  });

  test("on_test_failure + no secret in config -> no test call", async () => {
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient();
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password: "on_test_failure",
          data: [
            {
              name: "qBit",
              type: "qbittorrent",
              fields: { host: "127.0.0.1" },
            },
          ],
        },
      },
      cache,
    );

    expect(api.testDownloadClient).not.toHaveBeenCalled();
    expect(api.updateDownloadClient).not.toHaveBeenCalled();
    expect(result.updated).toBe(0);
  });

  test("DRY_RUN + test throws -> reported, no update call", async () => {
    vi.mocked(getEnvs).mockReturnValue({ DRY_RUN: true, LOG_LEVEL: "fatal" } as ReturnType<typeof getEnvs>);
    api.testDownloadClient.mockRejectedValueOnce(new Error("Connection refused"));
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient();
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password: "on_test_failure",
          data: [
            {
              name: "qBit",
              type: "qbittorrent",
              fields: { host: "127.0.0.1", password: "NEW_CONFIG_SECRET" },
            },
          ],
        },
      },
      cache,
    );

    expect(api.testDownloadClient).toHaveBeenCalledTimes(1);
    expect(api.testDownloadClient).toHaveBeenCalledWith(serverClient);
    expect(api.updateDownloadClient).not.toHaveBeenCalled();
    expect(result.updated).toBe(1);

    const updateEntry = result.diffEntries.find((e) => e.name === "qBit" && e.action === "update");
    expect(updateEntry).toBeDefined();
    expect(updateEntry?.fieldChanges).toEqual([{ field: "fields.password", from: SECRET_MASK, to: SECRET_MASK }]);
  });
});
