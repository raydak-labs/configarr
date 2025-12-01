import { describe, expect, test } from "vitest";
import { ServerCache } from "./cache";
import {
  filterUnmanagedClients,
  isDownloadClientEqual,
  resolveTagNamesToIds,
  validateDownloadClient,
  normalizeConfigFields,
  getCategoryFieldName,
} from "./download-clients";
import type { DownloadClientResource, TagResource } from "./__generated__/radarr/data-contracts";
import { DownloadProtocol } from "./__generated__/radarr/data-contracts";
import type { MergedTagResource } from "./__generated__/mergedTypes";
import type { InputConfigDownloadClient } from "./types/config.types";
import type { ArrClientLanguageResource } from "./clients/unified-client";

// Helper type for tests - allows string literals for protocol
type TestDownloadClientResource = Omit<DownloadClientResource, 'protocol'> & {
  protocol?: DownloadProtocol;
};

describe("download-clients – tag resolution", () => {
  test("resolves tag names to IDs (case-insensitive)", () => {
    const serverTags: TagResource[] = [
      { id: 1, label: "movies" },
      { id: 2, label: "4K" },
      { id: 3, label: "Test-Tag" },
    ];

    const { ids, missingTags } = resolveTagNamesToIds(
      ["Movies", "4k", "test-tag"],
      serverTags
    );

    expect(ids).toEqual([1, 2, 3]);
    expect(missingTags).toEqual([]);
  });

  test("resolves numeric tag IDs directly", () => {
    const serverTags: TagResource[] = [
      { id: 1, label: "movies" },
      { id: 2, label: "4K" },
    ];

    const { ids, missingTags } = resolveTagNamesToIds([1, 2, 999], serverTags);

    expect(ids).toEqual([1, 2, 999]);
    expect(missingTags).toEqual([]);
  });

  test("identifies missing tags", () => {
    const serverTags: TagResource[] = [
      { id: 1, label: "movies" },
    ];

    const { ids, missingTags } = resolveTagNamesToIds(
      ["movies", "missing1", "missing2"],
      serverTags
    );

    expect(ids).toEqual([1]);
    expect(missingTags).toEqual(["missing1", "missing2"]);
  });

  test("handles mixed tag names and IDs", () => {
    const serverTags: TagResource[] = [
      { id: 1, label: "movies" },
      { id: 2, label: "4K" },
    ];

    const { ids, missingTags } = resolveTagNamesToIds(
      ["movies", 2, "new-tag", 999],
      serverTags
    );

    expect(ids).toEqual([1, 2, 999]);
    expect(missingTags).toEqual(["new-tag"]);
  });

  test("handles empty tag list", () => {
    const serverTags: TagResource[] = [];

    const { ids, missingTags } = resolveTagNamesToIds([], serverTags);

    expect(ids).toEqual([]);
    expect(missingTags).toEqual([]);
  });
});

describe("download-clients – field normalization", () => {
  test("converts generic category to app-specific field for Radarr", () => {
    const result = normalizeConfigFields({ category: "movies" }, "RADARR");

    expect(result).toHaveProperty("category", "movies");
    expect(result).toHaveProperty("movieCategory", "movies");
  });

  test("converts generic category to app-specific field for Sonarr", () => {
    const result = normalizeConfigFields({ category: "tv" }, "SONARR");

    expect(result).toHaveProperty("category", "tv");
    expect(result).toHaveProperty("tvCategory", "tv");
  });

  test("converts generic category to app-specific field for Lidarr", () => {
    const result = normalizeConfigFields({ category: "music" }, "LIDARR");

    expect(result).toHaveProperty("category", "music");
    expect(result).toHaveProperty("musicCategory", "music");
  });

  test("converts generic category to app-specific field for Readarr", () => {
    const result = normalizeConfigFields({ category: "books" }, "READARR");

    expect(result).toHaveProperty("category", "books");
    expect(result).toHaveProperty("bookCategory", "books");
  });

  test("converts snake_case to camelCase", () => {
    const result = normalizeConfigFields(
      { use_ssl: true, api_key: "test123", recent_priority: 5 },
      "RADARR"
    );

    expect(result).toHaveProperty("useSsl", true);
    expect(result).toHaveProperty("apiKey", "test123");
    expect(result).toHaveProperty("recentPriority", 5);
    
    // Also keeps originals for backward compatibility
    expect(result).toHaveProperty("use_ssl", true);
    expect(result).toHaveProperty("api_key", "test123");
    expect(result).toHaveProperty("recent_priority", 5);
  });

  test("handles mixed field naming", () => {
    const result = normalizeConfigFields(
      { category: "movies", use_ssl: true, host: "localhost" },
      "RADARR"
    );

    expect(result).toHaveProperty("movieCategory", "movies");
    expect(result).toHaveProperty("useSsl", true);
    expect(result).toHaveProperty("host", "localhost");
  });
});

