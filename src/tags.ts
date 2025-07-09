import { getUnifiedClient } from "./clients/unified-client";
import { logger } from "./logger";
import { InputConfigDelayProfile } from "./types/config.types";
import { MergedDelayProfileResource, MergedTagResource } from "./__generated__/mergedTypes";
import { getEnvs } from "./env";

export const loadServerTags = async (): Promise<MergedTagResource[]> => {
  if (getEnvs().LOAD_LOCAL_SAMPLES) {
    throw new Error("Local sample loading for tags is not implemented yet.");
  }
  const api = getUnifiedClient();
  const serverObjects = await api.getTags();
  return serverObjects;
};
