import { expect, vi } from "vitest";
import { logger } from "../logger";

const SECRET_URL = "https://user:s3cr3t-pass@hooks.example.test/path-token-abc123";

type NotificationWriter = {
  createNotification(notification: never): Promise<unknown>;
  updateNotification(id: string, notification: never): Promise<unknown>;
};

/** Asserts a failed notification create and update log the status only, not the webhook URL. */
export async function expectNotificationWriteRedacted(client: NotificationWriter): Promise<void> {
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
  const lines: string[] = [];
  for (const level of ["trace", "debug", "info", "warn", "error", "fatal"] as const) {
    if (typeof logger[level] !== "function") continue;
    vi.spyOn(logger, level).mockImplementation(((...args: unknown[]) => {
      lines.push(args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" "));
    }) as never);
  }

  try {
    const notification = { name: "hook", implementation: "Webhook", fields: [{ name: "url", value: SECRET_URL }] };
    const createError = await client.createNotification(notification as never).catch((error: Error) => error);
    const updateError = await client.updateNotification("1", { ...notification, id: 1 } as never).catch((error: Error) => error);

    for (const error of [createError, updateError]) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("HTTP 400");
      expect((error as Error).message).not.toContain("s3cr3t-pass");
      expect((error as Error).message).not.toContain("path-token-abc123");
    }
    expect(lines.join("\n")).not.toContain("s3cr3t-pass");
    expect(lines.join("\n")).not.toContain("path-token-abc123");
  } finally {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  }
}
