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

  public testIsSecretField(fieldName: string): boolean {
    return this.isSecretField(fieldName);
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

describe("download_clients secret schema validation", () => {
  test.each([
    { value: true, valid: true },
    { value: false, valid: true },
    { value: "on_test_failure", valid: false },
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
  });

  test.each([
    { value: true, valid: true },
    { value: false, valid: true },
    { value: "yes", valid: false },
    { value: "on_test_failure", valid: false },
    { value: 123, valid: false },
  ])("validates update_password_on_test_fail=$value (valid=$valid)", ({ value, valid }) => {
    const arrResult = InputConfigArrInstanceSchema.shape.download_clients.unwrap().safeParse({
      update_password_on_test_fail: value,
    });
    expect(arrResult.success).toBe(valid);

    const prowlarrResult = InputConfigProwlarrDownloadClientsSchema.safeParse({
      update_password_on_test_fail: value,
    });
    expect(prowlarrResult.success).toBe(valid);
  });
});

describe("BaseDownloadClientSync - secret update modes", () => {
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

  const schemaAria2: DownloadClientResource = {
    id: 0,
    name: "Aria2",
    implementation: "Aria2",
    protocol: DownloadProtocol.Torrent,
    enable: true,
    priority: 1,
    fields: [
      { name: "host", value: "" },
      { name: "rpcPath", value: "" },
      { name: "secretToken", value: "" },
    ],
    tags: [],
    removeCompletedDownloads: true,
    removeFailedDownloads: true,
    configContract: "Aria2Settings",
  };

  const createAria2ServerClient = (overrides: Partial<DownloadClientResource> = {}): DownloadClientResource => ({
    id: 2,
    name: "aria2-client",
    implementation: "Aria2",
    protocol: DownloadProtocol.Torrent,
    enable: true,
    priority: 1,
    fields: [
      { name: "host", value: "127.0.0.1" },
      { name: "rpcPath", value: "/rpc" },
      { name: "secretToken", value: "********" },
    ],
    tags: [],
    removeCompletedDownloads: true,
    removeFailedDownloads: true,
    configContract: "Aria2Settings",
    ...overrides,
  });

  const schemaFreebox: DownloadClientResource = {
    id: 0,
    name: "Freebox",
    implementation: "Freebox",
    protocol: DownloadProtocol.Torrent,
    enable: true,
    priority: 1,
    fields: [
      { name: "host", value: "" },
      { name: "appToken", value: "" },
    ],
    tags: [],
    removeCompletedDownloads: true,
    removeFailedDownloads: true,
    configContract: "FreeboxSettings",
  };

  const createFreeboxServerClient = (overrides: Partial<DownloadClientResource> = {}): DownloadClientResource => ({
    id: 3,
    name: "freebox-client",
    implementation: "Freebox",
    protocol: DownloadProtocol.Torrent,
    enable: true,
    priority: 1,
    fields: [
      { name: "host", value: "192.168.0.254" },
      { name: "appToken", value: "********" },
    ],
    tags: [],
    removeCompletedDownloads: true,
    removeFailedDownloads: true,
    configContract: "FreeboxSettings",
    ...overrides,
  });

  let api: any;
  let cache: ServerCache;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEnvs).mockReturnValue({ LOG_LEVEL: "fatal", CONFIGARR_ENFORCE_CONFIG_VALIDATION: false } as ReturnType<typeof getEnvs>);
    cache = { tags: [] } as unknown as ServerCache;
    api = {
      getDownloadClientSchema: vi.fn(async () => [schemaClient, schemaAria2, schemaFreebox]),
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

  test("positive: on_test_fail true + update_password unset + test passes -> no update, test called once with the server resource", async () => {
    api.testDownloadClient.mockResolvedValueOnce(undefined);
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient();
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password_on_test_fail: true,
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

  test("positive: on_test_fail true + update_password unset + test throws -> one update whose payload carries the CONFIG secret; diff entry secret masked; log line has no secret value", async () => {
    const secret = "SUPER_SECRET_NEW_PASSWORD";
    api.testDownloadClient.mockRejectedValueOnce(new Error("Authentication failed"));
    const infoSpy = vi.spyOn(logger, "info");
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient();
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password_on_test_fail: true,
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
    expect(logged).toContain('Download client "qBit": connection test rejected the stored secret, updating secret fields');
    expect(logged).not.toContain(secret);
  });

  test("positive: update_password true -> secrets sent, no connection test", async () => {
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient();
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);
    const secret = "DIRECT_UPDATE_PASSWORD";

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password: true,
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

    expect(api.testDownloadClient).not.toHaveBeenCalled();
    expect(api.updateDownloadClient).toHaveBeenCalledTimes(1);
    const updatePayload = api.updateDownloadClient.mock.calls[0][1];
    expect(updatePayload.fields?.find((f: any) => f.name === "password")?.value).toBe(secret);
    expect(result.updated).toBe(1);
  });

  test("update_password true + password omitted + non-secret change -> stored secret preserved", async () => {
    const sync = new RadarrDownloadClientSync(api);
    api.getDownloadClients.mockResolvedValueOnce([createServerClient()]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password: true,
          data: [{ name: "qBit", type: "qbittorrent", fields: { host: "different-host" } }],
        },
      },
      cache,
    );

    expect(api.updateDownloadClient).toHaveBeenCalledTimes(1);
    const updatePayload = api.updateDownloadClient.mock.calls[0][1];
    expect(updatePayload.fields?.find((f: any) => f.name === "host")?.value).toBe("different-host");
    expect(updatePayload.fields?.find((f: any) => f.name === "password")?.value).toBe(SECRET_MASK);
    expect(result.updated).toBe(1);
  });

  test("boundary: both true -> behaves as update_password true (no test)", async () => {
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient();
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);
    const secret = "BOTH_TRUE_PASSWORD";

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password: true,
          update_password_on_test_fail: true,
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

    expect(api.testDownloadClient).not.toHaveBeenCalled();
    expect(api.updateDownloadClient).toHaveBeenCalledTimes(1);
    const updatePayload = api.updateDownloadClient.mock.calls[0][1];
    expect(updatePayload.fields?.find((f: any) => f.name === "password")?.value).toBe(secret);
    expect(result.updated).toBe(1);
  });

  test("boundary: both false -> no secret sent, no test", async () => {
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient();
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password: false,
          update_password_on_test_fail: false,
          data: [
            {
              name: "qBit",
              type: "qbittorrent",
              fields: { host: "127.0.0.1", password: "NEW_SECRET_IGNORED" },
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

  test("on_test_fail true + disabled server client -> no test call, no update", async () => {
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient({ enable: false });
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password_on_test_fail: true,
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

  test("on_test_fail true + non-secret change -> update includes the configured secret, no test call", async () => {
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient();
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password_on_test_fail: true,
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
    expect(updatePayload.fields?.find((f: any) => f.name === "password")?.value).toBe("NEW_CONFIG_SECRET");

    const updateEntry = result.diffEntries.find((e) => e.name === "qBit" && e.action === "update");
    expect(updateEntry?.fieldChanges).toEqual([
      { field: "fields.host", from: "127.0.0.1", to: "different-host" },
      { field: "fields.password", from: SECRET_MASK, to: SECRET_MASK },
    ]);
  });

  test("on_test_fail true + no secret in config -> no test call", async () => {
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient();
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password_on_test_fail: true,
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

  test("positive: on_test_fail true + stored secret empty + configured secret + credential failure -> configured secret sent, diff masked", async () => {
    const secret = "EMPTY_STORED_REPAIR";
    const infoSpy = vi.spyOn(logger, "info");
    api.testDownloadClient.mockRejectedValueOnce(new Error("Authentication failed"));
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient({
      fields: [
        { name: "host", value: "127.0.0.1" },
        { name: "password", value: "" },
      ],
    });
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password_on_test_fail: true,
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
    expect(result.updated).toBe(1);
    expect(api.updateDownloadClient).toHaveBeenCalledTimes(1);

    const updatePayload = api.updateDownloadClient.mock.calls[0][1];
    expect(updatePayload.fields?.find((f: any) => f.name === "password")?.value).toBe(secret);

    const updateEntry = result.diffEntries.find((e) => e.name === "qBit" && e.action === "update");
    expect(updateEntry).toBeDefined();
    expect(updateEntry?.fieldChanges).toEqual([{ field: "fields.password", from: SECRET_MASK, to: SECRET_MASK }]);
    expect(JSON.stringify(result.diffEntries)).not.toContain(secret);

    const logged = infoSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(logged).not.toContain(secret);
  });

  test("positive: on_test_fail true + stored secret empty + non-secret change -> both sent", async () => {
    const secret = "EMPTY_PLUS_HOST";
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient({
      fields: [
        { name: "host", value: "127.0.0.1" },
        { name: "password", value: "" },
      ],
    });
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password_on_test_fail: true,
          data: [
            {
              name: "qBit",
              type: "qbittorrent",
              fields: { host: "different-host", password: secret },
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
    expect(updatePayload.fields?.find((f: any) => f.name === "password")?.value).toBe(secret);

    const updateEntry = result.diffEntries.find((e) => e.name === "qBit" && e.action === "update");
    expect(updateEntry).toBeDefined();
    expect(updateEntry?.fieldChanges).toEqual([
      { field: "fields.host", from: "127.0.0.1", to: "different-host" },
      { field: "fields.password", from: SECRET_MASK, to: SECRET_MASK },
    ]);
  });

  test("boundary: on_test_fail true + stored secret null + configured secret + credential failure -> configured secret sent", async () => {
    const secret = "EMPTY_STORED_REPAIR_NULL";
    api.testDownloadClient.mockRejectedValueOnce(new Error("Authentication failed"));
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient({
      fields: [
        { name: "host", value: "127.0.0.1" },
        { name: "password", value: null as any },
      ],
    });
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password_on_test_fail: true,
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
    expect(result.updated).toBe(1);
    expect(api.updateDownloadClient).toHaveBeenCalledTimes(1);

    const updatePayload = api.updateDownloadClient.mock.calls[0][1];
    expect(updatePayload.fields?.find((f: any) => f.name === "password")?.value).toBe(secret);

    const updateEntry = result.diffEntries.find((e) => e.name === "qBit" && e.action === "update");
    expect(updateEntry).toBeDefined();
    expect(updateEntry?.fieldChanges).toEqual([{ field: "fields.password", from: SECRET_MASK, to: SECRET_MASK }]);
  });

  test("update_password false + stored secret + empty configured -> no update, no test", async () => {
    const sync = new RadarrDownloadClientSync(api);
    api.getDownloadClients.mockResolvedValueOnce([createServerClient()]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password: false,
          data: [{ name: "qBit", type: "qbittorrent", fields: { host: "127.0.0.1", password: "" } }],
        },
      },
      cache,
    );

    expect(api.testDownloadClient).not.toHaveBeenCalled();
    expect(api.updateDownloadClient).not.toHaveBeenCalled();
    expect(result.updated).toBe(0);
    expect(result.diffEntries.filter((entry) => entry.action === "update")).toHaveLength(0);
  });

  test("update_password true + stored secret + empty configured -> clears the stored secret", async () => {
    const sync = new RadarrDownloadClientSync(api);
    api.getDownloadClients.mockResolvedValueOnce([createServerClient()]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password: true,
          data: [{ name: "qBit", type: "qbittorrent", fields: { host: "127.0.0.1", password: "" } }],
        },
      },
      cache,
    );

    expect(api.testDownloadClient).not.toHaveBeenCalled();
    expect(api.updateDownloadClient).toHaveBeenCalledTimes(1);
    const updatePayload = api.updateDownloadClient.mock.calls[0][1];
    expect(updatePayload.fields?.find((f: any) => f.name === "password")?.value).toBe("");
    expect(result.updated).toBe(1);
  });

  test("on_test_fail + stored secret + empty configured + test passes -> no update", async () => {
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient();
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password_on_test_fail: true,
          data: [{ name: "qBit", type: "qbittorrent", fields: { host: "127.0.0.1", password: "" } }],
        },
      },
      cache,
    );

    expect(api.testDownloadClient).toHaveBeenCalledTimes(1);
    expect(api.testDownloadClient).toHaveBeenCalledWith(serverClient);
    expect(api.updateDownloadClient).not.toHaveBeenCalled();
    expect(result.updated).toBe(0);
  });

  test("on_test_fail + stored secret + empty configured + credential failure -> clears the stored secret", async () => {
    api.testDownloadClient.mockRejectedValueOnce(new Error("Authentication failed"));
    const sync = new RadarrDownloadClientSync(api);
    api.getDownloadClients.mockResolvedValueOnce([createServerClient()]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password_on_test_fail: true,
          data: [{ name: "qBit", type: "qbittorrent", fields: { host: "127.0.0.1", password: "" } }],
        },
      },
      cache,
    );

    expect(api.testDownloadClient).toHaveBeenCalledTimes(1);
    expect(api.updateDownloadClient).toHaveBeenCalledTimes(1);
    const updatePayload = api.updateDownloadClient.mock.calls[0][1];
    expect(updatePayload.fields?.find((f: any) => f.name === "password")?.value).toBe("");
    expect(result.updated).toBe(1);
    const updateEntry = result.diffEntries.find((entry) => entry.action === "update");
    expect(updateEntry?.fieldChanges).toEqual([{ field: "fields.password", from: SECRET_MASK, to: SECRET_MASK }]);
  });

  test("on_test_fail true + stored secret empty + configured secret empty + test passes -> no update", async () => {
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient({
      fields: [
        { name: "host", value: "127.0.0.1" },
        { name: "password", value: "" },
      ],
    });
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password_on_test_fail: true,
          data: [
            {
              name: "qBit",
              type: "qbittorrent",
              fields: { host: "127.0.0.1", password: "" },
            },
          ],
        },
      },
      cache,
    );

    expect(api.testDownloadClient).toHaveBeenCalledTimes(1);
    expect(api.updateDownloadClient).not.toHaveBeenCalled();
    expect(result.updated).toBe(0);
  });

  test("on_test_fail true + stored secret empty + configured secret empty + credential failure -> no update", async () => {
    api.testDownloadClient.mockRejectedValueOnce(new Error("Authentication failed"));
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient({
      fields: [
        { name: "host", value: "127.0.0.1" },
        { name: "password", value: "" },
      ],
    });
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password_on_test_fail: true,
          data: [
            {
              name: "qBit",
              type: "qbittorrent",
              fields: { host: "127.0.0.1", password: "" },
            },
          ],
        },
      },
      cache,
    );

    expect(api.testDownloadClient).toHaveBeenCalledTimes(1);
    expect(api.updateDownloadClient).not.toHaveBeenCalled();
    expect(result.updated).toBe(0);
    expect(result.diffEntries.filter((entry) => entry.action === "update")).toHaveLength(0);
  });

  test("negative: update_password false + stored secret empty + configured secret -> no update, no test", async () => {
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient({
      fields: [
        { name: "host", value: "127.0.0.1" },
        { name: "password", value: "" },
      ],
    });
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password: false,
          data: [
            {
              name: "qBit",
              type: "qbittorrent",
              fields: { host: "127.0.0.1", password: "IGNORED_WHEN_FALSE" },
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
    api.testDownloadClient.mockRejectedValueOnce(new Error("Authentication failed"));
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient();
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password_on_test_fail: true,
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

  test("on_test_fail true + client unreachable -> no update", async () => {
    api.testDownloadClient.mockRejectedValueOnce(new Error("Unable to connect to qBittorrent", { cause: { response: { status: 400 } } }));
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient();
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password_on_test_fail: true,
          data: [{ name: "qBit", type: "qbittorrent", fields: { host: "127.0.0.1", password: "NEW_CONFIG_SECRET" } }],
        },
      },
      cache,
    );

    expect(api.testDownloadClient).toHaveBeenCalledTimes(1);
    expect(api.updateDownloadClient).not.toHaveBeenCalled();
    expect(result.updated).toBe(0);
    expect(result.diffEntries.filter((entry) => entry.action === "update")).toHaveLength(0);
  });

  test("on_test_fail true + arr 500 -> no update", async () => {
    api.testDownloadClient.mockRejectedValueOnce(new Error("Authentication failed", { cause: { response: { status: 500 } } }));
    const sync = new RadarrDownloadClientSync(api);
    api.getDownloadClients.mockResolvedValueOnce([createServerClient()]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password_on_test_fail: true,
          data: [{ name: "qBit", type: "qbittorrent", fields: { host: "127.0.0.1", password: "NEW_CONFIG_SECRET" } }],
        },
      },
      cache,
    );

    expect(api.updateDownloadClient).not.toHaveBeenCalled();
    expect(result.updated).toBe(0);
  });

  test("on_test_fail true + plaintext stored secret differs -> test runs and credential failure sends the config secret", async () => {
    const secret = "ROTATED_SECRET";
    api.testDownloadClient.mockRejectedValueOnce(new Error("Authentication failed"));
    const sync = new RadarrDownloadClientSync(api);
    const serverClient = createServerClient({
      fields: [
        { name: "host", value: "127.0.0.1" },
        { name: "password", value: "old-plain" },
      ],
    });
    api.getDownloadClients.mockResolvedValueOnce([serverClient]);

    const result = await sync.syncDownloadClients(
      {
        download_clients: {
          update_password_on_test_fail: true,
          data: [{ name: "qBit", type: "qbittorrent", fields: { host: "127.0.0.1", password: secret } }],
        },
      },
      cache,
    );

    expect(api.testDownloadClient).toHaveBeenCalledWith(serverClient);
    const updatePayload = api.updateDownloadClient.mock.calls[0][1];
    expect(updatePayload.fields?.find((field: { name?: string }) => field.name === "password")?.value).toBe(secret);
    expect(result.updated).toBe(1);
    expect(JSON.stringify(result.diffEntries)).not.toContain(secret);
    expect(JSON.stringify(result.diffEntries)).not.toContain("old-plain");
  });

  describe("secretToken and appToken predicate and sync handling", () => {
    test("isSecretField identifies secretToken and appToken as secrets and preserves non-secret fields", () => {
      const syncInstance = new MockDownloadClientSync({} as any);
      expect(syncInstance.testIsSecretField("secretToken")).toBe(true);
      expect(syncInstance.testIsSecretField("appToken")).toBe(true);
      expect(syncInstance.testIsSecretField("password")).toBe(true);
      expect(syncInstance.testIsSecretField("apiKey")).toBe(true);
      expect(syncInstance.testIsSecretField("username")).toBe(false);
      expect(syncInstance.testIsSecretField("host")).toBe(false);
      expect(syncInstance.testIsSecretField("rpcPath")).toBe(false);
    });

    test("positive: on_test_fail true + Aria2 secretToken against server mask -> takes connection-test path on failure", async () => {
      const token = "ARIA2_SECRET_TOKEN";
      api.testDownloadClient.mockRejectedValueOnce(new Error("Unauthorized token"));
      const sync = new RadarrDownloadClientSync(api);
      const serverClient = createAria2ServerClient();
      api.getDownloadClients.mockResolvedValueOnce([serverClient]);

      const result = await sync.syncDownloadClients(
        {
          download_clients: {
            update_password_on_test_fail: true,
            data: [
              {
                name: "aria2-client",
                type: "aria2",
                fields: { host: "127.0.0.1", rpcPath: "/rpc", secretToken: token },
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
      expect(calledId).toBe("2");
      const secretField = updatePayload.fields?.find((f: any) => f.name === "secretToken");
      expect(secretField?.value).toBe(token);

      const updateEntry = result.diffEntries.find((e) => e.name === "aria2-client" && e.action === "update");
      expect(updateEntry).toBeDefined();
      expect(updateEntry?.fieldChanges).toEqual([{ field: "fields.secretToken", from: SECRET_MASK, to: SECRET_MASK }]);
      expect(JSON.stringify(result.diffEntries)).not.toContain(token);
    });

    test("positive: on_test_fail true + Aria2 secretToken against server mask + test passes -> no update", async () => {
      api.testDownloadClient.mockResolvedValueOnce(undefined);
      const sync = new RadarrDownloadClientSync(api);
      const serverClient = createAria2ServerClient();
      api.getDownloadClients.mockResolvedValueOnce([serverClient]);

      const result = await sync.syncDownloadClients(
        {
          download_clients: {
            update_password_on_test_fail: true,
            data: [
              {
                name: "aria2-client",
                type: "aria2",
                fields: { host: "127.0.0.1", rpcPath: "/rpc", secretToken: "VALID_TOKEN" },
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

    test("positive: on_test_fail true + Freebox appToken against server mask -> takes connection-test path on failure", async () => {
      const token = "FREEBOX_APP_TOKEN";
      api.testDownloadClient.mockRejectedValueOnce(new Error("Unauthorized app token"));
      const sync = new RadarrDownloadClientSync(api);
      const serverClient = createFreeboxServerClient();
      api.getDownloadClients.mockResolvedValueOnce([serverClient]);

      const result = await sync.syncDownloadClients(
        {
          download_clients: {
            update_password_on_test_fail: true,
            data: [
              {
                name: "freebox-client",
                type: "freebox",
                fields: { host: "192.168.0.254", appToken: token },
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
      expect(calledId).toBe("3");
      const secretField = updatePayload.fields?.find((f: any) => f.name === "appToken");
      expect(secretField?.value).toBe(token);

      const updateEntry = result.diffEntries.find((e) => e.name === "freebox-client" && e.action === "update");
      expect(updateEntry).toBeDefined();
      expect(updateEntry?.fieldChanges).toEqual([{ field: "fields.appToken", from: SECRET_MASK, to: SECRET_MASK }]);
      expect(JSON.stringify(result.diffEntries)).not.toContain(token);
    });

    test("positive: on_test_fail true + stored secretToken empty + configured value + credential failure -> secret sent, diff masked", async () => {
      const token = "EMPTY_STORED_TOKEN_REPAIR";
      const infoSpy = vi.spyOn(logger, "info");
      api.testDownloadClient.mockRejectedValueOnce(new Error("Authentication failed"));
      const sync = new RadarrDownloadClientSync(api);
      const serverClient = createAria2ServerClient({
        fields: [
          { name: "host", value: "127.0.0.1" },
          { name: "rpcPath", value: "/rpc" },
          { name: "secretToken", value: "" },
        ],
      });
      api.getDownloadClients.mockResolvedValueOnce([serverClient]);

      const result = await sync.syncDownloadClients(
        {
          download_clients: {
            update_password_on_test_fail: true,
            data: [
              {
                name: "aria2-client",
                type: "aria2",
                fields: { host: "127.0.0.1", rpcPath: "/rpc", secretToken: token },
              },
            ],
          },
        },
        cache,
      );

      expect(api.testDownloadClient).toHaveBeenCalledTimes(1);
      expect(result.updated).toBe(1);
      expect(api.updateDownloadClient).toHaveBeenCalledTimes(1);

      const updatePayload = api.updateDownloadClient.mock.calls[0][1];
      expect(updatePayload.fields?.find((f: any) => f.name === "secretToken")?.value).toBe(token);

      const updateEntry = result.diffEntries.find((e) => e.name === "aria2-client" && e.action === "update");
      expect(updateEntry).toBeDefined();
      expect(updateEntry?.fieldChanges).toEqual([{ field: "fields.secretToken", from: SECRET_MASK, to: SECRET_MASK }]);
      expect(JSON.stringify(result.diffEntries)).not.toContain(token);

      const logged = infoSpy.mock.calls.map((call) => String(call[0])).join("\n");
      expect(logged).not.toContain(token);
    });

    test("on_test_fail true + non-secret field change (rpcPath) -> update includes the configured secret, no test", async () => {
      const sync = new RadarrDownloadClientSync(api);
      const serverClient = createAria2ServerClient();
      api.getDownloadClients.mockResolvedValueOnce([serverClient]);

      const result = await sync.syncDownloadClients(
        {
          download_clients: {
            update_password_on_test_fail: true,
            data: [
              {
                name: "aria2-client",
                type: "aria2",
                fields: { host: "127.0.0.1", rpcPath: "/custom-rpc", secretToken: "NEW_CONFIG_SECRET" },
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
      expect(updatePayload.fields?.find((f: any) => f.name === "rpcPath")?.value).toBe("/custom-rpc");
      expect(updatePayload.fields?.find((f: any) => f.name === "secretToken")?.value).toBe("NEW_CONFIG_SECRET");

      const updateEntry = result.diffEntries.find((e) => e.name === "aria2-client" && e.action === "update");
      expect(updateEntry).toBeDefined();
      expect(updateEntry?.fieldChanges).toEqual([
        { field: "fields.rpcPath", from: "/rpc", to: "/custom-rpc" },
        { field: "fields.secretToken", from: SECRET_MASK, to: SECRET_MASK },
      ]);
    });
  });
});
