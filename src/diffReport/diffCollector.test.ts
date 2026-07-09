import { describe, expect, test } from "vitest";
import { DiffCollector } from "./diffCollector";
import { DiffEntry } from "./diffReport.types";

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
});
