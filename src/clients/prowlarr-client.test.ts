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
  v1DownloadclientCreate: vi.fn(async (c: { name: string }) => ({ id: 9, ...c })),
  v1DownloadclientUpdate: vi.fn(async (_id: string, c: { name: string }) => c),
  v1IndexerCreate: vi.fn(async (c: { name: string }) => ({ id: 10, ...c })),
  v1IndexerUpdate: vi.fn(async (_id: string, c: { name: string }) => c),
  v1CommandCreate: vi.fn(async (c: { name: string }) => ({ id: 7, ...c })),
  v1AppprofileList: vi.fn(async () => [{ id: 1, name: "Standard" }]),
  v1AppprofileCreate: vi.fn(async (p: { name: string }) => ({ id: 2, ...p })),
  v1AppprofileUpdate: vi.fn(async (_id: string, p: { name: string }) => p),
  v1AppprofileDelete: vi.fn(async () => undefined),
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
    await c.deleteAppProfile("8");

    expect(api.v1TagDelete).toHaveBeenCalledWith(3);
    expect(api.v1IndexerDelete).toHaveBeenCalledWith(4);
    expect(api.v1ApplicationsDelete).toHaveBeenCalledWith(5);
    expect(api.v1IndexerproxyDelete).toHaveBeenCalledWith(6);
    expect(api.v1DownloadclientDelete).toHaveBeenCalledWith(7);
    expect(api.v1AppprofileDelete).toHaveBeenCalledWith(8);
  });

  it("force-saves disabled download clients and indexers", async () => {
    const c = client();
    await c.createDownloadClient({ name: "bh", enable: false });
    await c.updateDownloadClient("9", { name: "bh", enable: false });
    await c.createIndexer({ name: "tpb", enable: false });
    await c.updateIndexer("10", { name: "tpb", enable: true });

    expect(api.v1DownloadclientCreate).toHaveBeenCalledWith({ name: "bh", enable: false }, { forceSave: true });
    expect(api.v1DownloadclientUpdate).toHaveBeenCalledWith("9", { name: "bh", enable: false }, { forceSave: true });
    expect(api.v1IndexerCreate).toHaveBeenCalledWith({ name: "tpb", enable: false }, { forceSave: true });
    expect(api.v1IndexerUpdate).toHaveBeenCalledWith("10", { name: "tpb", enable: true }, { forceSave: false });
  });

  it("creates and updates sync profiles", async () => {
    const c = client();
    await c.createAppProfile({ name: "Seeded", minimumSeeders: 5 });
    await c.updateAppProfile("2", { id: 2, name: "Seeded", minimumSeeders: 9 });

    expect(api.v1AppprofileCreate).toHaveBeenCalledWith({ name: "Seeded", minimumSeeders: 5 });
    expect(api.v1AppprofileUpdate).toHaveBeenCalledWith("2", { id: 2, name: "Seeded", minimumSeeders: 9 });
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
