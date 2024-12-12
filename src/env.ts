import path from "node:path";
import { z } from "zod";

const DEFAULT_ROOT_PATH = path.resolve(process.cwd());

const schema = z.object({
  // NODE_ENV: z.enum(["production", "development", "test"] as const),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"] as const)
    .optional()
    .default("info"),
  CONFIG_LOCATION: z.string().optional(),
  SECRETS_LOCATION: z.string().optional(),
  // TODO: deprecate?
  CUSTOM_REPO_ROOT: z.string().optional(),
  ROOT_PATH: z.string().optional().default(DEFAULT_ROOT_PATH),
  DRY_RUN: z
    .string()
    .toLowerCase()
    .transform((x) => x === "true")
    .pipe(z.boolean())
    .default("false"),
  LOAD_LOCAL_SAMPLES: z
    .string()
    .toLowerCase()
    .transform((x) => x === "true")
    .pipe(z.boolean())
    .default("false"),
  DEBUG_CREATE_FILES: z
    .string()
    .toLowerCase()
    .transform((x) => x === "true")
    .pipe(z.boolean())
    .default("false"),
});

// declare global {
//   // eslint-disable-next-line @typescript-eslint/no-namespace
//   namespace NodeJS {
//     // eslint-disable-next-line @typescript-eslint/no-empty-object-type
//     interface ProcessEnv extends z.infer<typeof schema> {}
//   }
// }

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

export const getHelpers = () => ({
  configLocation: getEnvs().CONFIG_LOCATION ?? `${getEnvs().ROOT_PATH}/config/config.yml`,
  secretLocation: getEnvs().SECRETS_LOCATION ?? `${getEnvs().ROOT_PATH}/config/secrets.yml`,
  // TODO: check for different env name
  repoPath: getEnvs().CUSTOM_REPO_ROOT ?? `${getEnvs().ROOT_PATH}/repos`,
  // TODO: add stuff like isDryRun,...?
});
