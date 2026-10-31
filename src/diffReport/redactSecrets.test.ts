import { describe, expect, test } from "vitest";
import { DiffEntry } from "./diffReport.types";
import { isSecretFieldName, redactDiffEntry, redactSecrets, redactUrlValue, SECRET_MASK } from "./redactSecrets";

describe("isSecretFieldName", () => {
  test("matches password, apikey, secret and token field names", () => {
    for (const fieldName of ["password", "Password", "apiKey", "api_key", "fields.password", "fields.secret", "authToken"]) {
      expect(isSecretFieldName(fieldName)).toBe(true);
    }
  });

  test("does not match regular field names", () => {
    for (const fieldName of ["host", "port", "priority", "fields.username", "minFormatScore", "tags"]) {
      expect(isSecretFieldName(fieldName)).toBe(false);
    }
  });
});

describe("redactSecrets", () => {
  test("returns scalars untouched", () => {
    expect(redactSecrets("qbittorrent")).toBe("qbittorrent");
    expect(redactSecrets(8080)).toBe(8080);
    expect(redactSecrets(null)).toBeNull();
    expect(redactSecrets(undefined)).toBeUndefined();
  });

  test("masks secret-named keys of an object", () => {
    expect(redactSecrets({ host: "qbittorrent", password: "hunter2" })).toEqual({ host: "qbittorrent", password: SECRET_MASK });
  });

  test("masks secret-named keys nested in objects and arrays", () => {
    expect(redactSecrets({ nested: { apiKey: "abc", keep: 1 }, list: [{ token: "t" }] })).toEqual({
      nested: { apiKey: SECRET_MASK, keep: 1 },
      list: [{ token: SECRET_MASK }],
    });
  });

  test("masks the value of a name/value pair whose name is secret-named", () => {
    // Custom-format comparison reports a reordered specifications[].fields array as one
    // change, so its { name, value } elements arrive here rather than as separate field paths.
    const fields = [
      { name: "release_group", value: "ARR" },
      { name: "api_key", value: "SUPERSECRET123" },
    ];

    expect(redactSecrets(fields)).toEqual([
      { name: "release_group", value: "ARR" },
      { name: "api_key", value: SECRET_MASK },
    ]);
  });
});

describe("redactDiffEntry", () => {
  test("masks both sides of a secret field change", () => {
    const entry: DiffEntry = {
      resourceType: "DownloadClient",
      name: "qBit",
      action: "update",
      fieldChanges: [{ field: "fields.password", from: "********", to: "SUPERSECRET123" }],
    };

    expect(redactDiffEntry(entry).fieldChanges).toEqual([{ field: "fields.password", from: SECRET_MASK, to: SECRET_MASK }]);
  });

  test("keeps non secret field changes intact", () => {
    const entry: DiffEntry = {
      resourceType: "DownloadClient",
      name: "qBit",
      action: "update",
      fieldChanges: [{ field: "fields.host", from: "old", to: "new" }],
    };

    expect(redactDiffEntry(entry).fieldChanges).toEqual([{ field: "fields.host", from: "old", to: "new" }]);
  });

  test("masks a secret value inside a reordered custom-format fields change", () => {
    const entry: DiffEntry = {
      resourceType: "CustomFormat",
      name: "WEB-DL",
      action: "update",
      fieldChanges: [
        {
          field: "specifications[0].fields",
          from: [
            { name: "release_group", value: "ARR" },
            { name: "api_key", value: "********" },
          ],
          to: [
            { name: "api_key", value: "SUPERSECRET123" },
            { name: "release_group", value: "ARR" },
          ],
        },
      ],
    };

    expect(redactDiffEntry(entry).fieldChanges![0]!.to).toEqual([
      { name: "api_key", value: SECRET_MASK },
      { name: "release_group", value: "ARR" },
    ]);
  });

  test("returns entries without field changes unchanged", () => {
    const entry: DiffEntry = { resourceType: "DownloadClient", name: "qBit", action: "create" };
    expect(redactDiffEntry(entry)).toBe(entry);
  });

  test("does not mutate the input entry", () => {
    const entry: DiffEntry = {
      resourceType: "DownloadClient",
      name: "qBit",
      action: "update",
      fieldChanges: [{ field: "fields.apiKey", from: "old", to: "SUPERSECRET123" }],
    };

    redactDiffEntry(entry);

    expect(entry.fieldChanges![0]!.to).toBe("SUPERSECRET123");
  });

  test("redacts url fields for notifications", () => {
    const entry: DiffEntry = {
      resourceType: "Notification",
      name: "discord",
      action: "update",
      fieldChanges: [
        {
          field: "fields.url",
          from: "https://discord.com/api/webhooks/old/token",
          to: "https://discord.com/api/webhooks/new/token",
        },
      ],
    };

    expect(redactDiffEntry(entry).fieldChanges).toEqual([
      {
        field: "fields.url",
        from: "https://discord.com/********",
        to: "https://discord.com/********",
      },
    ]);
  });

  test("redacts webhookUrl and serverUrl fields for notifications", () => {
    const entry: DiffEntry = {
      resourceType: "Notification",
      name: "hook",
      action: "update",
      fieldChanges: [
        {
          field: "fields.webhookUrl",
          from: "https://hooks.example.com/services/old",
          to: "https://hooks.example.com/services/new",
        },
        {
          field: "fields.serverUrl",
          from: "https://server.example.com/push/old",
          to: "https://server.example.com/push/new",
        },
      ],
    };

    expect(redactDiffEntry(entry).fieldChanges).toEqual([
      {
        field: "fields.webhookUrl",
        from: "https://hooks.example.com/********",
        to: "https://hooks.example.com/********",
      },
      {
        field: "fields.serverUrl",
        from: "https://server.example.com/********",
        to: "https://server.example.com/********",
      },
    ]);
  });

  test("redacts strings with url credentials regardless of field name or resource", () => {
    const entry: DiffEntry = {
      resourceType: "DownloadClient",
      name: "client",
      action: "update",
      fieldChanges: [
        {
          field: "fields.host",
          from: "http://user:oldpw@host:8080/path",
          to: "http://user:newpw@host:8080/path",
        },
      ],
    };

    expect(redactDiffEntry(entry).fieldChanges).toEqual([
      {
        field: "fields.host",
        from: "http://host:8080/********",
        to: "http://host:8080/********",
      },
    ]);
  });

  test("keeps secret-named field fully masked even if value is a URL", () => {
    const entry: DiffEntry = {
      resourceType: "Notification",
      name: "webhook",
      action: "update",
      fieldChanges: [
        {
          field: "fields.apiKey",
          from: "https://user:pw@example.com/key",
          to: "https://user:pw@example.com/newkey",
        },
        {
          field: "fields.secretUrl",
          from: "https://user:pw@example.com/secret",
          to: "https://user:pw@example.com/newsecret",
        },
      ],
    };

    expect(redactDiffEntry(entry).fieldChanges).toEqual([
      { field: "fields.apiKey", from: SECRET_MASK, to: SECRET_MASK },
      { field: "fields.secretUrl", from: SECRET_MASK, to: SECRET_MASK },
    ]);
  });
});

