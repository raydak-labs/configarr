import { describe, expect, test, vi, beforeEach } from "vitest";
import { z } from "zod";
import { validateData, validateConfig, validateExternal, ValidationError } from "./validation";

// Mock env module
vi.mock("./env", () => ({
  getEnvs: vi.fn().mockReturnValue({
    CONFIGARR_ENFORCE_CONFIG_VALIDATION: false,
    CONFIGARR_ENFORCE_EXTERNAL_VALIDATION: false,
  }),
}));

// Mock logger
vi.mock("./logger", () => ({
  logger: {
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { logger } from "./logger";
import { getEnvs } from "./env";

const testSchema = z.object({
  name: z.string(),
  age: z.number().min(0),
});

describe("validateData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return parsed data on valid input", () => {
    const result = validateData(testSchema, { name: "test", age: 25 }, "test-context");
    expect(result).toEqual({ name: "test", age: 25 });
  });

  test("should log warning and return raw data in lenient mode", () => {
    const invalid = { name: 123, age: "not-a-number" };
    const result = validateData(testSchema, invalid, "test-context", false);
    expect(result).toEqual(invalid);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("Validation warning [test-context]"));
  });

  test("should throw ValidationError in strict mode", () => {
    const invalid = { name: 123, age: "not-a-number" };
    expect(() => validateData(testSchema, invalid, "test-context", true)).toThrow(ValidationError);
  });

  test("should include context in ValidationError message", () => {
    try {
      validateData(testSchema, { name: 123 }, "my-config", true);
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).message).toContain("my-config");
      expect((e as ValidationError).context).toBe("my-config");
    }
  });

  test("should default to lenient when enforce is undefined", () => {
    const invalid = { name: 123 };
    const result = validateData(testSchema, invalid, "test", undefined);
    expect(result).toEqual(invalid);
    expect(logger.warn).toHaveBeenCalled();
  });
});

describe("validateConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should use env flag when no override provided", () => {
    vi.mocked(getEnvs).mockReturnValue({
      CONFIGARR_ENFORCE_CONFIG_VALIDATION: false,
      CONFIGARR_ENFORCE_EXTERNAL_VALIDATION: false,
    } as any);

    const invalid = { name: 123 };
    const result = validateConfig(testSchema, invalid, "test");
    expect(result).toEqual(invalid);
    expect(logger.warn).toHaveBeenCalled();
  });

  test("should throw when env enforcement is enabled", () => {
    vi.mocked(getEnvs).mockReturnValue({
      CONFIGARR_ENFORCE_CONFIG_VALIDATION: true,
      CONFIGARR_ENFORCE_EXTERNAL_VALIDATION: false,
    } as any);

    expect(() => validateConfig(testSchema, { name: 123 }, "test")).toThrow(ValidationError);
  });

  test("should respect override over env flag", () => {
    vi.mocked(getEnvs).mockReturnValue({
      CONFIGARR_ENFORCE_CONFIG_VALIDATION: true,
      CONFIGARR_ENFORCE_EXTERNAL_VALIDATION: false,
    } as any);

    // Override to lenient despite env being strict
    const result = validateConfig(testSchema, { name: 123 }, "test", false);
    expect(result).toEqual({ name: 123 });
  });
});

describe("validateExternal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should use external env flag", () => {
    vi.mocked(getEnvs).mockReturnValue({
      CONFIGARR_ENFORCE_CONFIG_VALIDATION: false,
      CONFIGARR_ENFORCE_EXTERNAL_VALIDATION: false,
    } as any);

    const invalid = { name: 123 };
    const result = validateExternal(testSchema, invalid, "test");
    expect(result).toEqual(invalid);
  });

  test("should throw when external enforcement is enabled", () => {
    vi.mocked(getEnvs).mockReturnValue({
      CONFIGARR_ENFORCE_CONFIG_VALIDATION: false,
      CONFIGARR_ENFORCE_EXTERNAL_VALIDATION: true,
    } as any);

    expect(() => validateExternal(testSchema, { name: 123 }, "test")).toThrow(ValidationError);
  });

  test("should pass through valid data regardless of enforcement mode", () => {
    vi.mocked(getEnvs).mockReturnValue({
      CONFIGARR_ENFORCE_CONFIG_VALIDATION: true,
      CONFIGARR_ENFORCE_EXTERNAL_VALIDATION: true,
    } as any);

    const valid = { name: "test", age: 25 };
    expect(validateConfig(testSchema, valid, "test")).toEqual(valid);
    expect(validateExternal(testSchema, valid, "test")).toEqual(valid);
  });
});
