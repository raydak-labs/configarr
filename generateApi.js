import fs from "fs";
import path from "path";
import { generateApi } from "swagger-typescript-api";

const PATH_TO_OUTPUT_DIR = path.resolve(process.cwd(), "./src/__generated__");

/* NOTE: all fields are optional expect one of `input`, `url`, `spec` */
generateApi({
  name: "GeneratedSonarrApi.ts",
  output: PATH_TO_OUTPUT_DIR,
  url: "https://raw.githubusercontent.com/Sonarr/Sonarr/develop/src/Sonarr.Api.V3/openapi.json",
  httpClientType: "axios",
})
  .then(({ files, configuration }) => {
    files.forEach(({ content, name }) => {
      fs.writeFile(path, content);
    });
  })
  .catch((e) => console.error(e));

generateApi({
  name: "GeneratedRadarrApi.ts",
  output: PATH_TO_OUTPUT_DIR,
  url: "https://raw.githubusercontent.com/Radarr/Radarr/develop/src/Radarr.Api.V3/openapi.json",
  httpClientType: "axios",
})
  .then(({ files, configuration }) => {
    files.forEach(({ content, name }) => {
      fs.writeFile(path, content);
    });
  })
  .catch((e) => console.error(e));

// generateTemplates({
//   cleanOutput: false,
//   output: PATH_TO_OUTPUT_DIR,
//   httpClientType: "fetch",
//   modular: false,
//   silent: false,
//   rewrite: false,
// });
