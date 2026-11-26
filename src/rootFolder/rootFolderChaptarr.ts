import type { RootFolderResource } from "../__generated__/chaptarr/data-contracts";
import type { ServerCache } from "../cache";
import { logger } from "../logger";
import type { ChaptarrMediaType, InputConfigRootFolder, InputConfigRootFolderChaptarr } from "../types/config.types";
import { ConfigValidationError } from "../validation";
import { nameIdMap, type ProfileAwareRootFolderApi, type ProfileAwareRootFolderFields, ProfileAwareRootFolderSync } from "./rootFolderBase";
import { calibreComparableFields, calibreFieldsFromConfig } from "./rootFolderCalibre";

export type ChaptarrRootFolderApi = ProfileAwareRootFolderApi<RootFolderResource>;

type ChaptarrRootFolderConfig = InputConfigRootFolderChaptarr;

/** Chaptarr's `folderType`. */
const folderTypeByMediaType: Record<ChaptarrMediaType, number> = {
  mixed: 0,
  audiobook: 1,
  ebook: 2,
};

export class ChaptarrRootFolderSync extends ProfileAwareRootFolderSync<ChaptarrRootFolderConfig, RootFolderResource> {
  protected readonly arrName = "Chaptarr";

  constructor(
    api: ChaptarrRootFolderApi,
    private readonly mediaType: ChaptarrMediaType = "ebook",
  ) {
    super(api);
  }

  protected buildResource(config: ChaptarrRootFolderConfig, fields: ProfileAwareRootFolderFields): RootFolderResource {
    const result: RootFolderResource = {
      path: fields.path,
      name: fields.name,
      defaultTags: fields.defaultTags,
      folderType: folderTypeByMediaType[this.mediaType],
      ...calibreFieldsFromConfig(config),
    };

    // A typed folder keeps its profiles per media side; mixed folders are completed in resolveRootFolderConfig.
    if (this.mediaType === "ebook") {
      result.ebookQualityProfileId = fields.defaultQualityProfileId;
      result.ebookMetadataProfileId = fields.defaultMetadataProfileId;
    } else if (this.mediaType === "audiobook") {
      result.audiobookQualityProfileId = fields.defaultQualityProfileId;
      result.audiobookMetadataProfileId = fields.defaultMetadataProfileId;
    }

    return result;
  }

  public override async resolveRootFolderConfig(config: ChaptarrRootFolderConfig, serverCache: ServerCache): Promise<RootFolderResource> {
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

  protected override extraComparableFields(resource: RootFolderResource): Record<string, unknown> {
    const fields: Record<string, unknown> = { ...calibreComparableFields(resource), folderType: resource.folderType };

    if (this.mediaType !== "audiobook") {
      fields.ebookQualityProfileId = resource.ebookQualityProfileId;
      fields.ebookMetadataProfileId = resource.ebookMetadataProfileId;
    }
    if (this.mediaType !== "ebook") {
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

const typedProfileKeys = [
  "ebook_quality_profile",
  "ebook_metadata_profile",
  "audiobook_quality_profile",
  "audiobook_metadata_profile",
] as const;

/** Readarr and Lidarr keys Chaptarr's root folder API has no field for. */
const unsupportedKeys = ["monitor", "monitor_new_items", "monitor_new_album"] as const;

/** Typed profile keys outside Chaptarr `mixed` throw; keys Chaptarr has no field for are ignored with a warning. */
export function validateChaptarrRootFolderFields(
  rootFolders: ReadonlyArray<InputConfigRootFolder> | undefined,
  arrType: string,
  mediaType: ChaptarrMediaType | undefined,
): void {
  const folders = (rootFolders ?? []).filter((folder) => typeof folder !== "string");
  const keysUsed = (candidates: readonly string[]) => candidates.filter((key) => folders.some((folder) => key in folder));

  if (arrType === "CHAPTARR") {
    const unsupported = keysUsed(unsupportedKeys);
    if (unsupported.length > 0) {
      logger.warn(
        `Chaptarr root folders have no field for ${unsupported.join(", ")}; these keys are ignored. Remove them from the config.`,
      );
    }
  }

  if (arrType === "CHAPTARR" && mediaType === "mixed") return;

  const used = new Set(keysUsed(typedProfileKeys));
  if (used.size === 0) return;

  const keys = [...used].join(", ");
  throw new ConfigValidationError(
    arrType === "CHAPTARR"
      ? `root folder fields ${keys} apply only to media_type: mixed`
      : `root folder fields ${keys} are supported only by Chaptarr, not ${arrType}`,
  );
}
