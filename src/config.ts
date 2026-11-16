import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import yaml from "yaml";
import { filterConfigarrReleaseProfiles } from "./configTemplates";
import { getEnvs, getHelpers } from "./env";
import { logger } from "./logger";
import { RemotePathConfigSchema } from "./remotePaths/remotePath.types";
import { normalizeRemotePath } from "./remotePaths/remotePath.util";
import {
  type ConfigCustomFormat,
  type ConfigIncludeItem,
  type ConfigQualityProfile,
  type ConfigSchema,
  type InputConfigArrInstance,
  type InputConfigIncludeItem,
  type InputConfigInstance,
  type InputConfigRemotePath,
  type InputConfigSchema,
  InputConfigSchemaSchema,
  type MergedConfigInstance,
} from "./types/config.types";
import { ConfigValidationError, validateConfig as validateConfigData } from "./validation";

let config: ConfigSchema | undefined;
let secrets: any;

// For testing: reset the secrets cache
export const resetSecretsCache = (): void => {
  secrets = undefined;
};

// For testing: drop the parsed config and secrets so the next getConfig reads the files again
export const resetConfigCache = (): void => {
  config = undefined;
  secrets = undefined;
};

const secretsTag = {
  identify: (value: any) => value instanceof String,
  tag: "!secret",
  resolve(str: string) {
    return getSecrets()[str];
  },
};

const envTag = {
  identify: (value: any) => value instanceof String,
  tag: "!env",
  resolve(str: string) {
    const envValue = process.env[str];

    if (!envValue) {
      const message = `Environment variables '${str}' is not set.`;
      logger.error(message);
      throw new Error(message);
    }

    return envValue;
  },
};

const fileTag = {
  identify: (value: any) => value instanceof String,
  tag: "!file",
  resolve(path: string) {
    if (!existsSync(path)) {
      logger.error(`File "${path}" specified in the config does not exist.`);
      throw new Error("File needed by the config not found.");
    }
    return readFileSync(path, "utf8");
  },
};

// TODO some schema validation. For now only check if something can be imported
export const getConfig = (): ConfigSchema => {
  if (config) {
    return config;
  }

  const helpers = getHelpers();
  const configLocation = helpers.configLocation;

  if (!existsSync(configLocation)) {
    logger.error(`Config file in location "${configLocation}" does not exists.`);
    throw new Error("Config file not found.");
  }

  const file = readFileSync(configLocation, "utf8");

  const rawConfig = yaml.parse(file, {
    customTags: [secretsTag, envTag, fileTag],
    merge: helpers.enableMerge,
  });

  const inputConfig = validateConfigData(InputConfigSchemaSchema, rawConfig, "config file") as InputConfigSchema;

  config = transformConfig(inputConfig);

  return config;
};

/**
 * Expand a path pattern (glob or direct path) into an array of file paths
 */
const expandPathPattern = (pattern: string): string[] => {
  const result = fg.sync(pattern, {
    absolute: true,
    onlyFiles: true,
    caseSensitiveMatch: false,
  });
  return Array.isArray(result) ? result.sort() : [];
};

/**
 * Load and parse a single secret file
 */
const loadSecretFile = (filePath: string): any | null => {
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

  if (!existsSync(resolvedPath)) {
    logger.warn(`Secret file "${resolvedPath}" does not exist. Skipping.`);
    return null;
  }

  try {
    const fileContent = readFileSync(resolvedPath, "utf8");
    if (!fileContent.trim()) {
      logger.debug(`Secret file "${resolvedPath}" is empty. Skipping.`);
      return null;
    }

    const parsed = yaml.parse(fileContent);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
    logger.warn(`Secret file "${resolvedPath}" does not contain a valid YAML object. Skipping.`);
    return null;
  } catch (error) {
    logger.error(`Failed to parse secret file "${resolvedPath}": ${error instanceof Error ? error.message : String(error)}. Skipping.`);
    return null;
  }
};

