import { describe, expect, test } from "vitest";
import type { MergedTagResource } from "../__generated__/mergedTypes";
import type { DownloadClientResource, TagResource } from "../__generated__/radarr/data-contracts";
import { DownloadProtocol } from "../__generated__/radarr/data-contracts";
import { ServerCache } from "../cache";
import type { InputConfigDownloadClient } from "../types/config.types";
import { GenericDownloadClientSync } from "./downloadClientGeneric";

type TestDownloadClientResource = Omit<DownloadClientResource, "protocol"> & {
  protocol?: DownloadProtocol;
};

// Helper function for tests
const getTestSync = () => new GenericDownloadClientSync("RADARR");

describe("downloadClientSyncer – tag resolution", () => {
  test("resolves tag names to IDs (case-insensitive)", () => {
    const serverTags: TagResource[] = [
      { id: 1, label: "movies" },
      { id: 2, label: "4K" },
      { id: 3, label: "Test-Tag" },
    ];

    const { ids, missingTags } = getTestSync().resolveTagNamesToIds(["Movies", "4k", "test-tag"], serverTags);

    expect(ids).toEqual([1, 2, 3]);
    expect(missingTags).toEqual([]);
  });

  test("resolves numeric tag IDs directly", () => {
    const serverTags: TagResource[] = [
      { id: 1, label: "movies" },
      { id: 2, label: "4K" },
    ];

    const { ids, missingTags } = getTestSync().resolveTagNamesToIds([1, 2, 999], serverTags);

    expect(ids).toEqual([1, 2, 999]);
    expect(missingTags).toEqual([]);
  });

  test("identifies missing tags", () => {
    const serverTags: TagResource[] = [{ id: 1, label: "movies" }];

    const { ids, missingTags } = getTestSync().resolveTagNamesToIds(["movies", "missing1", "missing2"], serverTags);

    expect(ids).toEqual([1]);
    expect(missingTags).toEqual(["missing1", "missing2"]);
  });

  test("handles mixed tag names and IDs", () => {
    const serverTags: TagResource[] = [
      { id: 1, label: "movies" },
      { id: 2, label: "4K" },
    ];

    const { ids, missingTags } = getTestSync().resolveTagNamesToIds(["movies", 2, "new-tag", 999], serverTags);

    expect(ids).toEqual([1, 2, 999]);
    expect(missingTags).toEqual(["new-tag"]);
  });

  test("handles empty tag list", () => {
    const serverTags: TagResource[] = [];

    const { ids, missingTags } = getTestSync().resolveTagNamesToIds([], serverTags);

    expect(ids).toEqual([]);
    expect(missingTags).toEqual([]);
  });
});

describe("downloadClientSyncer – field normalization", () => {
  test("converts snake_case to camelCase", () => {
    const result = getTestSync().normalizeConfigFields({ use_ssl: true, api_key: "test123", recent_priority: 5 }, "RADARR");

    expect(result).toHaveProperty("useSsl", true);
    expect(result).toHaveProperty("apiKey", "test123");
    expect(result).toHaveProperty("recentPriority", 5);

    // Backward compatibility with snake_case
    expect(result).toHaveProperty("use_ssl", true);
    expect(result).toHaveProperty("api_key", "test123");
    expect(result).toHaveProperty("recent_priority", 5);
  });

  test("handles mixed field naming", () => {
    const result = getTestSync().normalizeConfigFields(
      {
        movie_imported_category: "movies-4k",
        use_ssl: true,
        host: "localhost",
      },
      "RADARR",
    );

    expect(result).toHaveProperty("movieImportedCategory", "movies-4k");
    expect(result).toHaveProperty("useSsl", true);
    expect(result).toHaveProperty("host", "localhost");
    expect(result).toHaveProperty("movie_imported_category", "movies-4k"); // backward compatibility
  });

  test("preserves exact field names when already camelCase", () => {
    const result = getTestSync().normalizeConfigFields(
      {
        movieImportedCategory: "4k-movies",
        urlBase: "/",
        host: "localhost",
      },
      "RADARR",
    );

    expect(result).toHaveProperty("movieImportedCategory", "4k-movies");
    expect(result).toHaveProperty("urlBase", "/");
    expect(result).toHaveProperty("host", "localhost");
    // No duplicate fields since they're already camelCase
    expect(result).not.toHaveProperty("movie_imported_category");
    expect(result).not.toHaveProperty("url_base");
  });

  test("handles empty config", () => {
    const result = getTestSync().normalizeConfigFields({}, "RADARR");
    expect(result).toEqual({});
  });

  test("handles nested objects", () => {
    const result = getTestSync().normalizeConfigFields(
      {
        nested_obj: {
          inner_field: "value",
        },
      },
      "RADARR",
    );

    expect(result).toHaveProperty("nestedObj", {
      inner_field: "value",
    });
  });
});

