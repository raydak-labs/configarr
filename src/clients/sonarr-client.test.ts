import { afterEach, describe, expect, it, vi } from "vitest";
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
    await client.updateProfileQualitySizes("1", [{ quality: "WEBDL-1080p", minSize: 0 }]);

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
        { id: 12, items: null, minSize: 3 },
      ],
    });
    expect(sentProfile).toEqual({
      ...profile,
      items: [{ ...groupItem, items: [{ ...leafItem, minSize: 0 }] }, nullItemsItem],
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
});
