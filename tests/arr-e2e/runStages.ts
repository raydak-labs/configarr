/**
 * Runs every e2e stage (`pnpm test:e2e:arr`). Sequential by default; with
 * `ARR_E2E_PARALLEL_STAGES=true` stages in one wave run concurrently, output buffered per stage.
 * A wave holds only stages whose containers do not overlap.
 */
import { spawn } from "node:child_process";

const WAVES: string[][] = [
  // Per-arr files use Sonarr v4 and Radarr v6; the version stages own separate containers.
  ["parallel", "sonarr-v5", "radarr-v5", "radarr-v7"],
  // Drives every default container, so it runs alone.
  ["pipeline"],
  // Same container as the per-arr Radarr file.
  ["radarr-v6"],
];

type StageResult = { stage: string; exitCode: number | null; seconds: number; output: string };

function runStage(stage: string, buffered: boolean): Promise<StageResult> {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", [`test:e2e:arr:${stage}`], { stdio: buffered ? ["ignore", "pipe", "pipe"] : "inherit" });
    let output = "";
    child.stdout?.on("data", (chunk) => (output += String(chunk)));
    child.stderr?.on("data", (chunk) => (output += String(chunk)));
    child.on("error", reject);
    child.on("close", (exitCode) => resolve({ stage, exitCode, seconds: (Date.now() - started) / 1000, output }));
  });
}

async function main(): Promise<number> {
  const parallel = process.env.ARR_E2E_PARALLEL_STAGES === "true";
  const results: StageResult[] = [];

  for (const wave of WAVES) {
    if (parallel) {
      const waveResults = await Promise.all(wave.map((stage) => runStage(stage, true)));
      for (const r of waveResults) process.stdout.write(`\n===== stage ${r.stage} =====\n${r.output}`);
      results.push(...waveResults);
    } else {
      for (const stage of wave) {
        results.push(await runStage(stage, false));
        if (results.at(-1)!.exitCode !== 0) break;
      }
    }
    if (results.some((r) => r.exitCode !== 0)) break;
  }

  for (const r of results) console.log(`${r.exitCode === 0 ? "ok  " : "FAIL"} ${r.stage} ${r.seconds.toFixed(1)}s`);
  return results.every((r) => r.exitCode === 0) ? 0 : 1;
}

process.exitCode = await main();
