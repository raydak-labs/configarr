import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../logger";
import { mapConfigMediaNamingToApi } from "./mediaNaming";
import { mapRadarrMediaNamingToApi } from "./mediaNamingRadarr";
import { mapSonarrMediaNamingToApi } from "./mediaNamingSonarr";

vi.mock("./mediaNamingRadarr", () => ({ mapRadarrMediaNamingToApi: vi.fn() }));
vi.mock("./mediaNamingSonarr", () => ({ mapSonarrMediaNamingToApi: vi.fn() }));
vi.mock("../logger", () => ({ logger: { warn: vi.fn() } }));

describe("mapConfigMediaNamingToApi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("dispatches Radarr config to the Radarr mapper", async () => {
    const resource = { renameMovies: true };
    vi.mocked(mapRadarrMediaNamingToApi).mockResolvedValue(resource);

    await expect(mapConfigMediaNamingToApi("RADARR", {})).resolves.toBe(resource);
    expect(mapRadarrMediaNamingToApi).toHaveBeenCalledWith({});
  });

  it("dispatches Sonarr config to the Sonarr mapper", async () => {
    const resource = { renameEpisodes: true };
    vi.mocked(mapSonarrMediaNamingToApi).mockResolvedValue(resource);

    await expect(mapConfigMediaNamingToApi("SONARR", {})).resolves.toBe(resource);
    expect(mapSonarrMediaNamingToApi).toHaveBeenCalledWith({});
  });

  it("warns for unsupported apps", async () => {
    await expect(mapConfigMediaNamingToApi("LIDARR", {})).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith("MediaNaming not supported for LIDARR");
  });
});
