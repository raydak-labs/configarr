import { describe, expect, it, vi } from "vitest";
import { ServerCache } from "../cache";
import { ChaptarrDownloadClientSync } from "../downloadClients/downloadClientChaptarr";
import { ChaptarrMetadataProfileSync } from "../metadataProfiles/metadataProfileChaptarr";
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

  it("treats an omitted media_type as ebook for every media-dependent sync", () => {
    const syncer = new ChaptarrSyncer() as unknown as {
      createQualityProfileSync(api: unknown, mediaType: undefined): { mediaType?: string };
      createRootFolderSync(api: unknown, mediaType: undefined): { mediaType?: string };
      createMediaManagementSync(api: unknown, mediaType: undefined): { mediaType?: string };
    };
    expect(syncer.createQualityProfileSync(client, undefined).mediaType).toBe("ebook");
    expect(syncer.createRootFolderSync(client, undefined).mediaType).toBe("ebook");
    expect(syncer.createMediaManagementSync(client, undefined).mediaType).toBe("ebook");
  });

  it("uses the Chaptarr metadata profile label", () => {
    const syncer = new ChaptarrSyncer() as unknown as { createMetadataProfileSync(api: unknown): unknown };
    expect(syncer.createMetadataProfileSync(client)).toBeInstanceOf(ChaptarrMetadataProfileSync);
  });
});
