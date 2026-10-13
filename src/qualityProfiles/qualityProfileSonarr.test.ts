import path from "path";
import { beforeEach, afterEach, describe, expect, expectTypeOf, test, vi } from "vitest";
import type { QualityProfileResource } from "../__generated__/sonarr/data-contracts";
import { SonarrClient } from "../clients/sonarr-client";
import type { QualityDefinitionShared } from "../qualityDefinitions/qualityDefinition.types";
import type { ConfigQualityProfile, MergedConfigInstance } from "../types/config.types";
import { QualityProfileShared } from "./qualityProfile.types";
import { QualityProfileSonarrSync } from "./qualityProfileSonarr";
import { cloneWithJSON, loadJsonFile } from "../util";

describe("QualityProfileSonarrSync", async () => {
  const sampleQualityProfile = loadJsonFile<QualityProfileShared>(
    path.resolve(__dirname, `../../tests/samples/single_quality_profile.json`),
  );

  describe("delete Quality Profiles tests", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    test("deleteOnServer deletes only the given quality profile id", async () => {
      const qp1 = cloneWithJSON(sampleQualityProfile);
      qp1.id = 1001;
      qp1.name = "QP-1";
      const qp2 = cloneWithJSON(sampleQualityProfile);
      qp2.id = 1002;
      qp2.name = "QP-2";
      const qp3 = cloneWithJSON(sampleQualityProfile);
      qp3.id = 1003;
      qp3.name = "QP-3";

      const deleteFn = vi.fn().mockResolvedValue(undefined);

      await new QualityProfileSonarrSync({
        getQualityProfiles: vi.fn(),
        createQualityProfile: vi.fn(),
        updateQualityProfile: vi.fn(),
        deleteQualityProfile: deleteFn,
        supportsProfileQualitySizes: vi.fn(),
        getProfileQualitySizes: vi.fn(),
        updateProfileQualitySizes: vi.fn(),
        getQualityDefinitions: vi.fn(),
      }).deleteOnServer(qp1);

      expect(deleteFn).toHaveBeenCalledTimes(1);
      expect(deleteFn).toHaveBeenNthCalledWith(1, "1001");
      expect(deleteFn).not.toHaveBeenCalledWith("1002");
      expect(deleteFn).not.toHaveBeenCalledWith("1003");
    });
  });

  describe("injected client", () => {
    test("create and update go through the injected client typed with the generated resource", async () => {
      const createQualityProfile = vi.fn(async (profile: QualityProfileResource) => profile);
      const updateQualityProfile = vi.fn(async (_id: string, profile: QualityProfileResource) => profile);

      const sync = new QualityProfileSonarrSync({
        getQualityProfiles: vi.fn(async () => []),
        createQualityProfile,
        updateQualityProfile,
        deleteQualityProfile: vi.fn(),
        supportsProfileQualitySizes: vi.fn(),
        getProfileQualitySizes: vi.fn(),
        updateProfileQualitySizes: vi.fn(),
        getQualityDefinitions: vi.fn(),
      });

      // The client is mandatory and its writes are typed with Sonarr's own resource.
      expectTypeOf(sync.createOnServer).returns.resolves.toEqualTypeOf<QualityProfileResource>();

      const profile: QualityProfileShared = { name: "New", items: [] };

      await sync.createOnServer(profile);
      await sync.updateOnServer("7", profile);

      expect(createQualityProfile).toHaveBeenCalledWith(profile);
      expect(updateQualityProfile).toHaveBeenCalledWith("7", profile);
    });
  });

  describe("profile quality sizes", () => {
    const definitions: QualityDefinitionShared[] = [
      { title: "WEB 1080p", quality: { name: "WEBDL-1080p" } },
      { title: "WEBDL-1080p", quality: { name: "WEBDL-1080p" } },
    ];
    const config: ConfigQualityProfile = {
      name: "WEB-1080p",
      quality_sizes: [{ quality: "WEBDL-1080p", min: 0, preferred: 75 }],
      qualities: [],
      quality_sort: "top",
      upgrade: { allowed: false },
      min_format_score: 0,
    };

    test("applies explicit per-profile values and reports field-level differences", async () => {
      const client = new SonarrClient("http://sonarr.test", "api-key");
      vi.spyOn(client, "supportsProfileQualitySizes").mockResolvedValue(true);
      vi.spyOn(client, "getProfileQualitySizes").mockResolvedValue([
        { id: 1, name: "WEB-1080p", items: [{ quality: "WEBDL-1080p", minSize: 2, preferredSize: 50, maxSize: 200 }] },
      ]);
      const update = vi.spyOn(client, "updateProfileQualitySizes").mockResolvedValue(undefined);

      const changes = await new QualityProfileSonarrSync(client).syncQualitySizes([config], definitions, true);

      expect(changes).toEqual([
        {
          resourceType: "QualityProfile",
          name: "WEB-1080p",
          action: "update",
          fieldChanges: [
            { field: "quality_sizes.WEBDL-1080p.min", from: 2, to: 0 },
            { field: "quality_sizes.WEBDL-1080p.preferred", from: 50, to: 75 },
          ],
        },
      ]);
      expect(update).toHaveBeenCalledWith("1", [{ quality: "WEBDL-1080p", minSize: 0, preferredSize: 75 }]);
    });

    test("rejects profile-specific sizes on Sonarr v4 before sync writes", async () => {
      const client = new SonarrClient("http://sonarr.test", "api-key");
      vi.spyOn(client, "supportsProfileQualitySizes").mockResolvedValue(false);
      const sync = new QualityProfileSonarrSync(client);

      await expect(sync.validateConfig({ quality_profiles: [config] } as MergedConfigInstance)).rejects.toThrow(
        "Per-profile quality_sizes require Sonarr v5.",
      );
    });

    test("allows a known quality omitted from config because Sonarr keeps it as a disabled profile item", async () => {
      const client = new SonarrClient("http://sonarr.test", "api-key");
      vi.spyOn(client, "supportsProfileQualitySizes").mockResolvedValue(true);
      vi.spyOn(client, "getQualityDefinitions").mockResolvedValue(definitions as never);
      const profile = {
        ...config,
        qualities: [{ name: "WEB 1080p", qualities: ["WEBDL-1080p"] }],
        quality_sizes: [{ quality: "WEBDL-1080p", preferred: 75 }],
      };

      await expect(
        new QualityProfileSonarrSync(client).validateConfig({ quality_profiles: [profile] } as MergedConfigInstance),
      ).resolves.toBeUndefined();
    });

    test("rejects a selector that matches one quality title and another quality name", async () => {
      const client = new SonarrClient("http://sonarr.test", "api-key");
      vi.spyOn(client, "supportsProfileQualitySizes").mockResolvedValue(true);
      vi.spyOn(client, "getQualityDefinitions").mockResolvedValue([
        { title: "Collision", quality: { name: "WEBDL-1080p" } },
        { title: "WEBRip-1080p", quality: { name: "Collision" } },
      ] as never);
      const profile = { ...config, quality_sizes: [{ quality: "Collision", min: 0 }] };

      await expect(
        new QualityProfileSonarrSync(client).validateConfig({ quality_profiles: [profile] } as MergedConfigInstance),
      ).rejects.toThrow("Quality selector 'Collision' is ambiguous");
    });

    test("uses the existing value for omitted fields and skips an already-synced profile", async () => {
      const client = new SonarrClient("http://sonarr.test", "api-key");
      vi.spyOn(client, "supportsProfileQualitySizes").mockResolvedValue(true);
      vi.spyOn(client, "getProfileQualitySizes").mockResolvedValue([
        { id: 1, name: "WEB-1080p", items: [{ quality: "WEBDL-1080p", minSize: 0, preferredSize: 75, maxSize: 200 }] },
      ]);
      const update = vi.spyOn(client, "updateProfileQualitySizes").mockResolvedValue(undefined);
      const singleValueConfig = { ...config, quality_sizes: [{ quality: "WEB 1080p", min: 0 }] };

      const changes = await new QualityProfileSonarrSync(client).syncQualitySizes([singleValueConfig], definitions, true);

      expect(changes).toEqual([]);
      expect(update).not.toHaveBeenCalled();
    });

    test("uses global quality-definition sizes as defaults while preserving per-profile overrides", async () => {
      const client = new SonarrClient("http://sonarr.test", "api-key");
      vi.spyOn(client, "supportsProfileQualitySizes").mockResolvedValue(true);
      vi.spyOn(client, "getProfileQualitySizes").mockResolvedValue([
        {
          id: 1,
          name: "WEB-1080p",
          items: [{ quality: "WEBDL-1080p", minSize: 2, preferredSize: 50, maxSize: 200 }],
        },
        {
          id: 2,
          name: "WEB-2160p",
          items: [{ quality: "WEBDL-1080p", minSize: 2, preferredSize: 50, maxSize: 200 }],
        },
      ]);
      const update = vi.spyOn(client, "updateProfileQualitySizes").mockResolvedValue(undefined);
      const overrides = [{ ...config, quality_sizes: [{ quality: "WEBDL-1080p", preferred: 75 }] }];

      const changes = await new QualityProfileSonarrSync(client).syncQualitySizes(overrides, definitions, true, [
        { quality: "WEBDL-1080p", min: 0, preferred: 50, max: 200 },
      ]);

      expect(changes).toEqual([
        {
          resourceType: "QualityProfile",
          name: "WEB-1080p",
          action: "update",
          fieldChanges: [
            { field: "quality_sizes.WEBDL-1080p.min", from: 2, to: 0 },
            { field: "quality_sizes.WEBDL-1080p.preferred", from: 50, to: 75 },
          ],
        },
        {
          resourceType: "QualityProfile",
          name: "WEB-2160p",
          action: "update",
          fieldChanges: [{ field: "quality_sizes.WEBDL-1080p.min", from: 2, to: 0 }],
        },
      ]);
      expect(update).toHaveBeenNthCalledWith(1, "1", [{ quality: "WEBDL-1080p", minSize: 0, preferredSize: 75, maxSize: 200 }]);
      expect(update).toHaveBeenNthCalledWith(2, "2", [{ quality: "WEBDL-1080p", minSize: 0, preferredSize: 50, maxSize: 200 }]);
    });

    test("includes per-profile size changes for a profile that would be created in dry-run", async () => {
      const client = new SonarrClient("http://sonarr.test", "api-key");
      vi.spyOn(client, "supportsProfileQualitySizes").mockResolvedValue(true);
      vi.spyOn(client, "getProfileQualitySizes").mockResolvedValue([]);
      const update = vi.spyOn(client, "updateProfileQualitySizes").mockResolvedValue(undefined);

      const changes = await new QualityProfileSonarrSync(client).syncQualitySizes([config], definitions, false);

      expect(changes).toEqual([
        {
          resourceType: "QualityProfile",
          name: "WEB-1080p",
          action: "update",
          fieldChanges: [
            { field: "quality_sizes.WEBDL-1080p.min", from: undefined, to: 0 },
            { field: "quality_sizes.WEBDL-1080p.preferred", from: undefined, to: 75 },
          ],
        },
      ]);
      expect(update).not.toHaveBeenCalled();
    });

    test("includes global defaults for a new configured profile in dry-run", async () => {
      const client = new SonarrClient("http://sonarr.test", "api-key");
      vi.spyOn(client, "supportsProfileQualitySizes").mockResolvedValue(true);
      vi.spyOn(client, "getProfileQualitySizes").mockResolvedValue([]);
      const profile = {
        ...config,
        quality_sizes: undefined,
        qualities: [{ name: "WEB 1080p", qualities: ["WEBDL-1080p"] }],
      };
      const definitionsWithImplicitQuality = [...definitions, { title: "HDTV 720p", quality: { name: "HDTV-720p" } }];

      const changes = await new QualityProfileSonarrSync(client).syncQualitySizes([profile], definitionsWithImplicitQuality, false, [
        { quality: "WEBDL-1080p", min: 0, preferred: 75, max: 200 },
        { quality: "HDTV-720p", min: 0, preferred: 10, max: 100 },
      ]);

      expect(changes).toEqual([
        {
          resourceType: "QualityProfile",
          name: "WEB-1080p",
          action: "update",
          fieldChanges: [
            { field: "quality_sizes.WEBDL-1080p.min", from: undefined, to: 0 },
            { field: "quality_sizes.WEBDL-1080p.preferred", from: undefined, to: 75 },
            { field: "quality_sizes.WEBDL-1080p.max", from: undefined, to: 200 },
            { field: "quality_sizes.HDTV-720p.min", from: undefined, to: 0 },
            { field: "quality_sizes.HDTV-720p.preferred", from: undefined, to: 10 },
            { field: "quality_sizes.HDTV-720p.max", from: undefined, to: 100 },
          ],
        },
      ]);
    });
  });
});
