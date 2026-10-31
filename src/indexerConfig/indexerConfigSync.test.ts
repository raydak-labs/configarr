import { afterEach, describe, expect, test, vi } from "vitest";
import { initEnvs } from "../env";
import { IndexerConfigSchema } from "../types/config.types";
import { syncIndexerConfig } from "./indexerConfigSync";
import type { IndexerConfigClient, IndexerConfigResourceShared } from "../clients/capabilities";

describe("indexerConfigSync", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    initEnvs();
  });

  describe("schema bounds", () => {
    test("accepts valid rss_sync_interval (0, 10, 120)", () => {
      expect(IndexerConfigSchema.safeParse({ rss_sync_interval: 0 }).success).toBe(true);
      expect(IndexerConfigSchema.safeParse({ rss_sync_interval: 10 }).success).toBe(true);
      expect(IndexerConfigSchema.safeParse({ rss_sync_interval: 60 }).success).toBe(true);
      expect(IndexerConfigSchema.safeParse({ rss_sync_interval: 120 }).success).toBe(true);
    });

    test("refuses invalid rss_sync_interval (1, 9, 121, negative)", () => {
      expect(IndexerConfigSchema.safeParse({ rss_sync_interval: 1 }).success).toBe(false);
      expect(IndexerConfigSchema.safeParse({ rss_sync_interval: 9 }).success).toBe(false);
      expect(IndexerConfigSchema.safeParse({ rss_sync_interval: 121 }).success).toBe(false);
      expect(IndexerConfigSchema.safeParse({ rss_sync_interval: -1 }).success).toBe(false);
    });

    test("accepts nonnegative retention, minimum_age, maximum_size", () => {
      expect(IndexerConfigSchema.safeParse({ retention: 0, minimum_age: 0, maximum_size: 0 }).success).toBe(true);
      expect(IndexerConfigSchema.safeParse({ retention: 100, minimum_age: 5, maximum_size: 50000 }).success).toBe(true);
    });

    test("refuses negative retention, minimum_age, maximum_size", () => {
      expect(IndexerConfigSchema.safeParse({ retention: -1 }).success).toBe(false);
      expect(IndexerConfigSchema.safeParse({ minimum_age: -1 }).success).toBe(false);
      expect(IndexerConfigSchema.safeParse({ maximum_size: -1 }).success).toBe(false);
    });
  });

  describe("sync execution", () => {
    const mockClient = (
      current: IndexerConfigResourceShared & Record<string, unknown>,
    ): IndexerConfigClient & {
      updateMock: ReturnType<typeof vi.fn>;
    } => {
      const updateMock = vi.fn().mockResolvedValue(current);
      return {
        getIndexerConfig: vi.fn().mockResolvedValue(current),
        updateIndexerConfig: updateMock,
        updateMock,
      };
    };

    test("no-op makes no write when server state matches config", async () => {
      const serverState = {
        id: 1,
        rssSyncInterval: 60,
        retention: 0,
        minimumAge: 0,
        maximumSize: 0,
      };
      const client = mockClient(serverState);
      const diff = await syncIndexerConfig(client, {
        rss_sync_interval: 60,
        retention: 0,
      });

      expect(diff).toEqual([]);
      expect(client.updateMock).not.toHaveBeenCalled();
    });

    test("DRY_RUN makes no write but reports diff", async () => {
      vi.stubEnv("DRY_RUN", "true");
      initEnvs();

      const serverState = {
        id: 1,
        rssSyncInterval: 25,
        retention: 0,
        minimumAge: 0,
        maximumSize: 0,
      };
      const client = mockClient(serverState);
      const diff = await syncIndexerConfig(client, {
        rss_sync_interval: 60,
      });

      expect(diff).toHaveLength(1);
      expect(diff[0]?.action).toBe("update");
      expect(diff[0]?.fieldChanges).toEqual([{ field: "rssSyncInterval", from: 25, to: 60 }]);
      expect(client.updateMock).not.toHaveBeenCalled();
    });

    test("normal update writes to server and preserves extra server fields (e.g. Radarr)", async () => {
      const serverState = {
        id: 1,
        rssSyncInterval: 25,
        retention: 0,
        minimumAge: 0,
        maximumSize: 0,
        preferIndexerFlags: true,
        availabilityDelay: -14,
        allowHardcodedSubs: false,
      };
      const client = mockClient(serverState);
      const diff = await syncIndexerConfig(client, {
        rss_sync_interval: 60,
        retention: 365,
      });

      expect(diff).toHaveLength(1);
      expect(diff[0]?.action).toBe("update");
      expect(diff[0]?.fieldChanges).toEqual([
        { field: "rssSyncInterval", from: 25, to: 60 },
        { field: "retention", from: 0, to: 365 },
      ]);
      expect(client.updateMock).toHaveBeenCalledWith("1", {
        id: 1,
        rssSyncInterval: 60,
        retention: 365,
        minimumAge: 0,
        maximumSize: 0,
        preferIndexerFlags: true,
        availabilityDelay: -14,
        allowHardcodedSubs: false,
      });
    });

    test("throws if indexer config is missing an id", async () => {
      const serverState = {
        id: undefined,
        rssSyncInterval: 25,
        retention: 0,
        minimumAge: 0,
        maximumSize: 0,
      };
      const client = mockClient(serverState);
      await expect(syncIndexerConfig(client, { rss_sync_interval: 60 })).rejects.toThrow("Indexer config is missing an id");
    });
  });
});
