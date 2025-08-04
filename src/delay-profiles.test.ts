import { describe, expect, test, vi } from "vitest";
import { MergedDelayProfileResource } from "./__generated__/mergedTypes";

// Hoist the mock to ensure it runs before imports
const mockGetDelayProfiles = vi.hoisted(() => vi.fn());

vi.mock("./clients/unified-client", () => ({
  getUnifiedClient: () => ({
    getDelayProfiles: mockGetDelayProfiles,
  }),
}));

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
    const serverProfiles: MergedDelayProfileResource[] = [
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

    mockGetDelayProfiles.mockResolvedValue(serverProfiles);

    const { calculateDelayProfilesDiff } = await import("./delay-profiles");
    const diff = await calculateDelayProfilesDiff(configProfiles, [{ label: "test", id: 1 }]);

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
    const serverProfiles: MergedDelayProfileResource[] = [
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
    ];

    mockGetDelayProfiles.mockResolvedValue(serverProfiles);

    const { calculateDelayProfilesDiff } = await import("./delay-profiles");
    const diff = await calculateDelayProfilesDiff(configProfiles, []);

    expect(diff).not.toBeNull();
    expect(diff?.defaultProfileChanged).toBe(true);
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
    const serverProfiles: MergedDelayProfileResource[] = [
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

    mockGetDelayProfiles.mockResolvedValue(serverProfiles);

    const { calculateDelayProfilesDiff } = await import("./delay-profiles");
    const diff = await calculateDelayProfilesDiff(configProfiles, []);

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
    const serverProfiles: MergedDelayProfileResource[] = [
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

    mockGetDelayProfiles.mockResolvedValue(serverProfiles);

    const { calculateDelayProfilesDiff } = await import("./delay-profiles");
    const diff = await calculateDelayProfilesDiff(configProfiles, []);

    expect(diff).not.toBeNull();
    expect(diff?.missingTags).toHaveLength(1);
  });
});
