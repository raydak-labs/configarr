import { default as fs } from "node:fs";
import path from "node:path";
import yaml from "yaml";
import { getHelpers } from "./env";
import { logger } from "./logger";
import { MappedTemplates } from "./types/common.types";
import { TrashQP, TrashQualityDefinition } from "./types/trashguide.types";
import { isUrl } from "./url-template-importer";

/** Which parser/merge path a loaded file belongs to. */
export type LoadedFileTemplateKind = "TRASH" | "RECYCLARR";

export type LoadedFileTemplate = {
  kind: LoadedFileTemplateKind;
  template: MappedTemplates | TrashQP | TrashQualityDefinition;
};

/** Keys we recognize in a Recyclarr-format template. Used to reject obviously-wrong files. */
const KNOWN_TEMPLATE_KEYS = [
  "quality_definition",
  "custom_formats",
  "custom_format_groups",
  "quality_profiles",
  "include",
  "customFormatDefinitions",
  "media_management",
  "media_naming",
  "media_naming_api",
  "ui_config",
  "delete_unmanaged_custom_formats",
  "delete_unmanaged_quality_profiles",
  "delete_unmanaged_metadata_profiles",
  "metadata_profiles",
  "root_folders",
  "delay_profiles",
  "download_clients",
];

/**
 * Whether an `include`'s `template` value names a file on disk rather than a template name.
 *
 * Existing template keys can never look like this: recyclarr and local template maps are keyed by
 * basename-without-extension (recyclarr-importer.ts / local-importer.ts), and TRaSH keys are
 * `trash_id` hex strings. Callers additionally check the template maps first, so a name that
 * already resolves keeps resolving exactly as before.
 */
export const isFilePath = (str: string): boolean => {
  if (!str || isUrl(str)) {
    return false;
  }

  return str.includes("/") || str.includes("\\") || /\.(ya?ml|json)$/i.test(str);
};

/**
 * Absolute paths are used as-is; relative paths resolve against the directory holding config.yml
 * (not the process cwd), so a config keeps working regardless of where configarr was started.
 */
export const resolveConfigRelativePath = (templatePath: string): string => {
  if (path.isAbsolute(templatePath)) {
    return templatePath;
  }

  return path.resolve(path.dirname(getHelpers().configLocation), templatePath);
};

/**
 * Load a template from a local file. Never throws - every failure is logged and returns `null`
 * so a single bad path cannot abort the whole run (same contract as `loadTemplateFromUrl`).
 */
export const loadTemplateFromFile = (templatePath: string, source?: LoadedFileTemplateKind): LoadedFileTemplate | null => {
  const resolved = resolveConfigRelativePath(templatePath);

  if (!fs.existsSync(resolved)) {
    logger.error(`Template file '${resolved}' does not exist. Ignoring.`);
    return null;
  }

  let parsed: unknown;

  try {
    logger.debug(`Loading template from file: ${resolved}`);
    // YAML is a superset of JSON, so this handles .yml, .yaml and .json alike.
    parsed = yaml.parse(fs.readFileSync(resolved, "utf8"));
  } catch (error) {
    logger.error(`Failed to load template file '${resolved}': ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }

  if (parsed == null) {
    logger.warn(`Template file '${resolved}' is empty. Ignoring.`);
    return null;
  }

  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    logger.warn(`Template file '${resolved}' must contain a YAML/JSON object. Ignoring.`);
    return null;
  }

  const content = parsed as Record<string, unknown>;

  // Unlike URL templates, a local TRaSH file does not need `source: TRASH` - a `trash_id`
  // is unambiguous and only ever appears in TRaSH-Guides quality profiles/definitions.
  if (source === "TRASH" || typeof content.trash_id === "string") {
    logger.debug(`Successfully loaded TRASH template from file: ${resolved}`);
    return { kind: "TRASH", template: content as unknown as TrashQP | TrashQualityDefinition };
  }

  if (!KNOWN_TEMPLATE_KEYS.some((key) => key in content)) {
    logger.warn(`Template file '${resolved}' contains no recognized template keys. Ignoring.`);
    return null;
  }

  const template = content as MappedTemplates;

  // Changes from Recyclarr 7.2.0: https://github.com/recyclarr/recyclarr/releases/tag/v7.2.0
  if (template.custom_formats) {
    template.custom_formats = template.custom_formats.map((cf) => {
      if (cf.assign_scores_to == null && cf.quality_profiles == null) {
        // Only `debug`: a CF entry with no assignment is legitimate in a file consumed through a
        // `profiles:` entry, which supplies the name. Matches transformConfig's handling.
        logger.debug(`Template file '${resolved}' has no assign_scores_to for CF entry '${cf.trash_ids}'.`);
      }

      if (cf.quality_profiles) {
        logger.warn(
          `Deprecated: (Template file '${resolved}') For custom_formats please rename 'quality_profiles' to 'assign_scores_to'. See recyclarr v7.2.0`,
        );
      }

      return { ...cf, assign_scores_to: cf.assign_scores_to ?? cf.quality_profiles ?? [] };
    });
  }

  logger.debug(`Successfully loaded template from file: ${resolved}`);
  return { kind: "RECYCLARR", template };
};
