import type { TestProject } from "vitest/node";
import { setupRunRepos, waitForProjectArrApis } from "./helpers";

/**
 * Runs once per vitest project: its container answers, and it gets its own snapshot of the
 * Recyclarr / TRaSH clone so its test files copy that instead of cloning.
 * The project name selects the readiness check; projects without one wait for the whole stack.
 */
export default async function setup(project: TestProject): Promise<() => void> {
  const env = project.config.env ?? {};
  await waitForProjectArrApis(env.ARR_E2E_PROJECT_NAME, env);
  return await setupRunRepos(project);
}
