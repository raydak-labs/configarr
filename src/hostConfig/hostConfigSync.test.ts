import { afterEach, describe, expect, test, vi } from "vitest";
import { RadarrClient } from "../clients/radarr-client";
import { SonarrClient } from "../clients/sonarr-client";
import { initEnvs } from "../env";
import { logger } from "../logger";
import { syncHostConfig } from "./hostConfigSync";
import { RadarrHostConfigSync } from "./hostConfigRadarr";
import { SonarrHostConfigSync } from "./hostConfigSonarr";

describe("host settings synchronization", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    initEnvs();
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
});
