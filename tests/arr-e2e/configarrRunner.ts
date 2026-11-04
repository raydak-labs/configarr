import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import esbuild from "esbuild";

export type ConfigarrRunResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
};

const REPO_ROOT = join(import.meta.dirname, "../..");
const TIMEOUT_MS = 300_000;

const cliBundle = (runRoot: string) => join(runRoot, "configarr.cjs");
const workerBundle = (runRoot: string) => join(runRoot, "configarr-worker.cjs");

/**
 * Builds the CLI (same esbuild bundle as the Docker image) and the e2e worker once per project.
 * A bundle starts with one file parse instead of tsx resolving every module.
 */
export async function buildConfigarrBundles(runRoot: string): Promise<void> {
  const common = { bundle: true, platform: "node", target: "node20", format: "cjs", logLevel: "error" } as const;
  await Promise.all([
    esbuild.build({ ...common, entryPoints: [join(REPO_ROOT, "src/index.ts")], outfile: cliBundle(runRoot) }),
    esbuild.build({ ...common, entryPoints: [join(REPO_ROOT, "tests/arr-e2e/configarrWorker.ts")], outfile: workerBundle(runRoot) }),
  ]);
}

/** One fresh configarr process, exactly like a user run. */
export function runConfigarrProcess(env: Record<string, string>, runRoot: string): Promise<ConfigarrRunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliBundle(runRoot)], {
      cwd: REPO_ROOT,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`configarr timed out after ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS);
    child.stdout.on("data", (chunk) => (stdout += String(chunk)));
    child.stderr.on("data", (chunk) => (stderr += String(chunk)));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ exitCode, stdout, stderr });
    });
  });
}

const MARKER = /\n@@configarr-e2e (\S+) (\d+) (\S+)\n/;

type Pending = { id: string; stderr: string; resolve: (r: ConfigarrRunResult) => void; reject: (e: Error) => void };

/** Worker for the current test file (vitest isolates files, so this module state is per file). */
let worker: { child: ChildProcessWithoutNullStreams; stdout: string; pending?: Pending } | undefined;
let queue: Promise<unknown> = Promise.resolve();

function startWorker(env: Record<string, string>, runRoot: string): NonNullable<typeof worker> {
  const child = spawn(process.execPath, [workerBundle(runRoot)], { cwd: REPO_ROOT, env: { ...process.env, ...env } });
  const state: NonNullable<typeof worker> = { child, stdout: "" };
  child.stdout.on("data", (chunk) => {
    state.stdout += String(chunk);
    const match = MARKER.exec(state.stdout);
    const pending = state.pending;
    if (!match || !pending || match[1] !== pending.id) return;
    const stdout = state.stdout.slice(0, match.index);
    state.stdout = state.stdout.slice(match.index + match[0].length);
    state.pending = undefined;
    const encoded = match[3] ?? "-";
    const error = encoded === "-" ? "" : Buffer.from(encoded, "base64").toString("utf8");
    pending.resolve({ exitCode: Number(match[2]), stdout, stderr: pending.stderr + error });
  });
  child.stderr.on("data", (chunk) => {
    if (state.pending) state.pending.stderr += String(chunk);
  });
  child.on("close", (code) => {
    if (worker === state) worker = undefined;
    state.pending?.reject(new Error(`configarr worker exited ${code}\n${state.stdout}\n${state.pending.stderr}`));
  });
  // Exits on its own once this test file's process closes stdin.
  child.unref();
  for (const stream of [child.stdin, child.stdout, child.stderr]) (stream as unknown as { unref?: () => void }).unref?.();
  return state;
}

/**
 * Runs configarr in the test file's long-lived worker. The worker resets env, config, caches and
 * the API client before each job, so a job sees what a fresh process would.
 */
export function runConfigarrInWorker(env: Record<string, string>, runRoot: string): Promise<ConfigarrRunResult> {
  const job = queue.then(
    () =>
      new Promise<ConfigarrRunResult>((resolve, reject) => {
        const state = (worker ??= startWorker(env, runRoot));
        const id = randomUUID();
        const timer = setTimeout(() => {
          state.child.kill("SIGKILL");
          reject(new Error(`configarr timed out after ${TIMEOUT_MS}ms`));
        }, TIMEOUT_MS);
        const done =
          <T>(fn: (v: T) => void) =>
          (v: T) => {
            clearTimeout(timer);
            fn(v);
          };
        state.pending = { id, stderr: "", resolve: done(resolve), reject: done(reject) };
        state.child.stdin.write(`${JSON.stringify({ id, env })}\n`);
      }),
  );
  queue = job.catch(() => undefined);
  return job;
}
