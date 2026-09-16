import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { E2E_API_KEY, prowlarrConnection } from "./config";
import {
  assertDiffUpToDate,
  assertPipelineSucceeded,
  blackholeFromSchema,
  cleanupProwlarrE2e,
  createProwlarrClient,
  findNamed,
  syncConfig,
} from "./helpers";

function fieldValue(resource: { fields?: Array<{ name?: string | null; value?: unknown }> | null } | undefined, name: string): unknown {
  return resource?.fields?.find((f) => f.name === name)?.value;
}

function prowlarrYaml(opts: {
  minSeeders?: number;
  syncLevel?: "addOnly" | "fullSync";
  proxyTimeout?: number;
  indexerPriority?: number;
  dcPriority?: number;
  deleteUnmanaged?: boolean;
  ignoreTags?: string[];
  ignoreApps?: string[];
  ignoreProfiles?: string[];
  ignoreProxies?: string[];
  ignoreIndexers?: string[];
  ignoreDownloadClients?: string[];
  downloadClient?: Record<string, unknown>;
}): Record<string, unknown> {
  const conn = prowlarrConnection();
  const empty = !!opts.deleteUnmanaged;
  const instance: Record<string, unknown> = {
    ...conn,
    tags: empty ? [] : ["e2e-tag"],
    sync_profiles: {
      data: empty
        ? []
        : [
            {
              name: "e2e-sync",
              enable_rss: true,
              enable_automatic_search: false,
              enable_interactive_search: true,
              minimum_seeders: opts.minSeeders ?? 2,
            },
          ],
      ...(opts.deleteUnmanaged ? { delete_unmanaged: { enabled: true, ignore: ["Standard", ...(opts.ignoreProfiles ?? [])] } } : {}),
    },
    indexer_proxies: {
      data: empty
        ? []
        : [
            {
              name: "e2e-flaresolverr",
              type: "FlareSolverr",
              fields: {
                host: "http://flaresolverr:8191/",
                requestTimeout: opts.proxyTimeout ?? 60,
              },
              tags: ["e2e-tag"],
            },
          ],
      ...(opts.deleteUnmanaged ? { delete_unmanaged: { enabled: true, ignore: opts.ignoreProxies ?? [] } } : {}),
    },
    indexers: {
      data: empty
        ? []
        : [
            {
              name: "e2e-tpb",
              definition: "The Pirate Bay",
              enable: false,
              sync_profile: "e2e-sync",
              priority: opts.indexerPriority ?? 25,
              tags: ["e2e-tag"],
            },
          ],
      ...(opts.deleteUnmanaged ? { delete_unmanaged: { enabled: true, ignore: opts.ignoreIndexers ?? [] } } : {}),
    },
    applications: {
      data: empty
        ? []
        : [
            {
              name: "e2e-sonarr",
              type: "Sonarr",
              sync_level: opts.syncLevel ?? "addOnly",
              fields: {
                prowlarrUrl: "http://prowlarr:9696",
                baseUrl: "http://sonarr:8989",
                apiKey: E2E_API_KEY,
              },
            },
            {
              name: "e2e-radarr",
              type: "Radarr",
              sync_level: opts.syncLevel ?? "addOnly",
              fields: {
                prowlarrUrl: "http://prowlarr:9696",
                baseUrl: "http://radarr:7878",
                apiKey: E2E_API_KEY,
              },
            },
          ],
      sync_indexers: false,
      ...(opts.deleteUnmanaged ? { delete_unmanaged: { enabled: true, ignore: opts.ignoreApps ?? [] } } : {}),
    },
  };
  if (opts.deleteUnmanaged) {
    instance.delete_unmanaged_tags = { enabled: true, ignore: opts.ignoreTags ?? [] };
    instance.download_clients = { data: [], delete_unmanaged: { enabled: true, ignore: opts.ignoreDownloadClients ?? [] } };
  } else if (opts.downloadClient) {
    instance.download_clients = {
      data: [{ ...opts.downloadClient, enable: false, priority: opts.dcPriority ?? 20 }],
    };
  }
  return { telemetry: false, prowlarr: { e2e: instance } };
}

