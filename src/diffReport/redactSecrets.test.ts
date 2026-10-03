import { describe, expect, test } from "vitest";
import { DiffEntry } from "./diffReport.types";
import { isSecretFieldName, redactDiffEntry, redactSecrets, SECRET_MASK } from "./redactSecrets";

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
});
