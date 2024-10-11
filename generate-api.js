import { unlinkSync } from "node:fs";
import path from "node:path";
import { generateApi } from "swagger-typescript-api";

const PATH_TO_OUTPUT_DIR = path.resolve(process.cwd(), "./src/__generated__");
const PATH_SONARR_DIR = path.resolve(PATH_TO_OUTPUT_DIR, "sonarr");
const PATH_RADARR_DIR = path.resolve(PATH_TO_OUTPUT_DIR, "radarr");

const main = async () => {
  await generateApi({
    output: PATH_SONARR_DIR,
    url: "https://raw.githubusercontent.com/Sonarr/Sonarr/develop/src/Sonarr.Api.V3/openapi.json",
    modular: true,
    singleHttpClient: true,
    // little hack to have one single client (we are deleting the weird created file for the http-client)
    fileNames: {
      httpClient: "../ky-client",
    },
  });

  await generateApi({
    output: PATH_RADARR_DIR,
    url: "https://raw.githubusercontent.com/Radarr/Radarr/develop/src/Radarr.Api.V3/openapi.json",
    modular: true,
    singleHttpClient: true,
    // little hack to have one single client (we are deleting the weird created file for the http-client)
    fileNames: {
      httpClient: "../ky-client",
    },
  });

  unlinkSync(path.resolve(PATH_SONARR_DIR, "..ts"));
  unlinkSync(path.resolve(PATH_RADARR_DIR, "..ts"));
};

main();
