import type { MediaManagementConfigResource, NamingConfigResource } from "../__generated__/chaptarr/data-contracts";
import type { MediaManagementClient } from "../clients/capabilities";
import type { ChaptarrMediaType, MediaNamingApiType } from "../types/config.types";
import { MediaManagementSync } from "./mediaManagement";

/**
 * Chaptarr's ebook side owns its own naming keys. A generic `media_naming_api` block
 * keeps the familiar book names (`standardBookFormat`, `authorFolderFormat`) and is
 * translated to the ebook keys only when the instance declares `media_type: ebook`.
 * Audiobook and mixed instances keep the generic keys.
 */
export class ChaptarrMediaManagementSync extends MediaManagementSync<NamingConfigResource, MediaManagementConfigResource> {
  constructor(
    api: MediaManagementClient<NamingConfigResource, MediaManagementConfigResource>,
    private readonly mediaType: ChaptarrMediaType = "ebook",
  ) {
    super(api);
  }

  protected override mapNamingApi(mediaNaming: MediaNamingApiType): MediaNamingApiType {
    if (this.mediaType !== "ebook") return mediaNaming;

    const { standardBookFormat, authorFolderFormat, ...rest } = mediaNaming;
    return {
      ...rest,
      ...(standardBookFormat !== undefined && { ebookStandardBookFormat: standardBookFormat }),
      ...(authorFolderFormat !== undefined && { ebookAuthorFolderFormat: authorFolderFormat }),
    };
  }
}
