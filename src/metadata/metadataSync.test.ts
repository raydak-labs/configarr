import { afterEach, expect, test, vi } from "vitest";
import { RadarrClient } from "../clients/radarr-client";
import { prepareMetadata } from "./metadataSync";

afterEach(() => vi.unstubAllGlobals());

test("rejects ambiguous provider types without writing", async () => {
  const writes: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      if (request.method !== "GET") writes.push(request.method);
      return Response.json([
        { id: 1, name: "One", implementation: "XbmcMetadata", enable: false, fields: [] },
        { id: 2, name: "Two", implementation: "XbmcMetadata", enable: false, fields: [] },
      ]);
    }),
  );
  const client = new RadarrClient("http://radarr.test", "key");
  await expect(prepareMetadata(client, { data: [{ type: "XbmcMetadata", enable: true }] })).rejects.toThrow("Ambiguous metadata provider");
  expect(writes).toEqual([]);
});
