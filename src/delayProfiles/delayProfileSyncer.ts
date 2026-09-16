import { getClient } from "../clients/client";
import { Tag } from "../tags/tag.types";
import { MediaArrType } from "../types/common.types";
import { InputConfigDelayProfile } from "../types/config.types";
import { DownloadProtocol as RadarrDownloadProtocol } from "../__generated__/radarr/data-contracts";
import { DownloadProtocol as ReadarrDownloadProtocol } from "../__generated__/readarr/data-contracts";
import { DownloadProtocol as SonarrDownloadProtocol } from "../__generated__/sonarr/data-contracts";
import { DownloadProtocol as WhisparrDownloadProtocol } from "../__generated__/whisparr/data-contracts";
import { StandardDelayProfileSync } from "./delayProfileBase";
import { DelayProfileLidarrSync } from "./delayProfileLidarr";

export function createDelayProfileSync(arrType: MediaArrType) {
  switch (arrType) {
    case "LIDARR":
      return new DelayProfileLidarrSync(getClient("LIDARR"));
    case "SONARR":
      return new StandardDelayProfileSync(getClient("SONARR"), SonarrDownloadProtocol);
    case "RADARR":
      return new StandardDelayProfileSync(getClient("RADARR"), RadarrDownloadProtocol);
    case "READARR":
      return new StandardDelayProfileSync(getClient("READARR"), ReadarrDownloadProtocol);
    case "WHISPARR":
      return new StandardDelayProfileSync(getClient("WHISPARR"), WhisparrDownloadProtocol);
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
