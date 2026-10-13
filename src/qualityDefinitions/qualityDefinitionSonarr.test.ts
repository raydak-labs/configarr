import { describe, expect, it, vi } from "vitest";
import type { QualityDefinitionResource } from "../__generated__/sonarr/data-contracts";
import { QualityDefinitionSonarrSync } from "./qualityDefinitionSonarr";

describe("QualityDefinitionSonarrSync", () => {
  it("routes v5 size changes to profile-level sync without reporting a global diff", async () => {
    const updateQualityDefinitions = vi.fn(async (definitions: QualityDefinitionResource[]) => definitions);
    const sync = new QualityDefinitionSonarrSync({
      getQualityDefinitions: vi.fn(),
      updateQualityDefinitions,
      supportsProfileQualitySizes: vi.fn(async () => true),
    });
    const current: QualityDefinitionResource[] = [
      { quality: { name: "WEBDL-1080p" }, title: "WEB 1080p", minSize: 2, preferredSize: 50, maxSize: 200 },
    ];
    const configured = [{ quality: "WEBDL-1080p", title: "WEB 1080p", min: 0, preferred: 75, max: 200 }];

    const result = await sync.persist(current, configured, true);

    expect(result.changeMap.size).toBe(0);
    expect(result.restData).toMatchObject([{ minSize: 0, preferredSize: 75 }]);
    expect(updateQualityDefinitions).not.toHaveBeenCalled();
  });

  it("continues to sync global size changes on Sonarr v4", async () => {
    const updateQualityDefinitions = vi.fn(async (definitions: QualityDefinitionResource[]) => definitions);
    const sync = new QualityDefinitionSonarrSync({
      getQualityDefinitions: vi.fn(),
      updateQualityDefinitions,
      supportsProfileQualitySizes: vi.fn(async () => false),
    });
    const current: QualityDefinitionResource[] = [
      { quality: { name: "WEBDL-1080p" }, title: "WEB 1080p", minSize: 2, preferredSize: 50, maxSize: 200 },
    ];
    const configured = [{ quality: "WEBDL-1080p", title: "WEB 1080p", min: 0, preferred: 75, max: 200 }];

    const result = await sync.persist(current, configured, true);

    expect(result.changeMap.get("WEBDL-1080p")).toEqual([
      { field: "minSize", from: 2, to: 0 },
      { field: "preferredSize", from: 50, to: 75 },
    ]);
    expect(updateQualityDefinitions).toHaveBeenCalledOnce();
  });
});
