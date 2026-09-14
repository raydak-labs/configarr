import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProwlarrClient } from "./prowlarr-client";

vi.mock("../logger", () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const api = {
  v1SystemStatusList: vi.fn(async () => ({ appName: "Prowlarr", version: "2.5.2" })),
  v1HealthList: vi.fn(async () => []),
  v1TagList: vi.fn(async () => []),
  v1TagCreate: vi.fn(async (t: { label: string }) => ({ id: 1, ...t })),
  v1TagDelete: vi.fn(async () => undefined),
  v1IndexerDelete: vi.fn(async () => undefined),
  v1ApplicationsDelete: vi.fn(async () => undefined),
  v1IndexerproxyDelete: vi.fn(async () => undefined),
  v1DownloadclientDelete: vi.fn(async () => undefined),
  v1CommandCreate: vi.fn(async (c: { name: string }) => ({ id: 7, ...c })),
  v1AppprofileList: vi.fn(async () => [{ id: 1, name: "Standard" }]),
};
vi.mock("../__generated__/prowlarr/Api", () => ({
  Api: class {
    constructor() {
      return api;
    }
  },
}));

const client = () => new ProwlarrClient("http://prowlarr:9696", "api-key");

describe("ProwlarrClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.v1HealthList.mockResolvedValue([]);
  });

  it("requires a base url and api key", () => {
    expect(() => new ProwlarrClient("", "key")).toThrow();
    expect(() => new ProwlarrClient("http://prowlarr:9696", "")).toThrow();
  });

  it("triggers the app indexer sync with Prowlarr's command name", async () => {
    await client().syncAppIndexers();

    expect(api.v1CommandCreate).toHaveBeenCalledExactlyOnceWith({ name: "ApplicationIndexerSync" });
  });

  it("converts string ids to numbers for the delete endpoints", async () => {
    const c = client();
    await c.deleteTag("3");
    await c.deleteIndexer("4");
    await c.deleteApplication("5");
    await c.deleteIndexerProxy("6");
    await c.deleteDownloadClient("7");

    expect(api.v1TagDelete).toHaveBeenCalledWith(3);
    expect(api.v1IndexerDelete).toHaveBeenCalledWith(4);
    expect(api.v1ApplicationsDelete).toHaveBeenCalledWith(5);
    expect(api.v1IndexerproxyDelete).toHaveBeenCalledWith(6);
    expect(api.v1DownloadclientDelete).toHaveBeenCalledWith(7);
  });

  describe("testConnection", () => {
    it("returns true when the health endpoint answers", async () => {
      await expect(client().testConnection()).resolves.toBe(true);
    });

    it("returns false and logs when the health endpoint fails", async () => {
      api.v1HealthList.mockRejectedValue(new Error("connection refused"));
      const { logger } = await import("../logger");

      await expect(client().testConnection()).resolves.toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
