import path from "path";
import { generateApi } from "swagger-typescript-api";

const PATH_TO_OUTPUT_DIR = path.resolve(process.cwd(), "./src/__generated__");

const main = async () => {
  await generateApi({
    name: "generated-sonarr-api.ts",
    output: PATH_TO_OUTPUT_DIR,
    url: "https://raw.githubusercontent.com/Sonarr/Sonarr/develop/src/Sonarr.Api.V3/openapi.json",
    httpClientType: "axios",
  });

  await generateApi({
    name: "generated-radarr-api.ts",
    output: PATH_TO_OUTPUT_DIR,
    url: "https://raw.githubusercontent.com/Radarr/Radarr/develop/src/Radarr.Api.V3/openapi.json",
    httpClientType: "axios",
  });
};

main();
