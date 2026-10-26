import { arrConnection } from "./config";
import { waitForArrApi, warmTemplateRepos } from "./helpers";

export default async function setup(): Promise<void> {
  const { baseUrl, apiKey } = arrConnection("RADARR");
  await waitForArrApi(baseUrl, apiKey, "/api/v3/system/status");
  await warmTemplateRepos();
}
