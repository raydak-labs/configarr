import { describe, expect, test } from "vitest";
import type { QualityProfileResource } from "../__generated__/readarr/data-contracts";
import { ServerCache } from "../cache";
import type { QualityProfilesClient } from "../clients/capabilities";
import type { CFProcessing, CustomFormatRequest } from "../customFormats/customFormat.types";
import type { QualityDefinitionShared } from "../qualityDefinitions/qualityDefinition.types";
import type { MergedConfigInstance } from "../types/config.types";
import type { QualityProfileShared } from "./qualityProfile.types";
import { QualityProfileChaptarrSync } from "./qualityProfileChaptarr";

const client = {} as QualityProfilesClient<QualityProfileResource>;

const formats: CustomFormatRequest[] = [
  { name: "audio-only", appliesTo: "audiobook" },
  { name: "ebook-only", appliesTo: "ebook" },
  { name: "both", appliesTo: "both" },
  { name: "untyped" },
];

describe("QualityProfileChaptarrSync", () => {
  test("adds the profile type Chaptarr requires", () => {
    const sync = new QualityProfileChaptarrSync(client, "ebook") as unknown as {
      toServerProfile(profile: { name: string }): Record<string, unknown>;
    };
    expect(sync.toServerProfile({ name: "Books" })).toMatchObject({ name: "Books", profileType: "ebook" });
  });

  test("keeps the existing profile type when updating", () => {
    const sync = new QualityProfileChaptarrSync(client, "mixed") as unknown as {
      toServerProfile(profile: { name: string; profileType: string }): Record<string, unknown>;
    };
    expect(sync.toServerProfile({ name: "Audio", profileType: "audiobook", items: [] } as never)).toMatchObject({
      name: "Audio",
      profileType: "audiobook",
    });
  });

  test("keeps only custom formats applicable to the profile media type", () => {
    const sync = new QualityProfileChaptarrSync(client, "ebook") as unknown as {
      customFormatsForProfile(items: CustomFormatRequest[], profile: unknown, serverMatch?: unknown): CustomFormatRequest[];
    };
    expect(sync.customFormatsForProfile(formats, {}).map((item) => item.name)).toEqual(["ebook-only", "both", "untyped"]);
  });

  test("uses the existing server profile's media side in mixed mode", () => {
    const sync = new QualityProfileChaptarrSync(client, "mixed") as unknown as {
      customFormatsForProfile(items: CustomFormatRequest[], profile: unknown, serverMatch?: unknown): CustomFormatRequest[];
    };
    expect(sync.customFormatsForProfile(formats, {}, { name: "Audio", profileType: "audiobook" }).map((item) => item.name)).toEqual([
      "audio-only",
      "both",
      "untyped",
    ]);
  });

  test("defaults an omitted media type to the ebook format side", () => {
    const sync = new QualityProfileChaptarrSync(client) as unknown as {
      customFormatsForProfile(items: CustomFormatRequest[], profile: unknown, serverMatch?: unknown): CustomFormatRequest[];
    };
    expect(sync.customFormatsForProfile(formats, {}).map((item) => item.name)).toEqual(["ebook-only", "both", "untyped"]);
  });

  const definitions: QualityDefinitionShared[] = [
    { id: 1, title: "EPUB", quality: { id: 1, name: "EPUB" } },
    { id: 2, title: "MP3", quality: { id: 10, name: "MP3" } },
  ];

  test("does not admit a quality through a group label from the server profile", () => {
    const sync = new QualityProfileChaptarrSync(client, "ebook") as unknown as {
      qualityDefinitionsForProfile(
        definitions: QualityDefinitionShared[],
        serverMatch: QualityProfileShared,
        profile: unknown,
      ): QualityDefinitionShared[];
    };
    const serverProfile: QualityProfileShared = {
      name: "E-Book",
      items: [
        {
          name: "MP3",
          allowed: true,
          items: [{ allowed: true, items: [], quality: { id: 1, name: "EPUB" } }],
        },
      ],
    };

    expect(sync.qualityDefinitionsForProfile(definitions, serverProfile, {}).map((item) => item.quality?.name)).toEqual(["EPUB"]);
  });

  test("can add a configured quality the existing profile does not have", () => {
    const sync = new QualityProfileChaptarrSync(client, "ebook") as unknown as {
      qualityDefinitionsForProfile(
        definitions: QualityDefinitionShared[],
        serverMatch: QualityProfileShared,
        profile: unknown,
      ): QualityDefinitionShared[];
    };
    const withPdf: QualityDefinitionShared[] = [...definitions, { id: 3, title: "PDF", quality: { id: 3, name: "PDF" } }];
    const serverProfile: QualityProfileShared = {
      name: "E-Book",
      items: [{ allowed: true, items: [], quality: { id: 1, name: "EPUB" } }],
    };

    const result = sync.qualityDefinitionsForProfile(withPdf, serverProfile, {
      qualities: [{ name: "EPUB" }, { name: "PDF" }],
    });
    expect(result.map((item) => item.quality?.name)).toEqual(["EPUB", "PDF"]);
  });

  test("does not admit a quality through a config group label", () => {
    const sync = new QualityProfileChaptarrSync(client, "ebook") as unknown as {
      qualityDefinitionsForProfile(
        definitions: QualityDefinitionShared[],
        serverMatch: undefined,
        profile: { qualities: Array<{ name: string; qualities: string[] }> },
      ): QualityDefinitionShared[];
    };

    const filtered = sync.qualityDefinitionsForProfile(definitions, undefined, {
      qualities: [{ name: "MP3", qualities: ["EPUB"] }],
    });
    expect(filtered.map((item) => item.quality?.name)).toEqual(["EPUB"]);
  });

  test("does not score a custom format the profile's media type excludes on update", async () => {
    const cfMap = {
      carrIdMapping: new Map([
        ["audio-trash", { carrConfig: { configarr_id: "audio-trash", name: "audio-only" }, requestConfig: {} }],
        ["ebook-trash", { carrConfig: { configarr_id: "ebook-trash", name: "ebook-only" }, requestConfig: {} }],
      ]),
      cfNameToCarrConfig: new Map(),
    } satisfies CFProcessing;
    const config = {
      custom_formats: [
        { trash_ids: ["audio-trash"], assign_scores_to: [{ name: "E-Book", score: 100 }] },
        { trash_ids: ["ebook-trash"], assign_scores_to: [{ name: "E-Book", score: 25 }] },
      ],
      quality_profiles: [
        {
          name: "E-Book",
          min_format_score: 5,
          qualities: [{ name: "EPUB" }],
          upgrade: { allowed: false },
          score_set: "default",
        },
      ],
      customFormatDefinitions: [],
      media_management: {},
      media_naming: {},
    } as unknown as MergedConfigInstance;
    const serverProfile: QualityProfileShared = {
      id: 7,
      name: "E-Book",
      minFormatScore: 0,
      upgradeAllowed: false,
      items: [{ allowed: true, items: [], quality: { id: 1, name: "EPUB" } }],
      formatItems: [{ name: "ebook-only", format: 20, score: 0 }],
    };
    const cache = new ServerCache({
      qualityDefinitions: definitions,
      qualityProfiles: [serverProfile],
      customFormats: [
        { id: 30, name: "audio-only", appliesTo: "audiobook" },
        { id: 20, name: "ebook-only", appliesTo: "ebook" },
      ],
      languages: [],
    });

    const result = await new QualityProfileChaptarrSync(client, "ebook").calculateQualityProfilesDiff(cfMap, config, cache);

    const formatItems = result.changedQPs[0]?.formatItems ?? [];
    expect(formatItems.map((item) => item.name)).toEqual(["ebook-only"]);
    expect(formatItems.every((item) => item.format != null)).toBe(true);
  });

  test("scores an audiobook profile's formats in mixed mode", async () => {
    const cfMap = {
      carrIdMapping: new Map([["audio-trash", { carrConfig: { configarr_id: "audio-trash", name: "audio-only" }, requestConfig: {} }]]),
      cfNameToCarrConfig: new Map(),
    } satisfies CFProcessing;
    const config = {
      custom_formats: [{ trash_ids: ["audio-trash"], assign_scores_to: [{ name: "Audio", score: 100 }] }],
      quality_profiles: [
        {
          name: "Audio",
          min_format_score: 5,
          qualities: [{ name: "MP3" }],
          upgrade: { allowed: false },
          score_set: "default",
        },
      ],
      customFormatDefinitions: [],
      media_management: {},
      media_naming: {},
    } as unknown as MergedConfigInstance;
    const serverProfile: QualityProfileShared & { profileType: string } = {
      id: 8,
      name: "Audio",
      profileType: "audiobook",
      minFormatScore: 0,
      upgradeAllowed: false,
      items: [{ allowed: true, items: [], quality: { id: 10, name: "MP3" } }],
      formatItems: [{ name: "audio-only", format: 30, score: 0 }],
    };
    const cache = new ServerCache({
      qualityDefinitions: definitions,
      qualityProfiles: [serverProfile],
      customFormats: [
        { id: 30, name: "audio-only", appliesTo: "audiobook" },
        { id: 20, name: "ebook-only", appliesTo: "ebook" },
      ],
      languages: [],
    });

    const result = await new QualityProfileChaptarrSync(client, "mixed").calculateQualityProfilesDiff(cfMap, config, cache);

    const formatItems = result.changedQPs[0]?.formatItems ?? [];
    expect(formatItems).toEqual([expect.objectContaining({ name: "audio-only", format: 30, score: 100 })]);
  });

  test("treats an omitted media type as ebook when scoring updates", async () => {
    const cfMap = {
      carrIdMapping: new Map([
        ["audio-trash", { carrConfig: { configarr_id: "audio-trash", name: "audio-only" }, requestConfig: {} }],
        ["ebook-trash", { carrConfig: { configarr_id: "ebook-trash", name: "ebook-only" }, requestConfig: {} }],
      ]),
      cfNameToCarrConfig: new Map(),
    } satisfies CFProcessing;
    const config = {
      custom_formats: [
        { trash_ids: ["audio-trash"], assign_scores_to: [{ name: "E-Book", score: 100 }] },
        { trash_ids: ["ebook-trash"], assign_scores_to: [{ name: "E-Book", score: 25 }] },
      ],
      quality_profiles: [
        {
          name: "E-Book",
          min_format_score: 5,
          qualities: [{ name: "EPUB" }],
          upgrade: { allowed: false },
          score_set: "default",
        },
      ],
      customFormatDefinitions: [],
      media_management: {},
      media_naming: {},
    } as unknown as MergedConfigInstance;
    const serverProfile: QualityProfileShared = {
      id: 7,
      name: "E-Book",
      minFormatScore: 0,
      upgradeAllowed: false,
      items: [{ allowed: true, items: [], quality: { id: 1, name: "EPUB" } }],
      formatItems: [{ name: "ebook-only", format: 20, score: 0 }],
    };
    const cache = new ServerCache({
      qualityDefinitions: definitions,
      qualityProfiles: [serverProfile],
      customFormats: [
        { id: 30, name: "audio-only", appliesTo: "audiobook" },
        { id: 20, name: "ebook-only", appliesTo: "ebook" },
      ],
      languages: [],
    });

    const result = await new QualityProfileChaptarrSync(client).calculateQualityProfilesDiff(cfMap, config, cache);

    const formatItems = result.changedQPs[0]?.formatItems ?? [];
    expect(formatItems.map((item) => item.name)).toEqual(["ebook-only"]);
    expect(formatItems.every((item) => item.format != null)).toBe(true);
  });

  test("treats an omitted media type as ebook when creating a profile", async () => {
    const cfMap = {
      carrIdMapping: new Map([
        ["audio-trash", { carrConfig: { configarr_id: "audio-trash", name: "audio-only" }, requestConfig: {} }],
        ["ebook-trash", { carrConfig: { configarr_id: "ebook-trash", name: "ebook-only" }, requestConfig: {} }],
      ]),
      cfNameToCarrConfig: new Map(),
    } satisfies CFProcessing;
    const config = {
      custom_formats: [
        { trash_ids: ["audio-trash"], assign_scores_to: [{ name: "E-Book", score: 100 }] },
        { trash_ids: ["ebook-trash"], assign_scores_to: [{ name: "E-Book", score: 25 }] },
      ],
      quality_profiles: [
        {
          name: "E-Book",
          min_format_score: 0,
          qualities: [{ name: "EPUB" }],
          upgrade: { allowed: false, until_quality: "EPUB" },
          score_set: "default",
        },
      ],
      customFormatDefinitions: [],
      media_management: {},
      media_naming: {},
    } as unknown as MergedConfigInstance;
    const cache = new ServerCache({
      qualityDefinitions: definitions,
      qualityProfiles: [],
      customFormats: [
        { id: 30, name: "audio-only", appliesTo: "audiobook" },
        { id: 20, name: "ebook-only", appliesTo: "ebook" },
      ],
      languages: [],
    });

    const result = await new QualityProfileChaptarrSync(client).calculateQualityProfilesDiff(cfMap, config, cache);

    const formatItems = result.create[0]?.formatItems ?? [];
    expect(formatItems.map((item) => item.name)).toEqual(["ebook-only"]);
    expect(formatItems.every((item) => item.format != null)).toBe(true);
  });

  test("does not score a custom format the media type excludes on an unmanaged profile", async () => {
    const cfMap = {
      carrIdMapping: new Map([
        ["audio-trash", { carrConfig: { configarr_id: "audio-trash", name: "audio-only" }, requestConfig: {} }],
        ["ebook-trash", { carrConfig: { configarr_id: "ebook-trash", name: "ebook-only" }, requestConfig: {} }],
      ]),
      cfNameToCarrConfig: new Map(),
    } satisfies CFProcessing;
    const config = {
      custom_formats: [
        { trash_ids: ["audio-trash"], assign_scores_to: [{ name: "Unmanaged", score: 100 }] },
        { trash_ids: ["ebook-trash"], assign_scores_to: [{ name: "Unmanaged", score: 25 }] },
      ],
      quality_profiles: [],
      customFormatDefinitions: [],
      media_management: {},
      media_naming: {},
    } as unknown as MergedConfigInstance;
    const serverProfile: QualityProfileShared = {
      id: 9,
      name: "Unmanaged",
      minFormatScore: 0,
      upgradeAllowed: false,
      items: [{ allowed: true, items: [], quality: { id: 1, name: "EPUB" } }],
      formatItems: [{ name: "ebook-only", format: 20, score: 0 }],
    };
    const cache = new ServerCache({
      qualityDefinitions: definitions,
      qualityProfiles: [serverProfile],
      customFormats: [
        { id: 30, name: "audio-only", appliesTo: "audiobook" },
        { id: 20, name: "ebook-only", appliesTo: "ebook" },
      ],
      languages: [],
    });

    const result = await new QualityProfileChaptarrSync(client, "ebook").calculateQualityProfilesDiff(cfMap, config, cache);

    const formatItems = result.changedQPs[0]?.formatItems ?? [];
    expect(formatItems).toEqual([expect.objectContaining({ name: "ebook-only", format: 20, score: 25 })]);
  });
});
