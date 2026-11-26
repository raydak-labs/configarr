import { describe, expect, test, vi } from "vitest";
import { ChaptarrMediaManagementSync } from "./mediaManagementChaptarr";

function stubApi(serverNaming: Record<string, unknown>) {
  const api = {
    getNaming: vi.fn(async () => serverNaming),
    updateNaming: vi.fn(async (_id: string, _data: Record<string, unknown>) => serverNaming),
    getMediamanagement: vi.fn(async () => ({ id: 2 })),
    updateMediamanagement: vi.fn(async () => ({ id: 2 })),
  };
  return api;
}

describe("ChaptarrMediaManagementSync", () => {
  test("maps generic book naming to the ebook keys for media_type ebook", async () => {
    const api = stubApi({
      id: 1,
      standardBookFormat: "old",
      authorFolderFormat: "old",
      ebookStandardBookFormat: null,
      ebookAuthorFolderFormat: null,
    });

    const sync = new ChaptarrMediaManagementSync(api as never, "ebook");
    const diff = await sync.persistNaming({ standardBookFormat: "{Author}/{Title}", authorFolderFormat: "{Author}" }, true);

    expect(api.updateNaming).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({
        ebookStandardBookFormat: "{Author}/{Title}",
        ebookAuthorFolderFormat: "{Author}",
        standardBookFormat: "old",
        authorFolderFormat: "old",
      }),
    );
    expect(diff?.changes).toEqual([
      { field: "ebookStandardBookFormat", from: null, to: "{Author}/{Title}" },
      { field: "ebookAuthorFolderFormat", from: null, to: "{Author}" },
    ]);
  });

  test("keeps the generic keys for audiobook and mixed", async () => {
    for (const mediaType of ["audiobook", "mixed"] as const) {
      const api = stubApi({ id: 1, standardBookFormat: "old", authorFolderFormat: "old" });
      const sync = new ChaptarrMediaManagementSync(api as never, mediaType);
      await sync.persistNaming({ standardBookFormat: "{Author}/{Title}" }, true);
      expect(api.updateNaming).toHaveBeenCalledWith("1", expect.objectContaining({ standardBookFormat: "{Author}/{Title}" }));
      expect(api.updateNaming.mock.calls[0]?.[1]).not.toHaveProperty("ebookStandardBookFormat");
    }
  });

  test("is idempotent when the ebook keys already match", async () => {
    const api = stubApi({
      id: 1,
      standardBookFormat: "old",
      ebookStandardBookFormat: "{Author}/{Title}",
      ebookAuthorFolderFormat: "{Author}",
    });
    const sync = new ChaptarrMediaManagementSync(api as never, "ebook");
    const diff = await sync.persistNaming({ standardBookFormat: "{Author}/{Title}", authorFolderFormat: "{Author}" }, true);
    expect(diff).toBeNull();
    expect(api.updateNaming).not.toHaveBeenCalled();
  });
});
