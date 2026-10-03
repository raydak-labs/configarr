import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mocked } from "vitest";
import type { RootFoldersClient } from "../clients/capabilities";
import { PathRootFolderSync } from "./rootFolderBase";
import { ServerCache } from "../cache";
import type { RootFolderServerResource } from "./rootFolder.types";

vi.mock("../env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../env")>();
  return {
    ...actual,
    getEnvs: vi.fn(() => ({ DRY_RUN: false, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" })),
  };
});

import { getEnvs } from "../env";

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
    vi.mocked(getEnvs).mockReturnValue({ DRY_RUN: false, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" } as never);
    serverCache = new ServerCache();
  });

  const setDryRun = (dryRun: boolean) =>
    vi.mocked(getEnvs).mockReturnValue({ DRY_RUN: dryRun, LOG_LEVEL: "silent", CONFIGARR_VERSION: "test" } as never);

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

  describe("syncRootFolders", () => {
    it("does not write anything when the server is already in sync", async () => {
      mockApi.getRootfolders.mockResolvedValue([{ path: "/existing" }]);

      const result = await new PathRootFolderSync(mockApi).syncRootFolders(["/existing"], serverCache);

      expect(result).toEqual({ added: 0, removed: 0, updated: 0, diffEntries: [] });
      expect(mockApi.addRootFolder).not.toHaveBeenCalled();
      expect(mockApi.updateRootFolder).not.toHaveBeenCalled();
      expect(mockApi.deleteRootFolder).not.toHaveBeenCalled();
    });

    it("deletes folders missing from config and creates missing folders", async () => {
      mockApi.getRootfolders.mockResolvedValue([
        { id: 7, path: "/keep" },
        { id: 8, path: "/gone" },
      ]);
      mockApi.addRootFolder.mockResolvedValue(undefined);
      mockApi.deleteRootFolder.mockResolvedValue(undefined);

      const result = await new PathRootFolderSync(mockApi).syncRootFolders(["/keep", "/added"], serverCache);

      expect(mockApi.deleteRootFolder).toHaveBeenCalledTimes(1);
      expect(mockApi.deleteRootFolder).toHaveBeenCalledWith("8");
      expect(mockApi.addRootFolder).toHaveBeenCalledTimes(1);
      expect(mockApi.addRootFolder).toHaveBeenCalledWith({ path: "/added" });
      expect(result).toEqual({
        added: 1,
        removed: 1,
        updated: 0,
        diffEntries: [
          { resourceType: "RootFolder", name: "/added", action: "create" },
          { resourceType: "RootFolder", name: "/gone", action: "delete" },
        ],
      });
    });

    it("reports the diff but writes nothing on a dry run", async () => {
      setDryRun(true);
      mockApi.getRootfolders.mockResolvedValue([{ id: 8, path: "/gone" }]);

      const result = await new PathRootFolderSync(mockApi).syncRootFolders(["/added"], serverCache);

      expect(mockApi.deleteRootFolder).not.toHaveBeenCalled();
      expect(mockApi.addRootFolder).not.toHaveBeenCalled();
      expect(result).toEqual({
        added: 1,
        removed: 1,
        updated: 0,
        diffEntries: [
          { resourceType: "RootFolder", name: "/added", action: "create" },
          { resourceType: "RootFolder", name: "/gone", action: "delete" },
        ],
      });
    });

    it("propagates delete failures so the instance is not reported as successful", async () => {
      mockApi.getRootfolders.mockResolvedValue([{ id: 8, path: "/gone" }]);
      mockApi.deleteRootFolder.mockRejectedValue(new Error("500 from server"));

      await expect(new PathRootFolderSync(mockApi).syncRootFolders(["/keep"], serverCache)).rejects.toThrow("500 from server");
    });
  });
});
