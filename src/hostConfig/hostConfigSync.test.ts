import { afterEach, describe, expect, test, vi } from "vitest";
import { LidarrClient } from "../clients/lidarr-client";
import { ProwlarrClient } from "../clients/prowlarr-client";
import { RadarrClient } from "../clients/radarr-client";
import { ReadarrClient } from "../clients/readarr-client";
import { SonarrClient } from "../clients/sonarr-client";
import { WhisparrClient } from "../clients/whisparr-client";
import { initEnvs } from "../env";
import { logger } from "../logger";
import { RadarrHostConfigSync } from "./hostConfigRadarr";
import { SonarrHostConfigSync } from "./hostConfigSonarr";
import type { HostClient, HostConfig, HostResource } from "./hostConfigSync";
import { BackupHostConfigSync, syncHostConfig } from "./hostConfigSync";
import { WhisparrHostConfigSync } from "./hostConfigWhisparr";

type StoredHostSettings = Record<string, unknown>;

function stubHostApi(initial: StoredHostSettings, apiVersion?: "v3" | "v5") {
  let stored = { ...initial };
  const requests: string[] = [];
  const writes: StoredHostSettings[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const path = new URL(request.url).pathname;
      requests.push(`${request.method} ${path}`);
      if (path === "/api") return Response.json({ current: apiVersion ?? "v3" });
      if (request.method === "PUT") {
        const body = (await request.json()) as StoredHostSettings;
        writes.push(body);
        stored = { ...stored, ...body };
        return Response.json({ id: 1 }, { status: 202 });
      }
      return Response.json(stored);
    }),
  );
  return { requests, writes, stored: () => stored };
}

