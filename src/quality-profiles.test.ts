import { describe, expect, test } from "vitest";
import { MergedQualityDefinitionResource } from "./__generated__/mergedTypes";
import { doAllQualitiesExist, isOrderOfQualitiesEqual, mapQualities } from "./quality-profiles";
import { ConfigQualityProfile, ConfigQualityProfileItem } from "./types";

describe("QualityProfiles", async () => {
  test("doAllQualitiesExist - all exist", async ({}) => {
    const fromConfig: ConfigQualityProfileItem[] = [
      { name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] },
      { name: "HDTV-1080p" },
      { name: "Bluray-1080p" },
      { name: "Remux-1080p" },
      { name: "WEB 720p", qualities: ["WEBDL-720p", "WEBRip-720p"] },
      { name: "HDTV-720p" },
    ];
    const fromServer: ConfigQualityProfileItem[] = [
      { name: "Bluray-1080p", qualities: [] },
      { name: "HDTV-720p", qualities: [] },
      { name: "WEB 720p", qualities: ["WEBDL-720p", "WEBRip-720p"] },
      { name: "HDTV-1080p", qualities: [] },
      { name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] },
      { name: "Remux-1080p", qualities: [] },
    ];
    const result = doAllQualitiesExist(fromServer, fromConfig);

    expect(result).toBe(true);
  });

  test("doAllQualitiesExist - enabled behaves equals if configured or not", async ({}) => {
    const fromConfig: ConfigQualityProfileItem[] = [{ name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"], enabled: true }];
    const fromServer: ConfigQualityProfileItem[] = [{ name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] }];
    const result = doAllQualitiesExist(fromServer, fromConfig);

    expect(result).toBe(true);
  });

  test("doAllQualitiesExist - enabled false trigger change", async ({}) => {
    const fromConfig: ConfigQualityProfileItem[] = [{ name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"], enabled: false }];
    const fromServer: ConfigQualityProfileItem[] = [{ name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] }];
    const result = doAllQualitiesExist(fromServer, fromConfig);

    expect(result).toBe(false);
  });

  test("doAllQualitiesExist - enabled both false no change", async ({}) => {
    const fromConfig: ConfigQualityProfileItem[] = [{ name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"], enabled: false }];
    const fromServer: ConfigQualityProfileItem[] = [{ name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"], enabled: false }];
    const result = doAllQualitiesExist(fromServer, fromConfig);

    expect(result).toBe(true);
  });

  test("doAllQualitiesExist - missing", async ({}) => {
    const fromConfig: ConfigQualityProfileItem[] = [
      { name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] },
      { name: "HDTV-1080p" },
      { name: "Bluray-1080p" },
      { name: "Remux-1080p" },
      { name: "WEB 720p", qualities: ["WEBDL-720p", "WEBRip-720p"] },
      { name: "HDTV-720p" },
    ];
    const fromServer: ConfigQualityProfileItem[] = [
      { name: "Bluray-1080p", qualities: [] },
      { name: "WEB 720p", qualities: ["WEBDL-720p", "WEBRip-720p"] },
      { name: "HDTV-1080p", qualities: [] },
      { name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] },
      { name: "Remux-1080p", qualities: [] },
    ];
    const result = doAllQualitiesExist(fromServer, fromConfig);

    expect(result).toBe(false);
  });

  test("isOrderOfQualitiesEqual - should match", async ({}) => {
    const fromConfig: ConfigQualityProfileItem[] = [
      { name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] },
      { name: "HDTV-1080p" },
      { name: "Bluray-1080p" },
      { name: "Remux-1080p" },
      { name: "WEB 720p", qualities: ["WEBDL-720p", "WEBRip-720p"] },
      { name: "HDTV-720p" },
    ];
    const fromServer: ConfigQualityProfileItem[] = [
      { name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] },
      { name: "HDTV-1080p" },
      { name: "Bluray-1080p" },
      { name: "Remux-1080p" },
      { name: "WEB 720p", qualities: ["WEBDL-720p", "WEBRip-720p"] },
      { name: "HDTV-720p" },
    ];
    const result = isOrderOfQualitiesEqual(fromConfig, fromServer);

    expect(result).toBe(true);
  });

  test("isOrderOfQualitiesEqual - different order", async ({}) => {
    const fromConfig: ConfigQualityProfileItem[] = [
      { name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] },
      { name: "HDTV-1080p" },
      { name: "Bluray-1080p" },
      { name: "Remux-1080p" },
      { name: "WEB 720p", qualities: ["WEBDL-720p", "WEBRip-720p"] },
      { name: "HDTV-720p" },
    ];
    const fromServer: ConfigQualityProfileItem[] = [
      { name: "Bluray-1080p", qualities: [] },
      { name: "HDTV-720p", qualities: [] },
      { name: "WEB 720p", qualities: ["WEBDL-720p", "WEBRip-720p"] },
      { name: "HDTV-1080p", qualities: [] },
      { name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] },
      { name: "Remux-1080p", qualities: [] },
    ];
    const result = isOrderOfQualitiesEqual(fromConfig, fromServer);

    expect(result).toBe(false);
  });

  test("mapQualities - enabled correctly mapped (default sorting)", async ({}) => {
    const fromConfig: ConfigQualityProfileItem[] = [
      { name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] },
      { name: "HDTV-1080p" },
    ];

    const resources: MergedQualityDefinitionResource[] = [
      { id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } },
      { id: 2, title: "WEBDL-1080p", weight: 2, quality: { id: 2, name: "WEBDL-1080p" } },
      { id: 3, title: "WEBRip-1080p", weight: 2, quality: { id: 3, name: "WEBRip-1080p" } },
      { id: 4, title: "Unknown", weight: 2, quality: { id: 4, name: "Unknown" } },
    ];

    const profile: ConfigQualityProfile = {
      name: "hi",
      min_format_score: 2,
      qualities: fromConfig,
      quality_sort: "sort",
      upgrade: { allowed: true, until_quality: "yes", until_score: 5 },
      score_set: "default",
    };

    const result = mapQualities(resources, profile);

    expect(result).toHaveLength(3);
    // ordering matters

    expect(result[0].quality?.name).toBe("Unknown");
    expect(result[0].allowed).toBe(false);
    expect(result[1].quality?.name).toBe("HDTV-1080p");
    expect(result[1].allowed).toBe(true);
    expect(result[2].name).toBe("WEB 1080p");
    expect(result[2].allowed).toBe(true);
  });

  test("mapQualities - enabled mapped to false", async ({}) => {
    const fromConfig: ConfigQualityProfileItem[] = [
      { name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] },
      { name: "HDTV-1080p", enabled: false },
    ];

    const resources: MergedQualityDefinitionResource[] = [
      { id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } },
      { id: 2, title: "WEBDL-1080p", weight: 2, quality: { id: 2, name: "WEBDL-1080p" } },
      { id: 3, title: "WEBRip-1080p", weight: 2, quality: { id: 3, name: "WEBRip-1080p" } },
      { id: 4, title: "Unknown", weight: 2, quality: { id: 4, name: "Unknown" } },
    ];

    const profile: ConfigQualityProfile = {
      name: "hi",
      min_format_score: 2,
      qualities: fromConfig,
      quality_sort: "sort",
      upgrade: { allowed: true, until_quality: "yes", until_score: 5 },
      score_set: "default",
    };

    const result = mapQualities(resources, profile);

    expect(result).toHaveLength(3);

    expect(result[0].quality?.name).toBe("Unknown");
    expect(result[0].allowed).toBe(false);
    expect(result[1].quality?.name).toBe("HDTV-1080p");
    expect(result[1].allowed).toBe(false);
    expect(result[2].name).toBe("WEB 1080p");
    expect(result[2].allowed).toBe(true);
  });

  test("calculateQualityProfilesDiff - should diff if minUpgradeFormatScore is different", async ({}) => {
    // TODO
  });

  test("calculateQualityProfilesDiff - should not diff if minUpgradeFormatScore is equal", async ({}) => {
    // TODO
  });

  test("calculateQualityProfilesDiff - should not diff if minUpgradeFormatScore is not configured", async ({}) => {
    // TODO
  });
});
