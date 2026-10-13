import { describe, expect, test, vi } from "vitest";
import { ReleaseProfileResource } from "../__generated__/sonarr-v5/data-contracts";
import { ServerCache } from "../cache";
import { ConfigValidationError } from "../validation";
import { ReleaseProfileSonarrSync } from "./releaseProfileSonarr";

const createApi = (profiles: ReleaseProfileResource[] = [], supportsReleaseProfileControls = true) => ({
  getReleaseProfiles: vi.fn().mockResolvedValue(profiles),
  createReleaseProfile: vi.fn().mockResolvedValue({}),
  updateReleaseProfile: vi.fn().mockResolvedValue({}),
  deleteReleaseProfile: vi.fn().mockResolvedValue(undefined),
  getTags: vi.fn().mockResolvedValue([]),
  createTag: vi.fn().mockResolvedValue({}),
  deleteTag: vi.fn().mockResolvedValue(undefined),
  getIndexers: vi.fn().mockResolvedValue([
    { id: 7, name: "Usenet" },
    { id: 8, name: "Torrents" },
  ]),
  supportsReleaseProfileControls: vi.fn().mockResolvedValue(supportsReleaseProfileControls),
});

const syncFor = (api: ReturnType<typeof createApi>) => new ReleaseProfileSonarrSync(api);

describe("ReleaseProfileSonarrSync", () => {
  test("creates a v5 profile with plural indexers and policy controls", async () => {
    const api = createApi();
    const sync = syncFor(api);

    await sync.sync(
      [
        {
          name: "HEVC",
          required: ["hevc"],
          indexers: ["Torrents", "Usenet"],
          excluded_tags: ["anime"],
          air_date_restriction: true,
          air_date_grace_period: 12,
          allow_season_pack_without_all_episodes_aired: true,
        },
      ],
      new ServerCache({ tags: [{ id: 4, label: "anime" }] }),
    );

    expect(api.createReleaseProfile).toHaveBeenCalledWith({
      name: "HEVC",
      enabled: true,
      required: ["hevc"],
      ignored: [],
      indexerIds: [7, 8],
      tags: [],
      excludedTags: [4],
      airDateRestriction: true,
      airDateGracePeriod: 12,
      allowSeasonPackWithoutAllEpisodesAired: true,
    });
  });

  test("compares indexer IDs as an unordered set", async () => {
    const api = createApi([
      {
        id: 3,
        name: "HEVC",
        enabled: true,
        required: ["hevc"],
        ignored: [],
        indexerIds: [8, 7],
        tags: [],
      },
    ]);
    const sync = syncFor(api);

    const result = await sync.sync([{ name: "HEVC", required: ["hevc"], indexers: ["Usenet", "Torrents"] }], new ServerCache());

    expect(api.updateReleaseProfile).not.toHaveBeenCalled();
    expect(result.updated).toBe(0);
  });

  test("keeps the legacy singular indexer selector on the v5 resource", async () => {
    const api = createApi();

    await syncFor(api).sync([{ name: "HEVC", indexer: "Usenet" }], new ServerCache());

    expect(api.createReleaseProfile).toHaveBeenCalledWith(expect.objectContaining({ indexerIds: [7] }));
  });

  test("treats an empty legacy indexer selector as all indexers", async () => {
    const api = createApi();

    await syncFor(api).sync([{ name: "HEVC", indexer: "" }], new ServerCache());

    expect(api.getIndexers).not.toHaveBeenCalled();
    expect(api.createReleaseProfile).toHaveBeenCalledWith(expect.objectContaining({ indexerIds: [] }));
  });

  test("does not update when excluded tags only differ by ordering or nullability", async () => {
    const api = createApi([
      {
        id: 3,
        name: "HEVC",
        enabled: true,
        required: ["hevc"],
        ignored: [],
        indexerIds: [],
        tags: [],
        excludedTags: [8, 4],
      },
    ]);

    const result = await syncFor(api).sync(
      [{ name: "HEVC", required: ["hevc"], excluded_tags: ["anime", "foreign"] }],
      new ServerCache({
        tags: [
          { id: 4, label: "anime" },
          { id: 8, label: "foreign" },
        ],
      }),
    );

    expect(api.updateReleaseProfile).not.toHaveBeenCalled();
    expect(result.updated).toBe(0);
  });

  test("treats null excluded tags as an empty tag set", async () => {
    const api = createApi([
      {
        id: 3,
        name: "HEVC",
        enabled: true,
        required: ["hevc"],
        ignored: [],
        indexerIds: [],
        tags: [],
        excludedTags: null,
      },
    ]);

    const result = await syncFor(api).sync([{ name: "HEVC", required: ["hevc"], excluded_tags: [] }], new ServerCache());

    expect(api.updateReleaseProfile).not.toHaveBeenCalled();
    expect(result.updated).toBe(0);
  });

  test("treats omitted or null policy defaults as configured false and zero", async () => {
    const api = createApi([
      {
        id: 3,
        name: "HEVC",
        enabled: true,
        required: ["hevc"],
        ignored: [],
        indexerIds: [],
        tags: [],
        airDateGracePeriod: null,
      },
    ]);

    const result = await syncFor(api).sync(
      [
        {
          name: "HEVC",
          required: ["hevc"],
          air_date_restriction: false,
          air_date_grace_period: 0,
          allow_season_pack_without_all_episodes_aired: false,
        },
      ],
      new ServerCache(),
    );

    expect(api.updateReleaseProfile).not.toHaveBeenCalled();
    expect(result.updated).toBe(0);
  });

  test("rejects a tag configured as both included and excluded before creating resources", async () => {
    const api = createApi();
    const sync = syncFor(api);

    await expect(
      sync.sync([{ name: "HEVC", tags: ["anime"], excluded_tags: ["ANIME"] }], new ServerCache({ tags: [{ id: 4, label: "anime" }] })),
    ).rejects.toThrow("cannot be both included and excluded");

    expect(api.createReleaseProfile).not.toHaveBeenCalled();
    expect(api.createTag).not.toHaveBeenCalled();
  });

  test("preserves omitted v5 controls when updating another field", async () => {
    const api = createApi([
      {
        id: 3,
        name: "HEVC",
        enabled: true,
        required: ["hevc"],
        ignored: [],
        indexerIds: [],
        tags: [],
        excludedTags: [4],
        airDateRestriction: true,
        airDateGracePeriod: 12,
        allowSeasonPackWithoutAllEpisodesAired: true,
      },
    ]);
    const sync = syncFor(api);

    await sync.sync([{ name: "HEVC", required: ["hevc", "x265"] }], new ServerCache());

    expect(api.updateReleaseProfile).toHaveBeenCalledWith(
      "3",
      expect.objectContaining({
        excludedTags: [4],
        airDateRestriction: true,
        airDateGracePeriod: 12,
        allowSeasonPackWithoutAllEpisodesAired: true,
      }),
    );
  });

  test("rejects v5-only options on v4 before writing", async () => {
    const api = createApi([], false);
    const sync = syncFor(api);

    await expect(sync.sync([{ name: "HEVC", indexers: ["Usenet"] }], new ServerCache())).rejects.toBeInstanceOf(ConfigValidationError);

    expect(api.getReleaseProfiles).not.toHaveBeenCalled();
    expect(api.createReleaseProfile).not.toHaveBeenCalled();
  });
});
