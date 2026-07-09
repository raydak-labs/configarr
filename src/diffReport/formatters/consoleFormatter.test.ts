import { describe, expect, test, vi, afterEach } from "vitest";
import { logger } from "../../logger";
import { ConsoleDiffFormatter } from "./consoleFormatter";
import { InstanceDiffReport } from "../diffReport.types";

describe("ConsoleDiffFormatter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("renders a report with creates, updates, and field changes", () => {
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => undefined as any);

    const report: InstanceDiffReport = {
      arrType: "RADARR",
      instanceName: "instance1",
      entries: [
        {
          resourceType: "QualityDefinition",
          name: "SDTV",
          action: "update",
          fieldChanges: [{ field: "minSize", from: 2, to: 5 }],
        },
        { resourceType: "QualityProfiles", name: "ExampleProfile", action: "create" },
        {
          resourceType: "QualityProfiles",
          name: "Remux-2160p",
          action: "update",
          fieldChanges: [
            { field: "minFormatScore", from: 0, to: 10 },
            { field: "language", from: "English", to: "Any" },
          ],
        },
      ],
    };

    new ConsoleDiffFormatter().format(report);

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const output = infoSpy.mock.calls[0]![0] as string;

    expect(output).toContain("=== Diff Report: RADARR / instance1 ===");
    expect(output).toContain("QualityDefinition (1 change)");
    expect(output).toContain("~ SDTV");
    expect(output).toContain("minSize: 2 -> 5");
    expect(output).toContain("QualityProfiles (1 create, 1 update)");
    expect(output).toContain("+ ExampleProfile (new)");
    expect(output).toContain("~ Remux-2160p");
    expect(output).toContain("minFormatScore: 0 -> 10");
    expect(output).toContain("language: English -> Any");
    expect(output).toContain("==========================================");
  });

  test("renders an up-to-date message when there are no entries", () => {
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => undefined as any);

    new ConsoleDiffFormatter().format({ arrType: "SONARR", instanceName: "main", entries: [] });

    const output = infoSpy.mock.calls[0]![0] as string;
    expect(output).toContain("up to date");
  });
});