export const getSecrets = () => {
  if (secrets) {
    return secrets;
  }

  const secretLocation = getHelpers().secretLocation;

  // Split by comma and expand each pattern (glob or direct path)
  const patterns = secretLocation
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const allFilePaths: string[] = [];
  for (const pattern of patterns) {
    const expanded = expandPathPattern(pattern);
    allFilePaths.push(...expanded);
  }

  // Single file path (backward compatibility) - throw error if not found (but not for glob patterns)
  if (patterns.length === 1 && patterns[0] && allFilePaths.length === 0 && !/[*?[{]/.test(patterns[0])) {
    logger.error(`Secret file in location "${patterns[0]}" does not exist.`);
    throw new Error("Secret file not found.");
  }

  if (allFilePaths.length === 0) {
    logger.warn(`No secret files found from "${secretLocation}". Continuing with empty secrets.`);
    secrets = {};
    return secrets;
  }

  // Load and merge all files
  const secretObjects = allFilePaths.map(loadSecretFile).filter((obj): obj is any => obj !== null);

  if (secretObjects.length === 0) {
    logger.warn(`No valid secret files could be loaded from "${secretLocation}". Continuing with empty secrets.`);
    secrets = {};
    return secrets;
  }

  logger.debug(`Loaded and merged secrets from ${secretObjects.length} file(s)`);
  secrets = secretObjects.reduce((merged, current) => ({ ...merged, ...current }), {});
  return secrets;
};

// 2024-09-30: Recyclarr assign_scores_to adjustments
export const transformConfig = (input: InputConfigSchema): ConfigSchema => {
  // Only normalizes custom_formats/include - quality_profiles isn't resolved to the fully
  // defaulted ConfigQualityProfile shape until mergeConfigsAndTemplates runs per-instance, so
  // this returns InputConfigArrInstance (with those two fields upgraded to their Config*
  // counterparts, which still satisfy the Input* shape), not ConfigArrInstance.
  const mappedCustomFormats = (arrInput: Record<string, InputConfigArrInstance> = {}): Record<string, InputConfigArrInstance> => {
    return Object.entries(arrInput).reduce(
      (p, [key, value]) => {
        const mappedCustomFormats = (value.custom_formats || []).map<ConfigCustomFormat>((cf) => {
          const { assign_scores_to, quality_profiles, ...rest } = cf;

          if (quality_profiles) {
            logger.warn(
              `Deprecated: (Instance '${key}') For custom_formats please rename 'quality_profiles' to 'assign_scores_to'. See recyclarr v7.2.0`,
            );
          }

          const mapped_assign_scores = quality_profiles ?? assign_scores_to;

          if (!mapped_assign_scores) {
            logger.debug(`No assign_scores_to or quality_profiles defined for CF entry '${cf.trash_ids}' in instance '${key}'`);
          }

          return { ...rest, assign_scores_to: mapped_assign_scores };
        });

        p[key] = { ...value, include: value.include?.map(parseIncludes), custom_formats: mappedCustomFormats };
        return p;
      },
      {} as Record<string, InputConfigArrInstance>,
    );
  };

  return {
    ...input,
    radarr: mappedCustomFormats(input.radarr),
    sonarr: mappedCustomFormats(input.sonarr),
    whisparr: mappedCustomFormats(input.whisparr),
    readarr: mappedCustomFormats(input.readarr),
    lidarr: mappedCustomFormats(input.lidarr),
  };
};

export const parseIncludes = (input: InputConfigIncludeItem): ConfigIncludeItem => ({
  template: input.template,
  source: input.source ?? "RECYCLARR",
  preferred_ratio: input.preferred_ratio,
  trash_cfgroup_include_optional: input.trash_cfgroup_include_optional,
  trash_cfgroup_include_unrequired: input.trash_cfgroup_include_unrequired,
  trash_cfgroup_include_cfs: input.trash_cfgroup_include_cfs,
  trash_cfgroup_exclude_cfs: input.trash_cfgroup_exclude_cfs,
});

/**
 * Drive-relative Windows path (`X:…`), as opposed to drive-absolute (`X:\…` or `X:/…`).
 * Accepted for backward compatibility but deprecated.
 */
const DRIVE_RELATIVE_PATH = /^[a-zA-Z]:(?![\\/])/;

/**
 * Validate remote path mappings configuration
 * Checks for duplicate host + remote_path combinations and validates structure
 * @throws Error if validation fails
 */
const validateRemotePaths = (remotePaths: InputConfigRemotePath[]): void => {
  const keys = new Set<string>();
  for (const config of remotePaths) {
    // Validate structure using Zod schema
    try {
      RemotePathConfigSchema.parse(config);
    } catch (error) {
      throw new ConfigValidationError(`Invalid remote path config: ${error instanceof Error ? error.message : String(error)}`);
    }

    for (const [field, value] of [
      ["remote_path", config.remote_path],
      ["local_path", config.local_path],
    ] as const) {
      if (DRIVE_RELATIVE_PATH.test(value)) {
        logger.warn(
          `Remote path mapping ${field} '${value}' is drive-relative, which is deprecated. Use an absolute path (X:\\…, /… or \\\\server\\share).`,
        );
      }
    }

    // Check for duplicates by host + remote_path combination
    // Normalize path for duplicate detection (remove trailing separators, `/` and `\`)
    const normalizedRemotePath = normalizeRemotePath(config.remote_path);
    const key = `${config.host}||${normalizedRemotePath}`;
    if (keys.has(key)) {
      throw new ConfigValidationError(`Duplicate remote path mapping: '${config.host} + ${config.remote_path}' already configured.`);
    }
    keys.add(key);
  }
};

export const validateConfig = (input: InputConfigInstance): MergedConfigInstance => {
  // TODO add validation and warnings like assign_scores. Setting default values not always the best

  const preferredRatio = input.quality_definition?.preferred_ratio;

  if (preferredRatio != null && (preferredRatio < 0 || preferredRatio > 1)) {
    if (getEnvs().CONFIGARR_ENFORCE_CONFIG_VALIDATION) {
      throw new ConfigValidationError("QualityDefinition: PreferredRatio must be between 0 and 1.");
    }
    logger.warn(`QualityDefinition: PreferredRatio must be between 0 and 1. Ignoring`);
    delete input.quality_definition!["preferred_ratio"];
  }

  // Validate remote path mappings if present
  if (input.download_clients?.remote_paths) {
    validateRemotePaths(input.download_clients.remote_paths);
  }

  return {
    ...input,
    custom_formats: (input.custom_formats || []).map((e) => ({
      trash_ids: e.trash_ids,
      assign_scores_to: e.assign_scores_to ?? e.quality_profiles ?? [],
    })),
    // Boundary assertion: by this point mergeConfigsAndTemplates has merged each profile from
    // potentially multiple sources (instance config, recyclarr/trash templates), and the
    // combination is assumed complete enough - see the TODO above, this isn't independently
    // verified field-by-field.
    quality_profiles: (input.quality_profiles ?? []) as ConfigQualityProfile[],
    release_profiles: input.release_profiles && filterConfigarrReleaseProfiles(input.release_profiles),
  };
};
