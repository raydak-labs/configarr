import { afterEach, describe, expect, it, vi } from "vitest";
import { SeasonPackUpgradeType } from "../__generated__/sonarr-v5/data-contracts";
import { SonarrClient } from "./sonarr-client";

describe("SonarrClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the v5 settings route when the server advertises API v5", async () => {
    const requests: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const url = new URL(request.url);
        requests.push(`${request.method} ${url.pathname}`);

        if (url.pathname === "/api") {
          return Response.json({ current: "v5", deprecated: ["v3"] });
        }
        if (url.pathname === "/api/v5/settings/naming") {
          return Response.json({ id: 1, renameEpisodes: true, colonReplacementFormat: 4 });
        }

        throw new Error(`Unexpected request ${request.method} ${url.pathname}`);
      }),
    );

    const client = new SonarrClient("http://sonarr.test", "api-key");

    await expect(client.getNaming()).resolves.toMatchObject({ id: 1, renameEpisodes: true });
    expect(requests).toEqual(["GET /api", "GET /api/v5/settings/naming"]);
  });

  it("keeps using the v3 settings route for Sonarr v4", async () => {
    const requests: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const url = new URL(request.url);
        requests.push(`${request.method} ${url.pathname}`);

        if (url.pathname === "/api") {
          return Response.json({ current: "v3", deprecated: [] });
        }
        if (url.pathname === "/api/v3/config/naming") {
          return Response.json({ id: 1, renameEpisodes: true, colonReplacementFormat: 4 });
        }

        throw new Error(`Unexpected request ${request.method} ${url.pathname}`);
      }),
    );

    const client = new SonarrClient("http://sonarr.test", "api-key");

    await expect(client.getNaming()).resolves.toMatchObject({ id: 1, renameEpisodes: true });
    expect(requests).toEqual(["GET /api", "GET /api/v3/config/naming"]);
  });

  it("reads and updates Sonarr v5 media-management controls without losing other settings", async () => {
    const current = {
      id: 1,
      recycleBin: "/old",
      skipFreeSpaceCheckWhenGrabbing: false,
      seasonPackUpgrade: "all",
      seasonPackUpgradeThreshold: 100,
      userRejectedExtensions: "",
    };
    const requests: { method: string; path: string; body?: unknown }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const url = new URL(request.url);
        const body = request.method === "PUT" ? await request.json() : undefined;
        requests.push({ method: request.method, path: url.pathname, body });

        if (url.pathname === "/api") {
          return Response.json({ current: "v5", deprecated: ["v3"] });
        }
        if (url.pathname === "/api/v5/settings/mediamanagement" && request.method === "GET") {
          return Response.json(current);
        }
        if (url.pathname === "/api/v5/settings/mediamanagement/1" && request.method === "PUT") {
          return Response.json(body);
        }
        throw new Error(`Unexpected request ${request.method} ${url.pathname}`);
      }),
    );

    const client = new SonarrClient("http://sonarr.test", "api-key");
    const settings = await client.getMediamanagement();
    expect(settings).toMatchObject({
      seasonPackUpgrade: "all",
      seasonPackUpgradeThreshold: 100,
      userRejectedExtensions: "",
    });

    await client.updateMediamanagement("1", {
      ...settings,
      skipFreeSpaceCheckWhenGrabbing: true,
      seasonPackUpgrade: SeasonPackUpgradeType.Threshold,
      seasonPackUpgradeThreshold: 80,
      userRejectedExtensions: ".exe,.bat",
    });

    expect(requests).toEqual([
      { method: "GET", path: "/api", body: undefined },
      { method: "GET", path: "/api/v5/settings/mediamanagement", body: undefined },
      { method: "GET", path: "/api/v5/settings/mediamanagement", body: undefined },
      {
        method: "PUT",
        path: "/api/v5/settings/mediamanagement/1",
        body: {
          ...current,
          skipFreeSpaceCheckWhenGrabbing: true,
          seasonPackUpgrade: "threshold",
          seasonPackUpgradeThreshold: 80,
          userRejectedExtensions: ".exe,.bat",
          recycleBinCleanupDays: null,
          minimumFreeSpaceWhenImporting: null,
        },
      },
    ]);
  });

  it("preserves unmodeled Sonarr v4 media-management settings when updating", async () => {
    const current = {
      id: 1,
      recycleBin: "/old",
      futureV3Setting: true,
    };
    let sentSettings: Record<string, unknown> | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const url = new URL(request.url);
        if (url.pathname === "/api") {
          return Response.json({ current: "v3", deprecated: [] });
        }
        if (url.pathname === "/api/v3/config/mediamanagement" && request.method === "GET") {
          return Response.json(current);
        }
        if (url.pathname === "/api/v3/config/mediamanagement/1" && request.method === "PUT") {
          sentSettings = await request.json();
          return Response.json(sentSettings);
        }
        throw new Error(`Unexpected request ${request.method} ${url.pathname}`);
      }),
    );

    const client = new SonarrClient("http://sonarr.test", "api-key");
    const settings = await client.getMediamanagement();

    await client.updateMediamanagement("1", { ...settings, createEmptySeriesFolders: true });

    expect(sentSettings).toMatchObject({ ...current, createEmptySeriesFolders: true });
  });

  it("reads and updates nested quality sizes through the v5 quality-profile resource", async () => {
    const profile = {
      id: 1,
      name: "WEB-1080p",
      upgradeAllowed: true,
      items: [
        {
          id: 10,
          name: "WEB 1080p",
          allowed: true,
          items: [
            {
              id: 11,
              quality: { id: 11, name: "WEBDL-1080p" },
              minSize: 1,
              preferredSize: 50,
              maxSize: 200,
            },
          ],
        },
        {
          id: 12,
          name: "WEBRip 1080p",
          quality: { id: 12, name: "WEBRip-1080p" },
          allowed: false,
          items: null,
          minSize: 3,
        },
      ],
    };
    let sentProfile: Record<string, unknown> | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const url = new URL(request.url);
        if (url.pathname === "/api") {
          return Response.json({ current: "v5", deprecated: ["v3"] });
        }
        if (url.pathname === "/api/v5/qualityprofile" && request.method === "GET") {
          return Response.json([profile]);
        }
        if (url.pathname === "/api/v5/qualityprofile/1" && request.method === "PUT") {
          sentProfile = await request.json();
          return Response.json(sentProfile);
        }
        throw new Error(`Unexpected request ${request.method} ${url.pathname}`);
      }),
    );
    const client = new SonarrClient("http://sonarr.test", "api-key");

    await expect(client.getProfileQualitySizes()).resolves.toEqual([
      {
        id: 1,
        name: "WEB-1080p",
        items: [
          { quality: "WEBDL-1080p", minSize: 1, preferredSize: 50, maxSize: 200 },
          { quality: "WEBRip-1080p", minSize: 3, preferredSize: undefined, maxSize: undefined },
        ],
      },
    ]);
    await client.updateProfileQualitySizes("1", [
      { quality: "WEBDL-1080p", minSize: 0 },
      { quality: "WEBRip-1080p", minSize: null },
    ]);

    const [groupItem, nullItemsItem] = profile.items;
    const leafItem = groupItem?.items?.[0];
    if (groupItem == null || leafItem == null || nullItemsItem == null) {
      throw new Error("Expected nested and null profile items in the API fixture.");
    }
    expect(sentProfile).toMatchObject({
      id: 1,
      name: "WEB-1080p",
      upgradeAllowed: true,
      items: [
        {
          id: 10,
          items: [{ id: 11, quality: { name: "WEBDL-1080p" }, minSize: 0, preferredSize: 50, maxSize: 200 }],
        },
        { id: 12, items: null, minSize: null },
      ],
    });
    expect(sentProfile).toEqual({
      ...profile,
      items: [
        { ...groupItem, items: [{ ...leafItem, minSize: 0 }] },
        { ...nullItemsItem, minSize: null },
      ],
    });
  });

  it("preserves v5 per-profile sizes when quality items move between groups", async () => {
    const leaf = {
      id: 11,
      quality: { id: 11, name: "WEBDL-1080p" },
      minSize: 2,
      preferredSize: 60,
      maxSize: 220,
    };
    const profile = {
      id: 1,
      name: "WEB-1080p",
      upgradeAllowed: true,
      items: [
        { id: 10, name: "WEB 1080p", items: [leaf] },
        { id: 20, name: "HD", items: [] },
      ],
    };
    let sentProfile: Record<string, unknown> | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const url = new URL(request.url);
        if (url.pathname === "/api") {
          return Response.json({ current: "v5", deprecated: ["v3"] });
        }
        if (url.pathname === "/api/v5/qualityprofile" && request.method === "GET") {
          return Response.json([profile]);
        }
        if (url.pathname === "/api/v5/qualityprofile/1" && request.method === "PUT") {
          sentProfile = await request.json();
          return Response.json(sentProfile);
        }
        throw new Error(`Unexpected request ${request.method} ${url.pathname}`);
      }),
    );
    const client = new SonarrClient("http://sonarr.test", "api-key");
    await client.getQualityProfiles();
    await client.updateQualityProfile("1", {
      ...profile,
      items: [
        { id: 10, name: "WEB 1080p", items: [] },
        { id: 20, name: "HD", items: [leaf] },
      ],
    });

    expect(sentProfile).toMatchObject({
      items: [
        { id: 10, items: [] },
        {
          id: 20,
          items: [{ quality: { name: "WEBDL-1080p" }, minSize: 2, preferredSize: 60, maxSize: 220 }],
        },
      ],
    });
  });

  it("does not expose profile-specific quality sizes on Sonarr v4", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        if (new URL(request.url).pathname === "/api") {
          return Response.json({ current: "v3", deprecated: [] });
        }
        throw new Error("No v3 feature route should be requested");
      }),
    );
    const client = new SonarrClient("http://sonarr.test", "api-key");

    await expect(client.supportsProfileQualitySizes()).resolves.toBe(false);
  });

  it("round-trips all Sonarr v5 release-profile fields through the generated v5 resource", async () => {
    const profile = {
      id: 3,
      name: "HEVC",
      enabled: true,
      required: ["hevc"],
      ignored: ["xvid"],
      indexerIds: [7, 8],
      tags: [4],
      excludedTags: [5],
      airDateRestriction: true,
      airDateGracePeriod: 12,
      allowSeasonPackWithoutAllEpisodesAired: true,
    };
    const requests: Array<{ method: string; path: string; body?: unknown }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const url = new URL(request.url);
        const body = request.method === "PUT" ? await request.json() : undefined;
        requests.push({ method: request.method, path: url.pathname, body });
        if (url.pathname === "/api") {
          return Response.json({ current: "v5", deprecated: ["v3"] });
        }
        if (url.pathname === "/api/v5/releaseprofile" && request.method === "GET") {
          return Response.json([profile]);
        }
        if (url.pathname === "/api/v5/releaseprofile/3" && request.method === "PUT") {
          return Response.json(body);
        }
        throw new Error(`Unexpected request ${request.method} ${url.pathname}`);
      }),
    );
    const client = new SonarrClient("http://sonarr.test", "api-key");
    const [current] = await client.getReleaseProfiles();

    if (!current) {
      throw new Error("Expected one release profile from the v5 API.");
    }
    await client.updateReleaseProfile("3", { ...current, required: ["hevc", "x265"] });

    expect(requests).toEqual([
      { method: "GET", path: "/api", body: undefined },
      { method: "GET", path: "/api/v5/releaseprofile", body: undefined },
      {
        method: "PUT",
        path: "/api/v5/releaseprofile/3",
        body: { ...profile, required: ["hevc", "x265"] },
      },
    ]);
  });

  it("defaults the v5 release-profile grace period when creating a legacy-shaped profile", async () => {
    let sentProfile: unknown;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const url = new URL(request.url);
        if (url.pathname === "/api") {
          return Response.json({ current: "v5", deprecated: ["v3"] });
        }
        if (url.pathname === "/api/v5/releaseprofile" && request.method === "POST") {
          sentProfile = await request.json();
          return Response.json(sentProfile);
        }
        throw new Error(`Unexpected request ${request.method} ${url.pathname}`);
      }),
    );
    const client = new SonarrClient("http://sonarr.test", "api-key");

    await client.createReleaseProfile({ name: "HEVC", enabled: true, required: ["hevc"], ignored: [], indexerIds: [], tags: [] });

    expect(sentProfile).toMatchObject({ name: "HEVC", airDateGracePeriod: 0 });
  });

  it("projects the v3 release-profile resource for legacy Sonarr", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const url = new URL(request.url);
        if (url.pathname === "/api") {
          return Response.json({ current: "v3", deprecated: [] });
        }
        if (url.pathname === "/api/v3/releaseprofile") {
          return Response.json([{ id: 3, name: "HEVC", enabled: true, required: ["hevc"], ignored: [], indexerId: 7, tags: [4] }]);
        }
        throw new Error(`Unexpected request ${request.method} ${url.pathname}`);
      }),
    );
    const client = new SonarrClient("http://sonarr.test", "api-key");

    await expect(client.getReleaseProfiles()).resolves.toMatchObject([
      { id: 3, name: "HEVC", indexerIds: [7], required: ["hevc"], tags: [4] },
    ]);
  });
});
