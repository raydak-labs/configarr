import { afterEach, beforeEach, describe, expect, it, test, vi } from "vitest";
import type { ServerCache } from "../cache";
import type { InputConfigIndexerProxy } from "../types/config.types";
import { IndexerProxySync } from "./indexerProxySync";
import type { IndexerProxyResource } from "./types";

vi.mock("../env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../env")>();
  return { ...actual, getEnvs: vi.fn(() => ({ DRY_RUN: false, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" })) };
});
vi.mock("../logger", () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const schema: IndexerProxyResource[] = [
  {
    implementation: "FlareSolverr",
    implementationName: "FlareSolverr",
    configContract: "FlareSolverrSettings",
    fields: [
      { name: "host", value: "" },
      { name: "requestTimeout", value: 60 },
    ],
    tags: [],
  },
  {
    implementation: "Http",
    implementationName: "Http",
    configContract: "HttpSettings",
    fields: [
      { name: "host", value: "" },
      { name: "port", value: 8080 },
    ],
    tags: [],
  },
];

const mockClient = {
  getIndexerProxySchema: vi.fn(async () => schema),
  getIndexerProxies: vi.fn(async (): Promise<IndexerProxyResource[]> => []),
  createIndexerProxy: vi.fn(async (p: IndexerProxyResource) => ({ ...p, id: 1 })),
  updateIndexerProxy: vi.fn(async (_id: string, p: IndexerProxyResource) => p),
  deleteIndexerProxy: vi.fn(async () => undefined),
  createTag: vi.fn(async (t: { label: string }) => ({ id: 3, label: t.label })),
};
vi.mock("../clients/unified-client", () => ({
  getSpecificClient: vi.fn(() => mockClient),
  getUnifiedClient: vi.fn(() => ({ api: mockClient })),
}));

const cache = (tags: { id: number; label: string }[] = []) => ({ tags: [...tags] }) as unknown as ServerCache;
const sync = () => new IndexerProxySync();

describe("IndexerProxySync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.getIndexerProxies.mockResolvedValue([]);
  });
  afterEach(() => vi.clearAllMocks());

  test("validate accepts a known implementation and rejects an unknown one", () => {
    expect(sync().validate({ name: "flare", type: "FlareSolverr", fields: { host: "http://f:8191/" } }, schema).valid).toBe(true);
    expect(sync().validate({ name: "nope", type: "Socks9" } as InputConfigIndexerProxy, schema).valid).toBe(false);
  });

  test("matches on name plus implementation, case-insensitively", () => {
    const server: IndexerProxyResource[] = [
      { id: 1, name: "flare", implementation: "FlareSolverr", fields: [{ name: "host", value: "http://f:8191/" }], tags: [] },
    ];

    const same = sync().calculateDiff([{ name: "flare", type: "flaresolverr", fields: { host: "http://f:8191/" } }], server, [], {});
    expect(same.unchanged.map((u) => u.server.name)).toEqual(["flare"]);

    // Same name, different implementation is a different resource, so it is a create.
    const different = sync().calculateDiff([{ name: "flare", type: "Http" }], server, [], {});
    expect(different.create.map((c) => c.name)).toEqual(["flare"]);
    expect(different.unchanged).toEqual([]);
  });

  it("creates a proxy with the merged fields and resolved tags", async () => {
    const out = await sync().sync(
      [{ name: "flare", type: "FlareSolverr", fields: { host: "http://flaresolverr:8191/" }, tags: ["managed"] }],
      undefined,
      cache([{ id: 8, label: "managed" }]),
    );

    expect(out.added).toBe(1);
    const payload = mockClient.createIndexerProxy.mock.calls[0]![0];
    expect(payload.implementation).toBe("FlareSolverr");
    expect(payload.configContract).toBe("FlareSolverrSettings");
    expect(payload.fields).toEqual([
      { name: "host", value: "http://flaresolverr:8191/" },
      { name: "requestTimeout", value: 60 },
    ]);
    expect(payload.tags).toEqual([8]);
  });

  it("updates a proxy when a field changes", async () => {
    mockClient.getIndexerProxies.mockResolvedValue([
      { id: 2, name: "flare", implementation: "FlareSolverr", fields: [{ name: "host", value: "http://old:8191/" }], tags: [] },
    ]);

    const out = await sync().sync([{ name: "flare", type: "FlareSolverr", fields: { host: "http://new:8191/" } }], undefined, cache());

    expect(out.updated).toBe(1);
    expect(mockClient.updateIndexerProxy.mock.calls[0]![0]).toBe("2");
    expect(out.diffEntries[0]).toMatchObject({
      resourceType: "IndexerProxy",
      name: "flare",
      action: "update",
      fieldChanges: [{ field: "fields.host", from: "http://old:8191/", to: "http://new:8191/" }],
    });
  });

  it("deletes unmanaged proxies but keeps ignored ones", async () => {
    mockClient.getIndexerProxies.mockResolvedValue([
      { id: 4, name: "stale", implementation: "Http", fields: [], tags: [] },
      { id: 5, name: "manual", implementation: "Http", fields: [], tags: [] },
    ]);

    const out = await sync().sync([], { enabled: true, ignore: ["manual"] }, cache());

    expect(mockClient.deleteIndexerProxy).toHaveBeenCalledExactlyOnceWith("4");
    expect(out.removed).toBe(1);
  });

  it("fails the sync when the server rejects the create", async () => {
    mockClient.createIndexerProxy.mockRejectedValue(new Error("400 Bad Request"));

    await expect(sync().sync([{ name: "flare", type: "FlareSolverr", fields: { host: "h" } }], undefined, cache())).rejects.toThrow(
      "Create IndexerProxy 'flare' failed: 400 Bad Request",
    );
  });

  it("fails the sync when the server list cannot be fetched", async () => {
    mockClient.getIndexerProxies.mockRejectedValue(new Error("connection refused"));

    await expect(sync().sync([{ name: "flare", type: "FlareSolverr" }], undefined, cache())).rejects.toThrow("connection refused");
  });
});
