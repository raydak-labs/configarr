import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../logger";
import { loadNamingFromTrashRadarr } from "../trash-guide";
import { RadarrMediaManagementSync } from "./mediaManagementRadarr";

vi.mock("../trash-guide", () => ({ loadNamingFromTrashRadarr: vi.fn() }));
vi.mock("../logger", () => ({ logger: { debug: vi.fn(), warn: vi.fn() } }));

describe("RadarrMediaManagementSync.mapNaming", () => {
  const sync = new RadarrMediaManagementSync({} as never);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("maps configured TRaSH names and rename settings", async () => {
    vi.mocked(loadNamingFromTrashRadarr).mockResolvedValue({
      folder: { default: "movie-folder" },
      file: { default: "movie-file" },
    });

    await expect(sync.mapNaming({ folder: "default", movie: { standard: "default", rename: true } })).resolves.toEqual({
      movieFolderFormat: "movie-folder",
      standardMovieFormat: "movie-file",
      renameMovies: true,
    });
  });

  it("warns and omits an unknown TRaSH name", async () => {
    vi.mocked(loadNamingFromTrashRadarr).mockResolvedValue({ folder: {}, file: {} });

    await expect(sync.mapNaming({ folder: "missing" })).resolves.toEqual({});
    expect(logger.warn).toHaveBeenCalledWith("(RADARR) TRaSH naming key 'missing' was not found. Check debug logs for available keys.");
  });

  it("returns null when TRaSH naming is unavailable", async () => {
    vi.mocked(loadNamingFromTrashRadarr).mockResolvedValue(null);

    await expect(sync.mapNaming({ folder: "default" })).resolves.toBeNull();
  });
});
