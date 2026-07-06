import fs from "node:fs";
import { describe, expect, test, vi, afterEach } from "vitest";
import { writeJsonDiffReport } from "./jsonFormatter";
import { InstanceDiffReport } from "../diffReport.types";

describe("writeJsonDiffReport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("writes a JSON document with generatedAt, dryRun, and instances", () => {
    const writeSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);

    const instances: InstanceDiffReport[] = [
      {
        arrType: "RADARR",
        instanceName: "instance1",
        entries: [{ resourceType: "QualityProfile", name: "HD", action: "create" }],
      },
    ];

    writeJsonDiffReport("/tmp/diff.json", instances, true);

    expect(writeSpy).toHaveBeenCalledTimes(1);
    const [filePath, content] = writeSpy.mock.calls[0]!;
    expect(filePath).toBe("/tmp/diff.json");

    const parsed = JSON.parse(content as string);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.instances).toEqual(instances);
    expect(typeof parsed.generatedAt).toBe("string");
    expect(() => new Date(parsed.generatedAt).toISOString()).not.toThrow();
  });
});
