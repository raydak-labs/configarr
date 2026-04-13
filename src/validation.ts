import { z } from "zod";
import { getEnvs } from "./env";
import { logger } from "./logger";

export class ValidationError extends Error {
  constructor(
    public readonly context: string,
    public readonly zodError: z.ZodError,
  ) {
    super(`Validation failed for ${context}: ${zodError.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
    this.name = "ValidationError";
  }
}

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
  return validateData(schema, data, context, shouldEnforce);
}

/**
 * Validate external data (TRaSH guides, API responses). Uses CONFIGARR_ENFORCE_EXTERNAL_VALIDATION env flag when no override is provided.
 */
export function validateExternal<T>(schema: z.ZodType<T>, data: unknown, context: string, enforce?: boolean): T {
  const shouldEnforce = enforce ?? getEnvs().CONFIGARR_ENFORCE_EXTERNAL_VALIDATION;
  return validateData(schema, data, context, shouldEnforce);
}
