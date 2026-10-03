import path from "path";
import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
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
      }).deleteOnServer(qp1);

      expect(deleteFn).toHaveBeenCalledTimes(1);
      expect(deleteFn).toHaveBeenNthCalledWith(1, "1001");
      expect(deleteFn).not.toHaveBeenCalledWith("1002");
      expect(deleteFn).not.toHaveBeenCalledWith("1003");
    });
  });
});
