import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../logger";
import { loadNamingFromTrashRadarr } from "../trash-guide";
import { mapRadarrMediaNamingToApi } from "./mediaNamingRadarr";

vi.mock("../trash-guide", () => ({ loadNamingFromTrashRadarr: vi.fn() }));
vi.mock("../logger", () => ({ logger: { debug: vi.fn(), warn: vi.fn() } }));

describe("mapRadarrMediaNamingToApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("maps configured TRaSH names and rename settings", async () => {
    vi.mocked(loadNamingFromTrashRadarr).mockResolvedValue({
      folder: { default: "movie-folder" },
      file: { default: "movie-file" },
    });

    await expect(mapRadarrMediaNamingToApi({ folder: "default", movie: { standard: "default", rename: true } })).resolves.toEqual({
      movieFolderFormat: "movie-folder",
      standardMovieFormat: "movie-file",
      renameMovies: true,
    });
  });

  it("warns and omits an unknown TRaSH name", async () => {
    vi.mocked(loadNamingFromTrashRadarr).mockResolvedValue({ folder: {}, file: {} });

    await expect(mapRadarrMediaNamingToApi({ folder: "missing" })).resolves.toEqual({});
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("mediaNaming.folder 'missing'"));
  });

  it("returns null when TRaSH naming is unavailable", async () => {
    vi.mocked(loadNamingFromTrashRadarr).mockResolvedValue(null);

    await expect(mapRadarrMediaNamingToApi({ folder: "default" })).resolves.toBeNull();
  });
});
