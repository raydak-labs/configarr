import { logger } from "./logger";
import type { InputConfigCustomFormat } from "./types/config.types";

/** Normalize legacy Recyclarr custom-format assignments for every template source. */
export function normalizeTemplateCustomFormats(
  customFormats: InputConfigCustomFormat[] | undefined,
  source: "Local Template" | "Recyclarr Template" | "Template from URL",
  name: string,
): InputConfigCustomFormat[] | undefined {
  return customFormats?.map((cf) => {
    if (cf.assign_scores_to == null && cf.quality_profiles == null) {
      logger.warn(`${source} "${name}" does not provide correct profile for custom format. Ignoring.`);
    }
    if (cf.quality_profiles) {
      logger.warn(
        `Deprecated: (${source} '${name}') For custom_formats please rename 'quality_profiles' to 'assign_scores_to'. See recyclarr v7.2.0`,
      );
    }
    return { ...cf, assign_scores_to: cf.assign_scores_to ?? cf.quality_profiles ?? [] };
  });
}