describe("prowlarr (live)", () => {
  beforeAll(async () => {
    await cleanupProwlarrE2e(createProwlarrClient());
  }, 180_000);

  afterAll(async () => {
    await cleanupProwlarrE2e(createProwlarrClient());
  });

  test("tags, sync profiles, flaresolverr, indexer, applications create/update/delete/idempotent", async () => {
    const client = createProwlarrClient();
    const ignoreTags = (await client.getTags()).map((t) => t.label).filter((n): n is string => !!n && n !== "e2e-tag");
    const ignoreApps = (await client.getApplications()).map((a) => a.name).filter((n): n is string => !!n);
    const ignoreProfiles = (await client.getAppProfiles()).map((p) => p.name).filter((n): n is string => !!n && n !== "e2e-sync");
    const ignoreProxies = (await client.getIndexerProxies()).map((p) => p.name).filter((n): n is string => !!n);
    const ignoreIndexers = (await client.getIndexers()).map((i) => i.name).filter((n): n is string => !!n);
    const ignoreDownloadClients = (await client.getDownloadClients()).map((d) => d.name).filter((n): n is string => !!n);

    const dcSchema = blackholeFromSchema(await client.getDownloadClientSchema());
    expect(dcSchema, "Prowlarr TorrentBlackhole/UsenetBlackhole schema").toBeTruthy();
    const downloadClient: Record<string, unknown> = {
      name: "e2e-blackhole",
      type: dcSchema!.type,
      fields: dcSchema!.fields,
    };

    const first = await syncConfig(prowlarrYaml({ downloadClient }));
    assertPipelineSucceeded(first.result, ["PROWLARR"]);

    expect((await client.getTags()).some((t) => t.label === "e2e-tag")).toBe(true);
    expect(findNamed(await client.getAppProfiles(), "e2e-sync")?.minimumSeeders).toBe(2);
    expect(findNamed(await client.getApplications(), "e2e-sonarr")).toBeTruthy();
    expect(findNamed(await client.getApplications(), "e2e-radarr")).toBeTruthy();
    expect(findNamed(await client.getAppProfiles(), "Standard")).toBeTruthy();

    const proxy = findNamed(await client.getIndexerProxies(), "e2e-flaresolverr");
    expect(proxy).toBeTruthy();
    expect(String(fieldValue(proxy, "host"))).toContain("flaresolverr");

    const indexer = findNamed(await client.getIndexers(), "e2e-tpb");
    expect(indexer?.enable).toBe(false);
    expect(indexer?.priority).toBe(25);

    const dc = findNamed(await client.getDownloadClients(), "e2e-blackhole");
    expect(dc?.enable).toBe(false);
    expect(dc?.priority).toBe(20);

    const second = await syncConfig(prowlarrYaml({ downloadClient }), first.workspace);
    assertPipelineSucceeded(second.result, ["PROWLARR"]);
    assertDiffUpToDate(second.result, ["PROWLARR"]);

    const updated = await syncConfig(
      prowlarrYaml({
        minSeeders: 5,
        syncLevel: "fullSync",
        proxyTimeout: 90,
        indexerPriority: 40,
        dcPriority: 5,
        downloadClient,
      }),
      first.workspace,
    );
    assertPipelineSucceeded(updated.result, ["PROWLARR"]);
    expect(findNamed(await client.getAppProfiles(), "e2e-sync")?.minimumSeeders).toBe(5);
    expect(String(findNamed(await client.getApplications(), "e2e-sonarr")?.syncLevel)).toBe("fullSync");
    expect(fieldValue(findNamed(await client.getIndexerProxies(), "e2e-flaresolverr"), "requestTimeout")).toBe(90);
    expect(findNamed(await client.getIndexers(), "e2e-tpb")?.enable).toBe(false);
    expect(findNamed(await client.getIndexers(), "e2e-tpb")?.priority).toBe(40);
    expect(findNamed(await client.getDownloadClients(), "e2e-blackhole")?.enable).toBe(false);
    expect(findNamed(await client.getDownloadClients(), "e2e-blackhole")?.priority).toBe(5);

    const deleted = await syncConfig(
      prowlarrYaml({
        deleteUnmanaged: true,
        ignoreTags,
        ignoreApps,
        ignoreProfiles: [...new Set(["Standard", ...ignoreProfiles])],
        ignoreProxies,
        ignoreIndexers,
        ignoreDownloadClients,
      }),
      first.workspace,
    );
    assertPipelineSucceeded(deleted.result, ["PROWLARR"]);
    expect((await client.getTags()).some((t) => t.label === "e2e-tag")).toBe(false);
    expect(findNamed(await client.getApplications(), "e2e-sonarr")).toBeUndefined();
    expect(findNamed(await client.getApplications(), "e2e-radarr")).toBeUndefined();
    expect(findNamed(await client.getIndexerProxies(), "e2e-flaresolverr")).toBeUndefined();
    expect(findNamed(await client.getIndexers(), "e2e-tpb")).toBeUndefined();
    expect(findNamed(await client.getDownloadClients(), "e2e-blackhole")).toBeUndefined();
    expect(findNamed(await client.getAppProfiles(), "e2e-sync")).toBeUndefined();
    expect(findNamed(await client.getAppProfiles(), "Standard")).toBeTruthy();
  }, 600_000);
});
