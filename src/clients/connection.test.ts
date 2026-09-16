import { describe, expect, test } from "vitest";
import { createConnectionErrorParts, forceSaveIfDisabled, logConnectionError, selectConnectionErrorDetail } from "./connection";

describe("forceSaveIfDisabled", () => {
  test("skips connection tests only when enable is false", () => {
    expect(forceSaveIfDisabled(false)).toEqual({ forceSave: true });
    expect(forceSaveIfDisabled(true)).toEqual({ forceSave: false });
    expect(forceSaveIfDisabled(undefined)).toEqual({ forceSave: false });
  });
});

describe("connection errors", () => {
  test("selects the structured HTTP detail when no friendly match exists", () => {
    const error = { message: "request failed", response: { status: 500, data: { message: "boom" } } };
    const parts = createConnectionErrorParts(error);

    expect(selectConnectionErrorDetail(parts)).toBe("HTTP 500: boom");
    expect(logConnectionError(error, "SONARR")).toBe("Connection to sonarr API failed: HTTP 500: boom");
  });
});
