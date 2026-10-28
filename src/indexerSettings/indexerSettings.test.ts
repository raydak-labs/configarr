import { beforeEach, describe, expect, test, vi } from "vitest";
import { prepareIndexerSettings, syncIndexerSettings, type IndexerSettingsClient } from "./indexerSettings";
import type { MergedConfigInstance } from "../types/config.types";
import { ConfigValidationError } from "../validation";

vi.mock("../env", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../env")>()),
  getEnvs: vi.fn(() => ({ DRY_RUN: false, LOG_LEVEL: "fatal" })),
}));
import { getEnvs } from "../env";
const instance = { custom_formats: [], quality_profiles: [] } as MergedConfigInstance;
const indexer = {
  id: 2,
  name: "Example (Prowlarr)",
  downloadClientId: 0,
  fields: [
    { name: "apiKey", value: "********" },
    {
      name: "multiLanguages",
      value: [1],
      selectOptions: [
        { name: "English", value: 1 },
        { name: "Hindi", value: 27 },
      ],
    },
    { name: "failDownloads", value: [], selectOptions: [{ name: "Executables", value: 0 }] },
  ],
};
const client: IndexerSettingsClient = {
  getIndexers: vi.fn(async () => [indexer]),
  getDownloadClients: vi.fn(async () => [{ id: 4, name: "Client" }]),
  updateIndexer: vi.fn(async () => ({})),
};

describe("indexer settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEnvs).mockReturnValue({ DRY_RUN: false, LOG_LEVEL: "fatal" } as ReturnType<typeof getEnvs>);
  });
  test("resolves server options and client names, preserving unrelated fields and masked secrets", async () => {
    const config = {
      data: [{ name: "Example (Prowlarr)", multi_languages: ["Hindi"], fail_downloads: ["Executables"], download_client: "Client" }],
    };
    const result = await syncIndexerSettings(client, config, instance);
    expect(result).toHaveLength(1);
    expect(client.updateIndexer).toHaveBeenCalledWith(
      "2",
      expect.objectContaining({
        downloadClientId: 4,
        fields: [
          { name: "apiKey", value: "********" },
          expect.objectContaining({ name: "multiLanguages", value: [27] }),
          expect.objectContaining({ name: "failDownloads", value: [0] }),
        ],
      }),
    );
  });
  test("validates all entries before updating and skips missing indexers", async () => {
    const config = {
      data: [
        { name: "absent", multi_languages: ["English"] },
        { name: "Example (Prowlarr)", multi_languages: ["Invalid"] },
      ],
    };
    await expect(syncIndexerSettings(client, config, instance)).rejects.toBeInstanceOf(ConfigValidationError);
    expect(client.updateIndexer).not.toHaveBeenCalled();
  });
  test("skips a missing indexer without writing", async () => {
    await expect(
      syncIndexerSettings(client, { data: [{ name: "not yet synced", multi_languages: ["English"] }] }, instance),
    ).resolves.toEqual([]);
    expect(client.updateIndexer).not.toHaveBeenCalled();
  });
  test("accepts download clients scheduled for creation during preflight", async () => {
    const config = { data: [{ name: "Example (Prowlarr)", download_client: "Planned" }] };
    const planned = { ...instance, download_clients: { data: [{ name: "Planned", type: "rtorrent" }] } };
    await expect(prepareIndexerSettings(client, config, planned, true)).resolves.toHaveLength(1);
    await expect(syncIndexerSettings(client, config, planned)).rejects.toBeInstanceOf(ConfigValidationError);
    vi.mocked(getEnvs).mockReturnValue({ DRY_RUN: true, LOG_LEVEL: "fatal" } as ReturnType<typeof getEnvs>);
    await expect(syncIndexerSettings(client, config, planned)).resolves.toMatchObject([
      { action: "update", fieldChanges: [{ field: "download_client", to: "Planned" }] },
    ]);
    expect(client.updateIndexer).not.toHaveBeenCalled();
  });
  test("rejects a referenced download client scheduled for cleanup before writes", async () => {
    const config = { data: [{ name: "Example (Prowlarr)", download_client: "Client" }] };
    const cleanup = { ...instance, download_clients: { delete_unmanaged: { enabled: true } } };
    await expect(prepareIndexerSettings(client, config, cleanup, true)).rejects.toThrow("scheduled for removal");
    expect(client.updateIndexer).not.toHaveBeenCalled();
  });
  test("rejects cleanup of an existing association even when download_client is omitted", async () => {
    vi.mocked(client.getIndexers).mockResolvedValueOnce([{ ...indexer, downloadClientId: 4 }]);
    const cleanup = { ...instance, download_clients: { delete_unmanaged: { enabled: true } } };
    await expect(prepareIndexerSettings(client, { data: [{ name: indexer.name }] }, cleanup, true)).rejects.toThrow(
      "scheduled for removal",
    );
  });
  test.each([
    { configuredType: "QBITTORRENT", ignore: [], removed: false },
    { configuredType: "Transmission", ignore: [], removed: true },
    { configuredType: "Transmission", ignore: ["Client"], removed: false },
  ])(
    "uses the download-client cleanup rules for referenced clients: $configuredType, $ignore",
    async ({ configuredType, ignore, removed }) => {
      vi.mocked(client.getDownloadClients).mockResolvedValueOnce([{ id: 4, name: "Client", implementation: "qBittorrent" }]);
      const config = { data: [{ name: indexer.name, download_client: "Client" }] };
      const cleanup = {
        ...instance,
        download_clients: { data: [{ name: "Client", type: configuredType }], delete_unmanaged: { enabled: true, ignore } },
      };
      const result = prepareIndexerSettings(client, config, cleanup, true);
      if (removed) await expect(result).rejects.toThrow("scheduled for removal");
      else await expect(result).resolves.toHaveLength(1);
    },
  );
});
