import { describe, expect, test } from "vitest";
import { DiffCollector } from "./diffCollector";
import { DiffEntry } from "./diffReport.types";
import { SECRET_MASK } from "./redactSecrets";

describe("DiffCollector", () => {
  test("accumulates entries across multiple add() calls", () => {
    const collector = new DiffCollector();
    const first: DiffEntry[] = [{ resourceType: "QualityProfile", name: "HD-1080p", action: "create" }];
    const second: DiffEntry[] = [
      { resourceType: "CustomFormat", name: "SDTV", action: "update", fieldChanges: [{ field: "score", from: 0, to: 10 }] },
    ];

    collector.add(first);
    collector.add(second);

    expect(collector.getEntries()).toEqual([...first, ...second]);
  });

  test("starts empty", () => {
    const collector = new DiffCollector();
    expect(collector.getEntries()).toEqual([]);
  });

  test("masks secret field changes so no formatter can leak them", () => {
    const collector = new DiffCollector();

    collector.add([
      {
        resourceType: "DownloadClient",
        name: "qBit",
        action: "update",
        fieldChanges: [
          { field: "fields.host", from: "old-host", to: "new-host" },
          { field: "fields.password", from: "********", to: "SUPERSECRET123" },
          { field: "fields.apiKey", from: "", to: "SUPERSECRET123" },
        ],
      },
    ]);

    expect(collector.getEntries()[0]!.fieldChanges).toEqual([
      { field: "fields.host", from: "old-host", to: "new-host" },
      { field: "fields.password", from: SECRET_MASK, to: SECRET_MASK },
      { field: "fields.apiKey", from: SECRET_MASK, to: SECRET_MASK },
    ]);
  });

  test("masks secrets nested in an object field value", () => {
    const collector = new DiffCollector();

    collector.add([
      {
        resourceType: "Indexer",
        name: "torznab",
        action: "update",
        fieldChanges: [{ field: "fields", from: { apiKey: "old" }, to: { apiKey: "SUPERSECRET123", baseUrl: "https://x" } }],
      },
    ]);

    expect(collector.getEntries()[0]!.fieldChanges).toEqual([
      { field: "fields", from: { apiKey: SECRET_MASK }, to: { apiKey: SECRET_MASK, baseUrl: "https://x" } },
    ]);
  });
});
