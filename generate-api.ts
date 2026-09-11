import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { generateApi } from "swagger-typescript-api";

const PATH_TO_OUTPUT_DIR = path.resolve(process.cwd(), "./src/__generated__");

const OPENAPI_SPECS = {
  sonarr: "https://raw.githubusercontent.com/Sonarr/Sonarr/develop/src/Sonarr.Api.V3/openapi.json",
  radarr: "https://raw.githubusercontent.com/Radarr/Radarr/develop/src/Radarr.Api.V3/openapi.json",
  whisparr: "https://raw.githubusercontent.com/Whisparr/Whisparr/develop/src/Whisparr.Api.V3/openapi.json",
  readarr: "https://raw.githubusercontent.com/Readarr/Readarr/develop/src/Readarr.Api.V1/openapi.json",
  lidarr: "https://raw.githubusercontent.com/lidarr/Lidarr/develop/src/Lidarr.Api.V1/openapi.json",
  prowlarr: "https://raw.githubusercontent.com/Prowlarr/Prowlarr/develop/src/Prowlarr.Api.V1/openapi.json",
} as const;

type AppName = keyof typeof OPENAPI_SPECS;

const isAppName = (value: string): value is AppName => value in OPENAPI_SPECS;

const generate = (app: AppName) =>
  generateApi({
    output: path.resolve(PATH_TO_OUTPUT_DIR, app),
    url: OPENAPI_SPECS[app],
    modular: true,
    singleHttpClient: true,
    // @ts-ignore little hack to have one single client (we are deleting the weird created file for the http-client)
    fileNames: {
      httpClient: "../../ky-client",
    },
  });

const main = async () => {
  const [requested] = process.argv.slice(2);
  const apps = Object.keys(OPENAPI_SPECS) as AppName[];

  if (requested !== undefined && !isAppName(requested)) {
    console.error(`Unknown application '${requested}'. Available: ${apps.join(", ")}`);
    process.exit(1);
  }

  for (const app of requested ? [requested] : apps) {
    await generate(app);
  }

  rmSync(path.resolve(PATH_TO_OUTPUT_DIR, "..ts"), { force: true });
  execFileSync("prettier", [PATH_TO_OUTPUT_DIR, "--write"], { stdio: "inherit" });
};

main();
