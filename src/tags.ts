import { getClient } from "./clients/client";
import type { TagsClient } from "./clients/capabilities";
import { logger } from "./logger";
import { ArrType } from "./types/common.types";
import { InputConfigDelayProfile } from "./types/config.types";
import { MergedDelayProfileResource, MergedTagResource } from "./types/merged.types";
import { getEnvs } from "./env";

export const loadServerTags = async (arrType: ArrType): Promise<MergedTagResource[]> => {
  if (getEnvs().LOAD_LOCAL_SAMPLES) {
    throw new Error("Local sample loading for tags is not implemented yet.");
  }
  const api: TagsClient = getClient(arrType);
  const serverObjects = await api.getTags();
  return serverObjects;
};
