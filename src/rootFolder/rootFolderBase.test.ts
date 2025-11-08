import { describe, it, expect, vi, beforeEach } from "vitest";
import { GenericRootFolderSync } from "./rootFolderBase";
import { getUnifiedClient } from "../clients/unified-client";
import { ServerCache } from "../cache";

// Mock the unified client
vi.mock("../clients/unified-client", () => ({
  getUnifiedClient: vi.fn(),
}));

describe("GenericRootFolderSync", () => {
  const mockApi = {
    getRootfolders: vi.fn(),
  };

  let serverCache: ServerCache;

  beforeEach(() => {
    vi.clearAllMocks();
    (getUnifiedClient as any).mockReturnValue(mockApi);
    serverCache = new ServerCache([], [], [], []);
  });

  describe("calculateDiff", () => {
    it("should handle string root folders", async () => {
      mockApi.getRootfolders.mockResolvedValue(["/existing"]);

      const sync = new GenericRootFolderSync("RADARR");
      const result = await sync.calculateDiff(["/existing", "/new"], serverCache);

      expect(result).toEqual({
        missingOnServer: ["/new"],
        notAvailableAnymore: [],
        changed: [],
      });
    });

    it("should detect root folders not available anymore", async () => {
      mockApi.getRootfolders.mockResolvedValue(["/old-folder"]);

      const sync = new GenericRootFolderSync("RADARR");
      const result = await sync.calculateDiff(["/new-folder"], serverCache);

      expect(result).toEqual({
        missingOnServer: ["/new-folder"],
        notAvailableAnymore: ["/old-folder"],
        changed: [],
      });
    });

    it("should handle mixed string and object root folders", async () => {
      mockApi.getRootfolders.mockResolvedValue(["/string-folder", "/object-folder"]);

      const sync = new GenericRootFolderSync("RADARR");
      const result = await sync.calculateDiff(
        [
          "/string-folder",
          { path: "/object-folder", name: "object", metadata_profile: "Standard", quality_profile: "Any" },
          { path: "/new-object", name: "new", metadata_profile: "Standard", quality_profile: "Any" },
        ],
        serverCache,
      );

      expect(result).toEqual({
        missingOnServer: [{ path: "/new-object", name: "new", metadata_profile: "Standard", quality_profile: "Any" }],
        notAvailableAnymore: [],
        changed: [],
      });
    });

    it("should handle empty config", async () => {
      mockApi.getRootfolders.mockResolvedValue(["/server-folder"]);

      const sync = new GenericRootFolderSync("RADARR");
      const result = await sync.calculateDiff([], serverCache);

      expect(result).toEqual({
        missingOnServer: [],
        notAvailableAnymore: ["/server-folder"],
        changed: [],
      });
    });

    it("should handle null/undefined config", async () => {
      mockApi.getRootfolders.mockResolvedValue([]);

      const sync = new GenericRootFolderSync("RADARR");
      const result = await sync.calculateDiff(null as any, serverCache);

      expect(result).toBeNull();
    });
  });

  describe("resolveRootFolderConfig", () => {
    it("should handle string config for non-Lidarr", async () => {
      const sync = new GenericRootFolderSync("RADARR");
      const result = await sync.resolveRootFolderConfig("/path/to/folder", serverCache);
      expect(result).toEqual({ path: "/path/to/folder" });
    });
  });
});
