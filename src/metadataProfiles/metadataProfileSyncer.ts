import { LidarrMetadataProfileSync } from "./metadataProfileLidarr";
import { ReadarrMetadataProfileSync } from "./metadataProfileReadarr";

export function createMetadataProfileSync(arrType: "LIDARR"): LidarrMetadataProfileSync;
export function createMetadataProfileSync(arrType: "READARR"): ReadarrMetadataProfileSync;
export function createMetadataProfileSync(arrType: "LIDARR" | "READARR") {
  switch (arrType) {
    case "LIDARR":
      return new LidarrMetadataProfileSync();
    case "READARR":
      return new ReadarrMetadataProfileSync();
  }
}
