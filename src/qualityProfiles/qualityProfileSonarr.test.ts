import path from "path";
import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import * as log from "../logger";
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

    test("deleteAll deletes every quality profile returned by server", async () => {
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
      const getFn = vi.fn().mockResolvedValue([qp1, qp2, qp3]);
      const logSpy = vi.spyOn(log.logger, "info").mockImplementation(() => {});

      await new QualityProfileSonarrSync({
        getQualityProfiles: getFn,
        createQualityProfile: vi.fn(),
        updateQualityProfile: vi.fn(),
        deleteQualityProfile: deleteFn,
      }).deleteAll();

      expect(deleteFn).toHaveBeenCalledTimes(3);
      expect(deleteFn).toHaveBeenNthCalledWith(1, "1001");
      expect(deleteFn).toHaveBeenNthCalledWith(2, "1002");
      expect(deleteFn).toHaveBeenNthCalledWith(3, "1003");

      expect(logSpy).toHaveBeenCalledWith("Deleted QP: 'QP-1'");
      expect(logSpy).toHaveBeenCalledWith("Deleted QP: 'QP-2'");
      expect(logSpy).toHaveBeenCalledWith("Deleted QP: 'QP-3'");
    });

    test("when no profiles then no deletions by deleteAll", async () => {
      const deleteFn = vi.fn();
      const getFn = vi.fn().mockResolvedValue([]);

      await new QualityProfileSonarrSync({
        getQualityProfiles: getFn,
        createQualityProfile: vi.fn(),
        updateQualityProfile: vi.fn(),
        deleteQualityProfile: deleteFn,
      }).deleteAll();

      expect(getFn).toHaveBeenCalledTimes(1);
      expect(deleteFn).not.toHaveBeenCalled();
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
