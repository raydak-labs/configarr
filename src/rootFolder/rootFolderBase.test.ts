import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mocked } from "vitest";
import type { RootFoldersClient } from "../clients/capabilities";
import { PathRootFolderSync } from "./rootFolderBase";
import { ServerCache } from "../cache";
import type { RootFolderServerResource } from "./rootFolder.types";

describe("PathRootFolderSync", () => {
  const mockApi: Mocked<RootFoldersClient<RootFolderServerResource>> = {
    getRootfolders: vi.fn(),
    addRootFolder: vi.fn(),
    updateRootFolder: vi.fn(),
    deleteRootFolder: vi.fn(),
  };

  let serverCache: ServerCache;

  beforeEach(() => {
    vi.clearAllMocks();
    serverCache = new ServerCache();
  });

  describe("calculateDiff", () => {
    it("should handle string root folders", async () => {
      mockApi.getRootfolders.mockResolvedValue([{ path: "/existing" }]);

      const sync = new PathRootFolderSync(mockApi);
      const result = await sync.calculateDiff(["/existing", "/new"], serverCache);

      expect(result).toEqual({
        missingOnServer: ["/new"],
        notAvailableAnymore: [],
        changed: [],
      });
    });

    it("should detect root folders not available anymore", async () => {
      mockApi.getRootfolders.mockResolvedValue([{ path: "/old-folder" }]);

      const sync = new PathRootFolderSync(mockApi);
      const result = await sync.calculateDiff(["/new-folder"], serverCache);

      expect(result).toEqual({
        missingOnServer: ["/new-folder"],
        notAvailableAnymore: [{ path: "/old-folder" }],
        changed: [],
      });
    });

    it("should handle mixed string and object root folders", async () => {
      mockApi.getRootfolders.mockResolvedValue([{ path: "/string-folder" }, { path: "/object-folder" }]);

      const sync = new PathRootFolderSync(mockApi);
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
      mockApi.getRootfolders.mockResolvedValue([{ path: "/server-folder" }]);

      const sync = new PathRootFolderSync(mockApi);
      const result = await sync.calculateDiff([], serverCache);

      expect(result).toEqual({
        missingOnServer: [],
        notAvailableAnymore: [{ path: "/server-folder" }],
        changed: [],
      });
    });

    it("should handle null/undefined config", async () => {
      mockApi.getRootfolders.mockResolvedValue([]);

      const sync = new PathRootFolderSync(mockApi);
      const result = await sync.calculateDiff(null, serverCache);

      expect(result).toBeNull();
    });
  });

  describe("resolveRootFolderConfig", () => {
    it("should handle string config for non-Lidarr", async () => {
      const sync = new PathRootFolderSync(mockApi);
      const result = await sync.resolveRootFolderConfig("/path/to/folder", serverCache);
      expect(result).toEqual({ path: "/path/to/folder" });
    });
  });
});
