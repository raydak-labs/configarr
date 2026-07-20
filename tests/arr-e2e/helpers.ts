import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { LidarrClient } from "../../src/clients/lidarr-client";
import { RadarrClient } from "../../src/clients/radarr-client";
import { ReadarrClient } from "../../src/clients/readarr-client";
import { SonarrClient } from "../../src/clients/sonarr-client";
import { WhisparrClient } from "../../src/clients/whisparr-client";
import { MergedDelayProfileResource } from "../../src/types/merged.types";

export const DEFAULT_API_KEY = "e2etestapikey0123456789abcdef012";
export const arrE2eEnabled = process.env.ARR_E2E === "1";

export type ArrKind = "sonarr" | "radarr" | "whisparr" | "readarr" | "lidarr";

export type DelayProfileClient = {
  getSystemStatus: () => Promise<{ version?: string | null; appName?: string | null }>;
  getDelayProfiles: () => Promise<any[]>;
  updateDelayProfile: (id: string, data: any) => Promise<any>;
};

type ArrTarget = {
  kind: ArrKind;
  defaultBaseUrl: string;
  statusPath: string;
  createClient: (baseUrl: string, apiKey: string) => DelayProfileClient;
};

export const ARR_TARGETS: ArrTarget[] = [
  {
    kind: "sonarr",
    defaultBaseUrl: "http://127.0.0.1:18989",
    statusPath: "/api/v3/system/status",
    createClient: (baseUrl, apiKey) => new SonarrClient(baseUrl, apiKey),
  },
  {
    kind: "radarr",
    defaultBaseUrl: "http://127.0.0.1:17878",
    statusPath: "/api/v3/system/status",
    createClient: (baseUrl, apiKey) => new RadarrClient(baseUrl, apiKey),
  },
  {
    kind: "whisparr",
    defaultBaseUrl: "http://127.0.0.1:16969",
    statusPath: "/api/v3/system/status",
    createClient: (baseUrl, apiKey) => new WhisparrClient(baseUrl, apiKey),
  },
  {
    kind: "readarr",
    defaultBaseUrl: "http://127.0.0.1:18787",
    statusPath: "/api/v1/system/status",
    createClient: (baseUrl, apiKey) => new ReadarrClient(baseUrl, apiKey),
  },
  {
    kind: "lidarr",
    defaultBaseUrl: "http://127.0.0.1:18686",
    statusPath: "/api/v1/system/status",
    createClient: (baseUrl, apiKey) => new LidarrClient(baseUrl, apiKey),
  },
];

export function resolveArrConnection(kind: ArrKind, defaultBaseUrl: string): { baseUrl: string; apiKey: string } {
  const upper = kind.toUpperCase();
  return {
    baseUrl: process.env[`${upper}_BASE_URL`] ?? defaultBaseUrl,
    apiKey: process.env[`${upper}_API_KEY`] ?? DEFAULT_API_KEY,
  };
}

export const LEGACY_DELAY_PROFILE = {
  enableUsenet: true,
  enableTorrent: true,
  preferredProtocol: "usenet" as const,
  usenetDelay: 7,
  torrentDelay: 3,
  bypassIfHighestQuality: true,
  bypassIfAboveCustomFormatScore: false,
  minimumCustomFormatScore: 0,
  tags: [] as number[],
};

export const LEGACY_DELAY_PROFILE_RESET = {
  ...LEGACY_DELAY_PROFILE,
  usenetDelay: 0,
  torrentDelay: 0,
  bypassIfHighestQuality: false,
};

export function defaultDelayProfile(profiles: MergedDelayProfileResource[]): MergedDelayProfileResource | undefined {
  return profiles.find((p) => !p.tags?.length) ?? profiles[0];
}

export async function waitForArrApi(baseUrl: string, apiKey: string, statusPath: string, timeoutMs = 180_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}${statusPath}`, { headers: { "X-Api-Key": apiKey } });
      if (res.ok) return;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error(`Timed out waiting for ${baseUrl}${statusPath}: ${String(lastError)}`);
}

export async function waitForAllArrApis(timeoutMs = 180_000): Promise<void> {
  await Promise.all(
    ARR_TARGETS.map(async (target) => {
      const { baseUrl, apiKey } = resolveArrConnection(target.kind, target.defaultBaseUrl);
      await waitForArrApi(baseUrl, apiKey, target.statusPath, timeoutMs);
    }),
  );
}

function delayProfilesYaml(kind: ArrKind): string {
  if (kind === "lidarr") {
    return `    delay_profiles:
      default:
        items:
          - name: Usenet
            protocol: UsenetDownloadProtocol
            allowed: true
            delay: 1
          - name: Torrent
            protocol: TorrentDownloadProtocol
            allowed: true
            delay: 0
        bypassIfHighestQuality: true
        bypassIfAboveCustomFormatScore: false
        minimumCustomFormatScore: 0`;
  }

  return `    delay_profiles:
      default:
        enableUsenet: true
        enableTorrent: true
        preferredProtocol: usenet
        usenetDelay: 1
        torrentDelay: 0
        bypassIfHighestQuality: true
        bypassIfAboveCustomFormatScore: false
        minimumCustomFormatScore: 0`;
}

/** Minimal config that still exercises the full configarr pipeline for every *arr. */
export function buildFullPipelineConfigYaml(): string {
  const blocks = ARR_TARGETS.map((target) => {
    const { baseUrl, apiKey } = resolveArrConnection(target.kind, target.defaultBaseUrl);
    return `${target.kind}:
  e2e:
    base_url: ${baseUrl}
    api_key: ${apiKey}
${delayProfilesYaml(target.kind)}
`;
  });

  return `# generated by arr-e2e full-pipeline smoke
telemetry: false

${blocks.join("\n")}`;
}

export function writeFullPipelineWorkspace(): { rootPath: string; configLocation: string; repoPath: string } {
  const rootPath = mkdtempSync(join(tmpdir(), "configarr-arr-e2e-"));
  const configDir = join(rootPath, "config");
  const repoPath = join(rootPath, "repos");
  mkdirSync(configDir, { recursive: true });
  mkdirSync(repoPath, { recursive: true });

  const configLocation = join(configDir, "config.yml");
  writeFileSync(configLocation, buildFullPipelineConfigYaml(), "utf8");

  return { rootPath, configLocation, repoPath };
}

export type ConfigarrRunResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
};

export async function runConfigarr(env: Record<string, string>, timeoutMs = 300_000): Promise<ConfigarrRunResult> {
  const repoRoot = join(import.meta.dirname, "../..");

  return await new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["exec", "tsx", "src/index.ts"], {
      cwd: repoRoot,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`configarr timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
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

export function assertPipelineSucceeded(result: ConfigarrRunResult, kinds: ArrKind[] = ARR_TARGETS.map((t) => t.kind)): void {
  if (result.exitCode !== 0) {
    throw new Error(`configarr exited ${result.exitCode}\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`);
  }

  for (const kind of kinds) {
    const upper = kind.toUpperCase();
    // Example: LIDARR: (1/0/0)
    const re = new RegExp(`${upper}: \\(1/0/0\\)`);
    if (!re.test(result.stdout)) {
      throw new Error(`Missing success summary for ${upper} in:\n${result.stdout}`);
    }
  }

  if (/Stopping further execution because 'STOP_ON_ERROR'/.test(result.stdout + result.stderr)) {
    throw new Error("STOP_ON_ERROR triggered during pipeline");
  }
}
