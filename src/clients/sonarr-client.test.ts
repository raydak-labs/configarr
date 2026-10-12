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
});
