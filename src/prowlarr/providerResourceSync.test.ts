import { z } from "zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerCache } from "../cache";
import { ExtraProp, ProviderResource, ProviderResourceSync } from "./providerResourceSync";

vi.mock("../env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../env")>();
  return { ...actual, getEnvs: vi.fn(() => ({ DRY_RUN: false, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" })) };
});
vi.mock("../logger", () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const mockClient = {
  getSchema: vi.fn(),
  getAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  createTag: vi.fn(async (t: { label: string }) => ({ id: 42, label: t.label })),
};
vi.mock("../clients/unified-client", () => ({
  getSpecificClient: vi.fn(() => mockClient),
  getUnifiedClient: vi.fn(() => ({ api: mockClient })),
}));

/** Minimal concrete resource + config so the base class can be exercised directly. */
interface ThingResource extends ProviderResource {
  mode?: string | null;
  extraFromTemplate?: string | null;
}
type ThingConfig = { name: string; type: string; mode?: string; fields?: Record<string, any>; tags?: (string | number)[] };

const ThingConfigSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  mode: z.string().optional(),
  fields: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.union([z.string().min(1), z.number().int().positive()])).optional(),
});

class ThingSync extends ProviderResourceSync<ThingConfig, ThingResource> {
  protected readonly label = "Thing";
  protected readonly configSchema = ThingConfigSchema;
  protected readonly templatePassthrough = ["extraFromTemplate"];
  protected readonly extras: ExtraProp<ThingConfig, Record<string, never>>[] = [
    { serverKey: "mode", fromConfig: (c) => c.mode ?? undefined, specified: (c) => c.mode !== undefined },
  ];

  protected fetchSchema() {
    return mockClient.getSchema() as Promise<ThingResource[]>;
  }
  protected fetchServer() {
    return mockClient.getAll() as Promise<ThingResource[]>;
  }
  protected createResource(payload: ThingResource) {
    return mockClient.create(payload);
  }
  protected updateResource(id: string, payload: ThingResource) {
    return mockClient.update(id, payload);
  }
  protected deleteResource(id: string) {
    return mockClient.remove(id);
  }
  protected findTemplate(config: ThingConfig, schema: ThingResource[]) {
    return schema.find((s) => s.implementation?.toLowerCase() === config.type.toLowerCase());
  }
  protected templateHint(config: ThingConfig) {
    return config.type;
  }
  protected matches(config: ThingConfig, server: ThingResource) {
    return config.name === server.name && config.type.toLowerCase() === server.implementation?.toLowerCase();
  }
  protected configKey(config: ThingConfig) {
    return `${config.name}::${config.type.toLowerCase()}`;
  }
  protected serverKey(server: ThingResource) {
    return `${server.name ?? ""}::${server.implementation?.toLowerCase() ?? ""}`;
  }
}

const schema: ThingResource[] = [
  {
    implementation: "Widget",
    implementationName: "Widget",
    configContract: "WidgetSettings",
    extraFromTemplate: "from-template",
    fields: [
      { name: "host", value: "" },
      { name: "port", value: 1234 },
      { name: "requestTimeout", value: 60 },
    ],
    tags: [],
  },
];

const cache = (tags: { id: number; label: string }[] = []) => ({ tags: [...tags] }) as unknown as ServerCache;
const sync = () => new ThingSync();

