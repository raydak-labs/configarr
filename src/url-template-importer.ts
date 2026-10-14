import ky from "ky";
import yaml from "yaml";
import { logger } from "./logger";
import { MappedTemplates } from "./types/common.types";
import { TrashQualityDefinition, TrashQualityDefinitionSchema, TrashQP, TrashQPSchema } from "./types/trashguide.types";

export const isUrl = (str: string): boolean => {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const loadTrashTemplateFromUrl = async (url: string): Promise<TrashQP | TrashQualityDefinition | null> => {
  try {
    logger.debug(`Loading TRASH template from URL: ${url}`);
    const response = await ky.get(url, { timeout: 30000 });
    const content = await response.text();
    const parsed: unknown = JSON.parse(content);

    if (parsed == null) {
      logger.warn(`TRASH template content from URL '${url}' is empty. Ignoring.`);
      return null;
    }

    const qualityDefinition = TrashQualityDefinitionSchema.safeParse(parsed);
    const hasQualityProfileItems = typeof parsed === "object" && parsed !== null && "items" in parsed && Array.isArray(parsed.items);
    if (qualityDefinition.success && !hasQualityProfileItems) {
      logger.debug(`Successfully loaded TRASH quality definition from URL: ${url}`);
      return qualityDefinition.data;
    }

    const qualityProfile = TrashQPSchema.safeParse(parsed);
    if (!qualityProfile.success) {
      logger.warn(
        `TRASH template from URL '${url}' is invalid: ${qualityProfile.error.issues[0]?.message ?? "invalid profile"}. Ignoring.`,
      );
      return null;
    }

    logger.debug(`Successfully loaded TRASH template from URL: ${url}`);
    return qualityProfile.data;
  } catch (error) {
    logger.error(`Failed to load TRASH template from URL '${url}': ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
};

const loadRecyclarrTemplateFromUrl = async (url: string): Promise<MappedTemplates | null> => {
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

export const loadTemplateFromUrl = async (
  url: string,
  source?: "TRASH" | "RECYCLARR",
): Promise<MappedTemplates | TrashQP | TrashQualityDefinition | null> => {
  if (source === "TRASH") {
    return loadTrashTemplateFromUrl(url);
  }
  return loadRecyclarrTemplateFromUrl(url);
};
