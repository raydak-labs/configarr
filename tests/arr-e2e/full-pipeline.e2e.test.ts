/**
 * Full configarr pipeline smoke against every *arr (no field-level asserts).
 *
 *   cd tests/arr-e2e && PUID=$(id -u) PGID=$(id -g) docker compose up -d
 *   ARR_E2E=1 pnpm test:e2e:arr
 */
import { describe, expect, test } from "vitest";
import {
  ARR_TARGETS,
  arrE2eEnabled,
  assertPipelineSucceeded,
  runConfigarr,
  waitForAllArrApis,
  writeFullPipelineWorkspace,
} from "./helpers";

describe.runIf(arrE2eEnabled)("configarr full pipeline (live)", () => {
  test("runs end-to-end against sonarr/radarr/whisparr/readarr/lidarr without errors", async () => {
    await waitForAllArrApis();

    const { configLocation, repoPath, rootPath } = writeFullPipelineWorkspace();

    const result = await runConfigarr({
      CONFIG_LOCATION: configLocation,
      ROOT_PATH: rootPath,
      CUSTOM_REPO_ROOT: repoPath,
      DRY_RUN: "false",
      STOP_ON_ERROR: "true",
      LOG_LEVEL: "info",
      TELEMETRY_ENABLED: "false",
    });

    assertPipelineSucceeded(result);

    // Second pass: idempotent re-sync should also succeed
    const second = await runConfigarr({
      CONFIG_LOCATION: configLocation,
      ROOT_PATH: rootPath,
      CUSTOM_REPO_ROOT: repoPath,
      DRY_RUN: "false",
      STOP_ON_ERROR: "true",
      LOG_LEVEL: "info",
      TELEMETRY_ENABLED: "false",
    });

    assertPipelineSucceeded(second);
    expect(ARR_TARGETS).toHaveLength(5);
  }, 600_000);
});
