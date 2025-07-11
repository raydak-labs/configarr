import { describe, expect, test, vi } from "vitest";

describe("DelayProfiles", () => {
  test("should correctly check diffs simple", async () => {
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
          tags: [3],
        },
      ],
    };
    // Simulate server data
    const serverProfiles = [
      {
        enableUsenet: true,
        enableTorrent: false,
        preferredProtocol: "usenet",
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
        preferredProtocol: "usenet",
        usenetDelay: 10,
        torrentDelay: 0,
        bypassIfHighestQuality: false,
        bypassIfAboveCustomFormatScore: false,
        minimumCustomFormatScore: 0,
        order: 1,
        tags: [1, 2],
      },
    ];
    vi.doMock("./clients/unified-client", () => ({
      getUnifiedClient: () => ({
        getDelayProfiles: async () => serverProfiles,
      }),
    }));
    const { calculateDelayProfilesDiff } = await import("./delay-profiles");
    const diff = await calculateDelayProfilesDiff(configProfiles as any);
    expect(diff?.missingOnServer).toHaveLength(1);
    expect(diff?.notAvailableAnymore).toHaveLength(1);
    expect(diff?.notAvailableAnymore.find((p: any) => Array.isArray(p.tags) && p.tags.length === 0)).toBeUndefined();
    expect(diff?.changed).toHaveLength(0);
  });

  test("should detect missing, changed, and not available delay profiles (new config structure)", async () => {
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
        tags: [],
      },
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
          tags: [3],
        },
      ],
    };
    const serverProfiles = [
      {
        id: 1,
        enableUsenet: true,
        enableTorrent: false,
        preferredProtocol: "usenet",
        usenetDelay: 10,
        torrentDelay: 0,
        bypassIfHighestQuality: false,
        bypassIfAboveCustomFormatScore: false,
        minimumCustomFormatScore: 0,
        order: 1,
        tags: [],
      },
      {
        id: 2,
        enableUsenet: false,
        enableTorrent: true,
        preferredProtocol: "torrent",
        usenetDelay: 0,
        torrentDelay: 10, // different from config
        bypassIfHighestQuality: true,
        bypassIfAboveCustomFormatScore: false,
        minimumCustomFormatScore: 0,
        order: 2,
        tags: [3],
      },
      {
        id: 3,
        enableUsenet: false,
        enableTorrent: true,
        preferredProtocol: "torrent",
        usenetDelay: 0,
        torrentDelay: 30,
        bypassIfHighestQuality: false,
        bypassIfAboveCustomFormatScore: false,
        minimumCustomFormatScore: 0,
        order: 3,
        tags: [4],
      },
    ];
    vi.doMock("./clients/unified-client", () => ({
      getUnifiedClient: () => ({
        getDelayProfiles: async () => serverProfiles,
      }),
    }));
    const { calculateDelayProfilesDiff } = await import("./delay-profiles");
    const diff = await calculateDelayProfilesDiff(configProfiles as any);
    expect(diff?.missingOnServer).toHaveLength(1);
    expect(diff?.notAvailableAnymore).toHaveLength(1);
    expect(diff?.notAvailableAnymore.find((p: any) => Array.isArray(p.tags) && p.tags.length === 0)).toBeUndefined();
    expect(diff?.changed).toHaveLength(1);
  });

  test("should handle config with no default profile and never delete server default", async () => {
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
          tags: [3],
        },
      ],
    };
    const serverProfiles = [
      {
        id: 1,
        enableUsenet: true,
        enableTorrent: false,
        preferredProtocol: "usenet",
        usenetDelay: 10,
        torrentDelay: 0,
        bypassIfHighestQuality: false,
        bypassIfAboveCustomFormatScore: false,
        minimumCustomFormatScore: 0,
        order: 1,
        tags: [],
      },
      {
        id: 2,
        enableUsenet: false,
        enableTorrent: true,
        preferredProtocol: "torrent",
        usenetDelay: 0,
        torrentDelay: 10, // different from config
        bypassIfHighestQuality: true,
        bypassIfAboveCustomFormatScore: false,
        minimumCustomFormatScore: 0,
        order: 2,
        tags: [3],
      },
      {
        id: 3,
        enableUsenet: false,
        enableTorrent: true,
        preferredProtocol: "torrent",
        usenetDelay: 0,
        torrentDelay: 30,
        bypassIfHighestQuality: false,
        bypassIfAboveCustomFormatScore: false,
        minimumCustomFormatScore: 0,
        order: 3,
        tags: [4],
      },
    ];
    vi.doMock("./clients/unified-client", () => ({
      getUnifiedClient: () => ({
        getDelayProfiles: async () => serverProfiles,
      }),
    }));
    const { calculateDelayProfilesDiff } = await import("./delay-profiles");
    const diff = await calculateDelayProfilesDiff(configProfiles as any);
    expect(diff?.missingOnServer).toHaveLength(1);
    expect(diff?.notAvailableAnymore).toHaveLength(1);
    expect(diff?.notAvailableAnymore.find((p: any) => Array.isArray(p.tags) && p.tags.length === 0)).toBeUndefined();
    expect(diff?.changed).toHaveLength(0);
  });
});
