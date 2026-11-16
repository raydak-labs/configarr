import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadNamingFromTrashSonarr } from "../trash-guide";
import { mapSonarrMediaNamingToApi } from "./mediaNamingSonarr";

vi.mock("../trash-guide", () => ({ loadNamingFromTrashSonarr: vi.fn() }));
vi.mock("../logger", () => ({ logger: { debug: vi.fn(), warn: vi.fn() } }));

describe("mapSonarrMediaNamingToApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("maps all episode formats and rename settings", async () => {
    vi.mocked(loadNamingFromTrashSonarr).mockResolvedValue({
      series: { default: "series-format" },
      season: { default: "season-format" },
      episodes: {
        standard: { default: "standard-format" },
        daily: { default: "daily-format" },
        anime: { default: "anime-format" },
      },
    });

    await expect(
      mapSonarrMediaNamingToApi({
        series: "default",
        season: "default",
        episodes: { standard: "default", daily: "default", anime: "default", rename: false },
      }),
    ).resolves.toEqual({
      seriesFolderFormat: "series-format",
      seasonFolderFormat: "season-format",
      standardEpisodeFormat: "standard-format",
      dailyEpisodeFormat: "daily-format",
      animeEpisodeFormat: "anime-format",
      renameEpisodes: false,
    });
  });

  it("returns null when TRaSH naming is unavailable", async () => {
    vi.mocked(loadNamingFromTrashSonarr).mockResolvedValue(null);

    await expect(mapSonarrMediaNamingToApi({ series: "default" })).resolves.toBeNull();
  });
});