describe("downloadClientSyncer – validation", () => {
  const mockSchema: TestDownloadClientResource[] = [
    {
      id: 0,
      name: "qBittorrent",
      implementation: "qBittorrent",
      protocol: DownloadProtocol.Torrent,
      enable: true,
      priority: 1,
      fields: [
        { name: "host", value: "" },
        { name: "port", value: "" },
      ],
      tags: [],
      removeCompletedDownloads: true,
      removeFailedDownloads: true,
      configContract: "",
    },
  ];

  test("validates valid configuration", () => {
    const config: InputConfigDownloadClient = {
      name: "Test Client",
      type: "qBittorrent",
      priority: 5,
      fields: { host: "localhost", port: 8080 },
    };

    const result = getTestSync().validateDownloadClient(config, mockSchema as any as DownloadClientResource[]);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("rejects missing name", () => {
    const config: any = {
      type: "qBittorrent",
    };

    const result = getTestSync().validateDownloadClient(config, mockSchema as any as DownloadClientResource[]);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => (e.includes("name") && e.includes("required")) || e.includes("undefined"))).toBe(true);
  });

  test("rejects empty name", () => {
    const config: any = {
      name: "",
      type: "qBittorrent",
    };

    const result = getTestSync().validateDownloadClient(config, mockSchema as any as DownloadClientResource[]);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("name"))).toBe(true);
  });

  test("rejects missing type", () => {
    const config: any = {
      name: "Test",
    };

    const result = getTestSync().validateDownloadClient(config, mockSchema as any as DownloadClientResource[]);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => (e.includes("type") && e.includes("required")) || e.includes("undefined"))).toBe(true);
  });

  test("rejects unknown download client type", () => {
    const config: InputConfigDownloadClient = {
      name: "Test",
      type: "UnknownClient",
    };

    const result = getTestSync().validateDownloadClient(config, mockSchema as any as DownloadClientResource[]);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Unknown download client type"))).toBe(true);
  });

  test("warns about priority outside typical range", () => {
    const config: InputConfigDownloadClient = {
      name: "Test",
      type: "qBittorrent",
      priority: 999,
    };

    const result = getTestSync().validateDownloadClient(config, mockSchema as any as DownloadClientResource[]);

    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("Priority"))).toBe(true);
  });

  test("rejects invalid priority (negative)", () => {
    const config: any = {
      name: "Test",
      type: "qBittorrent",
      priority: -1,
    };

    const result = getTestSync().validateDownloadClient(config, mockSchema as any as DownloadClientResource[]);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Priority"))).toBe(true);
  });

  test("rejects invalid tag (empty string)", () => {
    const config: any = {
      name: "Test",
      type: "qBittorrent",
      tags: ["valid", ""],
    };

    const result = getTestSync().validateDownloadClient(config, mockSchema as any as DownloadClientResource[]);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Tag"))).toBe(true);
  });

  test("accepts valid tags (strings and numbers)", () => {
    const config: InputConfigDownloadClient = {
      name: "Test",
      type: "qBittorrent",
      tags: ["movies", "4k", 123],
    };

    const result = getTestSync().validateDownloadClient(config, mockSchema as any as DownloadClientResource[]);

    expect(result.valid).toBe(true);
  });
});

