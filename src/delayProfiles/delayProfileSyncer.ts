import { Tag } from "../tags/tag.types";
import { MediaArrType } from "../types/common.types";
import { InputConfigDelayProfile } from "../types/config.types";
import { DelayProfileLidarrSync } from "./delayProfileLidarr";
import { DelayProfileRadarrSync } from "./delayProfileRadarr";
import { DelayProfileReadarrSync } from "./delayProfileReadarr";
import { DelayProfileSonarrSync } from "./delayProfileSonarr";
import { DelayProfileWhisparrSync } from "./delayProfileWhisparr";

export function createDelayProfileSync(arrType: MediaArrType) {
  switch (arrType) {
    case "LIDARR":
      return new DelayProfileLidarrSync();
    case "SONARR":
      return new DelayProfileSonarrSync();
    case "RADARR":
      return new DelayProfileRadarrSync();
    case "READARR":
      return new DelayProfileReadarrSync();
    case "WHISPARR":
      return new DelayProfileWhisparrSync();
  }
}

export const deleteAdditionalDelayProfiles = async (arrType: MediaArrType) => {
  await createDelayProfileSync(arrType).deleteAdditional();
};

export const createDelayProfileOnServer = async (arrType: MediaArrType, profile: InputConfigDelayProfile, tags: Tag[]) => {
  return createDelayProfileSync(arrType).createFromConfig(profile, tags);
};

export const updateDelayProfileOnServer = async (arrType: MediaArrType, profile: InputConfigDelayProfile, tags: Tag[], id: string) => {
  await createDelayProfileSync(arrType).updateDefaultFromConfig(profile, tags, id);
};

export const calculateDelayProfilesDiff = async (
  arrType: MediaArrType,
  delayProfilesObj: { default?: InputConfigDelayProfile; additional?: InputConfigDelayProfile[] },
  tags: Tag[],
) => {
  return createDelayProfileSync(arrType).calculateDiff(delayProfilesObj, tags);
};

export const mapToServerDelayProfile = (arrType: MediaArrType, profile: InputConfigDelayProfile, serverTags: Tag[]) => {
  return createDelayProfileSync(arrType).mapToServer(profile, serverTags);
};
