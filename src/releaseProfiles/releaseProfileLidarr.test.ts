import { describe, expect, test, vi, beforeEach } from "vitest";
import { logger } from "../logger";
import { ReleaseProfileLidarrSync } from "./releaseProfileLidarr";

vi.spyOn(logger, "warn").mockImplementation(() => undefined);

const api = {
  getReleaseProfiles: vi.fn(),
  createReleaseProfile: vi.fn(),
  updateReleaseProfile: vi.fn(),
  deleteReleaseProfile: vi.fn(),
  getTags: vi.fn(),
  createTag: vi.fn(),
  deleteTag: vi.fn(),
  getIndexers: vi.fn(),
};

describe("ReleaseProfileLidarrSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("drops name from the payload and warns once", () => {
    const sync = new ReleaseProfileLidarrSync(api);

    expect(sync.mapToServer({ name: "HEVC", required: ["hevc"] }, [], 0)).toEqual({
      enabled: true,
      required: ["hevc"],
      ignored: [],
      indexerId: 0,
      tags: [],
    });
    sync.mapToServer({ name: "Other", required: ["x265"] }, [], 0);

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith("Release profile 'name' is not supported on this *arr and will be ignored.");
  });
});
