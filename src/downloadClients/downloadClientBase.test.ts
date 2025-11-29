import { describe, expect, test, vi, beforeEach } from "vitest";
import { BaseDownloadClientSync } from "./downloadClientBase";
import type { InputConfigDownloadClient } from "../types/config.types";
import type { DownloadClientResource } from "../types/download-client.types";
import type { ServerCache } from "../cache";
import type { IArrClient } from "../clients/unified-client";
import type { TagResource } from "../__generated__/radarr/data-contracts";
import { DownloadProtocol } from "../__generated__/radarr/data-contracts";
import { ArrType } from "../types/common.types";

// Mock implementation of BaseDownloadClientSync for testing
class MockDownloadClientSync extends BaseDownloadClientSync {
  constructor() {
    super();
  }

  // Expose protected methods for testing
  public testValidateDownloadClient(config: InputConfigDownloadClient, schema: DownloadClientResource[]) {
    return this.validateDownloadClient(config, schema);
  }

  public testResolveTagNamesToIds(tagNames: (string | number)[], serverTags: TagResource[]) {
    return this.resolveTagNamesToIds(tagNames, serverTags);
  }

  public testGetCategoryFieldName(arrType: ArrType) {
    return this.getCategoryFieldName(arrType);
  }

  public testNormalizeConfigFields(configFields: Record<string, any>, arrType: ArrType) {
    return this.normalizeConfigFields(configFields, arrType);
  }

  public testSnakeToCamel(str: string) {
    return this.snakeToCamel(str);
  }

  public testGetApi(): IArrClient {
    return this.getApi();
  }

  // Implement abstract methods minimally for testing
  protected getArrType(): ArrType {
    return "RADARR";
  }

  protected async calculateDiff(configClients: InputConfigDownloadClient[], serverClients: DownloadClientResource[], cache: ServerCache) {
    return {
      create: [],
      update: [],
      unchanged: [],
      deleted: [],
    };
  }

  public async resolveConfig(
    config: InputConfigDownloadClient,
    cache: ServerCache,
    serverClient?: DownloadClientResource,
    partialUpdate?: boolean,
  ) {
    return {} as DownloadClientResource;
  }

  protected createClient() {
    throw new Error("Not implemented in test");
  }

  protected updateClient() {
    throw new Error("Not implemented in test");
  }

  protected deleteClient() {
    throw new Error("Not implemented in test");
  }
}

