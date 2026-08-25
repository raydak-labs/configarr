import { z } from "zod";
import { getEnvs } from "./env";
import { logger } from "./logger";

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigValidationError";
  }
}

export class ValidationError extends ConfigValidationError {
  constructor(
    public readonly context: string,
    public readonly zodError: z.ZodError,
  ) {
    super(`Validation failed for ${context}: ${zodError.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
    this.name = "ValidationError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const findStrippedConfigKeys = (input: unknown, parsed: unknown, path: Array<string | number> = []): string[] => {
  if (Array.isArray(input) && Array.isArray(parsed)) {
    return input.flatMap((item, index) => findStrippedConfigKeys(item, parsed[index], [...path, index]));
  }

  if (!isRecord(input) || !isRecord(parsed)) {
    return [];
  }

  const keys: string[] = [];
  for (const [key, value] of Object.entries(input)) {
    if (key === "Items" && input.items === undefined && "items" in parsed) {
      continue;
    }

    if (!(key in parsed)) {
      keys.push([...path, key].join("."));
      continue;
    }

    keys.push(...findStrippedConfigKeys(value, parsed[key], [...path, key]));
  }

  return keys;
};

/**
 * Validate data against a Zod schema.
 *
 * In lenient mode (default): logs warnings and returns the raw data on failure.
 * In strict mode (enforce=true): throws a ValidationError on failure.
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @param context - Human-readable context for error messages (e.g. "config.sonarr.main")
 * @param enforce - Override enforcement. If undefined, uses the appropriate env flag.
 */
export function validateData<T>(schema: z.ZodType<T>, data: unknown, context: string, enforce?: boolean): T {
  const result = schema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");

  if (enforce) {
    throw new ValidationError(context, result.error);
  }

  logger.warn(`Validation warning [${context}]: ${issues}`);
  return data as T;
}

/**
 * Validate config data. Uses CONFIGARR_ENFORCE_CONFIG_VALIDATION env flag when no override is provided.
 */
export function validateConfig<T>(schema: z.ZodType<T>, data: unknown, context: string, enforce?: boolean): T {
  const shouldEnforce = enforce ?? getEnvs().CONFIGARR_ENFORCE_CONFIG_VALIDATION;
  const result = schema.safeParse(data);

  if (result.success) {
    if (shouldEnforce) {
      const strippedKeys = findStrippedConfigKeys(data, result.data);
      if (strippedKeys.length > 0) {
        throw new ConfigValidationError(`Validation failed for ${context}: unrecognized key(s): ${strippedKeys.join(", ")}`);
      }
    }

    return result.data;
  }

  return validateData(schema, data, context, shouldEnforce);
}

/**
 * Validate external data (TRaSH guides, API responses). Uses CONFIGARR_ENFORCE_EXTERNAL_VALIDATION env flag when no override is provided.
 */
export function validateExternal<T>(schema: z.ZodType<T>, data: unknown, context: string, enforce?: boolean): T {
  const shouldEnforce = enforce ?? getEnvs().CONFIGARR_ENFORCE_EXTERNAL_VALIDATION;
  return validateData(schema, data, context, shouldEnforce);
}
