import { beforeEach, describe, expect, test, vi } from "vitest";
import { ServerCache } from "../cache";
import { DiffCollector } from "../diffReport/diffCollector";
import { logger } from "../logger";
import { MergedConfigInstance } from "../types/config.types";
import { completeMediaSync, MediaFeatureSyncs, MediaSyncContext } from "./mediaPipeline";

const configWithoutRemotePaths = (): MergedConfigInstance =>
  ({
    custom_formats: [],
    quality_profiles: [],
    download_clients: {
      data: [{ name: "qBit", type: "qbittorrent", fields: { host: "qbittorrent", password: "SUPERSECRET123" } }],
      update_password: true,
    },
  }) as MergedConfigInstance;

const context = (): MediaSyncContext => {
  const syncs = {
    downloadClients: { syncDownloadClients: vi.fn().mockResolvedValue({ diffEntries: [] }) },
  } as unknown as MediaFeatureSyncs;

  return {
    arrType: "RADARR",
    instanceName: "main",
    client: {} as MediaSyncContext["client"],
    config: configWithoutRemotePaths(),
    serverCache: new ServerCache(),
    collector: new DiffCollector(),
    syncs,
  };
};

describe("completeMediaSync", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("does not log download client secrets when there are no remote paths", async () => {
    const loggerDebugSpy = vi.spyOn(logger, "debug").mockImplementation(() => undefined);

    await completeMediaSync(context());

    const logged = loggerDebugSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(logged).toContain("No remote paths to sync for RADARR");
    expect(logged).toContain("download_clients keys");
    expect(logged).not.toContain("SUPERSECRET123");
  });

  test("masks download client secrets that reach the diff report", async () => {
    const ctx = context();
    vi.spyOn(ctx.syncs.downloadClients, "syncDownloadClients").mockResolvedValue({
      added: 0,
      updated: 1,
      removed: 0,
      failed: 0,
      diffEntries: [
        {
          resourceType: "DownloadClient",
          name: "qBit",
          action: "update",
          fieldChanges: [{ field: "fields.password", from: "********", to: "SUPERSECRET123" }],
        },
      ],
    });

    const report = await completeMediaSync(ctx);

    expect(JSON.stringify(report)).not.toContain("SUPERSECRET123");
    expect(report.entries[0]!.fieldChanges).toEqual([{ field: "fields.password", from: "********", to: "********" }]);
  });
});
