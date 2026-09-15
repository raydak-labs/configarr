import type { Tag } from "./tag.types";
import { getClient } from "../clients/client";
import { getEnvs } from "../env";
import { ArrType } from "../types/common.types";

export const loadServerTags = async (arrType: ArrType): Promise<Tag[]> => {
  if (getEnvs().LOAD_LOCAL_SAMPLES) {
    throw new Error("Local sample loading for tags is not implemented yet.");
  }
  return getClient(arrType).getTags();
};