describe("redactUrlValue", () => {
  test("masks userinfo and replaces path/query/fragment with SECRET_MASK", () => {
    expect(redactUrlValue("https://user:pw@hooks.example.com/services/T/B/x?token=1")).toBe("https://hooks.example.com/********");
    expect(redactUrlValue("https://user:pw@example.com")).toBe("https://example.com/********");
    expect(redactUrlValue("https://user:pw@example.com/")).toBe("https://example.com/********");
  });

  test("masks sensitive query parameter on bare origin", () => {
    expect(redactUrlValue("https://example.com/?token=secret123")).toBe("https://example.com/********");
    expect(redactUrlValue("https://example.com?token=secret123")).toBe("https://example.com/********");
  });

  test("masks path token such as Discord webhook url", () => {
    expect(redactUrlValue("https://discord.com/api/webhooks/123/abc")).toBe("https://discord.com/********");
  });

  test("preserves bare origin with and without trailing slash", () => {
    expect(redactUrlValue("https://ntfy.sh")).toBe("https://ntfy.sh");
    expect(redactUrlValue("https://ntfy.sh/")).toBe("https://ntfy.sh/");
  });

  test("keeps port in origin when redacting path or bare", () => {
    expect(redactUrlValue("https://example.com:8443/webhook")).toBe("https://example.com:8443/********");
    expect(redactUrlValue("https://example.com:8443")).toBe("https://example.com:8443");
    expect(redactUrlValue("https://example.com:8443/")).toBe("https://example.com:8443/");
  });

  test("masks malformed string as SECRET_MASK", () => {
    expect(redactUrlValue("not a url")).toBe(SECRET_MASK);
    expect(redactUrlValue("http://")).toBe(SECRET_MASK);
  });

  test("masks mailto url as SECRET_MASK", () => {
    expect(redactUrlValue("mailto:user@example.com")).toBe(SECRET_MASK);
  });

  test("leaves empty string and whitespace untouched", () => {
    expect(redactUrlValue("")).toBe("");
    expect(redactUrlValue("   ")).toBe("   ");
  });

  test("leaves null and undefined untouched", () => {
    expect(redactUrlValue(null)).toBeNull();
    expect(redactUrlValue(undefined)).toBeUndefined();
  });

  test("leaves non-string (number) unchanged", () => {
    expect(redactUrlValue(123)).toBe(123);
  });
});
