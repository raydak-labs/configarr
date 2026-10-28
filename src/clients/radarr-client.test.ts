import { afterEach, describe, expect, it, vi } from "vitest";
import { RadarrClient } from "./radarr-client";
import { logger } from "../logger";

describe("RadarrClient API v3 compatibility", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("hides import-list server errors that can contain provider credentials", async () => {
    const errorLog = vi.spyOn(logger, "error");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ message: "provider credential example-secret" }, { status: 400 })),
    );
    const client = new RadarrClient("http://radarr.test", "api-key");
    await expect(client.createImportList({ name: "fixture", fields: [{ name: "apiKey", value: "example-secret" }] })).rejects.toThrow(
      "Request failed (HTTP 400); check server logs for details",
    );
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("example-secret");
    errorLog.mockRestore();
  });

  it.each([
    { response: "200 JSON", createStatus: 200, updateStatus: 200 },
    { response: "201/202 typed JSON", createStatus: 201, updateStatus: 202 },
  ])("uses API v3 custom-format CRUD with $response responses", async ({ createStatus, updateStatus }) => {
    const version = "7.0.0.10815";
    const format = {
      name: "Release title",
      includeCustomFormatWhenRenaming: false,
      specifications: [
        { implementation: "ReleaseTitleSpecification", negate: false, required: true, fields: [{ name: "value", value: "release" }] },
      ],
    };
    const stored = { id: 42, ...format };
    const requests: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const { pathname } = new URL(request.url);
        requests.push(`${request.method} ${pathname}`);
        expect(request.headers.get("X-Api-Key")).toBe("api-key");
        if (pathname === "/radarr/api/v3/system/status") return Response.json({ version });
        if (pathname === "/radarr/api/v3/customformat" && request.method === "GET") return Response.json([stored]);
        if (request.method === "POST" || request.method === "PUT") {
          expect(request.headers.get("Content-Type")).toBe("application/json");
          expect(await request.json()).toEqual(request.method === "POST" ? format : stored);
          return Response.json(stored, { status: request.method === "POST" ? createStatus : updateStatus });
        }
        if (request.method === "DELETE") return new Response(null, { status: 200 });
        throw new Error(`Unexpected request ${request.method} ${pathname}`);
      }),
    );

    const client = new RadarrClient("http://radarr.test/radarr", "api-key");
    await expect(client.getSystemStatus()).resolves.toMatchObject({ version });
    await expect(client.getCustomFormats()).resolves.toEqual([stored]);
    await expect(client.createCustomFormat(format)).resolves.toEqual(stored);
    await expect(client.updateCustomFormat("42", stored)).resolves.toEqual(stored);
    await expect(client.deleteCustomFormat("42")).resolves.toBeDefined();
    expect(requests).toEqual([
      "GET /radarr/api/v3/system/status",
      "GET /radarr/api/v3/customformat",
      "POST /radarr/api/v3/customformat",
      "PUT /radarr/api/v3/customformat/42",
      "DELETE /radarr/api/v3/customformat/42",
    ]);
  });
});
