import ky from "ky";
import yaml from "yaml";
import { logger } from "./logger";
import { MappedTemplates } from "./types/common.types";

export const isUrl = (str: string): boolean => {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const loadTemplateFromUrl = async (url: string): Promise<MappedTemplates | null> => {
  try {
    logger.debug(`Loading template from URL: ${url}`);
    const response = await ky.get(url, { timeout: 30000 });
    const content = await response.text();
    const parsed = yaml.parse(content) as MappedTemplates;

    if (parsed == null) {
      logger.warn(`Template content from URL '${url}' is empty. Ignoring.`);
      return null;
    }

    // Transform custom formats similar to local/recyclarr templates
    if (parsed.custom_formats) {
      parsed.custom_formats = parsed.custom_formats.map((cf) => {
        if (cf.assign_scores_to == null && cf.quality_profiles == null) {
          logger.warn(`Template from URL "${url}" does not provide correct profile for custom format. Ignoring.`);
        }

        if (cf.quality_profiles) {
          logger.warn(
            `Deprecated: (Template from URL '${url}') For custom_formats please rename 'quality_profiles' to 'assign_scores_to'. See recyclarr v7.2.0`,
          );
        }
        return { ...cf, assign_scores_to: cf.assign_scores_to ?? cf.quality_profiles ?? [] };
      });
    }

    logger.debug(`Successfully loaded template from URL: ${url}`);
    return parsed;
  } catch (error) {
    logger.error(`Failed to load template from URL '${url}': ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
};