describe("ProviderResourceSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.getSchema.mockResolvedValue(schema);
    mockClient.getAll.mockResolvedValue([]);
    mockClient.create.mockResolvedValue({ id: 1 });
    mockClient.update.mockImplementation(async (_id: string, p: ThingResource) => p);
    mockClient.remove.mockResolvedValue(undefined);
    mockClient.createTag.mockImplementation(async (t: { label: string }) => ({ id: 42, label: t.label }));
  });
  afterEach(() => vi.clearAllMocks());

  describe("validation", () => {
    it("skips an item whose template is unknown without failing the run", async () => {
      const out = await sync().sync([{ name: "Nope", type: "DoesNotExist" }], undefined, cache());

      expect(mockClient.create).not.toHaveBeenCalled();
      expect(out).toMatchObject({ added: 0, updated: 0, removed: 0 });
    });

    it("skips duplicate identities", async () => {
      const out = await sync().sync(
        [
          { name: "Dup", type: "Widget", fields: { host: "a" } },
          { name: "Dup", type: "Widget", fields: { host: "b" } },
        ],
        undefined,
        cache(),
      );

      expect(mockClient.create).not.toHaveBeenCalled();
      expect(out.added).toBe(0);
    });

    it("rejects a name longer than 100 characters", () => {
      const res = sync().validate({ name: "x".repeat(101), type: "Widget" }, schema);

      expect(res.valid).toBe(false);
      expect(res.errors.join()).toContain("100 characters or less");
    });

    it("warns about a schema field that has no value and is not configured", () => {
      const res = sync().validate({ name: "W", type: "Widget" }, schema);

      expect(res.valid).toBe(true);
      expect(res.warnings.join()).toContain("host");
    });
  });

  describe("payload building", () => {
    it("merges config fields onto the schema template and copies passthrough keys", async () => {
      await sync().sync([{ name: "W", type: "Widget", fields: { host: "example", request_timeout: 90 } }], undefined, cache());

      const payload = mockClient.create.mock.calls[0]![0] as ThingResource;
      expect(payload.implementation).toBe("Widget");
      expect(payload.extraFromTemplate).toBe("from-template");
      expect(payload.fields).toEqual([
        { name: "host", value: "example" },
        { name: "port", value: 1234 },
        { name: "requestTimeout", value: 90 },
      ]);
    });

    it("uses the server fields as the base for a partial update", async () => {
      mockClient.getAll.mockResolvedValue([
        {
          id: 5,
          name: "W",
          implementation: "Widget",
          mode: "old",
          fields: [{ name: "host", value: "kept-from-server" }],
          tags: [],
        },
      ]);

      await sync().sync([{ name: "W", type: "Widget", mode: "new" }], undefined, cache());

      const [, payload] = mockClient.update.mock.calls[0]!;
      expect(payload.mode).toBe("new");
      expect(payload.fields).toEqual([{ name: "host", value: "kept-from-server" }]);
    });

    it("uses the schema fields as the base when field overrides are present", async () => {
      mockClient.getAll.mockResolvedValue([
        { id: 5, name: "W", implementation: "Widget", fields: [{ name: "host", value: "server" }], tags: [] },
      ]);

      await sync().sync([{ name: "W", type: "Widget", fields: { host: "configured" } }], undefined, cache());

      const [, payload] = mockClient.update.mock.calls[0]!;
      expect(payload.fields).toHaveLength(3);
      expect(payload.fields![0]).toEqual({ name: "host", value: "configured" });
    });
  });

  describe("tags", () => {
    it("creates tags that do not exist yet and resolves them to ids", async () => {
      await sync().sync([{ name: "W", type: "Widget", fields: { host: "h" }, tags: ["fresh"] }], undefined, cache());

      expect(mockClient.createTag).toHaveBeenCalledWith({ label: "fresh" });
      expect((mockClient.create.mock.calls[0]![0] as ThingResource).tags).toEqual([42]);
    });

    it("fails the sync when a tag cannot be created", async () => {
      mockClient.createTag.mockRejectedValue(new Error("tag rejected"));

      await expect(sync().sync([{ name: "W", type: "Widget", tags: ["fresh"] }], undefined, cache())).rejects.toThrow(
        "Tag creation failed",
      );
      expect(mockClient.create).not.toHaveBeenCalled();
    });
  });

  describe("failure handling", () => {
    it("fails the sync when a create is rejected by the server", async () => {
      mockClient.create.mockRejectedValue(new Error("400 Bad Request"));

      await expect(sync().sync([{ name: "W", type: "Widget", fields: { host: "h" } }], undefined, cache())).rejects.toThrow(
        "Create Thing 'W' failed: 400 Bad Request",
      );
    });

    it("fails the sync when an update is rejected by the server", async () => {
      mockClient.getAll.mockResolvedValue([
        { id: 5, name: "W", implementation: "Widget", fields: [{ name: "host", value: "old" }], tags: [] },
      ]);
      mockClient.update.mockRejectedValue(new Error("409 Conflict"));

      await expect(sync().sync([{ name: "W", type: "Widget", fields: { host: "new" } }], undefined, cache())).rejects.toThrow(
        "Update Thing 'W' failed: 409 Conflict",
      );
    });

    it("fails the sync when a delete is rejected by the server", async () => {
      mockClient.getAll.mockResolvedValue([{ id: 9, name: "Stale", implementation: "Widget", fields: [], tags: [] }]);
      mockClient.remove.mockRejectedValue(new Error("500 Server Error"));

      await expect(sync().sync([], { enabled: true }, cache())).rejects.toThrow("Delete Thing 'Stale' failed: 500 Server Error");
    });

    it("stops at the first failure instead of continuing with the remaining items", async () => {
      mockClient.create.mockRejectedValueOnce(new Error("boom"));

      await expect(
        sync().sync(
          [
            { name: "First", type: "Widget", fields: { host: "a" } },
            { name: "Second", type: "Widget", fields: { host: "b" } },
          ],
          undefined,
          cache(),
        ),
      ).rejects.toThrow("Create Thing 'First' failed");
      expect(mockClient.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("delete_unmanaged", () => {
    it("deletes only the entries that are neither configured nor ignored", async () => {
      mockClient.getAll.mockResolvedValue([
        { id: 1, name: "Keep", implementation: "Widget", fields: [], tags: [] },
        { id: 2, name: "Ignored", implementation: "Widget", fields: [], tags: [] },
        { id: 3, name: "Stale", implementation: "Widget", fields: [], tags: [] },
      ]);

      const out = await sync().sync([{ name: "Keep", type: "Widget" }], { enabled: true, ignore: ["Ignored"] }, cache());

      expect(mockClient.remove).toHaveBeenCalledExactlyOnceWith("3");
      expect(out.removed).toBe(1);
    });

    it("deletes nothing when disabled", async () => {
      mockClient.getAll.mockResolvedValue([{ id: 3, name: "Stale", implementation: "Widget", fields: [], tags: [] }]);

      const out = await sync().sync([], { enabled: false }, cache());

      expect(mockClient.remove).not.toHaveBeenCalled();
      expect(out.removed).toBe(0);
    });
  });

  describe("dry run", () => {
    it("reports the diff without calling the API", async () => {
      const { getEnvs } = await import("../env");
      vi.mocked(getEnvs).mockReturnValue({ DRY_RUN: true, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" } as any);
      mockClient.getAll.mockResolvedValue([{ id: 3, name: "Stale", implementation: "Widget", fields: [], tags: [] }]);

      const out = await sync().sync([{ name: "W", type: "Widget", fields: { host: "h" } }], { enabled: true }, cache());

      expect(mockClient.create).not.toHaveBeenCalled();
      expect(mockClient.remove).not.toHaveBeenCalled();
      expect(out).toMatchObject({ added: 1, removed: 1 });
      expect(out.diffEntries).toEqual([
        { resourceType: "Thing", name: "W", action: "create" },
        { resourceType: "Thing", name: "Stale", action: "delete" },
      ]);
    });
  });
});
