import { afterEach, describe, expect, test, vi } from "vitest";
import { ServerCache } from "../cache";
import { initEnvs } from "../env";
import { DiffCollector } from "../diffReport/diffCollector";
import { SECRET_MASK } from "../diffReport/redactSecrets";
import { ConfigValidationError } from "../validation";
import { InputConfigNotificationsSchema } from "../types/config.types";
import { validateNotifications, syncNotifications, type NotificationResourceItem } from "./notifications";
import type { NotificationsClient, TagsClient } from "../clients/capabilities";

describe("notifications", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    initEnvs();
  });

  const webhookSchema: NotificationResourceItem = {
    id: 1,
    name: "Webhook",
    implementation: "Webhook",
    implementationName: "Webhook",
    includeHealthWarnings: false,
    onGrab: false,
    onDownload: false,
    onUpgrade: false,
    supportsOnGrab: true,
    supportsOnDownload: true,
    supportsOnUpgrade: true,
    fields: [
      { name: "url", label: "URL", type: "textbox", privacy: "normal", value: "" },
      { name: "method", label: "Method", type: "select", privacy: "normal", value: 1 },
      { name: "password", label: "Password", type: "textbox", privacy: "password", value: "" },
      { name: "apiKey", label: "API Key", type: "textbox", privacy: "apiKey", value: "" },
      { name: "userName", label: "Username", type: "textbox", privacy: "userName", value: "" },
    ],
  };

  const customScriptSchema: NotificationResourceItem = {
    id: 2,
    name: "CustomScript",
    implementation: "CustomScript",
    implementationName: "Custom Script",
    includeHealthWarnings: false,
    onGrab: false,
    supportsOnGrab: true,
    supportsOnDownload: false,
    fields: [
      { name: "path", label: "Path", type: "textbox", privacy: "normal", value: "" },
      { name: "arguments", label: "Arguments", type: "textbox", privacy: "normal", value: "" },
    ],
  };

  const mockClient = (
    options: {
      schema?: NotificationResourceItem[];
      existing?: NotificationResourceItem[];
      tags?: Array<{ id: number; label: string }>;
    } = {},
  ): NotificationsClient &
    TagsClient & {
      createMock: ReturnType<typeof vi.fn>;
      updateMock: ReturnType<typeof vi.fn>;
      deleteMock: ReturnType<typeof vi.fn>;
      createTagMock: ReturnType<typeof vi.fn>;
    } => {
    const schema = options.schema ?? [webhookSchema, customScriptSchema];
    const existing = options.existing ?? [];
    const tags = options.tags ?? [];

    const createMock = vi.fn().mockImplementation(async (item) => ({ ...item, id: 99 }));
    const updateMock = vi.fn().mockImplementation(async (_id, item) => item);
    const deleteMock = vi.fn().mockResolvedValue(undefined);
    const createTagMock = vi.fn().mockImplementation(async (label) => ({ id: 50, label }));

    return {
      getNotificationSchema: vi.fn().mockResolvedValue(schema),
      getNotifications: vi.fn().mockResolvedValue(existing),
      createNotification: createMock,
      updateNotification: updateMock,
      deleteNotification: deleteMock,
      getTags: vi.fn().mockResolvedValue(tags),
      createTag: createTagMock,
      deleteTag: vi.fn().mockResolvedValue(undefined),
      createMock,
      updateMock,
      deleteMock,
      createTagMock,
    };
  };

  describe("schema validation", () => {
    test("validates valid notifications configuration", () => {
      const parsed = InputConfigNotificationsSchema.safeParse({
        update_password: true,
        delete_unmanaged: { enabled: true, ignore: ["default"] },
        data: [
          {
            name: "my-webhook",
            type: "Webhook",
            events: { on_grab: true, on_upgrade: false },
            include_health_warnings: true,
            fields: { url: "https://example.com/webhook", password: "secret-password" },
            tags: ["ops"],
          },
        ],
      });
      expect(parsed.success).toBe(true);
    });
  });

  describe("preflight validation (validateNotifications)", () => {
    test("refuses duplicate notification names in config", async () => {
      const client = mockClient();
      await expect(
        validateNotifications(client, {
          data: [
            { name: "my-hook", type: "Webhook" },
            { name: "My-Hook", type: "Webhook" },
          ],
        }),
      ).rejects.toThrow(ConfigValidationError);
      await expect(
        validateNotifications(client, {
          data: [
            { name: "my-hook", type: "Webhook" },
            { name: "my-hook", type: "Webhook" },
          ],
        }),
      ).rejects.toThrow("Duplicate notification 'my-hook'");
    });

    test("refuses ambiguous existing server entries with same name", async () => {
      const client = mockClient({
        existing: [
          { id: 10, name: "ops-webhook", implementation: "Webhook" },
          { id: 11, name: "Ops-Webhook", implementation: "Webhook" },
        ],
      });
      await expect(
        validateNotifications(client, {
          data: [{ name: "ops-webhook", type: "Webhook" }],
        }),
      ).rejects.toThrow("Ambiguous notification 'Ops-Webhook'");
    });

    test("refuses unknown notification type", async () => {
      const client = mockClient();
      await expect(
        validateNotifications(client, {
          data: [{ name: "hook", type: "UnknownService" }],
        }),
      ).rejects.toThrow("Unknown notification type 'UnknownService'");
    });

    test("refuses unknown field names", async () => {
      const client = mockClient();
      await expect(
        validateNotifications(client, {
          data: [
            {
              name: "hook",
              type: "Webhook",
              fields: { url: "https://foo", invalidField: "bad" },
            },
          ],
        }),
      ).rejects.toThrow("Notification 'hook': unknown field 'invalidField' for type 'Webhook'");
    });

    test("refuses unsupported events", async () => {
      const client = mockClient();
      await expect(
        validateNotifications(client, {
          data: [
            {
              name: "script",
              type: "CustomScript",
              events: { on_download: true }, // supportsOnDownload is false for CustomScript
            },
          ],
        }),
      ).rejects.toThrow("Notification 'script': unsupported event 'on_download' for type 'CustomScript'");
    });

    test("refuses notification when existing server entry has different type", async () => {
      const client = mockClient({
        existing: [{ id: 10, name: "ops-hook", implementation: "Webhook" }],
      });
      await expect(
        validateNotifications(client, {
          data: [{ name: "ops-hook", type: "CustomScript" }],
        }),
      ).rejects.toThrow(
        "Notification 'ops-hook' exists as type 'Webhook' but config says 'CustomScript'; rename it or remove the server entry",
      );
    });

    test("refuses field name with wrong casing (Url refused, url accepted)", async () => {
      const client = mockClient();
      await expect(
        validateNotifications(client, {
          data: [
            {
              name: "hook",
              type: "Webhook",
              fields: { Url: "https://example.com" },
            },
          ],
        }),
      ).rejects.toThrow("Notification 'hook': unknown field 'Url' for type 'Webhook'");

      await expect(
        validateNotifications(client, {
          data: [
            {
              name: "hook",
              type: "Webhook",
              fields: { url: "https://example.com" },
            },
          ],
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe("sync execution (syncNotifications)", () => {
    test("creates notification with unlisted events set to false and resolves tags", async () => {
      const client = mockClient({
        tags: [{ id: 7, label: "prod" }],
      });
      const cache = new ServerCache();
      cache.tags = [{ id: 7, label: "prod" }];

      const diff = await syncNotifications(
        client,
        {
          data: [
            {
              name: "ops-hook",
              type: "Webhook",
              events: { on_grab: true },
              fields: { url: "https://hooks.slack.com/services/abc" },
              tags: ["prod"],
            },
          ],
        },
        cache,
      );

      expect(diff).toEqual([{ resourceType: "Notification", name: "ops-hook", action: "create" }]);
      expect(client.createMock).toHaveBeenCalledTimes(1);
      const payload = client.createMock.mock.calls[0]?.[0];
      expect(payload.name).toBe("ops-hook");
      expect(payload.onGrab).toBe(true);
      expect(payload.onDownload).toBe(false);
      expect(payload.onUpgrade).toBe(false);
      expect(payload.tags).toEqual([7]);
      const urlField = payload.fields.find((f: any) => f.name === "url");
      expect(urlField.value).toBe("https://hooks.slack.com/services/abc");
    });

    test("no-op makes no write when server notification matches config", async () => {
      const existing: NotificationResourceItem = {
        id: 10,
        name: "ops-hook",
        implementation: "Webhook",
        includeHealthWarnings: false,
        onGrab: true,
        onDownload: false,
        onUpgrade: false,
        tags: [7],
        fields: [
          { name: "url", value: "https://hooks.slack.com/services/abc" },
          { name: "password", value: "********" },
        ],
      };
      const client = mockClient({
        existing: [existing],
        tags: [{ id: 7, label: "prod" }],
      });
      const cache = new ServerCache();
      cache.tags = [{ id: 7, label: "prod" }];

      const diff = await syncNotifications(
        client,
        {
          update_password: false,
          data: [
            {
              name: "ops-hook",
              type: "Webhook",
              events: { on_grab: true },
              fields: { url: "https://hooks.slack.com/services/abc", password: "super-secret" },
              tags: ["prod"],
            },
          ],
        },
        cache,
      );

      expect(diff).toEqual([]);
      expect(client.updateMock).not.toHaveBeenCalled();
    });

    test("update_password: false leaves masked secret alone without update or write", async () => {
      const existing: NotificationResourceItem = {
        id: 10,
        name: "ops-hook",
        implementation: "Webhook",
        fields: [{ name: "password", privacy: "password", value: "********" }],
      };
      const client = mockClient({ existing: [existing] });
      const cache = new ServerCache();

      const diff = await syncNotifications(
        client,
        {
          update_password: false,
          data: [
            {
              name: "ops-hook",
              type: "Webhook",
              fields: { password: "new-super-secret" },
            },
          ],
        },
        cache,
      );

      expect(diff).toEqual([]);
      expect(client.updateMock).not.toHaveBeenCalled();
    });

    test("update_password: true sends masked secret and redacts it in diff", async () => {
      const existing: NotificationResourceItem = {
        id: 10,
        name: "ops-hook",
        implementation: "Webhook",
        fields: [
          { name: "url", privacy: "normal", value: "https://old.url" },
          { name: "password", privacy: "password", value: "********" },
          { name: "apiKey", privacy: "apiKey", value: "********" },
          { name: "userName", privacy: "userName", value: "********" },
        ],
      };
      const client = mockClient({ existing: [existing] });
      const cache = new ServerCache();

      const diff = await syncNotifications(
        client,
        {
          update_password: true,
          data: [
            {
              name: "ops-hook",
              type: "Webhook",
              fields: {
                password: "my-plain-secret-password",
                api_key: "my-plain-secret-key",
                user_name: "my-plain-username",
              },
            },
          ],
        },
        cache,
      );

      expect(diff).toHaveLength(1);
      expect(diff[0]?.action).toBe("update");
      // All secrets must be masked as SECRET_MASK, never containing plaintext secrets
      for (const change of diff[0]?.fieldChanges ?? []) {
        expect(change.from).not.toBe("my-plain-secret-password");
        expect(change.to).not.toBe("my-plain-secret-password");
        expect(change.from).not.toBe("my-plain-secret-key");
        expect(change.to).not.toBe("my-plain-secret-key");
        expect(change.from).not.toBe("my-plain-username");
        expect(change.to).not.toBe("my-plain-username");

        if (change.field.startsWith("fields.")) {
          expect(change.from).toBe(SECRET_MASK);
          expect(change.to).toBe(SECRET_MASK);
        }
      }

      // But the payload sent to client.updateNotification HAS the updated plaintext secrets
      expect(client.updateMock).toHaveBeenCalledTimes(1);
      const updatePayload = client.updateMock.mock.calls[0]?.[1];
      const pwdField = updatePayload.fields.find((f: any) => f.name === "password");
      expect(pwdField.value).toBe("my-plain-secret-password");
      const keyField = updatePayload.fields.find((f: any) => f.name === "apiKey");
      expect(keyField.value).toBe("my-plain-secret-key");
      const userField = updatePayload.fields.find((f: any) => f.name === "userName");
      expect(userField.value).toBe("my-plain-username");
    });

    test("unlisted events stay unchanged on update", async () => {
      const existing: NotificationResourceItem = {
        id: 10,
        name: "ops-hook",
        implementation: "Webhook",
        onGrab: true,
        onDownload: true, // unlisted in config below
        onUpgrade: false,
      };
      const client = mockClient({ existing: [existing] });
      const cache = new ServerCache();

      const diff = await syncNotifications(
        client,
        {
          data: [
            {
              name: "ops-hook",
              type: "Webhook",
              events: { on_upgrade: true }, // only on_upgrade changed
            },
          ],
        },
        cache,
      );

      expect(diff).toHaveLength(1);
      expect(diff[0]?.fieldChanges).toEqual([{ field: "onUpgrade", from: false, to: true }]);
      const payload = client.updateMock.mock.calls[0]?.[1];
      expect(payload.onGrab).toBe(true);
      expect(payload.onDownload).toBe(true); // unchanged
      expect(payload.onUpgrade).toBe(true);
    });

    test("DRY_RUN makes no write on create, update, or delete", async () => {
      vi.stubEnv("DRY_RUN", "true");
      initEnvs();

      const existing: NotificationResourceItem = {
        id: 10,
        name: "old-hook",
        implementation: "Webhook",
      };
      const client = mockClient({ existing: [existing] });
      const cache = new ServerCache();

      const diff = await syncNotifications(
        client,
        {
          delete_unmanaged: { enabled: true, ignore: [] },
          data: [
            {
              name: "new-hook",
              type: "Webhook",
            },
          ],
        },
        cache,
      );

      expect(diff).toHaveLength(2);
      expect(client.createMock).not.toHaveBeenCalled();
      expect(client.deleteMock).not.toHaveBeenCalled();
    });

    test("DRY_RUN reports an update without writing it", async () => {
      vi.stubEnv("DRY_RUN", "true");
      initEnvs();

      const existing: NotificationResourceItem = {
        id: 10,
        name: "ops-hook",
        implementation: "Webhook",
        onGrab: false,
      };
      const client = mockClient({ existing: [existing] });

      const diff = await syncNotifications(
        client,
        { data: [{ name: "ops-hook", type: "Webhook", events: { on_grab: true } }] },
        new ServerCache(),
      );

      expect(diff[0]?.action).toBe("update");
      expect(client.updateMock).not.toHaveBeenCalled();
    });

    test("DRY_RUN shows a configured tag missing on the server as an added placeholder", async () => {
      vi.stubEnv("DRY_RUN", "true");
      initEnvs();

      const existing: NotificationResourceItem = {
        id: 10,
        name: "ops-hook",
        implementation: "Webhook",
        tags: [7],
      };
      const client = mockClient({ existing: [existing], tags: [{ id: 7, label: "prod" }] });
      const cache = new ServerCache();
      cache.tags = [{ id: 7, label: "prod" }];

      const diff = await syncNotifications(client, { data: [{ name: "ops-hook", type: "Webhook", tags: ["prod", "new-label"] }] }, cache);

      const tagChange = diff[0]?.fieldChanges?.find((change) => change.field === "tags");
      expect(tagChange?.from).toEqual([7]);
      expect(tagChange?.to).toEqual([-1, 7]);
      expect(client.updateMock).not.toHaveBeenCalled();
    });

    test("create turns off events the schema enables by default", async () => {
      const client = mockClient({ schema: [{ ...webhookSchema, onDownload: true }] });

      await syncNotifications(client, { data: [{ name: "ops-hook", type: "Webhook", events: { on_grab: true } }] }, new ServerCache());

      const payload = client.createMock.mock.calls[0]?.[0];
      expect(payload.onGrab).toBe(true);
      expect(payload.onDownload).toBe(false);
    });

    test("a secret field the server has not stored yet stays masked in the diff", async () => {
      const existing: NotificationResourceItem = {
        id: 10,
        name: "ops-hook",
        implementation: "Webhook",
        fields: [{ name: "url", privacy: "normal", value: "https://example.com" }],
      };
      const client = mockClient({ existing: [existing] });

      const diff = await syncNotifications(
        client,
        { data: [{ name: "ops-hook", type: "Webhook", fields: { password: "my-plain-secret-password" } }] },
        new ServerCache(),
      );

      expect(diff[0]?.fieldChanges).toEqual([{ field: "fields.password", from: undefined, to: SECRET_MASK }]);
      const passwordField = client.updateMock.mock.calls[0]?.[1].fields.find((f: any) => f.name === "password");
      expect(passwordField.value).toBe("my-plain-secret-password");
    });

    test("delete_unmanaged deletes unmanaged entries and honours ignore", async () => {
      const existing: NotificationResourceItem[] = [
        { id: 10, name: "managed-hook", implementation: "Webhook" },
        { id: 11, name: "unmanaged-to-delete", implementation: "Webhook" },
        { id: 12, name: "ignored-hook", implementation: "Webhook" },
      ];
      const client = mockClient({ existing });
      const cache = new ServerCache();

      const diff = await syncNotifications(
        client,
        {
          delete_unmanaged: { enabled: true, ignore: ["ignored-hook"] },
          data: [
            {
              name: "managed-hook",
              type: "Webhook",
            },
          ],
        },
        cache,
      );

      expect(diff).toEqual([{ resourceType: "Notification", name: "unmanaged-to-delete", action: "delete" }]);
      expect(client.deleteMock).toHaveBeenCalledTimes(1);
      expect(client.deleteMock).toHaveBeenCalledWith("11");
    });

    test("refuses notification when existing server entry has different type", async () => {
      const client = mockClient({
        existing: [{ id: 10, name: "ops-hook", implementation: "Webhook" }],
      });
      const cache = new ServerCache();
      await expect(
        syncNotifications(
          client,
          {
            data: [{ name: "ops-hook", type: "CustomScript" }],
          },
          cache,
        ),
      ).rejects.toThrow(
        "Notification 'ops-hook' exists as type 'Webhook' but config says 'CustomScript'; rename it or remove the server entry",
      );
    });

    test("updates existing notification when type matches but name case differs", async () => {
      const existing: NotificationResourceItem = {
        id: 10,
        name: "ops-hook",
        implementation: "Webhook",
        includeHealthWarnings: false,
        fields: [{ name: "url", value: "https://old.url" }],
      };
      const client = mockClient({ existing: [existing] });
      const cache = new ServerCache();

      const diff = await syncNotifications(
        client,
        {
          data: [
            {
              name: "Ops-Hook",
              type: "Webhook",
              fields: { url: "https://new.url" },
            },
          ],
        },
        cache,
      );

      expect(diff).toEqual([
        {
          resourceType: "Notification",
          name: "Ops-Hook",
          action: "update",
          fieldChanges: [
            { field: "name", from: "ops-hook", to: "Ops-Hook" },
            { field: "fields.url", from: "https://old.url", to: "https://new.url" },
          ],
        },
      ]);
      expect(client.updateMock).toHaveBeenCalledWith(
        "10",
        expect.objectContaining({
          id: 10,
          name: "Ops-Hook",
          implementation: "Webhook",
          fields: expect.arrayContaining([{ name: "url", value: "https://new.url" }]),
        }),
      );
    });

    test("redacts credential, path and query tokens in changed notification url diff report while sending original url to client", async () => {
      const oldUrl = "https://user:old-credential@hooks.example.com/services/old-path-token?token=old-query-token";
      const newUrl = "https://user:new-credential@hooks.example.com/services/new-path-token?token=new-query-token";
      const existing: NotificationResourceItem = {
        id: 11,
        name: "ops-hook",
        implementation: "Webhook",
        includeHealthWarnings: false,
        fields: [{ name: "url", privacy: "normal", value: oldUrl }],
      };
      const client = mockClient({ existing: [existing] });

      const diff = await syncNotifications(
        client,
        { data: [{ name: "ops-hook", type: "Webhook", fields: { url: newUrl } }] },
        new ServerCache(),
      );
      const collector = new DiffCollector();
      collector.add(diff);

      const entries = collector.getEntries();
      const serialized = JSON.stringify(entries);

      expect(serialized).not.toContain("old-credential");
      expect(serialized).not.toContain("new-credential");
      expect(serialized).not.toContain("old-path-token");
      expect(serialized).not.toContain("new-path-token");
      expect(serialized).not.toContain("old-query-token");
      expect(serialized).not.toContain("new-query-token");

      expect(entries[0]?.fieldChanges).toEqual([
        {
          field: "fields.url",
          from: "https://hooks.example.com/********",
          to: "https://hooks.example.com/********",
        },
      ]);

      expect(client.updateMock).toHaveBeenCalledTimes(1);
      const updatedPayload = client.updateMock.mock.calls[0]![1] as NotificationResourceItem;
      const urlField = updatedPayload.fields?.find((f) => f.name === "url");
      expect(urlField?.value).toBe(newUrl);
    });

    test("DRY_RUN masks changed notification url in reported entry without writing update", async () => {
      vi.stubEnv("DRY_RUN", "true");
      initEnvs();

      const oldUrl = "https://user:old-credential@hooks.example.com/services/old-path-token?token=old-query-token";
      const newUrl = "https://user:new-credential@hooks.example.com/services/new-path-token?token=new-query-token";
      const existing: NotificationResourceItem = {
        id: 11,
        name: "ops-hook",
        implementation: "Webhook",
        includeHealthWarnings: false,
        fields: [{ name: "url", privacy: "normal", value: oldUrl }],
      };
      const client = mockClient({ existing: [existing] });

      const diff = await syncNotifications(
        client,
        { data: [{ name: "ops-hook", type: "Webhook", fields: { url: newUrl } }] },
        new ServerCache(),
      );
      const collector = new DiffCollector();
      collector.add(diff);

      const entries = collector.getEntries();
      expect(entries[0]?.fieldChanges).toEqual([
        {
          field: "fields.url",
          from: "https://hooks.example.com/********",
          to: "https://hooks.example.com/********",
        },
      ]);
      expect(client.updateMock).not.toHaveBeenCalled();
    });
  });
});
