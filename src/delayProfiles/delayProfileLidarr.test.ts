import { describe, expect, test, vi } from "vitest";
import { DelayProfileLidarrSync } from "./delayProfileLidarr";

const delayApi = {
  getDelayProfiles: vi.fn(),
  createDelayProfile: vi.fn(),
  updateDelayProfile: vi.fn(),
  deleteDelayProfile: vi.fn(),
};

const lidarrDelay = () => new DelayProfileLidarrSync(delayApi);

describe("DelayProfileLidarrSync", () => {
  test("Lidarr classic delay YAML diffs usenetDelay like other *arrs", async () => {
    const configProfiles = {
      default: {
        enableUsenet: true,
        enableTorrent: false,
        preferredProtocol: "usenet",
        usenetDelay: 10,
        torrentDelay: 0,
        bypassIfHighestQuality: false,
        bypassIfAboveCustomFormatScore: false,
        minimumCustomFormatScore: 0,
      },
    };

    delayApi.getDelayProfiles.mockResolvedValue([
      {
        id: 1,
        tags: [],
        enableUsenet: true,
        enableTorrent: true,
        preferredProtocol: "usenet",
        usenetDelay: 0,
        torrentDelay: 0,
        bypassIfHighestQuality: false,
        bypassIfAboveCustomFormatScore: false,
        minimumCustomFormatScore: 0,
        order: 1,
      },
    ]);

    const diff = await lidarrDelay().calculateDiff(configProfiles, []);

    expect(diff?.defaultProfileChanged).toBe(true);
    expect(diff?.defaultProfileFieldChanges).toEqual(
      expect.arrayContaining([
        { field: "enableTorrent", from: true, to: false },
        { field: "usenetDelay", from: 0, to: 10 },
      ]),
    );
  });

  test("mapToServerDelayProfile - Lidarr classic YAML keeps enableUsenet/usenetDelay", async () => {
    const mapped = lidarrDelay().mapToServer(
      {
        enableUsenet: true,
        enableTorrent: false,
        preferredProtocol: "usenet",
        usenetDelay: 10,
        torrentDelay: 0,
      },
      [],
    );

    expect(mapped).toMatchObject({
      enableUsenet: true,
      enableTorrent: false,
      preferredProtocol: "usenet",
      usenetDelay: 10,
      torrentDelay: 0,
    });
    expect(mapped).not.toHaveProperty("items");
  });

  test("mapToServerDelayProfile - items-only payload omits legacy protocol fields", async () => {
    const mapped = lidarrDelay().mapToServer(
      {
        items: [
          { name: "Usenet", protocol: "UsenetDownloadProtocol", allowed: true, delay: 2 },
          { name: "Torrent", protocol: "TorrentDownloadProtocol", allowed: true, delay: 0 },
          { name: "Youtube", protocol: "YoutubeDownloadProtocol", allowed: false, delay: 0 },
        ],
        bypassIfHighestQuality: true,
        bypassIfAboveCustomFormatScore: true,
        minimumCustomFormatScore: 0,
      },
      [],
    );

    expect(mapped).toEqual({
      bypassIfHighestQuality: true,
      bypassIfAboveCustomFormatScore: true,
      minimumCustomFormatScore: 0,
      order: undefined,
      tags: [],
      items: [
        { name: "Usenet", protocol: "UsenetDownloadProtocol", allowed: true, delay: 2 },
        { name: "Torrent", protocol: "TorrentDownloadProtocol", allowed: true, delay: 0 },
        { name: "Youtube", protocol: "YoutubeDownloadProtocol", allowed: false, delay: 0 },
      ],
    });
    expect(mapped).not.toHaveProperty("preferredProtocol");
    expect(mapped).not.toHaveProperty("enableUsenet");
  });

  test("InputConfigDelayProfileSchema - accepts Items alias", async () => {
    const { InputConfigDelayProfileSchema } = await import("../types/config.types");
    const parsed = InputConfigDelayProfileSchema.parse({
      Items: [{ name: "Usenet", protocol: "UsenetDownloadProtocol", allowed: true, delay: 2 }],
      bypassIfHighestQuality: true,
    });

    expect(parsed).toEqual({
      items: [{ name: "Usenet", protocol: "UsenetDownloadProtocol", allowed: true, delay: 2 }],
      bypassIfHighestQuality: true,
    });
  });
});
