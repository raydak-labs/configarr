import { describe, expect, test, vi } from "vitest";
import { DownloadProtocol } from "../__generated__/sonarr/data-contracts";
import { areTagsEqual, delayProfilesToDiffEntries, StandardDelayProfile, StandardDelayProfileSync } from "./delayProfileBase";

const delayApi = {
  getDelayProfiles: vi.fn(),
  createDelayProfile: vi.fn(),
  updateDelayProfile: vi.fn(),
  deleteDelayProfile: vi.fn(),
};

const sonarrDelay = () => new StandardDelayProfileSync(delayApi, DownloadProtocol);

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

  test("includes default-profile tags in missingTags", async () => {
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
        tags: ["new-default-tag"],
      },
    };

    delayApi.getDelayProfiles.mockResolvedValue([
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
        tags: [],
      },
    ]);

    const diff = await sonarrDelay().calculateDiff(configProfiles, []);

    expect(diff?.defaultProfileChanged).toBe(true);
    expect(diff?.missingTags).toEqual(["new-default-tag"]);
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
