import { afterEach, describe, expect, it, vi } from "vitest";
import { ChaptarrClient } from "./chaptarr-client";

describe("ChaptarrClient remote path mappings", () => {
  afterEach(() => vi.unstubAllGlobals());

  const stubWrite = (bodies: unknown[]) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const { pathname } = new URL(request.url);
        if (pathname === "/api/v1/remotepathmapping" && request.method === "POST") {
          bodies.push(await request.json());
          return Response.json({ id: 1 });
        }
        if (/^\/api\/v1\/remotepathmapping\/\d+$/.test(pathname) && request.method === "PUT") {
          bodies.push(await request.json());
          return Response.json({ id: 1 });
        }
        throw new Error(`Unexpected request ${request.method} ${pathname}`);
      }),
    );

  it("creates a global mapping with client id 0", async () => {
    const bodies: unknown[] = [];
    stubWrite(bodies);
    await new ChaptarrClient("http://chaptarr.test", "api-key").createRemotePathMapping({
      host: "transmission",
      remotePath: "/downloads",
      localPath: "/data/downloads",
    });
    expect(bodies).toEqual([{ host: "transmission", remotePath: "/downloads", localPath: "/data/downloads", downloadClientId: 0 }]);
  });

  it("keeps the client id of an existing mapping on update", async () => {
    const bodies: unknown[] = [];
    stubWrite(bodies);
    await new ChaptarrClient("http://chaptarr.test", "api-key").updateRemotePathMapping("1", {
      id: 1,
      host: "transmission",
      remotePath: "/downloads",
      localPath: "/data/downloads",
      downloadClientId: 42,
    });
    expect(bodies).toEqual([{ id: 1, host: "transmission", remotePath: "/downloads", localPath: "/data/downloads", downloadClientId: 42 }]);
  });

  it("falls back to a global mapping when an update carries no client id", async () => {
    const bodies: unknown[] = [];
    stubWrite(bodies);
    await new ChaptarrClient("http://chaptarr.test", "api-key").updateRemotePathMapping("1", {
      id: 1,
      host: "transmission",
      remotePath: "/downloads",
      localPath: "/data/downloads",
    });
    expect(bodies).toMatchObject([{ id: 1, downloadClientId: 0 }]);
  });
});
