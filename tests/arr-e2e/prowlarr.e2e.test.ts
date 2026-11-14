import { afterAll, beforeAll, describe, expect, onTestFinished, test } from "vitest";
import { randomUUID } from "node:crypto";
import { E2E_API_KEY, prowlarrConnection } from "./config";
import {
  assertDiffUpToDate,
  assertNoErrorLogs,
  assertPipelineSucceeded,
  blackholeFromSchema,
  cleanupProwlarrE2e,
  createProwlarrClient,
  findNamed,
  nonE2eNames,
  syncConfig,
  waitUntil,
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

/** Schema field from issue #561: UNIT3D definitions spell this checkbox in snake_case. */
const SNAKE_SCHEMA_FIELD = "single_file_release_use_filename";

function definitionWithSnakeField(
  schema: Array<{
    definitionName?: string | null;
    name?: string | null;
    fields?: Array<{ name?: string | null; type?: string | null }> | null;
  }>,
): string | undefined {
  const match = schema.find((item) => item.fields?.some((field) => field.name === SNAKE_SCHEMA_FIELD && field.type === "checkbox"));
  return match?.definitionName ?? match?.name ?? undefined;
}

function snakeFieldYaml(opts: {
  definition: string;
  fields?: Record<string, unknown>;
  deleteUnmanaged?: boolean;
  ignoreIndexers?: string[];
}): Record<string, unknown> {
  const indexers = opts.deleteUnmanaged
    ? { data: [], delete_unmanaged: { enabled: true, ignore: opts.ignoreIndexers ?? [] } }
    : {
        data: [
          {
            name: "e2e-snake",
            definition: opts.definition,
            enable: false,
            priority: 25,
            fields: opts.fields,
          },
        ],
      };
  return { telemetry: false, prowlarr: { e2e: { ...prowlarrConnection(), indexers } } };
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

  test("update_password_on_test_fail writes a Deluge password with other changes and tests it alone", async () => {
    const { base_url: baseUrl, api_key: apiKey } = prowlarrConnection();
    const delugeBaseUrl = process.env.DELUGE_BASE_URL ?? "http://127.0.0.1:18112";
    await waitUntil(async () => {
      try {
        return (await fetch(delugeBaseUrl, { signal: AbortSignal.timeout(3000) })).ok;
      } catch {
        return false;
      }
    }, 60_000);

    const client = createProwlarrClient();
    const schema = (await client.getDownloadClientSchema()).find((item) => item.implementation?.toLowerCase() === "deluge");
    expect(schema?.fields, "Deluge schema").toBeTruthy();
    const name = `e2e-deluge-${randomUUID()}`;
    const apiPath = "/api/v1/downloadclient";
    const query = "forceSave=true";
    const headers = { "X-Api-Key": apiKey, "Content-Type": "application/json" };
    const delugeHost = process.env.DELUGE_E2E_HOST ?? "deluge";
    const delugePassword = process.env.DELUGE_E2E_PASSWORD ?? "deluge";

    const payload = (password: string, priority: number) => ({
      ...schema,
      name,
      enable: false,
      priority,
      fields: schema!.fields!.map((field) => ({
        ...field,
        value:
          field.name === "host"
            ? delugeHost
            : field.name === "port"
              ? 8112
              : field.name === "useSsl"
                ? false
                : field.name === "urlBase"
                  ? ""
                  : field.name === "password"
                    ? password
                    : field.name === "category"
                      ? ""
                      : field.value,
      })),
    });
    const create = async (password: string, priority: number) => {
      const response = await fetch(`${baseUrl}${apiPath}?${query}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload(password, priority)),
      });
      const body = await response.text();
      expect(response.ok, body).toBe(true);
      const created = JSON.parse(body) as { id: number };
      const enabled = await fetch(`${baseUrl}${apiPath}/${created.id}?${query}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ ...JSON.parse(body), enable: true }),
      });
      expect(enabled.ok, await enabled.text()).toBe(true);
      return created.id;
    };

    const id = await create("stale-password", 1);
    onTestFinished(async () => {
      const current = findNamed(await client.getDownloadClients(), name);
      if (current?.id != null) await client.deleteDownloadClient(String(current.id));
    });

    const yaml = (priority: number) => ({
      telemetry: false,
      prowlarr: {
        e2e: {
          ...prowlarrConnection(),
          download_clients: {
            update_password_on_test_fail: true,
            data: [
              {
                name,
                type: schema!.implementation,
                enable: true,
                priority,
                fields: {
                  host: delugeHost,
                  port: 8112,
                  use_ssl: false,
                  url_base: "",
                  password: delugePassword,
                  category: "",
                },
              },
            ],
          },
        },
      },
    });

    const withChange = await syncConfig(yaml(5));
    assertPipelineSucceeded(withChange.result, ["PROWLARR"]);
    expect(withChange.result.stdout).not.toContain("connection test rejected");
    const saved = findNamed(await client.getDownloadClients(), name);
    expect(saved?.priority).toBe(5);
    const tested = await fetch(`${baseUrl}${apiPath}/test`, {
      method: "POST",
      headers,
      body: JSON.stringify(saved),
    });
    expect(tested.ok, await tested.text()).toBe(true);
    const second = await syncConfig(yaml(5), withChange.workspace);
    assertDiffUpToDate(second.result, ["PROWLARR"]);

    // Reseed the stale password at the same priority so only the password can differ.
    const current = findNamed(await client.getDownloadClients(), name);
    expect(current).toBeDefined();
    const reseed = {
      ...current!,
      fields: current!.fields?.map((field) => (field.name === "password" ? { ...field, value: "stale-password" } : field)),
    };
    const reseeded = await fetch(`${baseUrl}${apiPath}/${id}?${query}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(reseed),
    });
    expect(reseeded.ok, await reseeded.text()).toBe(true);

    const passwordOnly = await syncConfig(yaml(5), withChange.workspace);
    assertPipelineSucceeded(passwordOnly.result, ["PROWLARR"]);
    expect(passwordOnly.result.stdout).toContain("connection test rejected the stored secret");
    const fixed = findNamed(await client.getDownloadClients(), name);
    const retested = await fetch(`${baseUrl}${apiPath}/test`, {
      method: "POST",
      headers,
      body: JSON.stringify(fixed),
    });
    expect(retested.ok, await retested.text()).toBe(true);
    const final = await syncConfig(yaml(5), passwordOnly.workspace);
    assertDiffUpToDate(final.result, ["PROWLARR"]);
  });

  test("update_password_on_test_fail clears and preserves an empty Deluge password", async () => {
    const { base_url: baseUrl, api_key: apiKey } = prowlarrConnection();
    const delugeBaseUrl = process.env.DELUGE_EMPTY_BASE_URL ?? "http://127.0.0.1:18113";
    await waitUntil(async () => {
      try {
        return (await fetch(delugeBaseUrl, { signal: AbortSignal.timeout(3000) })).ok;
      } catch {
        return false;
      }
    }, 60_000);

    const client = createProwlarrClient();
    const schema = (await client.getDownloadClientSchema()).find((item) => item.implementation?.toLowerCase() === "deluge");
    expect(schema?.fields, "Deluge schema").toBeTruthy();
    const name = `e2e-deluge-empty-${randomUUID()}`;
    const apiPath = "/api/v1/downloadclient";
    const query = "forceSave=true";
    const headers = { "X-Api-Key": apiKey, "Content-Type": "application/json" };
    const delugeHost = process.env.DELUGE_EMPTY_E2E_HOST ?? "deluge-empty";

    const payload = (password: string) => ({
      ...schema,
      name,
      enable: false,
      priority: 1,
      fields: schema!.fields!.map((field) => ({
        ...field,
        value:
          field.name === "host"
            ? delugeHost
            : field.name === "port"
              ? 8112
              : field.name === "useSsl"
                ? false
                : field.name === "urlBase"
                  ? ""
                  : field.name === "password"
                    ? password
                    : field.name === "category"
                      ? ""
                      : field.value,
      })),
    });
    const create = async (password: string) => {
      const response = await fetch(`${baseUrl}${apiPath}?${query}`, { method: "POST", headers, body: JSON.stringify(payload(password)) });
      const body = await response.text();
      expect(response.ok, body).toBe(true);
      const created = JSON.parse(body) as { id: number };
      const enabled = await fetch(`${baseUrl}${apiPath}/${created.id}?${query}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ ...JSON.parse(body), enable: true }),
      });
      expect(enabled.ok, await enabled.text()).toBe(true);
      return created.id;
    };

    const id = await create("stale-password");
    onTestFinished(async () => {
      const current = findNamed(await client.getDownloadClients(), name);
      if (current?.id != null) await client.deleteDownloadClient(String(current.id));
    });

    const yaml = (password: string) => ({
      telemetry: false,
      prowlarr: {
        e2e: {
          ...prowlarrConnection(),
          download_clients: {
            update_password_on_test_fail: true,
            data: [
              {
                name,
                type: schema!.implementation,
                enable: true,
                priority: 1,
                fields: { host: delugeHost, port: 8112, use_ssl: false, url_base: "", password, category: "" },
              },
            ],
          },
        },
      },
    });

    const cleared = await syncConfig(yaml(""));
    assertPipelineSucceeded(cleared.result, ["PROWLARR"]);
    expect(cleared.result.stdout).toContain("connection test rejected the stored secret");
    const saved = findNamed(await client.getDownloadClients(), name);
    expect(saved?.fields?.find((field) => field.name === "password")?.value).toBe("");
    const tested = await fetch(`${baseUrl}${apiPath}/test`, {
      method: "POST",
      headers,
      body: JSON.stringify(saved),
    });
    expect(tested.ok, await tested.text()).toBe(true);
    const second = await syncConfig(yaml(""), cleared.workspace);
    assertDiffUpToDate(second.result, ["PROWLARR"]);

    // Reseed the empty password and configure a non-empty one: the stored empty value works,
    // so the test passes and the configured value is not written.
    const current = findNamed(await client.getDownloadClients(), name);
    expect(current).toBeDefined();
    const reseed = {
      ...current!,
      fields: current!.fields?.map((field) => (field.name === "password" ? { ...field, value: "" } : field)),
    };
    const reseeded = await fetch(`${baseUrl}${apiPath}/${id}?${query}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(reseed),
    });
    expect(reseeded.ok, await reseeded.text()).toBe(true);

    const kept = await syncConfig(yaml("ignored-non-empty"), cleared.workspace);
    assertPipelineSucceeded(kept.result, ["PROWLARR"]);
    expect(kept.result.stdout).not.toContain("connection test rejected");
    expect(findNamed(await client.getDownloadClients(), name)?.fields?.find((field) => field.name === "password")?.value).toBe("");
    const final = await syncConfig(yaml("ignored-non-empty"), kept.workspace);
    assertDiffUpToDate(final.result, ["PROWLARR"]);
  });

  test("snake_case schema fields accept snake_case and camelCase config keys", async () => {
    const client = createProwlarrClient();
    const definition = definitionWithSnakeField(await client.getIndexerSchema());
    expect(definition, `schema checkbox ${SNAKE_SCHEMA_FIELD}`).toBeTruthy();

    const ignoreIndexers = nonE2eNames(await client.getIndexers());
    const snakeFields = { [SNAKE_SCHEMA_FIELD]: false };
    const camelFields = { singleFileReleaseUseFilename: true };

    const created = await syncConfig(snakeFieldYaml({ definition: definition!, fields: snakeFields }));
    assertPipelineSucceeded(created.result, ["PROWLARR"]);
    assertNoErrorLogs(created.result);
    expect(fieldValue(findNamed(await client.getIndexers(), "e2e-snake"), SNAKE_SCHEMA_FIELD)).toBe(false);

    const second = await syncConfig(snakeFieldYaml({ definition: definition!, fields: snakeFields }), created.workspace);
    assertPipelineSucceeded(second.result, ["PROWLARR"]);
    assertDiffUpToDate(second.result, ["PROWLARR"]);
    expect(`${second.result.stdout}\n${second.result.stderr}`).not.toContain("does not exist on server");

    const updated = await syncConfig(snakeFieldYaml({ definition: definition!, fields: camelFields }), created.workspace);
    assertPipelineSucceeded(updated.result, ["PROWLARR"]);
    assertNoErrorLogs(updated.result);
    expect(fieldValue(findNamed(await client.getIndexers(), "e2e-snake"), SNAKE_SCHEMA_FIELD)).toBe(true);

    const unchanged = await syncConfig(snakeFieldYaml({ definition: definition!, fields: camelFields }), created.workspace);
    assertPipelineSucceeded(unchanged.result, ["PROWLARR"]);
    assertDiffUpToDate(unchanged.result, ["PROWLARR"]);

    const deleted = await syncConfig(snakeFieldYaml({ definition: definition!, deleteUnmanaged: true, ignoreIndexers }), created.workspace);
    assertPipelineSucceeded(deleted.result, ["PROWLARR"]);
    expect(findNamed(await client.getIndexers(), "e2e-snake")).toBeUndefined();
  }, 300_000);

  test("indexer_config is rejected on Prowlarr", async () => {
    const conn = prowlarrConnection();
    const config = {
      prowlarr: {
        e2e: {
          ...conn,
          indexer_config: { rss_sync_interval: 60 },
        },
      },
    };
    const { result } = await syncConfig(config);
    expect(result.exitCode).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain("indexer_config is not supported on Prowlarr");
  });

  test("notification connections", async () => {
    const client = createProwlarrClient();
    const conn = prowlarrConnection();
    const preexisting = nonE2eNames(await client.getNotifications());
    const yaml = (includeNotif: boolean, onHealthIssue = false, includeHealthWarnings = false, listHealthEvent = true) => ({
      prowlarr: {
        e2e: {
          ...conn,
          notifications: {
            data: includeNotif
              ? [
                  {
                    name: "e2e-notification",
                    type: "CustomScript",
                    events: listHealthEvent ? { on_grab: true, on_health_issue: onHealthIssue } : { on_grab: true },
                    include_health_warnings: includeHealthWarnings,
                    fields: { path: "/data/e2e/e2e-notification.sh" },
                    tags: ["e2e-notif-tag"],
                  },
                ]
              : [],
            delete_unmanaged: { enabled: true, ignore: preexisting },
          },
        },
      },
    });

    const created = await syncConfig(yaml(true, false, false));
    assertPipelineSucceeded(created.result, ["PROWLARR"]);
    let notif = findNamed(await client.getNotifications(), "e2e-notification");
    expect(notif, "e2e-notification did not persist").toBeTruthy();
    expect(notif?.onGrab).toBe(true);
    expect(notif?.onHealthIssue).toBe(false);
    expect(notif?.includeHealthWarnings).toBe(false);
    const pathField = notif?.fields?.find((f: { name?: string | null }) => f.name === "path");
    expect(pathField?.value).toBe("/data/e2e/e2e-notification.sh");
    const tag = (await client.getTags()).find((item) => item.label === "e2e-notif-tag");
    expect(tag?.id).toBeTruthy();
    expect(notif?.tags).toContain(tag?.id);

    const updated = await syncConfig(yaml(true, true, true), created.workspace);
    assertPipelineSucceeded(updated.result, ["PROWLARR"]);
    notif = findNamed(await client.getNotifications(), "e2e-notification");
    expect(notif?.onGrab).toBe(true);
    expect(notif?.onHealthIssue).toBe(true);
    expect(notif?.includeHealthWarnings).toBe(true);

    const omitted = await syncConfig(yaml(true, true, true, false), created.workspace);
    assertPipelineSucceeded(omitted.result, ["PROWLARR"]);
    notif = findNamed(await client.getNotifications(), "e2e-notification");
    expect(notif?.onGrab).toBe(true);
    expect(notif?.onHealthIssue).toBe(true);
    expect(notif?.includeHealthWarnings).toBe(true);

    const second = await syncConfig(yaml(true, true, true, false), created.workspace);
    assertPipelineSucceeded(second.result, ["PROWLARR"]);
    assertDiffUpToDate(second.result, ["PROWLARR"]);

    const deleted = await syncConfig(yaml(false, false, false), created.workspace);
    assertPipelineSucceeded(deleted.result, ["PROWLARR"]);
    expect(findNamed(await client.getNotifications(), "e2e-notification")).toBeUndefined();
  });
});
