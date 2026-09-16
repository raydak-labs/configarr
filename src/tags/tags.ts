import type { Tag } from "./tag.types";
import type { TagsClient } from "../clients/capabilities";
import { getEnvs } from "../env";

export const loadServerTags = async (client: TagsClient): Promise<Tag[]> => {
  if (getEnvs().LOAD_LOCAL_SAMPLES) {
    throw new Error("Local sample loading for tags is not implemented yet.");
  }
  return client.getTags();
};
