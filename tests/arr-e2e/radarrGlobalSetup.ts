import type { TestProject } from "vitest/node";
import { arrConnection } from "./config";
import { setupRunRepos, waitForArrApi } from "./helpers";

export default async function setup(project: TestProject): Promise<() => void> {
  const { baseUrl, apiKey } = arrConnection("RADARR");
  await waitForArrApi(baseUrl, apiKey, "/api/v3/system/status");
  return await setupRunRepos(project);
}
