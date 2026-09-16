import { describe, expect, test, vi } from "vitest";
import { DownloadProtocol } from "../__generated__/sonarr/data-contracts";
import { areTagsEqual, delayProfilesToDiffEntries, StandardDelayProfile, StandardDelayProfileSync } from "./delayProfileBase";
import { DelayProfileLidarrSync } from "./delayProfileLidarr";

const delayApi = {
  getDelayProfiles: vi.fn(),
  createDelayProfile: vi.fn(),
  updateDelayProfile: vi.fn(),
  deleteDelayProfile: vi.fn(),
};

const sonarrDelay = () => new StandardDelayProfileSync(delayApi, DownloadProtocol);
const lidarrDelay = () => new DelayProfileLidarrSync(delayApi);

describe("DelayProfiles", () => {
  test("should not diff (with default profile and additional profile)", async () => {
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
        order: 1,
      },
      additional: [
        {
          enableUsenet: true,
          enableTorrent: false,
          preferredProtocol: "usenet",
          usenetDelay: 10,
          torrentDelay: 0,
          bypassIfHighestQuality: false,
          bypassIfAboveCustomFormatScore: false,
          minimumCustomFormatScore: 0,
          order: 2,
          tags: ["test"],
        },
      ],
    };

    // Simulate server data that matches the config
    const serverProfiles: StandardDelayProfile[] = [
      {
        enableUsenet: true,
        enableTorrent: false,
        preferredProtocol: "usenet" as any,
        usenetDelay: 10,
        torrentDelay: 0,
        bypassIfHighestQuality: false,
        bypassIfAboveCustomFormatScore: false,
        minimumCustomFormatScore: 0,
        order: 1,
        tags: [], // default profile
      },
      {
        id: 1,
        enableUsenet: true,
        enableTorrent: false,
        preferredProtocol: "usenet" as any,
        usenetDelay: 10,
        torrentDelay: 0,
        bypassIfHighestQuality: false,
        bypassIfAboveCustomFormatScore: false,
        minimumCustomFormatScore: 0,
        order: 2,
        tags: [1], // matches "test" tag
      },
    ];

    delayApi.getDelayProfiles.mockResolvedValue(serverProfiles);

    const diff = await sonarrDelay().calculateDiff(configProfiles, [{ label: "test", id: 1 }]);

    expect(diff).toBeNull();
  });

  test("should diff - changes in default profile", async () => {
    const configProfiles = {
      default: {
        enableUsenet: false,
        enableTorrent: true,
        preferredProtocol: "torrent",
        usenetDelay: 0,
        torrentDelay: 15,
        bypassIfHighestQuality: true,
        bypassIfAboveCustomFormatScore: false,
        minimumCustomFormatScore: 0,
      },
    };

    // Simulate server data with different default profile
    const serverProfiles: StandardDelayProfile[] = [
      {
        id: 7,
        enableUsenet: true,
        enableTorrent: false,
        preferredProtocol: "usenet" as any,
        usenetDelay: 10,
        torrentDelay: 0,
        bypassIfHighestQuality: false,
        bypassIfAboveCustomFormatScore: false,
        minimumCustomFormatScore: 0,
        order: 1,
        tags: [], // default profile
      },
    ];

    delayApi.getDelayProfiles.mockResolvedValue(serverProfiles);

    const diff = await sonarrDelay().calculateDiff(configProfiles, []);

    expect(diff).not.toBeNull();
    expect(diff?.defaultProfileChanged).toBe(true);
    expect(diff?.defaultProfileId).toBe("7");
    expect(diff?.additionalProfilesChanged).toBe(false);
    expect(diff?.defaultProfile).toBeDefined();
    expect(diff?.additionalProfiles).toHaveLength(0);
    expect(diff?.missingTags).toHaveLength(0);
  });

  test("should diff - changes in additional profile", async () => {
    const configProfiles = {
      additional: [
        {
          enableUsenet: false,
          enableTorrent: true,
          preferredProtocol: "torrent",
          usenetDelay: 0,
          torrentDelay: 20,
          bypassIfHighestQuality: true,
          bypassIfAboveCustomFormatScore: false,
          minimumCustomFormatScore: 0,
          order: 2,
          tags: ["test"],
        },
      ],
    };
    // Simulate server data
    const serverProfiles: StandardDelayProfile[] = [
      {
        enableUsenet: true,
        enableTorrent: false,
        preferredProtocol: "usenet" as any,
        usenetDelay: 10,
        torrentDelay: 0,
        bypassIfHighestQuality: false,
        bypassIfAboveCustomFormatScore: false,
        minimumCustomFormatScore: 0,
        order: 1,
        tags: [], // default profile
      },
      {
        id: 1,
        enableUsenet: true,
        enableTorrent: false,
        preferredProtocol: "usenet" as any,
        usenetDelay: 10,
        torrentDelay: 0,
        bypassIfHighestQuality: false,
        bypassIfAboveCustomFormatScore: false,
        minimumCustomFormatScore: 0,
        order: 1,
        tags: [1, 2],
      },
    ];

    delayApi.getDelayProfiles.mockResolvedValue(serverProfiles);

    const diff = await sonarrDelay().calculateDiff(configProfiles, []);

    expect(diff).not.toBeNull();
    expect(diff?.defaultProfileChanged).toBe(false);
    expect(diff?.additionalProfilesChanged).toBe(true);
    expect(diff?.defaultProfile).not.toBeDefined();
    expect(diff?.additionalProfiles).toBeDefined();
    expect(diff?.missingTags).toHaveLength(1);
  });

  test("should require new tags to be created", async () => {
    const configProfiles = {
      additional: [
        {
          enableUsenet: false,
          enableTorrent: true,
          preferredProtocol: "torrent",
          usenetDelay: 0,
          torrentDelay: 20,
          bypassIfHighestQuality: true,
          bypassIfAboveCustomFormatScore: false,
          minimumCustomFormatScore: 0,
          order: 2,
          tags: ["test"],
        },
      ],
    };
    // Simulate server data
    const serverProfiles: StandardDelayProfile[] = [
      {
        enableUsenet: true,
        enableTorrent: false,
        preferredProtocol: "usenet" as any,
        usenetDelay: 10,
        torrentDelay: 0,
        bypassIfHighestQuality: false,
        bypassIfAboveCustomFormatScore: false,
        minimumCustomFormatScore: 0,
        order: 1,
        tags: [], // default profile
      },
      {
        id: 1,
        enableUsenet: true,
        enableTorrent: false,
        preferredProtocol: "usenet" as any,
        usenetDelay: 10,
        torrentDelay: 0,
        bypassIfHighestQuality: false,
        bypassIfAboveCustomFormatScore: false,
        minimumCustomFormatScore: 0,
        order: 1,
        tags: [1, 2],
      },
    ];

    delayApi.getDelayProfiles.mockResolvedValue(serverProfiles);

    const diff = await sonarrDelay().calculateDiff(configProfiles, []);

    expect(diff).not.toBeNull();
    expect(diff?.missingTags).toHaveLength(1);
  });

  test("calculateDelayProfilesDiff - default profile change exposes structured fieldChanges", async () => {
    const configProfiles = {
      default: {
        enableUsenet: true,
        enableTorrent: true,
        preferredProtocol: "usenet",
        usenetDelay: 10,
        torrentDelay: 0,
        bypassIfHighestQuality: false,
        bypassIfAboveCustomFormatScore: false,
        minimumCustomFormatScore: 0,
        order: 1,
      },
    };

    const serverProfiles: StandardDelayProfile[] = [
      {
        id: 1,
        tags: [],
        enableUsenet: true,
        enableTorrent: true,
        preferredProtocol: "usenet" as any,
        usenetDelay: 0,
        torrentDelay: 0,
        bypassIfHighestQuality: false,
        bypassIfAboveCustomFormatScore: false,
        minimumCustomFormatScore: 0,
        order: 1,
      },
    ];

    delayApi.getDelayProfiles.mockResolvedValue(serverProfiles);

    const diff = await sonarrDelay().calculateDiff(configProfiles, []);

    expect(diff?.defaultProfileChanged).toBe(true);
    expect(diff?.defaultProfileFieldChanges).toEqual([{ field: "usenetDelay", from: 0, to: 10 }]);
  });

  test("delayProfilesToDiffEntries - builds a DiffEntry for the default profile", async () => {
    const diff = {
      defaultProfileChanged: true,
      additionalProfilesChanged: false,
      missingTags: [],
      defaultProfile: {} as any,
      additionalProfiles: [],
      defaultProfileFieldChanges: [{ field: "usenetDelay", from: 0, to: 10 }],
      additionalProfilesFieldChanges: [],
    };

    const entries = delayProfilesToDiffEntries(diff);

    expect(entries).toEqual([
      { resourceType: "DelayProfile", name: "default", action: "update", fieldChanges: [{ field: "usenetDelay", from: 0, to: 10 }] },
    ]);
  });

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

describe("areTagsEqual", () => {
  test("does not mutate input arrays", async () => {
    const left = [3, 1, 2];
    const right = [2, 3, 1];

    expect(areTagsEqual(left, right)).toBe(true);
    expect(left).toEqual([3, 1, 2]);
    expect(right).toEqual([2, 3, 1]);
  });
});