describe("BaseDownloadClientSync – utility methods", () => {
  let sync: MockDownloadClientSync;

  beforeEach(() => {
    sync = new MockDownloadClientSync();
  });

  describe("snakeToCamel conversion", () => {
    test("converts simple snake_case to camelCase", () => {
      expect(sync.testSnakeToCamel("hello_world")).toBe("helloWorld");
      expect(sync.testSnakeToCamel("test_case")).toBe("testCase");
      expect(sync.testSnakeToCamel("api_key")).toBe("apiKey");
    });

    test("handles multiple underscores", () => {
      expect(sync.testSnakeToCamel("very_long_field_name")).toBe("veryLongFieldName");
    });

    test("handles empty string", () => {
      expect(sync.testSnakeToCamel("")).toBe("");
    });

    test("handles string without underscores", () => {
      expect(sync.testSnakeToCamel("camel")).toBe("camel");
    });

    test("handles leading/trailing underscores", () => {
      expect(sync.testSnakeToCamel("_private_field")).toBe("PrivateField");
      expect(sync.testSnakeToCamel("trailing_")).toBe("trailing_"); // trailing underscore doesn't convert
    });
  });

  describe("category field mapping", () => {
    test("returns correct category field for RADARR", () => {
      const field = sync.testGetCategoryFieldName("RADARR");
      expect(field).toBeDefined();
      expect(typeof field).toBe("string");
    });
  });

  describe("field normalization", () => {
    test("normalizes snake_case fields to camelCase", () => {
      const result = sync.testNormalizeConfigFields(
        {
          use_ssl: true,
          api_key: "test123",
          recent_priority: 5,
          normal_field: "value",
        },
        "RADARR",
      );

      expect(result).toHaveProperty("useSsl", true);
      expect(result).toHaveProperty("apiKey", "test123");
      expect(result).toHaveProperty("recentPriority", 5);
      expect(result).toHaveProperty("normalField", "value");

      // Should keep original fields for backward compatibility
      expect(result).toHaveProperty("use_ssl", true);
      expect(result).toHaveProperty("api_key", "test123");
      expect(result).toHaveProperty("recent_priority", 5);
      expect(result).toHaveProperty("normal_field", "value");
    });

    test("handles empty config", () => {
      const result = sync.testNormalizeConfigFields({}, "RADARR");
      expect(result).toEqual({});
    });

    test("handles nested objects", () => {
      const result = sync.testNormalizeConfigFields(
        {
          nested_obj: {
            inner_field: "value",
          },
        },
        "RADARR",
      );

      expect(result).toHaveProperty("nestedObj"); // converts key name
      expect(result.nestedObj).toEqual({ inner_field: "value" }); // doesn't recurse into object
      expect(result).toHaveProperty("nested_obj"); // keeps original key
    });
  });

  describe("tag resolution", () => {
    test("resolves tag names to IDs (case-insensitive)", () => {
      const serverTags: TagResource[] = [
        { id: 1, label: "movies" },
        { id: 2, label: "4K" },
        { id: 3, label: "Test-Tag" },
      ];

      const { ids, missingTags } = sync.testResolveTagNamesToIds(["Movies", "4k", "test-tag"], serverTags);

      expect(ids).toEqual([1, 2, 3]);
      expect(missingTags).toEqual([]);
    });

    test("handles numeric tag IDs", () => {
      const serverTags: TagResource[] = [
        { id: 1, label: "movies" },
        { id: 2, label: "4K" },
      ];

      const { ids, missingTags } = sync.testResolveTagNamesToIds([1, 2, 999], serverTags);

      expect(ids).toEqual([1, 2, 999]);
      expect(missingTags).toEqual([]);
    });

    test("identifies missing tags", () => {
      const serverTags: TagResource[] = [{ id: 1, label: "movies" }];

      const { ids, missingTags } = sync.testResolveTagNamesToIds(["movies", "missing1", "missing2"], serverTags);

      expect(ids).toEqual([1]);
      expect(missingTags).toEqual(["missing1", "missing2"]);
    });

    test("handles empty tag list", () => {
      const { ids, missingTags } = sync.testResolveTagNamesToIds([], []);

      expect(ids).toEqual([]);
      expect(missingTags).toEqual([]);
    });
  });

  describe("validation", () => {
    test("validates valid configuration", () => {
      const mockSchema: DownloadClientResource[] = [
        {
          id: 0,
          name: "TestClient",
          implementation: "TestImplementation",
          protocol: DownloadProtocol.Torrent,
          enable: true,
          priority: 1,
          fields: [],
          tags: [],
          removeCompletedDownloads: true,
          removeFailedDownloads: true,
          configContract: "",
        },
      ];

      const config: InputConfigDownloadClient = {
        name: "Valid Client",
        type: "TestImplementation",
        priority: 5,
      };

      const result = sync.testValidateDownloadClient(config, mockSchema);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("rejects configuration with missing name", () => {
      const mockSchema: DownloadClientResource[] = [
        {
          id: 0,
          name: "TestClient",
          implementation: "TestImplementation",
          protocol: DownloadProtocol.Torrent,
          enable: true,
          priority: 1,
          fields: [],
          tags: [],
          removeCompletedDownloads: true,
          removeFailedDownloads: true,
          configContract: "",
        },
      ];

      const config = {
        type: "TestImplementation",
      } as any;

      const result = sync.testValidateDownloadClient(config, mockSchema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("rejects configuration with missing type", () => {
      const mockSchema: DownloadClientResource[] = [
        {
          id: 0,
          name: "TestClient",
          implementation: "TestImplementation",
          protocol: DownloadProtocol.Torrent,
          enable: true,
          priority: 1,
          fields: [],
          tags: [],
          removeCompletedDownloads: true,
          removeFailedDownloads: true,
          configContract: "",
        },
      ];

      const config = {
        name: "Test",
      } as any;

      const result = sync.testValidateDownloadClient(config, mockSchema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("lazy API initialization", () => {
    test("getApi() throws error when not configured", () => {
      // This test verifies that getApi() properly throws when API is not configured
      expect(() => sync.testGetApi()).toThrow("Please configure API first.");
    });
  });
});
