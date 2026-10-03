/**
 * Error propagation of the media pipeline write boundaries.
 *
 * A failing write must not resolve normally: `completeMediaSync` has to reject so that the
 * instance loop in src/index.ts counts the instance as a failure instead of reporting a green
 * summary for a configuration that was never applied. Every boundary keeps logging the failure
 * before it propagates.
 *
 * ConfigValidationError keeps its documented behavior on every boundary (log + propagate).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServerCache } from "../cache";
import { ConfigValidationError } from "../validation";
import { completeMediaSync, type MediaFeatureSyncs } from "./mediaPipeline";

vi.mock("../logger", () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("../env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../env")>();
  return {
    ...actual,
    getEnvs: vi.fn(() => ({ DRY_RUN: false, DEBUG_CREATE_FILES: false, LOAD_LOCAL_SAMPLES: false, LOG_LEVEL: "silent" })),
  };
});
vi.mock("../downloadClientConfig/downloadClientConfigSyncer", () => ({
  syncDownloadClientConfig: vi.fn(async () => ({ diffEntries: [] })),
  downloadClientConfigDiffToDiffEntries: vi.fn(() => []),
}));
vi.mock("../remotePaths/remotePathSyncer", () => ({ syncRemotePaths: vi.fn(async () => ({ diffEntries: [] })) }));

import { getEnvs } from "../env";
import { syncDownloadClientConfig } from "../downloadClientConfig/downloadClientConfigSyncer";
import { logger } from "../logger";
import { syncRemotePaths } from "../remotePaths/remotePathSyncer";

const DOWNLOAD_CLIENTS = { download_clients: { data: [{ name: "qbit", type: "QBittorrent" }] } };
const DOWNLOAD_CLIENT_CONFIG = { download_clients: { config: { enable_completed_download_handling: true } } };
const REMOTE_PATHS = {
  download_clients: { remote_paths: [{ host: "seed", remote_path: "/downloads", local_path: "/data" }] },
};

const client = () => ({ createTag: vi.fn(async (tag: { label: string }) => ({ id: 1, label: tag.label })) });

const syncs = (): MediaFeatureSyncs =>
  ({
    qd: { loadFromServer: vi.fn(async () => []), persist: vi.fn() },
    mm: { persistNaming: vi.fn(), persistMediamanagement: vi.fn() },
    qp: { loadFromServer: vi.fn(async () => []) },
    delay: { calculateDiff: vi.fn(async () => null) },
    releaseProfiles: { sync: vi.fn(async () => ({ diffEntries: [] })) },
    root: { syncRootFolders: vi.fn(async () => ({ added: 0, removed: 0, updated: 0, diffEntries: [] })) },
    downloadClients: { syncDownloadClients: vi.fn(async () => ({ added: 0, updated: 0, removed: 0, failed: 0, diffEntries: [] })) },
  }) as unknown as MediaFeatureSyncs;

const complete = (syncObjects: MediaFeatureSyncs, instanceConfig: object) =>
  completeMediaSync({
    arrType: "SONARR",
    instanceName: "test",
    client: client() as never,
    config: instanceConfig,
    serverCache: new ServerCache({ tags: [] }),
    collector: { add: vi.fn(), getEntries: vi.fn(() => []) } as never,
    syncs: syncObjects,
  } as never);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getEnvs).mockReturnValue({
    DRY_RUN: false,
    DEBUG_CREATE_FILES: false,
    LOAD_LOCAL_SAMPLES: false,
    LOG_LEVEL: "silent",
  } as never);
});

describe("completeMediaSync error propagation", () => {
  it("propagates a download client sync failure after logging it", async () => {
    const syncObjects = syncs();
    vi.mocked(syncObjects.downloadClients.syncDownloadClients).mockRejectedValue(new Error("500 from /api/v3/downloadclient"));

    await expect(complete(syncObjects, DOWNLOAD_CLIENTS)).rejects.toThrow("500 from /api/v3/downloadclient");
    expect(logger.error).toHaveBeenCalledWith("Failed to sync download clients: 500 from /api/v3/downloadclient");
  });

  it("propagates a download client config sync failure after logging it", async () => {
    vi.mocked(syncDownloadClientConfig).mockRejectedValue(new Error("500 from /api/v3/config/downloadclient"));

    await expect(complete(syncs(), DOWNLOAD_CLIENT_CONFIG)).rejects.toThrow("500 from /api/v3/config/downloadclient");
    expect(logger.error).toHaveBeenCalledWith("Failed to sync download client config: 500 from /api/v3/config/downloadclient");
  });

  it("propagates a remote path sync failure after logging it", async () => {
    vi.mocked(syncRemotePaths).mockRejectedValue(new Error("500 from /api/v3/remotepathmapping"));

    await expect(complete(syncs(), REMOTE_PATHS)).rejects.toThrow("500 from /api/v3/remotepathmapping");
    expect(logger.error).toHaveBeenCalledWith("Failed to sync remote path mappings: 500 from /api/v3/remotepathmapping");
  });

  it("propagates a non-Error rejection from the download client sync", async () => {
    const syncObjects = syncs();
    vi.mocked(syncObjects.downloadClients.syncDownloadClients).mockRejectedValue("timeout");

    await expect(complete(syncObjects, DOWNLOAD_CLIENTS)).rejects.toBe("timeout");
    expect(logger.error).toHaveBeenCalledWith("Failed to sync download clients: timeout");
  });

  it("stops the remaining stages once a download client write failed", async () => {
    const syncObjects = syncs();
    vi.mocked(syncObjects.downloadClients.syncDownloadClients).mockRejectedValue(new Error("boom"));
    vi.mocked(syncDownloadClientConfig).mockResolvedValue({ diffEntries: [] } as never);

    await expect(
      complete(syncObjects, {
        download_clients: { ...DOWNLOAD_CLIENTS.download_clients, config: DOWNLOAD_CLIENT_CONFIG.download_clients.config },
      }),
    ).rejects.toThrow("boom");

    expect(syncDownloadClientConfig).not.toHaveBeenCalled();
  });

  it("keeps propagating a ConfigValidationError from the download client sync", async () => {
    const syncObjects = syncs();
    vi.mocked(syncObjects.downloadClients.syncDownloadClients).mockRejectedValue(new ConfigValidationError("unknown implementation"));

    await expect(complete(syncObjects, DOWNLOAD_CLIENTS)).rejects.toThrow(ConfigValidationError);
    expect(logger.error).toHaveBeenCalledWith("Failed to sync download clients: unknown implementation");
  });

  it("keeps propagating a ConfigValidationError from the download client config sync", async () => {
    vi.mocked(syncDownloadClientConfig).mockRejectedValue(new ConfigValidationError("unknown service"));

    await expect(complete(syncs(), DOWNLOAD_CLIENT_CONFIG)).rejects.toThrow(ConfigValidationError);
    expect(logger.error).toHaveBeenCalledWith("Failed to sync download client config: unknown service");
  });

  it("keeps propagating a ConfigValidationError from the remote path sync", async () => {
    vi.mocked(syncRemotePaths).mockRejectedValue(new ConfigValidationError("invalid remote path"));

    await expect(complete(syncs(), REMOTE_PATHS)).rejects.toThrow(ConfigValidationError);
    expect(logger.error).toHaveBeenCalledWith("Failed to sync remote path mappings: invalid remote path");
  });
});
