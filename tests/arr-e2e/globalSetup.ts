import type { TestProject } from "vitest/node";
import { setupRunRepos, waitForAllArrApis, waitForArrApi, waitForSonarrApi } from "./helpers";

/**
 * Runs once per vitest project: its containers answer, and it gets its own snapshot of the
 * Recyclarr / TRaSH clone so its test files copy that instead of cloning.
 * Version projects set `<ARR>_BASE_URL` in `test.env` and only wait for that container.
 */
export default async function setup(project: TestProject): Promise<() => void> {
  const env = project.config.env ?? {};
  if (env.SONARR_BASE_URL) {
    await waitForSonarrApi(env.SONARR_BASE_URL, env.SONARR_API_KEY ?? "");
  } else if (env.RADARR_BASE_URL) {
    await waitForArrApi(env.RADARR_BASE_URL, env.RADARR_API_KEY ?? "", "/api/v3/system/status");
  } else {
    await waitForAllArrApis();
  }
  return await setupRunRepos(project);
}