describe("download-clients – validation", () => {
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

    const result = validateDownloadClient(config, mockSchema as any as DownloadClientResource[]);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("rejects missing name", () => {
    const config: any = {
      type: "qBittorrent",
    };

    const result = validateDownloadClient(config, mockSchema as any as DownloadClientResource[]);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("name is required"))).toBe(true);
  });

  test("rejects empty name", () => {
    const config: any = {
      name: "",
      type: "qBittorrent",
    };

    const result = validateDownloadClient(config, mockSchema as any as DownloadClientResource[]);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("name"))).toBe(true);
  });

  test("rejects missing type", () => {
    const config: any = {
      name: "Test",
    };

    const result = validateDownloadClient(config, mockSchema as any as DownloadClientResource[]);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("type is required"))).toBe(true);
  });

  test("rejects unknown download client type", () => {
    const config: InputConfigDownloadClient = {
      name: "Test",
      type: "UnknownClient",
    };

    const result = validateDownloadClient(config, mockSchema as any as DownloadClientResource[]);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("Unknown download client type"))).toBe(true);
  });

  test("warns about priority outside typical range", () => {
    const config: InputConfigDownloadClient = {
      name: "Test",
      type: "qBittorrent",
      priority: 999,
    };

    const result = validateDownloadClient(config, mockSchema as any as DownloadClientResource[]);

    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.includes("Priority"))).toBe(true);
  });

  test("rejects invalid priority (negative)", () => {
    const config: any = {
      name: "Test",
      type: "qBittorrent",
      priority: -1,
    };

    const result = validateDownloadClient(config, mockSchema as any as DownloadClientResource[]);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("Priority"))).toBe(true);
  });

  test("rejects invalid tag (empty string)", () => {
    const config: any = {
      name: "Test",
      type: "qBittorrent",
      tags: ["valid", ""],
    };

    const result = validateDownloadClient(config, mockSchema as any as DownloadClientResource[]);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("Tag"))).toBe(true);
  });

  test("accepts valid tags (strings and numbers)", () => {
    const config: InputConfigDownloadClient = {
      name: "Test",
      type: "qBittorrent",
      tags: ["movies", "4k", 123],
    };

    const result = validateDownloadClient(config, mockSchema as any as DownloadClientResource[]);

    expect(result.valid).toBe(true);
  });
});

describe("download-clients – category field mapping", () => {
  test("maps correct category fields for each arr type", () => {
    expect(getCategoryFieldName("SONARR")).toBe("tvCategory");
    expect(getCategoryFieldName("LIDARR")).toBe("musicCategory");
    expect(getCategoryFieldName("RADARR")).toBe("movieCategory");
    expect(getCategoryFieldName("WHISPARR")).toBe("movieCategory");
    expect(getCategoryFieldName("READARR")).toBe("bookCategory");
  });
});

describe("download-clients – deletion logic", () => {
  const emptyLanguages: ArrClientLanguageResource[] = [];

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

    const deleteConfig = { enabled: true, ignore: [] };

    const result = filterUnmanagedClients(serverClients, configClients, deleteConfig);

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

    const result = filterUnmanagedClients(serverClients, configClients, false);

    expect(result).toEqual([]);
  });
});

describe("download-clients – equality & omission semantics", () => {
  const emptyLanguages: ArrClientLanguageResource[] = [];

  const makeCache = (tags: MergedTagResource[] = []) =>
    new ServerCache([], [], [], emptyLanguages);

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

    const equal = isDownloadClientEqual(config, server, cache, "RADARR");

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

    const equal = isDownloadClientEqual(config, server, cache, "RADARR");

    expect(equal).toBe(false);
  });
});