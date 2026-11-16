import path from "node:path";
import { z } from "zod";

const DEFAULT_ROOT_PATH = path.resolve(process.cwd());

// Values injected by --define at build time.
const CONFIGARR_VERSION = process.env.CONFIGARR_VERSION ?? "dev";
const BUILD_TIME = process.env.BUILD_TIME ?? "";
const GITHUB_RUN_ID = process.env.GITHUB_RUN_ID ?? "";
const GITHUB_REPO = process.env.GITHUB_REPO ?? "";
const GITHUB_SHA = process.env.GITHUB_SHA ?? "";

const booleanFromEnv = z
  .string()
  .toLowerCase()
  .transform((value) => value === "true")
  .pipe(z.boolean());

const schema = z.object({
  CONFIGARR_VERSION: z.string().optional().default(CONFIGARR_VERSION),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).optional().default("info"),
  LOG_FORMAT: z.enum(["text", "json"]).optional().default("text"),
  CONFIG_LOCATION: z.string().optional(),
  SECRETS_LOCATION: z.string().optional(),
  CONFIGARR_DIFF_OUTPUT_FILE: z.string().optional(),
  CUSTOM_REPO_ROOT: z.string().optional(),
  ROOT_PATH: z.string().optional().default(DEFAULT_ROOT_PATH),
  DRY_RUN: booleanFromEnv.default(false),
  LOAD_LOCAL_SAMPLES: booleanFromEnv.default(false),
  DEBUG_CREATE_FILES: booleanFromEnv.default(false),
  STOP_ON_ERROR: booleanFromEnv.default(false),
  LOG_STACKTRACE: booleanFromEnv.default(false),
  CONFIGARR_ENABLE_MERGE: booleanFromEnv.default(false),
  CONFIGARR_ENFORCE_CONFIG_VALIDATION: booleanFromEnv.default(false),
  CONFIGARR_ENFORCE_EXTERNAL_VALIDATION: booleanFromEnv.default(false),
  TELEMETRY_ENABLED: booleanFromEnv.optional(),
});

let envs: z.infer<typeof schema>;

export function initEnvs() {
  const parsed = schema.safeParse(process.env);

  if (parsed.success === false) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables.");
  }

  envs = parsed.data;
}

export const getEnvs = () => {
  if (envs) return envs;

  envs = schema.parse(process.env);

  return envs;
};

export const getHelpers = () => {
  const env = getEnvs();

  return {
    configLocation: env.CONFIG_LOCATION ?? `${env.ROOT_PATH}/config/config.yml`,
    secretLocation: env.SECRETS_LOCATION ?? `${env.ROOT_PATH}/config/secrets.yml`,
    repoPath: env.CUSTOM_REPO_ROOT ?? `${env.ROOT_PATH}/repos`,
    enableMerge: env.CONFIGARR_ENABLE_MERGE,
  };
};

export const getBuildInfo = () => ({
  version: getEnvs().CONFIGARR_VERSION,
  buildTime: BUILD_TIME,
  githubRunId: GITHUB_RUN_ID,
  githubRepo: GITHUB_REPO,
  githubSha: GITHUB_SHA,
});
