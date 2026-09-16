import { cpSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { spawn } from "node:child_process";
import { expect } from "vitest";
import { stringify } from "yaml";
import { LidarrClient } from "../../src/clients/lidarr-client";
import { ProwlarrClient } from "../../src/clients/prowlarr-client";
import { RadarrClient } from "../../src/clients/radarr-client";
import { ReadarrClient } from "../../src/clients/readarr-client";
import { SonarrClient } from "../../src/clients/sonarr-client";
import { WhisparrClient } from "../../src/clients/whisparr-client";
import { DelayProfileShared } from "../../src/delayProfiles/delayProfile.types";
import type { ArrType, MediaArrType } from "../../src/types/common.types";
import { arrConnection } from "./config";

const PROWLARR_STATUS_PATH = "/api/v1/system/status";
const FLARESOLVERR_DEFAULT_BASE_URL = "http://127.0.0.1:18191";

export type MediaArrClient = SonarrClient | RadarrClient | WhisparrClient | ReadarrClient | LidarrClient;

/** Status endpoint per *arr, for the readiness wait in `globalSetup`. */
const STATUS_PATHS: Record<MediaArrType, string> = {
  SONARR: "/api/v3/system/status",
  RADARR: "/api/v3/system/status",
  WHISPARR: "/api/v3/system/status",
  READARR: "/api/v1/system/status",
  LIDARR: "/api/v1/system/status",
};

export function createProwlarrClient(): ProwlarrClient {
  const { baseUrl, apiKey } = arrConnection("PROWLARR");
  return new ProwlarrClient(baseUrl, apiKey);
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

export function defaultDelayProfile<T extends DelayProfileShared>(profiles: T[]): T | undefined {
  return profiles.find((p) => !p.tags?.length) ?? profiles[0];
}

export async function waitUntil(predicate: () => Promise<boolean>, timeoutMs = 15_000, intervalMs = 250): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for condition`);
}

export async function waitForArrApi(baseUrl: string, apiKey: string, statusPath: string, timeoutMs = 180_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    let authFailure: Error | undefined;
    try {
      const res = await fetch(`${baseUrl}${statusPath}`, { headers: { "X-Api-Key": apiKey } });
      if (res.ok) return;
      lastError = new Error(`HTTP ${res.status}`);
      // A wrong API key never fixes itself, so fail now instead of after the full timeout.
      if (res.status === 401 || res.status === 403) {
        authFailure = new Error(`${baseUrl}${statusPath} returned ${res.status} (API key / auth env vars)`);
      }
    } catch (err) {
      lastError = err;
    }
    if (authFailure) throw authFailure;
    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error(`Timed out waiting for ${baseUrl}${statusPath}: ${String(lastError)}`);
}

/** True as soon as one status endpoint answers, i.e. the stack exists and is booting. */
async function anyArrReachable(): Promise<boolean> {
  const probes = Object.entries(STATUS_PATHS).map(async ([kind, statusPath]) => {
    const { baseUrl, apiKey } = arrConnection(kind as MediaArrType);
    const res = await fetch(`${baseUrl}${statusPath}`, { headers: { "X-Api-Key": apiKey }, signal: AbortSignal.timeout(3000) });
    if (!res.ok && res.status !== 401 && res.status !== 403) throw new Error(`HTTP ${res.status}`);
    return true;
  });
  const results = await Promise.allSettled(probes);
  return results.some((r) => r.status === "fulfilled");
}

export async function waitForAllArrApis(timeoutMs = 180_000): Promise<void> {
  if (!(await anyArrReachable())) {
    throw new Error(
      "No *arr container answered. Start the stack first:\n" + "  cd tests/arr-e2e && PUID=$(id -u) PGID=$(id -g) docker compose up -d",
    );
  }

  const prowlarr = arrConnection("PROWLARR");
  const flaresolverr = process.env.FLARESOLVERR_BASE_URL ?? FLARESOLVERR_DEFAULT_BASE_URL;
  await Promise.all([
    ...Object.entries(STATUS_PATHS).map(async ([kind, statusPath]) => {
      const { baseUrl, apiKey } = arrConnection(kind as MediaArrType);
      await waitForArrApi(baseUrl, apiKey, statusPath, timeoutMs);
    }),
    waitForArrApi(prowlarr.baseUrl, prowlarr.apiKey, PROWLARR_STATUS_PATH, timeoutMs),
    waitForArrApi(flaresolverr, "", "/", timeoutMs),
  ]);
}

export type ConfigWorkspace = { rootPath: string; configLocation: string; repoPath: string };

/** Recyclarr + TRaSH clone that `globalSetup` warms once, then every test file copies. */
const TEMPLATE_REPO_ROOT = join(tmpdir(), "configarr-arr-e2e-repo-template");

/**
 * Repo clone for the running test file. configarr checks out its pinned revision on every
 * run, so two files sharing one clone would race on `.git/index.lock`.
 */
function repoRootForCurrentFile(): string {
  const testPath = expect.getState().testPath ?? "shared";
  const key = basename(testPath).replace(/\.e2e\.test\.ts$/, "");
  const repoPath = join(tmpdir(), `configarr-arr-e2e-repo-${key}`);
  if (!existsSync(repoPath) && existsSync(TEMPLATE_REPO_ROOT)) {
    cpSync(TEMPLATE_REPO_ROOT, repoPath, { recursive: true });
  }
  return repoPath;
}

export function writeConfigWorkspace(config: unknown, reuse?: ConfigWorkspace): ConfigWorkspace {
  const rootPath = reuse?.rootPath ?? mkdtempSync(join(tmpdir(), "configarr-arr-e2e-"));
  const configDir = join(rootPath, "config");
  const repoPath = reuse?.repoPath ?? repoRootForCurrentFile();
  mkdirSync(configDir, { recursive: true });
  mkdirSync(repoPath, { recursive: true });
  const configLocation = reuse?.configLocation ?? join(configDir, "config.yml");
  writeFileSync(configLocation, stringify(config), "utf8");
  return { rootPath, configLocation, repoPath };
}

/** Clones the template repos once so the per-file copies cost no network. */
export async function warmTemplateRepos(): Promise<void> {
  const rootPath = join(tmpdir(), "configarr-arr-e2e-warmup");
  mkdirSync(join(rootPath, "config"), { recursive: true });
  const configLocation = join(rootPath, "config", "config.yml");
  writeFileSync(configLocation, stringify({ telemetry: false }), "utf8");

  const result = await runConfigarr(configarrEnv({ rootPath, configLocation, repoPath: TEMPLATE_REPO_ROOT }));
  if (result.exitCode !== 0) {
    throw new Error(`Warming the template repos failed (${result.exitCode})\n${result.stdout}\n${result.stderr}`);
  }
}

function configarrEnv(workspace: ConfigWorkspace): Record<string, string> {
  return {
    CONFIG_LOCATION: workspace.configLocation,
    ROOT_PATH: workspace.rootPath,
    CUSTOM_REPO_ROOT: workspace.repoPath,
    DRY_RUN: "false",
    STOP_ON_ERROR: "true",
    LOG_LEVEL: "info",
    TELEMETRY_ENABLED: "false",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
  };
}

export async function syncConfig(
  config: unknown,
  reuse?: ConfigWorkspace,
): Promise<{ workspace: ConfigWorkspace; result: ConfigarrRunResult }> {
  const workspace = writeConfigWorkspace(config, reuse);
  const result = await runConfigarr(configarrEnv(workspace));
  return { workspace, result };
}

export type ConfigarrRunResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
};

async function runConfigarr(env: Record<string, string>, timeoutMs = 300_000): Promise<ConfigarrRunResult> {
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

/** Exit code 0 plus a `(1/0/0)` summary for each instance the run was supposed to configure. */
export function assertPipelineSucceeded(result: ConfigarrRunResult, kinds: readonly ArrType[]): void {
  if (result.exitCode !== 0) {
    throw new Error(`configarr exited ${result.exitCode}\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`);
  }

  for (const kind of kinds) {
    const upper = kind.toUpperCase();
    const re = new RegExp(`${upper}: \\(1/0/0\\)`);
    if (!re.test(result.stdout)) {
      throw new Error(`Missing success summary for ${upper} in:\n${result.stdout}`);
    }
  }

  if (/Stopping further execution because 'STOP_ON_ERROR'/.test(result.stdout + result.stderr)) {
    throw new Error("STOP_ON_ERROR triggered during pipeline");
  }
}

export function assertNoErrorLogs(result: ConfigarrRunResult): void {
  const text = `${result.stdout}\n${result.stderr}`;
  if (/ERROR\s+\[/.test(text)) {
    throw new Error(`configarr logged ERROR\n${text}`);
  }
}

export function assertDiffUpToDate(result: ConfigarrRunResult, instanceKinds: string[]): void {
  if (result.exitCode !== 0) {
    throw new Error(`configarr exited ${result.exitCode}\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`);
  }

  for (const kind of instanceKinds) {
    const header = `=== Diff Report: ${kind.toUpperCase()} / e2e`;
    const start = result.stdout.indexOf(header);
    if (start < 0) {
      throw new Error(`Missing Diff Report for ${kind}\n${result.stdout}`);
    }
    const end = result.stdout.indexOf("==========================================", start);
    const section = result.stdout.slice(start, end < 0 ? undefined : end);
    if (!section.includes("(up to date - no changes)")) {
      throw new Error(`${kind} Diff Report listed changes:\n${section}\n--- stdout ---\n${result.stdout}`);
    }
  }
}

export function stripVolatile(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripVolatile);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (key === "id" || key === "added" || /timestamp/i.test(key)) continue;
      out[key] = stripVolatile(nested);
    }
    return out;
  }
  return value;
}

export function findNamed<T extends { name?: string | null }>(items: T[], name: string): T | undefined {
  return items.find((item) => item.name === name);
}

export function cfReleaseTitleValue(cf: { specifications?: Array<{ fields?: unknown }> | null } | undefined): unknown {
  const fields = cf?.specifications?.[0]?.fields;
  if (Array.isArray(fields)) {
    const field = fields.find((f) => typeof f === "object" && f !== null && "name" in f && (f as { name?: string }).name === "value") as
      { value?: unknown } | undefined;
    return field?.value;
  }
  if (fields && typeof fields === "object" && "value" in fields) {
    return (fields as { value?: unknown }).value;
  }
  return undefined;
}

/** All e2e-managed resources are prefixed so cleanup never touches server defaults. */
function isE2eName(name: string | null | undefined): boolean {
  return !!name && name.startsWith("e2e-");
}

/**
 * Names a `delete_unmanaged_*` run must not touch. e2e-managed names are filtered out: a
 * leftover from an earlier test in the same file would otherwise end up on the ignore list
 * and survive the delete the test is asserting.
 */
export function nonE2eNames<T extends { name?: string | null }>(items: T[]): string[] {
  return items.map((item) => item.name).filter((name): name is string => !!name && !isE2eName(name));
}

function isNotFoundError(err: unknown): boolean {
  const status = (err as { response?: { status?: number } }).response?.status;
  if (status === 404) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /\b404\b/.test(msg) || /not found/i.test(msg);
}

async function tryDelete(errors: string[], label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    if (isNotFoundError(err)) return;
    errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function throwCleanupErrors(errors: string[]): void {
  if (errors.length > 0) {
    throw new Error(`e2e cleanup errors:\n${errors.join("\n")}`);
  }
}

/** Deletes every `e2e-` resource this suite can create on a media *arr. Safe to call twice. */
export async function cleanupMediaE2e(client: MediaArrClient): Promise<void> {
  const errors: string[] = [];

  const cfs = await client.getCustomFormats();
  for (const cf of cfs) {
    if (cf.id != null && isE2eName(cf.name)) await tryDelete(errors, "cf", () => client.deleteCustomFormat(String(cf.id)));
  }

  const dcs = await client.getDownloadClients();
  for (const dc of dcs) {
    if (dc.id != null && isE2eName(dc.name)) await tryDelete(errors, "dc", () => client.deleteDownloadClient(String(dc.id)));
  }

  const paths = await client.getRemotePathMappings();
  for (const mapping of paths) {
    const host = "host" in mapping ? String((mapping as { host?: string }).host ?? "") : "";
    const local = "localPath" in mapping ? String((mapping as { localPath?: string }).localPath ?? "") : "";
    if (mapping.id != null && (host === "e2e-host" || local.includes("/data/e2e"))) {
      await tryDelete(errors, "rpath", () => client.deleteRemotePathMapping(String(mapping.id)));
    }
  }

  const delayTag = (await client.getTags()).find((t) => t.label === "e2e-delay");
  if (delayTag?.id != null) {
    const delays = await client.getDelayProfiles();
    for (const profile of delays) {
      if (profile.id != null && Array.isArray(profile.tags) && profile.tags.includes(delayTag.id)) {
        await tryDelete(errors, "delay", () => client.deleteDelayProfile(String(profile.id)));
      }
    }
  }

  const folders = await client.getRootfolders();
  for (const folder of folders) {
    if (folder.id != null && folder.path?.includes("/data/e2e")) {
      await tryDelete(errors, "root", () => client.deleteRootFolder(String(folder.id)));
    }
  }

  const qps = await client.getQualityProfiles();
  for (const qp of qps) {
    if (qp.id != null && isE2eName(qp.name) && qp.name !== "Any") {
      await tryDelete(errors, "qp", () => client.deleteQualityProfile(String(qp.id)));
    }
  }

  throwCleanupErrors(errors);
}

/** Lidarr and Readarr only. Call after `cleanupMediaE2e`, which drops the root folders using them. */
export async function cleanupMetadataProfilesE2e(client: LidarrClient | ReadarrClient): Promise<void> {
  const errors: string[] = [];
  for (const meta of await client.getMetadataProfiles()) {
    if (meta.id != null && isE2eName(meta.name)) {
      await tryDelete(errors, "meta", () => client.deleteMetadataProfile(String(meta.id)));
    }
  }
  throwCleanupErrors(errors);
}

export async function cleanupProwlarrE2e(client: ProwlarrClient): Promise<void> {
  const errors: string[] = [];
  for (const app of await client.getApplications()) {
    if (app.id != null && isE2eName(app.name)) await tryDelete(errors, "app", () => client.deleteApplication(String(app.id)));
  }
  for (const indexer of await client.getIndexers()) {
    if (indexer.id != null && isE2eName(indexer.name)) await tryDelete(errors, "idx", () => client.deleteIndexer(String(indexer.id)));
  }
  for (const proxy of await client.getIndexerProxies()) {
    if (proxy.id != null && isE2eName(proxy.name)) await tryDelete(errors, "proxy", () => client.deleteIndexerProxy(String(proxy.id)));
  }
  for (const dc of await client.getDownloadClients()) {
    if (dc.id != null && isE2eName(dc.name)) await tryDelete(errors, "pdc", () => client.deleteDownloadClient(String(dc.id)));
  }
  for (const profile of await client.getAppProfiles()) {
    if (profile.id != null && isE2eName(profile.name) && profile.name !== "Standard") {
      await tryDelete(errors, "sync", () => client.deleteAppProfile(String(profile.id)));
    }
  }
  for (const tag of await client.getTags()) {
    if (tag.id != null && isE2eName(tag.label)) await tryDelete(errors, "tag", () => client.deleteTag(String(tag.id)));
  }
  throwCleanupErrors(errors);
}

type SchemaClient = {
  implementation?: string | null;
  fields?: Array<{ name?: string | null }> | null;
};

export function blackholeFromSchema(schema: SchemaClient[]): { type: string; fields: Record<string, string> } | undefined {
  const match = (name: string) => schema.find((s) => (s.implementation ?? "").toLowerCase() === name.toLowerCase());
  const torrent = match("TorrentBlackhole");
  const usenet = match("UsenetBlackhole");
  const picked = torrent ?? usenet;
  if (!picked?.implementation) return undefined;
  const fields: Record<string, string> = {};
  for (const field of picked.fields ?? []) {
    const name = field.name;
    if (!name) continue;
    if (/watch/i.test(name)) fields[name] = "/data/e2e/watch";
    else if (/torrent/i.test(name)) fields[name] = "/data/e2e/torrent";
    else if (/nzb/i.test(name)) fields[name] = "/data/e2e/nzb";
  }
  return { type: picked.implementation, fields };
}

export type MediaBaseline = {
  ui: unknown;
  mm: unknown;
  naming: unknown;
  delayDefault: unknown;
  qualityDefinitions: unknown;
  downloadClientConfig: unknown;
};

/** Server-wide settings a feature run overwrites in place. Restored in each file's `afterAll`. */
export async function snapshotMediaBaseline(client: MediaArrClient): Promise<MediaBaseline> {
  const delays = await client.getDelayProfiles();
  return {
    ui: await client.getUiConfig(),
    mm: await client.getMediamanagement(),
    naming: await client.getNaming(),
    delayDefault: defaultDelayProfile(delays),
    qualityDefinitions: await client.getQualityDefinitions(),
    downloadClientConfig: await client.getDownloadClientConfig(),
  };
}

export async function restoreMediaBaseline(client: MediaArrClient, snap: MediaBaseline): Promise<void> {
  // Only write back what a test actually changed. Whisparr 3.5.0 rejects its own default naming
  // config (folder formats must start with a literal subfolder), so a no-op PUT would 400.
  const restore = async (snapshot: unknown, current: unknown, update: (id: string, body: never) => Promise<unknown>) => {
    const id = (snapshot as { id?: number } | undefined)?.id;
    if (id == null || JSON.stringify(snapshot) === JSON.stringify(current)) return;
    await update(String(id), snapshot as never);
  };

  await restore(snap.ui, await client.getUiConfig(), (id, body) => client.updateUiConfig(id, body));
  await restore(snap.mm, await client.getMediamanagement(), (id, body) => client.updateMediamanagement(id, body));
  await restore(snap.naming, await client.getNaming(), (id, body) => client.updateNaming(id, body));
  await restore(snap.delayDefault, defaultDelayProfile(await client.getDelayProfiles()), (id, body) => client.updateDelayProfile(id, body));
  await restore(snap.downloadClientConfig, await client.getDownloadClientConfig(), (id, body) =>
    client.updateDownloadClientConfig(id, body),
  );

  const definitions = snap.qualityDefinitions;
  if (Array.isArray(definitions) && JSON.stringify(definitions) !== JSON.stringify(await client.getQualityDefinitions())) {
    await client.updateQualityDefinitions(definitions as never);
  }
}

/**
 * Root folders configarr must keep: omitting one from the YAML deletes it, so every non-e2e
 * folder has to stay in the list. Sonarr, Radarr and Whisparr take plain paths.
 */
export async function preservedRootFolderPaths(client: MediaArrClient): Promise<string[]> {
  const folders = await client.getRootfolders();
  return folders.filter((f) => f.path && !f.path.includes("/data/e2e")).map((f) => f.path!);
}

/** Same, for Lidarr and Readarr, whose root folders are objects with profiles by name. */
export async function preservedRootFolderObjects(client: LidarrClient | ReadarrClient): Promise<Record<string, unknown>[]> {
  const folders = (await client.getRootfolders()).filter((f) => f.path && !f.path.includes("/data/e2e"));
  const [qualityProfiles, metadataProfiles] = await Promise.all([client.getQualityProfiles(), client.getMetadataProfiles()]);
  return folders.map((folder) => {
    const quality_profile = qualityProfiles.find((p) => p.id === folder.defaultQualityProfileId)?.name;
    const metadata_profile = metadataProfiles.find((p) => p.id === folder.defaultMetadataProfileId)?.name;
    if (!quality_profile || !metadata_profile) {
      throw new Error(`Cannot preserve root folder '${folder.path}': unresolved default profiles`);
    }
    return { path: folder.path, name: folder.name, metadata_profile, quality_profile };
  });
}
