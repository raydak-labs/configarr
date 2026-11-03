import { spawn } from "node:child_process";

/** Sonarr v5 and the three Radarr majors use separate containers, so they run together. */
const scripts = ["test:e2e:arr:sonarr-v5", "test:e2e:arr:radarr-v5", "test:e2e:arr:radarr-v6", "test:e2e:arr:radarr-v7"];

const codes = await Promise.all(
  scripts.map(
    (script) =>
      new Promise<number>((resolve, reject) => {
        const child = spawn("pnpm", ["run", script], { env: process.env, stdio: ["ignore", "pipe", "pipe"] });
        const write = (chunk: Buffer) => {
          for (const line of chunk.toString().split("\n")) {
            if (line.length > 0) process.stdout.write(`[${script}] ${line}\n`);
          }
        };
        child.stdout?.on("data", write);
        child.stderr?.on("data", write);
        child.on("error", reject);
        child.on("close", (code) => resolve(code ?? 1));
      }),
  ),
);

if (codes.some((code) => code !== 0)) {
  process.exit(1);
}
