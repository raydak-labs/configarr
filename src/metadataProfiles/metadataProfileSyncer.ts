import { getClient } from "../clients/client";
import { LidarrMetadataProfileSync } from "./metadataProfileLidarr";
import { ReadarrMetadataProfileSync } from "./metadataProfileReadarr";

export function createMetadataProfileSync(arrType: "LIDARR"): LidarrMetadataProfileSync;
export function createMetadataProfileSync(arrType: "READARR"): ReadarrMetadataProfileSync;
export function createMetadataProfileSync(arrType: "LIDARR" | "READARR") {
  switch (arrType) {
    case "LIDARR":
      return new LidarrMetadataProfileSync(getClient("LIDARR"));
    case "READARR":
      return new ReadarrMetadataProfileSync(getClient("READARR"));
  }
}
