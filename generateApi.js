const { generateApi, generateTemplates } = require("swagger-typescript-api");
const path = require("path");
const fs = require("fs");

const PATH_TO_OUTPUT_DIR = path.resolve(process.cwd(), "./src/__generated__");

/* NOTE: all fields are optional expect one of `input`, `url`, `spec` */
generateApi({
  name: "MySuperbApi.ts",
  output: path.resolve(process.cwd(), "./src/__generated__"),
  url: "https://raw.githubusercontent.com/Sonarr/Sonarr/develop/src/Sonarr.Api.V3/openapi.json",
  httpClientType: "fetch",
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
