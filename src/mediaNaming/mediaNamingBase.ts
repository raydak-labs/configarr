import { logger } from "../logger";
import type { MediaNamingType } from "../types/config.types";
import type { TrashArrSupported } from "../types/trashguide.types";

export abstract class MediaNamingBase<Resource extends object = object> {
  protected constructor(private readonly arrType: TrashArrSupported) {}

  abstract map(mediaNaming: MediaNamingType): Promise<Resource | null>;

  protected resolveMediaNaming(key: string | undefined, trashValues: Record<string, string>, label: string): string | null {
    if (!key) {
      return null;
    }

    const value = trashValues[key];
    if (value == null) {
      logger.warn(`(${this.arrType}) Specified ${label} '${key}' could not be found in TRaSH-Guide. Check debug logs for available keys.`);
      return null;
    }

    return value;
  }

  protected logMapped(resource: Resource): void {
    logger.debug<object>(resource, "Mapped mediaNaming to API:");
  }
}
