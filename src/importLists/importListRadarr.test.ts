import { afterEach, expect, test, vi } from "vitest";
import { ServerCache } from "../cache";
import { RadarrClient } from "../clients/radarr-client";
import type { MergedConfigInstance } from "../types/config.types";
import { RadarrImportListSync } from "./importListRadarr";

afterEach(() => vi.unstubAllGlobals());

test("preserves a masked provider secret on unchanged and unrelated updates", async () => {
  const fields = [
    { name: "apiKey", value: "********", privacy: "password" },
    { name: "credential", value: "********", privacy: "password" },
    { name: "listId", value: "old" },
  ];
  const item = { id: 2, name: "list", implementation: "Provider", enabled: false, qualityProfileId: 1, rootFolderPath: "/movies", fields };
  const writes: unknown[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const path = new URL(request.url).pathname;
      if (request.method === "PUT") {
        writes.push(await request.json());
        return Response.json(item);
      }
      if (path.endsWith("/importlist/schema")) return Response.json([{ implementation: "Provider", fields }]);
      if (path.endsWith("/importlist")) return Response.json([item]);
      if (path.endsWith("/qualityprofile")) return Response.json([{ id: 1, name: "HD" }]);
      if (path.endsWith("/rootfolder")) return Response.json([{ id: 1, path: "/movies" }]);
      throw new Error(`Unexpected path: ${path}`);
    }),
  );
  const sync = new RadarrImportListSync(new RadarrClient("http://radarr.test", "key"));
  const instance = {} as MergedConfigInstance;
  const config = { name: "list", type: "Provider", fields: { api_key: "configured-secret", credential: "private-value", list_id: "old" } };
  expect(await sync.sync({ data: [config] }, new ServerCache(), instance)).toEqual([]);
  expect(writes).toHaveLength(0);
  const report = await sync.sync({ data: [{ ...config, fields: { ...config.fields, list_id: "new" } }] }, new ServerCache(), instance);
  expect(report).toHaveLength(1);
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({
    fields: [
      { name: "apiKey", value: "********" },
      { name: "credential", value: "********" },
      { name: "listId", value: "new" },
    ],
  });
  expect(JSON.stringify(report)).not.toContain("configured-secret");
});

test.each([
  {
    label: "root folder",
    instance: { root_folders: ["/other"], quality_profiles: [] },
    message: "root folder is scheduled for removal",
    serverRoot: "/movies",
  },
  {
    label: "root folder with a trailing slash",
    instance: { root_folders: ["/movies"], quality_profiles: [] },
    message: "root folder is scheduled for removal",
    serverRoot: "/movies/",
    existingRoot: "/movies/",
  },
  {
    label: "existing root while switching to a new root",
    instance: { root_folders: ["/new"], quality_profiles: [] },
    message: "root folder is scheduled for removal",
    serverRoot: "/movies",
    existingRoot: "/movies",
    requestedRoot: "/new",
  },
  {
    label: "quality profile",
    instance: { quality_profiles: [], delete_unmanaged_quality_profiles: { enabled: true } },
    message: "quality profile is scheduled for removal",
    serverRoot: "/movies",
  },
  {
    label: "existing profile while switching to an ignored profile",
    instance: { quality_profiles: [], root_folders: ["/movies"], delete_unmanaged_quality_profiles: { enabled: true, ignore: ["HD"] } },
    message: "quality profile is scheduled for removal",
    serverRoot: "/movies",
    existingRoot: "/movies",
    existingProfileId: 2,
  },
])(
  "rejects an import list whose $label would be removed by the same run",
  async ({ instance, message, serverRoot, existingRoot, existingProfileId, requestedRoot }) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const path = new URL(request.url).pathname;
        if (path.endsWith("/importlist/schema")) return Response.json([{ implementation: "Provider", fields: [] }]);
        if (path.endsWith("/importlist"))
          return Response.json(
            existingRoot
              ? [
                  {
                    id: 2,
                    name: "list",
                    implementation: "Provider",
                    qualityProfileId: existingProfileId ?? 1,
                    rootFolderPath: existingRoot,
                  },
                ]
              : [],
          );
        if (path.endsWith("/qualityprofile"))
          return Response.json([
            { id: 1, name: "HD" },
            { id: 2, name: "Old" },
          ]);
        if (path.endsWith("/rootfolder")) return Response.json([{ id: 1, path: serverRoot }]);
        throw new Error(`Unexpected path: ${path}`);
      }),
    );
    const sync = new RadarrImportListSync(new RadarrClient("http://radarr.test", "key"));
    await expect(
      sync.validateConfig(
        { data: [{ name: "list", type: "Provider", quality_profile: "HD", root_folder: requestedRoot ?? serverRoot }] },
        { ...instance, custom_formats: [] },
      ),
    ).rejects.toThrow(message);
  },
);

test("accepts an existing normalized root alias when one matching server root is retained", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const path = new URL(request.url).pathname;
      if (path.endsWith("/importlist/schema")) return Response.json([{ implementation: "Provider", fields: [] }]);
      if (path.endsWith("/importlist"))
        return Response.json([{ id: 2, name: "list", implementation: "Provider", qualityProfileId: 1, rootFolderPath: "/movies//" }]);
      if (path.endsWith("/qualityprofile")) return Response.json([{ id: 1, name: "HD" }]);
      if (path.endsWith("/rootfolder"))
        return Response.json([
          { id: 1, path: "/movies" },
          { id: 2, path: "/movies/" },
        ]);
      throw new Error(`Unexpected path: ${path}`);
    }),
  );
  const sync = new RadarrImportListSync(new RadarrClient("http://radarr.test", "key"));
  await expect(
    sync.validateConfig(
      { data: [{ name: "list", type: "Provider", quality_profile: "HD", root_folder: "/movies//" }] },
      { custom_formats: [], quality_profiles: [], root_folders: ["/movies/"] },
    ),
  ).resolves.toBeUndefined();
});

test.each([
  {
    label: "retained server root referenced with a trailing slash",
    serverRoot: "/movies",
    requestedRoot: "/movies/",
    rootFolders: ["/movies"],
    ignore: ["HD"],
  },
  { label: "root created in the same run", serverRoot: "/other", requestedRoot: "/movies", rootFolders: ["/movies"], ignore: ["HD"] },
  {
    label: "new root replacing an equivalent existing root",
    serverRoot: "/movies/",
    requestedRoot: "/movies",
    rootFolders: ["/movies"],
    ignore: ["HD"],
  },
])("accepts a $label and an ignored quality profile", async ({ serverRoot, requestedRoot, rootFolders, ignore }) => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const path = new URL(request.url).pathname;
      if (path.endsWith("/importlist/schema")) return Response.json([{ implementation: "Provider", fields: [] }]);
      if (path.endsWith("/importlist")) return Response.json([]);
      if (path.endsWith("/qualityprofile")) return Response.json([{ id: 1, name: "HD" }]);
      if (path.endsWith("/rootfolder")) return Response.json([{ id: 1, path: serverRoot }]);
      throw new Error(`Unexpected path: ${path}`);
    }),
  );
  const sync = new RadarrImportListSync(new RadarrClient("http://radarr.test", "key"));
  await expect(
    sync.validateConfig(
      { data: [{ name: "list", type: "Provider", quality_profile: "HD", root_folder: requestedRoot }] },
      { custom_formats: [], quality_profiles: [], root_folders: rootFolders, delete_unmanaged_quality_profiles: { enabled: true, ignore } },
    ),
  ).resolves.toBeUndefined();
});
