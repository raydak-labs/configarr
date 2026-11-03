import readline from "node:readline";

// Pretty logs must be synchronous so a result marker cannot overtake them.
process.env.CONFIGARR_E2E_WORKER = "true";

/**
 * One configarr process for a whole e2e file. Each stdin line is `{ id, env }`.
 * Logs stay on stdout. A marker line returns the exit code so the parent can
 * keep the process and avoid paying tsx startup on every sync.
 */
const baseEnv = { ...process.env };
let lastRepo: string | undefined;

type Job = { id: string; env: Record<string, string> };

async function handle(job: Job): Promise<void> {
  for (const key of Object.keys(process.env)) {
    if (!(key in baseEnv)) delete process.env[key];
  }
  Object.assign(process.env, baseEnv, job.env);

  const { initEnvs } = await import("../../src/env");
  initEnvs();
  const { clearCachedConfig } = await import("../../src/config");
  clearCachedConfig();
  if (job.env.CUSTOM_REPO_ROOT !== lastRepo) {
    const { clearTrashCache } = await import("../../src/trash-guide");
    clearTrashCache();
    lastRepo = job.env.CUSTOM_REPO_ROOT;
  }
  const { logger } = await import("../../src/logger");
  logger.level = job.env.LOG_LEVEL ?? "info";
  const { run } = await import("../../src/index");

  let exitCode = 0;
  let errorText = "";
  try {
    await run();
  } catch (error: unknown) {
    exitCode = 1;
    errorText = error instanceof Error ? (error.stack ?? error.message) : String(error);
  }
  await new Promise((resolve) => logger.flush(resolve));
  const encoded = Buffer.from(errorText).toString("base64") || "-";
  process.stdout.write(`\n@@E2E ${job.id} ${exitCode} ${encoded}\n`);
}

const lines = readline.createInterface({ input: process.stdin });
let chain: Promise<void> = Promise.resolve();
lines.on("line", (line) => {
  const job = JSON.parse(line) as Job;
  chain = chain.then(() => handle(job));
});
