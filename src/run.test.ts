import { describe, expect, it, vi } from "vitest";
import { configureApi } from "./clients/client";
import { logger } from "./logger";
import { run } from "./run";

const sonarrRun = vi.hoisted(() => vi.fn());

vi.mock("./env", () => ({
  getBuildInfo: () => ({ buildTime: "", githubRunId: "", githubSha: "" }),
  getEnvs: () => ({ CONFIGARR_VERSION: "test", DRY_RUN: false }),
}));
vi.mock("./config", () => ({ getConfig: () => ({ sonarrEnabled: 0 }) }));
vi.mock("./recyclarr-importer", () => ({ cloneRecyclarrTemplateRepo: vi.fn() }));
vi.mock("./trash-guide", () => ({ cloneTrashRepo: vi.fn() }));
vi.mock("./clients/client", () => ({ configureApi: vi.fn(), unsetApi: vi.fn() }));
vi.mock("./diffReport/formatters/consoleFormatter", () => ({
  ConsoleDiffFormatter: class {
    format = vi.fn();
  },
}));
vi.mock("./diffReport/formatters/jsonFormatter", () => ({ writeJsonDiffReport: vi.fn() }));
vi.mock("./logger", () => ({
  logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn() },
  logBlankLine: vi.fn(),
  logHeading: vi.fn(),
  logInstanceHeading: vi.fn(),
}));
vi.mock("./telemetry", () => ({
  getTelemetryInstance: vi.fn(),
  Telemetry: { isEnabled: vi.fn().mockReturnValue(false) },
}));
vi.mock("./arr/sonarrSyncer", () => ({
  SonarrSyncer: class {
    run = sonarrRun;
  },
}));
vi.mock("./arr/radarrSyncer", () => ({
  RadarrSyncer: class {
    run = vi.fn();
  },
}));
vi.mock("./arr/whisparrSyncer", () => ({
  WhisparrSyncer: class {
    run = vi.fn();
  },
}));
vi.mock("./arr/readarrSyncer", () => ({
  ReadarrSyncer: class {
    run = vi.fn();
  },
}));
vi.mock("./arr/lidarrSyncer", () => ({
  LidarrSyncer: class {
    run = vi.fn();
  },
}));
vi.mock("./arr/prowlarrSyncer", () => ({
  ProwlarrSyncer: class {
    run = vi.fn();
  },
}));

describe("run", () => {
  it("does not run Sonarr when sonarrEnabled is falsy zero", async () => {
    await run();

    expect(logger.debug).toHaveBeenCalledWith("SONARR disabled in config");
    expect(sonarrRun).not.toHaveBeenCalled();
    expect(configureApi).not.toHaveBeenCalled();
  });
});
