import { defineConfig } from "vitest/config";

const API_KEY = "e2etestapikey0123456789abcdef012";
const TESTS = "tests/arr-e2e";

/** Version fixture: one feature file against its own container, so it runs beside the default project. */
function versionProject(name: string, file: string, env: Record<string, string>) {
  return { extends: true as const, test: { name, include: [`${TESTS}/${file}`], env } };
}

const env = process.env;
// The default Radarr container is v6; skip the assertion when the URL is overridden to an unknown major.
const defaultRadarrMajor = env.RADARR_EXPECTED_MAJOR ?? (env.RADARR_BASE_URL ? undefined : "6");

// Projects with groupOrder 0 own disjoint containers and run concurrently; the pipeline drives every
// default container, so it waits for group 0 to finish. Each project runs its own globalSetup.
export default defineConfig({
  test: {
    testTimeout: 600_000,
    hookTimeout: 180_000,
    globalSetup: [`${TESTS}/globalSetup.ts`],
    // ARR_E2E_SEQUENTIAL=true runs one file at a time, for debugging or slow hosts.
    maxWorkers: env.ARR_E2E_SEQUENTIAL === "true" ? 1 : 9,
    projects: [
      {
        extends: true,
        test: {
          name: "arr",
          include: [`${TESTS}/*.e2e.test.ts`],
          exclude: [`${TESTS}/pipeline.e2e.test.ts`],
          env: defaultRadarrMajor ? { RADARR_EXPECTED_MAJOR: defaultRadarrMajor } : {},
        },
      },
      versionProject("sonarr-v5", "sonarr.e2e.test.ts", {
        SONARR_BASE_URL: env.SONARR_V5_BASE_URL ?? "http://127.0.0.1:18990",
        SONARR_API_KEY: env.SONARR_V5_API_KEY ?? API_KEY,
      }),
      versionProject("radarr-v5", "radarr.e2e.test.ts", {
        RADARR_BASE_URL: env.RADARR_V5_BASE_URL ?? "http://127.0.0.1:17879",
        RADARR_API_KEY: env.RADARR_V5_API_KEY ?? API_KEY,
        RADARR_EXPECTED_MAJOR: "5",
      }),
      versionProject("radarr-v7", "radarr.e2e.test.ts", {
        RADARR_BASE_URL: env.RADARR_V7_BASE_URL ?? "http://127.0.0.1:17880",
        RADARR_API_KEY: env.RADARR_V7_API_KEY ?? API_KEY,
        RADARR_EXPECTED_MAJOR: "7",
      }),
      {
        extends: true,
        test: { name: "pipeline", include: [`${TESTS}/pipeline.e2e.test.ts`], sequence: { groupOrder: 1 } },
      },
    ],
  },
});