describe("downloadClientSyncer – deletion logic", () => {
  test("filterUnmanagedClients uses composite key of name + implementation", () => {
    const serverClients: TestDownloadClientResource[] = [
      {
        id: 1,
        enable: true,
        protocol: DownloadProtocol.Torrent,
        name: "qb-download",
        implementation: "qBittorrent",
        priority: 1,
        tags: [],
        removeCompletedDownloads: true,
        removeFailedDownloads: true,
        configContract: "",
        fields: [],
      },
      {
        id: 2,
        enable: true,
        protocol: DownloadProtocol.Torrent,
        name: "qb-download",
        implementation: "SomeOtherImplementation",
        priority: 1,
        tags: [],
        removeCompletedDownloads: true,
        removeFailedDownloads: true,
        configContract: "",
        fields: [],
      },
    ];

    const configClients: InputConfigDownloadClient[] = [
      {
        name: "qb-download",
        type: "qBittorrent",
      },
    ];

    // Convert to new structure
    const newConfig = {
      download_clients: {
        data: configClients,
        update_password: false,
      },
    };

    const deleteConfig = { enabled: true, ignore: [] };

    const result = getTestSync().filterUnmanagedClients(serverClients, configClients, deleteConfig);

    // Only the server client whose (name, implementation) pair does NOT
    // appear in the configuration should be considered unmanaged.
    expect(result.map((c) => c.id)).toEqual([2]);
  });

  test("filterUnmanagedClients respects delete_unmanaged=false", () => {
    const serverClients: TestDownloadClientResource[] = [
      {
        id: 1,
        enable: true,
        protocol: DownloadProtocol.Torrent,
        name: "qb-download",
        implementation: "qBittorrent",
        priority: 1,
        tags: [],
        removeCompletedDownloads: true,
        removeFailedDownloads: true,
        configContract: "",
        fields: [],
      },
    ];

    const configClients: InputConfigDownloadClient[] = [];

    const result = getTestSync().filterUnmanagedClients(serverClients, configClients, { enabled: false });

    expect(result).toEqual([]);
  });
});

describe("downloadClientSyncer – equality & omission semantics", () => {
  const makeCache = (tags: MergedTagResource[] = []) => new ServerCache([], [], [], []);

  test("isDownloadClientEqual treats omitted top-level fields as 'do not manage'", () => {
    const cache = makeCache();

    const server: TestDownloadClientResource = {
      id: 1,
      enable: false,
      protocol: DownloadProtocol.Torrent,
      name: "client-1",
      implementation: "qBittorrent",
      priority: 5,
      tags: [],
      removeCompletedDownloads: false,
      removeFailedDownloads: false,
      configContract: "",
      fields: [],
    };

    const config: InputConfigDownloadClient = {
      name: "client-1",
      type: "qBittorrent",
      // All top-level booleans and priority omitted
      // This should be treated as "do not manage" for those properties
    };

    const equal = getTestSync().isDownloadClientEqual(config, server, cache);

    expect(equal).toBe(true);
  });

  test("isDownloadClientEqual detects explicit differences when fields are set", () => {
    const cache = makeCache();

    const server: TestDownloadClientResource = {
      id: 1,
      enable: true,
      protocol: DownloadProtocol.Torrent,
      name: "client-1",
      implementation: "qBittorrent",
      priority: 1,
      tags: [],
      removeCompletedDownloads: true,
      removeFailedDownloads: true,
      configContract: "",
      fields: [],
    };

    const config: InputConfigDownloadClient = {
      name: "client-1",
      type: "qBittorrent",
      enable: false, // explicitly different from server
    };

    const equal = getTestSync().isDownloadClientEqual(config, server, cache);

    expect(equal).toBe(false);
  });
});
