/**
 * Long-lived configarr process for one e2e test file, bundled by `globalSetup`. Starting a fresh
 * process per sync cost ~2s of CPU-bound startup on CI; this pays it once per file.
 *
 * Protocol: one JSON job `{ id, env }` per stdin line. configarr's logs go to stdout with
 * synchronous writes, then `@@configarr-e2e <id> <exitCode> <base64 error|->` on its own line.
 * The marker is written with `fs.writeSync` too, so it cannot overtake a log line.
 */
import { writeSync } from "node:fs";
import { createInterface } from "node:readline";
import { initEnvs } from "../../src/env";
import { resetConfigCache } from "../../src/config";
import { unsetApi } from "../../src/clients/client";
import { run } from "../../src/run";
import { resetTelemetryInstance } from "../../src/telemetry";
import { resetTrashCache } from "../../src/trash-guide";

type Job = { id: string; env: Record<string, string> };

const baseEnv = { ...process.env };

/** Same state a fresh process starts with: env from this job only, no cached config, cache or client. */
function resetFor(job: Job): void {
  // Repo paths are module constants in src/util.ts, fixed by the env this process started with.
  if (job.env.CUSTOM_REPO_ROOT !== baseEnv.CUSTOM_REPO_ROOT) {
    throw new Error(`Worker started for repo '${baseEnv.CUSTOM_REPO_ROOT}', job uses '${job.env.CUSTOM_REPO_ROOT}'`);
  }
  for (const key of Object.keys(process.env)) {
    if (!(key in baseEnv)) delete process.env[key];
  }
  Object.assign(process.env, baseEnv, job.env);
  initEnvs();
  resetConfigCache();
  resetTrashCache();
  resetTelemetryInstance();
  unsetApi();
}

async function handle(job: Job): Promise<void> {
  let exitCode = 0;
  let error = "";
  try {
    resetFor(job);
    await run();
  } catch (err: unknown) {
    exitCode = 1;
    error = err instanceof Error ? (err.stack ?? err.message) : String(err);
  }
  const encoded = error ? Buffer.from(error).toString("base64") : "-";
  writeSync(1, `\n@@configarr-e2e ${job.id} ${exitCode} ${encoded}\n`);
}

let queue: Promise<void> = Promise.resolve();
const lines = createInterface({ input: process.stdin });
lines.on("line", (line) => {
  const job = JSON.parse(line) as Job;
  queue = queue.then(() => handle(job));
});
// The parent test file closes stdin when it exits.
lines.on("close", () => void queue.then(() => process.exit(0)));
