import type { RootFolderResource } from "../__generated__/readarr/data-contracts";
import type { ServerCache } from "../cache";
import type { InputConfigRootFolderReadarr, ReadarrMediaType } from "../types/config.types";
import { ConfigValidationError } from "../validation";
import { nameIdMap, type ProfileAwareRootFolderApi, type ProfileAwareRootFolderFields } from "./rootFolderBase";
import { ReadarrRootFolderSync } from "./rootFolderReadarr";

/** Chaptarr fields that the generated vanilla-Readarr contract does not declare. */
export type ChaptarrRootFolderFields = {
  /** 0 = mixed, 1 = audiobook, 2 = ebook. */
  folderType?: number;
  ebookQualityProfileId?: number;
  ebookMetadataProfileId?: number;
  audiobookQualityProfileId?: number;
  audiobookMetadataProfileId?: number;
};

export type ChaptarrRootFolderResource = RootFolderResource & ChaptarrRootFolderFields;
export type ChaptarrRootFolderApi = ProfileAwareRootFolderApi<ChaptarrRootFolderResource>;

type ChaptarrRootFolderConfig = InputConfigRootFolderReadarr;

const folderTypeByMediaType: Record<ReadarrMediaType, number> = {
  mixed: 0,
  audiobook: 1,
  ebook: 2,
};

export class ChaptarrRootFolderSync extends ReadarrRootFolderSync<ChaptarrRootFolderResource> {
  constructor(
    api: ChaptarrRootFolderApi,
    private readonly mediaType: ReadarrMediaType = "ebook",
  ) {
    super(api, "Chaptarr");
  }

  protected override buildResource(config: ChaptarrRootFolderConfig, fields: ProfileAwareRootFolderFields): ChaptarrRootFolderResource {
    const result = super.buildResource(config, fields);

    // Typed Chaptarr folders use their per-media profile ids instead of the defaults.
    delete result.defaultMetadataProfileId;
    delete result.defaultQualityProfileId;
    result.folderType = folderTypeByMediaType[this.mediaType];

    const qualityProfileId = fields.defaultQualityProfileId;
    const metadataProfileId = fields.defaultMetadataProfileId;
    if (this.mediaType === "ebook") {
      result.ebookQualityProfileId = qualityProfileId;
      result.ebookMetadataProfileId = metadataProfileId;
    } else if (this.mediaType === "audiobook") {
      result.audiobookQualityProfileId = qualityProfileId;
      result.audiobookMetadataProfileId = metadataProfileId;
    }

    return result;
  }

  public override async resolveRootFolderConfig(
    config: ChaptarrRootFolderConfig,
    serverCache: ServerCache,
  ): Promise<ChaptarrRootFolderResource> {
    const resource = await super.resolveRootFolderConfig(config, serverCache);

    // A mixed folder owns both media sides. Each side falls back to the primary profiles.
    if (this.mediaType === "mixed") {
      const qualityProfiles = serverCache.qualityProfiles.length > 0 ? serverCache.qualityProfiles : await this.api.getQualityProfiles();
      const quality = nameIdMap(qualityProfiles);
      const metadata = nameIdMap(await this.api.getMetadataProfiles());

      resource.ebookQualityProfileId = resolveProfileId(config.ebook_quality_profile ?? config.quality_profile, quality, "quality");
      resource.ebookMetadataProfileId = resolveProfileId(config.ebook_metadata_profile ?? config.metadata_profile, metadata, "metadata");
      resource.audiobookQualityProfileId = resolveProfileId(config.audiobook_quality_profile ?? config.quality_profile, quality, "quality");
      resource.audiobookMetadataProfileId = resolveProfileId(
        config.audiobook_metadata_profile ?? config.metadata_profile,
        metadata,
        "metadata",
      );
    }

    return resource;
  }

  protected override extraComparableFields(resource: ChaptarrRootFolderResource): Record<string, unknown> {
    const fields = super.extraComparableFields(resource);
    fields.folderType = resource.folderType;

    if (this.mediaType === "ebook") {
      fields.ebookQualityProfileId = resource.ebookQualityProfileId;
      fields.ebookMetadataProfileId = resource.ebookMetadataProfileId;
    } else if (this.mediaType === "audiobook") {
      fields.audiobookQualityProfileId = resource.audiobookQualityProfileId;
      fields.audiobookMetadataProfileId = resource.audiobookMetadataProfileId;
    } else if (this.mediaType === "mixed") {
      fields.ebookQualityProfileId = resource.ebookQualityProfileId;
      fields.ebookMetadataProfileId = resource.ebookMetadataProfileId;
      fields.audiobookQualityProfileId = resource.audiobookQualityProfileId;
      fields.audiobookMetadataProfileId = resource.audiobookMetadataProfileId;
    }

    return fields;
  }
}

function resolveProfileId(name: string | undefined, profiles: Map<string, number>, kind: string): number | undefined {
  if (name === undefined) return undefined;
  const id = profiles.get(name);
  if (id === undefined) throw new ConfigValidationError(`${kind} profile '${name}' not found on Chaptarr server`);
  return id;
}
