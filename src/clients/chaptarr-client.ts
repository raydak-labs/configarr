import type { RemotePathMappingResource } from "../__generated__/readarr/data-contracts";
import { ReadarrClient } from "./readarr-client";

/** Chaptarr adds a required client id to the Readarr remote path mapping shape. */
type ChaptarrRemotePathMappingResource = RemotePathMappingResource & { downloadClientId: number };

/**
 * Read a mapping's client id when the server resource carries it. The generated vanilla-Readarr
 * contract omits the field, so the check narrows instead of casting.
 */
function existingDownloadClientId(mapping: RemotePathMappingResource): number | undefined {
  if (!("downloadClientId" in mapping)) return undefined;
  return typeof mapping.downloadClientId === "number" ? mapping.downloadClientId : undefined;
}

/** Chaptarr keeps Readarr's API surface; only the diagnostics label differs. */
export class ChaptarrClient extends ReadarrClient {
  constructor(baseUrl: string, apiKey: string) {
    super(baseUrl, apiKey, "CHAPTARR");
  }

  // Chaptarr requires a download client id on the mapping resource, even when the
  // mapping is global. Zero is accepted and keeps a new mapping unattached.
  override async createRemotePathMapping(mapping: RemotePathMappingResource): Promise<RemotePathMappingResource> {
    const payload: ChaptarrRemotePathMappingResource = { ...mapping, downloadClientId: existingDownloadClientId(mapping) ?? 0 };
    return super.createRemotePathMapping(payload);
  }

  // Path-only updates start from the server mapping, so keep its client id instead of
  // turning a client-specific mapping into a global one.
  override async updateRemotePathMapping(
    id: string,
    mapping: RemotePathMappingResource & { downloadClientId?: number },
  ): Promise<RemotePathMappingResource> {
    const payload: ChaptarrRemotePathMappingResource = { ...mapping, downloadClientId: existingDownloadClientId(mapping) ?? 0 };
    return super.updateRemotePathMapping(id, payload);
  }
}
