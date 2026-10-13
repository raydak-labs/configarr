import { describe, expect, test, vi } from "vitest";
import { resolveServerMajorVersion } from "../arr/serverVersion";
import { ServerCache } from "../cache";
import { SonarrClient } from "../clients/sonarr-client";
import type { CFProcessing } from "../customFormats/customFormat.types";
import type { MergedConfigInstance } from "../types/config.types";
import type { QualityDefinitionShared } from "../qualityDefinitions/qualityDefinition.types";
import { QualityProfileSonarrSync } from "./qualityProfileSonarr";

/**
 * Sonarr v5 moved quality size limits off the quality definition and onto quality profile items,
 * which makes a per-profile override possible for the first time. Driven through the real sync with a
 * stubbed client, so these assert what is actually written and what is deliberately left alone.
 */
describe("per-profile quality size limits", () => {
  const qualityDefinitions: QualityDefinitionShared[] = [
    { id: 1, quality: { id: 1, name: "WEBDL-1080p" } },
    { id: 2, quality: { id: 2, name: "WEBRip-1080p" } },
    { id: 1000, quality: { id: 1000, name: "WEB 1080p" } },
  ];

  const serverProfile = () => ({
    id: 7,
    name: "e2e-qp",
    upgradeAllowed: true,
    cutoff: 1000,
    minFormatScore: 0,
    cutoffFormatScore: 100,
    minUpgradeFormatScore: 1,
    formatItems: [],
    items: [
      {
        id: 1000,
        name: "WEB 1080p",
        quality: { id: 1000, name: "WEB 1080p" },
        allowed: true,
        items: [],
        minSize: 12.4,
        maxSize: 199.9,
        preferredSize: 55,
      },
    ],
  });

  type Sizes = Record<string, number | null | undefined>;

  const mergedConfig = (sizes?: Sizes): MergedConfigInstance =>
    ({
      base_url: "http://sonarr:8989",
      api_key: "key",
      quality_profiles: [
        {
          name: "e2e-qp",
          min_format_score: 0,
          upgrade: { allowed: true, until_quality: "WEB 1080p", until_score: 100 },
          qualities: [{ name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"], ...sizes }],
        },
      ],
      custom_formats: [],
      customFormatDefinitions: [],
      media_management: {},
      media_naming: {},
    }) as unknown as MergedConfigInstance;

  const emptyCfMap = { definitions: [], add: [], onlySpecific: [] } as unknown as CFProcessing;

  const run = async (version: string, sizes?: Sizes) => {
    const written: Array<{ items: Array<Record<string, unknown>> }> = [];
    const sonarr = {
      getSystemStatus: async () => ({ version }),
      getQualityDefinitions: async () => qualityDefinitions,
      getQualityProfiles: async () => [serverProfile()],
      createQualityProfile: async (profile: unknown) => {
        written.push(profile as never);
        return profile;
      },
      updateQualityProfile: async (_id: string, profile: unknown) => {
        written.push(profile as never);
        return profile;
      },
      deleteQualityProfile: async () => undefined,
    } as unknown as SonarrClient;

    // Resolved first so the gate does not add a request inside the diff.
    await resolveServerMajorVersion(sonarr);

    const sync = new QualityProfileSonarrSync(sonarr as never);
    const diff = await sync.calculateQualityProfilesDiff(
      emptyCfMap,
      mergedConfig(sizes),
      new ServerCache({ qualityDefinitions, qualityProfiles: [serverProfile()], customFormats: [], languages: [] }),
    );
    await sync.persist(diff, true);
    return written;
  };

  const groupItem = (written: Array<{ items: Array<Record<string, unknown>> }>) =>
    written[0]?.items.find((item) => item.name === "WEB 1080p");

  test("writes the sizes onto the group item the config names", async () => {
    const written = await run("5.0.0.2569", { min: 0, preferred: 12.4, max: 199.9 });

    expect(written).toHaveLength(1);
    expect(groupItem(written)).toMatchObject({ minSize: 0, maxSize: 199.9, preferredSize: 12.4 });
  });

  test("preserves a server size the config does not mention", async () => {
    // An omitted size has to mean "leave the server value", not "clear it". mapQualities attaches only
    // the sizes the config carries, so the mapped item has nothing for the others.
    const written = await run("5.0.0.2569", { preferred: 12.4 });

    expect(groupItem(written)).toMatchObject({ maxSize: 199.9, minSize: 12.4 });
  });

  test("preserves server sizes on a run that replaces items for another reason", async () => {
    // The items array is assigned wholesale whenever the quality order differs, which is unrelated to
    // sizes. The mapped item has to inherit the server sizes, or that replacement nulls them.
    const written = await run("5.0.0.2569", { preferred: 12.4 });

    expect(groupItem(written)?.maxSize).toBe(199.9);
  });

  test("clears a size written as null", async () => {
    const written = await run("5.0.0.2569", { preferred: null });

    expect(groupItem(written)?.preferredSize).toBeNull();
  });

  test("rejects the per-profile sizes against a v4 server", async () => {
    await expect(run("4.0.19.3011", { preferred: 12.4 })).rejects.toThrow(/Sonarr v5/);
  });

  test("still rejects quality-definition size limits against the v5 contract", async () => {
    // The v5 contract dropped the size fields from the quality definition resource, so the v4
    // mechanism cannot be used there and the user has to move them into the profile. Covered end to
    // end against the real client in sonarr-client.test.ts; this is the config-facing half of it.
    const real = new SonarrClient("http://127.0.0.1:1", "key", "v5");
    await expect(real.updateQualityDefinitions([{ id: 1, quality: { id: 1, name: "WEBDL-1080p" }, preferredSize: 50 }])).rejects.toThrow(
      /not supported on the Sonarr v5 API/,
    );
  });
});
