import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaManagementClient } from "../clients/capabilities";
import { MediaManagementSync, mediamanagementDiffToDiffEntries, namingDiffToDiffEntries } from "./mediaManagement";

type Naming = { id?: number; renameEpisodes?: boolean };
type Management = { id?: number; autoUnmonitorPreviouslyDownloadedEpisodes?: boolean };

vi.mock("../logger", () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const createApi = () => ({
  getNaming: vi.fn(),
  updateNaming: vi.fn(),
  getMediamanagement: vi.fn(),
  updateMediamanagement: vi.fn(),
});

const createSync = () => {
  const api = createApi();
  return { api, sync: new MediaManagementSync<Naming, Management>(api as unknown as MediaManagementClient<Naming, Management>) };
};

describe("MediaManagementSync.persistNaming", () => {
  let ctx: ReturnType<typeof createSync>;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createSync();
  });

  it("does nothing when no media_naming_api is configured", async () => {
    const result = await ctx.sync.persistNaming(undefined, true);

    expect(result).toBeNull();
    expect(ctx.api.getNaming).not.toHaveBeenCalled();
    expect(ctx.api.updateNaming).not.toHaveBeenCalled();
  });

  it("returns null and skips the write when the server is already in sync", async () => {
    ctx.api.getNaming.mockResolvedValue({ id: 1, renameEpisodes: false });

    const result = await ctx.sync.persistNaming({ renameEpisodes: false }, true);

    expect(result).toBeNull();
    expect(ctx.api.updateNaming).not.toHaveBeenCalled();
  });

  it("updates the naming config with the server id when a diff exists", async () => {
    ctx.api.getNaming.mockResolvedValue({ id: 1, renameEpisodes: false });
    ctx.api.updateNaming.mockResolvedValue(undefined);

    const result = await ctx.sync.persistNaming({ renameEpisodes: true }, true);

    expect(ctx.api.updateNaming).toHaveBeenCalledWith("1", { id: 1, renameEpisodes: true });
    expect(result?.changes).toEqual([{ field: "renameEpisodes", from: false, to: true }]);
    expect(result?.updatedData).toEqual({ id: 1, renameEpisodes: true });
  });

  it("does not write when write is false but still reports the diff", async () => {
    ctx.api.getNaming.mockResolvedValue({ id: 1, renameEpisodes: false });

    const result = await ctx.sync.persistNaming({ renameEpisodes: true }, false);

    expect(ctx.api.updateNaming).not.toHaveBeenCalled();
    expect(result?.changes).toEqual([{ field: "renameEpisodes", from: false, to: true }]);
  });

  it("throws when the server naming response has no id", async () => {
    ctx.api.getNaming.mockResolvedValue({ renameEpisodes: false });

    await expect(ctx.sync.persistNaming({ renameEpisodes: true }, true)).rejects.toThrow(
      "Naming configuration response is missing its id.",
    );
    expect(ctx.api.updateNaming).not.toHaveBeenCalled();
  });

  it("propagates write failures", async () => {
    ctx.api.getNaming.mockResolvedValue({ id: 1, renameEpisodes: false });
    ctx.api.updateNaming.mockRejectedValue(new Error("500 from server"));

    await expect(ctx.sync.persistNaming({ renameEpisodes: true }, true)).rejects.toThrow("500 from server");
  });
});

describe("MediaManagementSync.persistMediamanagement", () => {
  let ctx: ReturnType<typeof createSync>;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createSync();
  });

  it("does nothing when no media_management is configured", async () => {
    const result = await ctx.sync.persistMediamanagement(undefined, true);

    expect(result).toBeNull();
    expect(ctx.api.getMediamanagement).not.toHaveBeenCalled();
    expect(ctx.api.updateMediamanagement).not.toHaveBeenCalled();
  });

  it("returns null and skips the write when the server is already in sync", async () => {
    ctx.api.getMediamanagement.mockResolvedValue({ id: 2, autoUnmonitorPreviouslyDownloadedEpisodes: true });

    const result = await ctx.sync.persistMediamanagement({ autoUnmonitorPreviouslyDownloadedEpisodes: true }, true);

    expect(result).toBeNull();
    expect(ctx.api.updateMediamanagement).not.toHaveBeenCalled();
  });

  it("updates the media management config with the server id when a diff exists", async () => {
    ctx.api.getMediamanagement.mockResolvedValue({ id: 2, autoUnmonitorPreviouslyDownloadedEpisodes: true });
    ctx.api.updateMediamanagement.mockResolvedValue(undefined);

    const result = await ctx.sync.persistMediamanagement({ autoUnmonitorPreviouslyDownloadedEpisodes: false }, true);

    expect(ctx.api.updateMediamanagement).toHaveBeenCalledWith("2", { id: 2, autoUnmonitorPreviouslyDownloadedEpisodes: false });
    expect(result?.changes).toEqual([{ field: "autoUnmonitorPreviouslyDownloadedEpisodes", from: true, to: false }]);
  });

  it("does not write when write is false but still reports the diff", async () => {
    ctx.api.getMediamanagement.mockResolvedValue({ id: 2, autoUnmonitorPreviouslyDownloadedEpisodes: true });

    const result = await ctx.sync.persistMediamanagement({ autoUnmonitorPreviouslyDownloadedEpisodes: false }, false);

    expect(ctx.api.updateMediamanagement).not.toHaveBeenCalled();
    expect(result?.changes).toEqual([{ field: "autoUnmonitorPreviouslyDownloadedEpisodes", from: true, to: false }]);
  });

  it("throws when the server media management response has no id", async () => {
    ctx.api.getMediamanagement.mockResolvedValue({ autoUnmonitorPreviouslyDownloadedEpisodes: true });

    await expect(ctx.sync.persistMediamanagement({ autoUnmonitorPreviouslyDownloadedEpisodes: false }, true)).rejects.toThrow(
      "Media-management configuration response is missing its id.",
    );
    expect(ctx.api.updateMediamanagement).not.toHaveBeenCalled();
  });
});

describe("diff entries", () => {
  it("converts a naming diff into a DiffEntry", () => {
    expect(namingDiffToDiffEntries({ changes: [{ field: "renameEpisodes", from: false, to: true }] })).toEqual([
      {
        resourceType: "MediaNaming",
        name: "MediaNaming",
        action: "update",
        fieldChanges: [{ field: "renameEpisodes", from: false, to: true }],
      },
    ]);
  });

  it("converts a media management diff into a DiffEntry", () => {
    expect(
      mediamanagementDiffToDiffEntries({ changes: [{ field: "autoUnmonitorPreviouslyDownloadedEpisodes", from: true, to: false }] }),
    ).toEqual([
      {
        resourceType: "MediaManagement",
        name: "MediaManagement",
        action: "update",
        fieldChanges: [{ field: "autoUnmonitorPreviouslyDownloadedEpisodes", from: true, to: false }],
      },
    ]);
  });
});
