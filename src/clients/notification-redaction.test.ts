import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "../logger";
import { LidarrClient } from "./lidarr-client";
import { ProwlarrClient } from "./prowlarr-client";
import { RadarrClient } from "./radarr-client";
import { ReadarrClient } from "./readarr-client";
import { SonarrClient } from "./sonarr-client";
import { WhisparrClient } from "./whisparr-client";

const SECRET_URL = "https://user:s3cr3t-pass@hooks.example.test/path-token-abc123";

const clients = [
  ["sonarr", (url: string) => new SonarrClient(url, "api-key")],
  ["radarr", (url: string) => new RadarrClient(url, "api-key")],
  ["lidarr", (url: string) => new LidarrClient(url, "api-key")],
  ["readarr", (url: string) => new ReadarrClient(url, "api-key")],
  ["whisparr", (url: string) => new WhisparrClient(url, "api-key")],
  ["prowlarr", (url: string) => new ProwlarrClient(url, "api-key")],
] as const;

const stubFailingNotificationWrites = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const url = new URL(request.url);
      if (url.pathname === "/api") {
        return Response.json({ current: "v3", deprecated: [] });
      }
      if (/^\/api\/v\d\/notification(\/\d+)?$/.test(url.pathname) && ["POST", "PUT"].includes(request.method)) {
        return Response.json([{ propertyName: "Url", errorMessage: `Unable to send test message to ${SECRET_URL}` }], { status: 400 });
      }
      throw new Error(`Unexpected request ${request.method} ${url.pathname}`);
    }),
  );
};

const captureLogs = () => {
  const lines: string[] = [];
  for (const level of ["trace", "debug", "info", "warn", "error", "fatal"] as const) {
    vi.spyOn(logger, level).mockImplementation(((...args: unknown[]) => {
      lines.push(args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" "));
    }) as never);
  }
  return lines;
};

describe("notification writes do not expose response details", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each(clients)("%s create and update keep the failure body out of logs and errors", async (_name, create) => {
    stubFailingNotificationWrites();
    const logs = captureLogs();
    const client = create("http://arr.test");
    const notification = { name: "hook", implementation: "Webhook", fields: [{ name: "url", value: SECRET_URL }] };

    const createError = await client.createNotification(notification as never).catch((error: Error) => error);
    const updateError = await client.updateNotification("1", { ...notification, id: 1 } as never).catch((error: Error) => error);

    for (const error of [createError, updateError]) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("HTTP 400");
      expect((error as Error).message).not.toContain("s3cr3t-pass");
      expect((error as Error).message).not.toContain("path-token-abc123");
    }
    expect(logs.join("\n")).not.toContain("s3cr3t-pass");
    expect(logs.join("\n")).not.toContain("path-token-abc123");
  });
});
