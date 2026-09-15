import { Tag } from "../tags/tag.types";
import { MediaArrType } from "../types/common.types";
import { InputConfigDelayProfile } from "../types/config.types";
import { DelayProfileGenericSync } from "./delayProfileGeneric";
import { DelayProfileLidarrSync } from "./delayProfileLidarr";

export function createDelayProfileSync(arrType: MediaArrType): DelayProfileGenericSync | DelayProfileLidarrSync {
  if (arrType === "LIDARR") {
    return new DelayProfileLidarrSync();
  }
  return new DelayProfileGenericSync(arrType);
}

export const deleteAdditionalDelayProfiles = async (arrType: MediaArrType) => {
  await createDelayProfileSync(arrType).deleteAdditional();
};

export const createDelayProfileOnServer = async (arrType: MediaArrType, profile: InputConfigDelayProfile, tags: Tag[]) => {
  return createDelayProfileSync(arrType).createFromConfig(profile, tags);
};

export const updateDelayProfileOnServer = async (arrType: MediaArrType, profile: InputConfigDelayProfile, tags: Tag[]) => {
  await createDelayProfileSync(arrType).updateDefaultFromConfig(profile, tags);
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
