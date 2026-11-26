import { describe, expect, it, vi } from "vitest";
import { ServerCache } from "../cache";
import { ChaptarrDownloadClientSync } from "../downloadClients/downloadClientChaptarr";
import { ChaptarrMediaManagementSync } from "../mediaManagement/mediaManagementChaptarr";
import { QualityProfileChaptarrSync } from "../qualityProfiles/qualityProfileChaptarr";
import { ChaptarrRootFolderSync } from "../rootFolder/rootFolderChaptarr";
import type { InputConfigArrInstance } from "../types/config.types";
import { ChaptarrSyncer } from "./chaptarrSyncer";

const client = {};
const { runMedia, completeMedia } = vi.hoisted(() => ({
  runMedia: vi.fn(),
  completeMedia: vi.fn(async () => ({ arrType: "CHAPTARR", instanceName: "e2e", entries: [] })),
}));

vi.mock("../clients/client", () => ({
  getClient: vi.fn(() => ({ getMetadataProfiles: async () => [] })),
}));
vi.mock("./mediaPipeline", () => ({
  runMediaSyncToQualityProfiles: runMedia,
  completeMediaSync: completeMedia,
}));

const instance: InputConfigArrInstance = {
  base_url: "http://chaptarr",
  api_key: "key",
  media_type: "ebook",
};

describe("ChaptarrSyncer", () => {
  it("runs the book pipeline as CHAPTARR with Chaptarr-specific syncs", async () => {
    runMedia.mockResolvedValue({
      arrType: "CHAPTARR",
      instanceName: "e2e",
      config: {},
      serverCache: new ServerCache(),
      collector: { add: vi.fn() },
    });

    const report = await new ChaptarrSyncer().run({}, instance, "e2e");

    const args = runMedia.mock.calls[0]?.[0] as {
      arrType: string;
      syncs: {
        qp: unknown;
        root: unknown;
        downloadClients: unknown;
      };
      mediaSyncs: (mediaType: string) => { mm: unknown; qp: unknown; root: unknown };
    };
    expect(args.arrType).toBe("CHAPTARR");
    expect(args.syncs.qp).toBeInstanceOf(QualityProfileChaptarrSync);
    expect(args.syncs.root).toBeInstanceOf(ChaptarrRootFolderSync);
    expect(args.syncs.downloadClients).toBeInstanceOf(ChaptarrDownloadClientSync);
    // Templates can supply media_type, so the pipeline rebuilds these from the merged value.
    expect(args.mediaSyncs("audiobook").qp).toBeInstanceOf(QualityProfileChaptarrSync);
    expect(args.mediaSyncs("audiobook").root).toBeInstanceOf(ChaptarrRootFolderSync);
    expect(report).toMatchObject({ arrType: "CHAPTARR" });
  });

  it("builds every media-dependent sync when media_type is omitted", async () => {
    runMedia.mockResolvedValue({
      arrType: "CHAPTARR",
      instanceName: "e2e",
      config: {},
      serverCache: new ServerCache(),
      collector: { add: vi.fn() },
    });

    await new ChaptarrSyncer().run({}, { base_url: "http://chaptarr", api_key: "key" }, "e2e");

    const args = runMedia.mock.calls.at(-1)?.[0] as { syncs: { mm: unknown; qp: unknown; root: unknown } };
    expect(args.syncs.mm).toBeInstanceOf(ChaptarrMediaManagementSync);
    expect(args.syncs.qp).toBeInstanceOf(QualityProfileChaptarrSync);
    expect(args.syncs.root).toBeInstanceOf(ChaptarrRootFolderSync);
  });

  it("syncs metadata profiles with the Chaptarr metadata sync", async () => {
    const add = vi.fn();
    runMedia.mockResolvedValue({
      arrType: "CHAPTARR",
      instanceName: "e2e",
      config: {},
      serverCache: new ServerCache(),
      collector: { add },
    });

    await new ChaptarrSyncer().run({}, instance, "e2e");

    expect(add).toHaveBeenCalledWith([]);
  });
});
