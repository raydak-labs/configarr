import { waitForAllArrApis, warmTemplateRepos } from "./helpers";

/**
 * Runs once per `vitest` invocation: every container answers, and the Recyclarr / TRaSH clone
 * exists so the parallel test files copy it instead of cloning six times.
 */
export default async function setup(): Promise<void> {
  await waitForAllArrApis();
  await warmTemplateRepos();
}
