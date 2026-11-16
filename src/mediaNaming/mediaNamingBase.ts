import { logger } from "../logger";
import type { TrashArrSupported } from "../types/trashguide.types";

export const resolveMediaNaming = (
  arrType: TrashArrSupported,
  key: string | undefined,
  trashValues: Record<string, string>,
  label: string,
): string | null => {
  if (!key) {
    return null;
  }

  const value = trashValues[key];
  if (value == null) {
    logger.warn(`(${arrType}) Specified ${label} '${key}' could not be found in TRaSH-Guide. Check debug logs for available keys.`);
    return null;
  }

  return value;
};
