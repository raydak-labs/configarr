import { afterEach, beforeEach, describe, expect, it, test, vi } from "vitest";
import type { ServerCache } from "../cache";
import type { InputConfigApplication } from "../types/config.types";
import { ApplicationSync } from "./applicationSync";
import type { ApplicationResource } from "./types";

vi.mock("../env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../env")>();
  return { ...actual, getEnvs: vi.fn(() => ({ DRY_RUN: false, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" })) };
});
vi.mock("../logger", () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const schema: ApplicationResource[] = [
  {
    implementation: "Sonarr",
    implementationName: "Sonarr",
    configContract: "SonarrSettings",
    fields: [
      { name: "baseUrl", value: "" },
      { name: "apiKey", value: "" },
    ],
    tags: [],
  },
];

const mockClient = {
  getApplicationSchema: vi.fn(async () => schema),
  getApplications: vi.fn(async (): Promise<ApplicationResource[]> => []),
  createApplication: vi.fn(async (a: ApplicationResource) => ({ ...a, id: 1 })),
  updateApplication: vi.fn(async (_id: string, a: ApplicationResource) => a),
  deleteApplication: vi.fn(async () => undefined),
  syncAppIndexers: vi.fn(async () => ({ id: 1 })),
  createTag: vi.fn(async (t: { label: string }) => ({ id: 9, label: t.label })),
};
vi.mock("../clients/unified-client", () => ({
  getSpecificClient: vi.fn(() => mockClient),
  getUnifiedClient: vi.fn(() => ({ api: mockClient })),
}));

const cache = () => ({ tags: [] as any[] }) as unknown as ServerCache;
const sync = () => new ApplicationSync();

describe("ApplicationSync – pure helpers", () => {
  test("validate accepts a known implementation", () => {
    const res = sync().validate({ name: "Sonarr", type: "Sonarr", fields: { baseUrl: "x", apiKey: "y" } }, schema);
    expect(res.valid).toBe(true);
  });

  test("validate rejects an unknown implementation", () => {
    const res = sync().validate({ name: "X", type: "Nope" } as InputConfigApplication, schema);
    expect(res.valid).toBe(false);
  });

  test("isEqual detects a syncLevel change and masks secrets", () => {
    const server: ApplicationResource = {
      id: 1,
      name: "Sonarr",
      implementation: "Sonarr",
      syncLevel: "fullSync" as ApplicationResource["syncLevel"],
      fields: [
        { name: "baseUrl", value: "http://s:8989" },
        { name: "apiKey", value: "********" },
      ],
      tags: [],
    };
    const changed = sync().isEqual({ name: "Sonarr", type: "Sonarr", sync_level: "addOnly" }, server, [], {});
    expect(changed.equal).toBe(false);
    expect(changed.changes).toContainEqual({ field: "syncLevel", from: "fullSync", to: "addOnly" });

    const unchanged = sync().isEqual(
      { name: "Sonarr", type: "Sonarr", sync_level: "fullSync", fields: { apiKey: "real-key", baseUrl: "http://s:8989" } },
      server,
      [],
      {},
    );
    expect(unchanged.equal).toBe(true);
  });

  test("omitted tags are left untouched (no diff, server tags preserved on update)", async () => {
    const server: ApplicationResource = {
      id: 1,
      name: "Sonarr",
      implementation: "Sonarr",
      syncLevel: "fullSync" as ApplicationResource["syncLevel"],
      fields: [{ name: "baseUrl", value: "http://s:8989" }],
      tags: [4, 7],
    };

    // no `tags` key -> not managed -> no tag change even though server has tags
    const eq = sync().isEqual({ name: "Sonarr", type: "Sonarr", fields: { baseUrl: "http://s:8989" } }, server, [], {});
    expect(eq.changes.some((c) => c.field === "tags")).toBe(false);

    // a forced update still keeps the server tags
    const payload = await sync().resolveConfig({ name: "Sonarr", type: "Sonarr", fields: { baseUrl: "http://new" } }, [], {}, server);
    expect(payload.tags).toEqual([4, 7]);

    // an explicit empty list DOES clear them
    const cleared = sync().isEqual({ name: "Sonarr", type: "Sonarr", tags: [] }, server, [], {});
    expect(cleared.changes).toContainEqual({ field: "tags", from: [4, 7], to: [] });
  });

  test("calculateDiff classifies create / unchanged / deleted", async () => {
    const serverApps: ApplicationResource[] = [
      {
        id: 1,
        name: "Sonarr",
        implementation: "Sonarr",
        syncLevel: "fullSync" as any,
        fields: [{ name: "baseUrl", value: "u" }],
        tags: [],
      },
      { id: 2, name: "Old", implementation: "Radarr", syncLevel: "fullSync" as any, fields: [], tags: [] },
    ];
    const diff = await sync().calculateDiff(
      [
        { name: "Sonarr", type: "Sonarr", fields: { baseUrl: "u" } },
        { name: "New", type: "Lidarr" },
      ],
      serverApps,
      [],
      {},
    );
    expect(diff.create.map((c) => c.name)).toEqual(["New"]);
    expect(diff.unchanged.map((u) => u.server.name)).toEqual(["Sonarr"]);
    expect(diff.deleted.map((d) => d.name)).toEqual(["Old"]);
  });
});

describe("ApplicationSync – syncApplications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.getApplications.mockResolvedValue([]);
  });
  afterEach(() => vi.clearAllMocks());

  it("creates a missing application", async () => {
    const out = await sync().syncApplications(
      { applications: { data: [{ name: "Sonarr", type: "Sonarr", fields: { baseUrl: "u", apiKey: "k" } }] } },
      cache(),
    );
    expect(mockClient.createApplication).toHaveBeenCalledTimes(1);
    expect(mockClient.createApplication.mock.calls[0]![0].syncLevel).toBe("fullSync");
    expect(out.added).toBe(1);
  });

  it("triggers app-indexer sync when requested", async () => {
    const out = await sync().syncApplications({ applications: { data: [], sync_indexers: true } }, cache());
    expect(mockClient.syncAppIndexers).toHaveBeenCalledTimes(1);
    expect(out.indexersSynced).toBe(true);
    expect(out.diffEntries).toContainEqual({ resourceType: "Application", name: "Sync App Indexers", action: "update" });
  });

  it("dry-run makes no API calls", async () => {
    const { getEnvs } = await import("../env");
    vi.mocked(getEnvs).mockReturnValue({ DRY_RUN: true, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" } as any);
    const out = await sync().syncApplications(
      { applications: { data: [{ name: "Sonarr", type: "Sonarr", fields: { baseUrl: "u", apiKey: "k" } }], sync_indexers: true } },
      cache(),
    );
    expect(mockClient.createApplication).not.toHaveBeenCalled();
    expect(mockClient.syncAppIndexers).not.toHaveBeenCalled();
    expect(out.added).toBe(1);
  });
});