describe("host settings synchronization", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    initEnvs();
  });

  test("rejects settings for the wrong application and unsupported Whisparr versions", () => {
    const radarr = new RadarrHostConfigSync(new RadarrClient("http://radarr.test", "key"));
    const sonarr = new SonarrHostConfigSync(new SonarrClient("http://sonarr.test", "key"));
    const whisparr = new WhisparrHostConfigSync(new WhisparrClient("http://whisparr.test", "key"));
    expect(() => radarr.validate({ whisparrAutoMatchOnDate: true }, "7.0.0")).toThrow("Whisparr host settings");
    expect(() => sonarr.validate({ whisparrCorruptFileDetection: true }, "5.0.0")).toThrow("Whisparr host settings");
    expect(() => whisparr.validate({ whisparrAutoMatchOnDate: true }, "2.0.0")).toThrow("requires Whisparr v3");
    expect(() => whisparr.validate({ authenticationMethod: "none" }, "3.0.0")).toThrow("Unsupported Whisparr host_config fields");
  });

  test("rejects a Whisparr host setting that the server does not expose", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ id: 1 })),
    );
    const sync = new WhisparrHostConfigSync(new WhisparrClient("http://whisparr.test", "key"));
    await expect(sync.sync({ whisparrAutoMatchOnDate: false })).rejects.toThrow("does not expose host setting");
  });

  test("checks Whisparr host settings were persisted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ id: 1, whisparrAutoMatchOnDate: true, whisparrCorruptFileDetection: false })),
    );
    const client = new WhisparrClient("http://whisparr.test", "key");
    await expect(
      client.updateHostConfig("1", { id: 1, whisparrAutoMatchOnDate: false, whisparrCorruptFileDetection: false }),
    ).rejects.toThrow("did not persist");
  });

  test("reports Whisparr field changes while preserving omitted values", async () => {
    let stored = { id: 1, whisparrAutoMatchOnDate: true, whisparrCorruptFileDetection: false, logLevel: "info" };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        if (request.method === "PUT") stored = await request.json();
        return Response.json(stored);
      }),
    );
    const sync = new WhisparrHostConfigSync(new WhisparrClient("http://whisparr.test", "key"));
    const diff = await sync.sync({ whisparrAutoMatchOnDate: false });
    expect(diff[0]?.fieldChanges).toEqual([{ field: "whisparrAutoMatchOnDate", from: true, to: false }]);
    expect(stored).toMatchObject({ whisparrAutoMatchOnDate: false, whisparrCorruptFileDetection: false, logLevel: "info" });
  });

  test("sets an initially empty OIDC secret without disclosing it in the diff", async () => {
    let stored = { id: 1, oidcClientSecret: "", oidcScopes: "openid", allowedHosts: "localhost" };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        if (request.method === "PUT") {
          stored = { ...stored, ...(await request.json()) };
          return Response.json({ id: 1 }, { status: 202 });
        }
        return Response.json(stored);
      }),
    );
    const client = new RadarrClient("http://radarr.test", "key");
    const report = await syncHostConfig(client, { oidcClientSecret: "new-secret-value" });
    expect(stored.oidcClientSecret).toBe("new-secret-value");
    expect(stored.allowedHosts).toBe("localhost");
    expect(JSON.stringify(report)).not.toContain("new-secret-value");
  });

  test("preserves masked secrets unless rotation is explicitly requested", async () => {
    let writes = 0;
    let submitted = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        if (request.method === "PUT") {
          writes++;
          submitted = (await request.json()).oidcClientSecret;
          return Response.json({ id: 1 }, { status: 202 });
        }
        return Response.json({ id: 1, oidcClientSecret: "********", oidcScopes: "openid" });
      }),
    );
    const client = new RadarrClient("http://radarr.test", "key");
    expect(await syncHostConfig(client, { oidcClientSecret: "rotate-to-this" })).toEqual([]);
    expect(writes).toBe(0);
    const report = await syncHostConfig(client, { oidcClientSecret: "rotate-to-this" }, true);
    expect(writes).toBe(1);
    expect(submitted).toBe("rotate-to-this");
    expect(JSON.stringify(report)).not.toContain("rotate-to-this");
  });

  test("dry run reports a redacted secret change without writing", async () => {
    vi.stubEnv("DRY_RUN", "true");
    initEnvs();
    let writes = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        if (request.method === "PUT") writes++;
        return Response.json({ id: 1, oidcClientSecret: "" });
      }),
    );
    const client = new RadarrClient("http://radarr.test", "key");
    const report = await syncHostConfig(client, { oidcClientSecret: "dry-secret" });
    expect(report).toHaveLength(1);
    expect(JSON.stringify(report)).not.toContain("dry-secret");
    expect(writes).toBe(0);
  });

  test("maps configured authentication and PEM settings while preserving other fields", async () => {
    let stored = {
      id: 1,
      authenticationMethod: "external",
      authenticationRequired: "enabled",
      oidcClientSecret: "********",
      allowedHosts: "localhost",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        if (request.method === "PUT") {
          stored = { ...stored, ...(await request.json()) };
          return Response.json({ id: 1 }, { status: 202 });
        }
        return Response.json(stored);
      }),
    );
    const client = new RadarrClient("http://radarr.test", "key");
    await new RadarrHostConfigSync(client).sync({
      authenticationMethod: "oidc",
      authenticationRequired: "disabledForLocalhost",
      allowedHosts: "localhost,127.0.0.1",
      oidcAuthority: "https://identity.example.com",
      oidcClientId: "radarr",
      oidcUserIdentifier: "sub",
      oidcScopes: "openid",
      enableSsl: true,
      sslCertPath: "/config/cert.pem",
      sslKeyPath: "/config/key.pem",
    });
    expect(stored).toMatchObject({
      authenticationMethod: "oidc",
      authenticationRequired: "disabledForLocalhost",
      allowedHosts: "localhost,127.0.0.1",
      oidcAuthority: "https://identity.example.com",
      oidcClientId: "radarr",
      oidcUserIdentifier: "sub",
      oidcScopes: "openid",
      enableSsl: true,
      sslCertPath: "/config/cert.pem",
      sslKeyPath: "/config/key.pem",
      oidcClientSecret: "********",
    });
  });

  test("keeps the masked secret when another field changes", async () => {
    let submitted: Record<string, unknown> = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        if (request.method === "PUT") {
          submitted = await request.json();
          return Response.json({ id: 1 }, { status: 202 });
        }
        return Response.json({ id: 1, oidcClientSecret: "********", oidcScopes: "openid" });
      }),
    );
    const client = new RadarrClient("http://radarr.test", "key");
    const report = await syncHostConfig(client, { oidcScopes: "openid profile", oidcClientSecret: "private-new-secret" });
    expect(submitted.oidcClientSecret).toBe("********");
    expect(submitted.oidcScopes).toBe("openid profile");
    expect(JSON.stringify(report)).not.toContain("private-new-secret");
  });

  test("uses Sonarr v5 General settings for authentication changes", async () => {
    const requests: string[] = [];
    let submitted: Record<string, unknown> = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const path = new URL(request.url).pathname;
        requests.push(`${request.method} ${path}`);
        if (path === "/api") return Response.json({ current: "v5" });
        if (request.method === "PUT") {
          submitted = await request.json();
          return Response.json({ id: 1 }, { status: 202 });
        }
        return Response.json({ id: 1, authenticationRequired: "enabled", oidcClientSecret: "********" });
      }),
    );
    const client = new SonarrClient("http://sonarr.test", "key");
    await new SonarrHostConfigSync(client).sync({ authenticationRequired: "disabledForLocalhost" });
    expect(submitted.authenticationRequired).toBe("disabledForLocalhost");
    expect(submitted.oidcClientSecret).toBe("********");
    expect(requests).toEqual(["GET /api", "GET /api/v5/settings/general", "PUT /api/v5/settings/general/1"]);
  });

  test("does not disclose secrets echoed in a server validation error", async () => {
    const log = vi.spyOn(logger, "error");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        if (request.method === "PUT") return Response.json([{ errorMessage: "rejected secret leaked-value" }], { status: 400 });
        return Response.json({ id: 1, oidcClientSecret: "" });
      }),
    );
    const client = new RadarrClient("http://radarr.test", "key");
    await expect(new RadarrHostConfigSync(client).sync({ oidcClientSecret: "leaked-value" })).rejects.not.toThrow("leaked-value");
    expect(JSON.stringify(log.mock.calls)).not.toContain("leaked-value");
  });

  test("does not disclose a secret returned in a failed host settings read", async () => {
    const log = vi.spyOn(logger, "error");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json([{ errorMessage: "server secret read-secret" }], { status: 500 })),
    );
    const client = new RadarrClient("http://radarr.test", "key");
    await expect(new RadarrHostConfigSync(client).sync({ oidcScopes: "openid" })).rejects.not.toThrow("read-secret");
    expect(JSON.stringify(log.mock.calls)).not.toContain("read-secret");
  });

  test("accepts the backup policy on every app, including versions without the authentication API", () => {
    const backup: HostConfig = { backup_folder: "Backups", backup_interval: 7, backup_retention: 28 };
    const apps = [
      { label: "Lidarr", create: () => new LidarrClient("http://lidarr.test", "key") },
      { label: "Readarr", create: () => new ReadarrClient("http://readarr.test", "key") },
      { label: "Prowlarr", create: () => new ProwlarrClient("http://prowlarr.test", "key") },
    ];
    for (const app of apps) {
      const sync = new BackupHostConfigSync<HostResource>(app.create(), app.label);
      expect(() => sync.validate(backup, "0.1.0.0")).not.toThrow();
    }
    expect(() => new RadarrHostConfigSync(new RadarrClient("http://radarr.test", "key")).validate(backup, "5.14.0")).not.toThrow();
    expect(() => new SonarrHostConfigSync(new SonarrClient("http://sonarr.test", "key")).validate(backup, "4.0.14")).not.toThrow();
    expect(() => new WhisparrHostConfigSync(new WhisparrClient("http://whisparr.test", "key")).validate(backup, "3.0.0")).not.toThrow();
  });

  test("rejects authentication settings on apps without an authentication host API", () => {
    const lidarr = new BackupHostConfigSync<HostResource>(new LidarrClient("http://lidarr.test", "key"), "Lidarr");
    expect(() => lidarr.validate({ oidcScopes: "openid" }, "3.0.0")).toThrow("Lidarr host_config supports only");
    expect(() => lidarr.validate({ authenticationMethod: "none", backup_interval: 7 }, "3.0.0")).toThrow(
      "Lidarr host_config supports only",
    );
  });

  test("keeps the authentication version gate for Radarr and Sonarr", () => {
    const radarr = new RadarrHostConfigSync(new RadarrClient("http://radarr.test", "key"));
    const sonarr = new SonarrHostConfigSync(new SonarrClient("http://sonarr.test", "key"));
    expect(() => radarr.validate({ oidcScopes: "openid" }, "6.0.0")).toThrow("host_config requires Radarr v7 or Sonarr v5");
    expect(() => sonarr.validate({ oidcScopes: "openid" }, "4.0.14")).toThrow("host_config requires Radarr v7 or Sonarr v5");
    expect(() => radarr.validate({ oidcScopes: "openid" }, "7.0.0")).not.toThrow();
    expect(() => sonarr.validate({ oidcScopes: "openid" }, "5.0.0")).not.toThrow();
  });

  test("syncs and re-reads the backup policy on Lidarr, Readarr and Prowlarr", async () => {
    const apps: Array<{ label: string; path: string; create: () => HostClient<HostResource> }> = [
      { label: "Lidarr", path: "/api/v1/config/host", create: () => new LidarrClient("http://lidarr.test", "key") },
      { label: "Readarr", path: "/api/v1/config/host", create: () => new ReadarrClient("http://readarr.test", "key") },
      { label: "Prowlarr", path: "/api/v1/config/host", create: () => new ProwlarrClient("http://prowlarr.test", "key") },
    ];
    for (const app of apps) {
      const api = stubHostApi({ id: 1, backupFolder: "Backups", backupInterval: 7, backupRetention: 28, logLevel: "info" });
      const sync = new BackupHostConfigSync<HostResource>(app.create(), app.label);
      const diff = await sync.sync({ backup_interval: 1, backup_retention: 7 });
      expect(diff[0]?.fieldChanges).toEqual([
        { field: "backupInterval", from: 7, to: 1 },
        { field: "backupRetention", from: 28, to: 7 },
      ]);
      expect(api.requests).toEqual([`GET ${app.path}`, `PUT ${app.path}/1`]);
      expect(api.stored()).toMatchObject({ backupFolder: "Backups", backupInterval: 1, backupRetention: 7, logLevel: "info" });

      const second = await sync.sync({ backup_interval: 1, backup_retention: 7 });
      expect(second).toEqual([]);
      expect(api.writes).toHaveLength(1);
      vi.unstubAllGlobals();
    }
  });

  test("uses the versioned Sonarr host endpoint for backup settings", async () => {
    for (const version of ["v3", "v5"] as const) {
      const api = stubHostApi(
        { id: 1, backupFolder: "Backups", backupInterval: 7, backupRetention: 28, authenticationRequired: "enabled" },
        version,
      );
      const sync = new SonarrHostConfigSync(new SonarrClient("http://sonarr.test", "key"));
      sync.validate({ backup_interval: 1 }, version === "v3" ? "4.0.14" : "5.0.0");
      const diff = await sync.sync({ backup_interval: 1 });
      const hostPath = version === "v3" ? "/api/v3/config/host" : "/api/v5/settings/general";
      expect(api.requests).toEqual(["GET /api", `GET ${hostPath}`, `PUT ${hostPath}/1`]);
      expect(diff[0]?.fieldChanges).toEqual([{ field: "backupInterval", from: 7, to: 1 }]);
      expect(api.stored()).toMatchObject({ backupFolder: "Backups", backupInterval: 1, backupRetention: 28 });
      vi.unstubAllGlobals();
    }
  });

  test("syncs the backup policy on Radarr versions before v7", async () => {
    const api = stubHostApi({ id: 1, backupFolder: "Backups", backupInterval: 7, backupRetention: 28 });
    const sync = new RadarrHostConfigSync(new RadarrClient("http://radarr.test", "key"));
    sync.validate({ backup_retention: 7 }, "6.0.0");
    const diff = await sync.sync({ backup_retention: 7 });
    expect(api.requests).toEqual(["GET /api/v3/config/host", "PUT /api/v3/config/host/1"]);
    expect(diff[0]?.fieldChanges).toEqual([{ field: "backupRetention", from: 28, to: 7 }]);
    expect(api.stored()).toMatchObject({ backupFolder: "Backups", backupInterval: 7, backupRetention: 7 });
  });

  test("syncs the backup policy on Whisparr without touching its own settings", async () => {
    const api = stubHostApi({
      id: 1,
      backupFolder: "Backups",
      backupInterval: 7,
      backupRetention: 28,
      whisparrAutoMatchOnDate: true,
      whisparrCorruptFileDetection: false,
    });
    const sync = new WhisparrHostConfigSync(new WhisparrClient("http://whisparr.test", "key"));
    sync.validate({ backup_interval: 1 }, "3.0.0");
    const diff = await sync.sync({ backup_interval: 1 });
    expect(api.requests).toEqual([
      "GET /api/v3/config/host",
      "GET /api/v3/config/host",
      "PUT /api/v3/config/host/1",
      "GET /api/v3/config/host",
    ]);
    expect(diff[0]?.fieldChanges).toEqual([{ field: "backupInterval", from: 7, to: 1 }]);
    expect(api.stored()).toMatchObject({ whisparrAutoMatchOnDate: true, whisparrCorruptFileDetection: false, backupInterval: 1 });
  });

  test("dry run reports backup changes without writing them", async () => {
    vi.stubEnv("DRY_RUN", "true");
    initEnvs();
    const api = stubHostApi({ id: 1, backupFolder: "Backups", backupInterval: 7, backupRetention: 28 });
    const sync = new BackupHostConfigSync<HostResource>(new LidarrClient("http://lidarr.test", "key"), "Lidarr");
    const report = await sync.sync({ backup_interval: 1 });
    expect(report[0]?.fieldChanges).toEqual([{ field: "backupInterval", from: 7, to: 1 }]);
    expect(api.writes).toHaveLength(0);
  });
});
