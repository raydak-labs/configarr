import { isSecretFieldName, SECRET_MASK } from "./redactSecrets";

const TRUNCATE_AT = 5;

/**
 * Renders a diff value for display. Secret-named keys are masked here as well so a
 * value that reached the formatter without passing the collector is still safe.
 */
export function formatDiffValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value !== "object") return String(value);
  return formatContainer(value);
}

function formatLeaf(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "object") return formatContainer(value as object);
  if (typeof value === "string") return JSON.stringify(value);
  return String(value);
}

function formatContainer(value: object): string {
  if (Array.isArray(value)) {
    return truncateAndJoin(
      value.map((v) => formatLeaf(v)),
      "[",
      "]",
    );
  }

  const entries = Object.entries(value as Record<string, unknown>).map(([key, v]) =>
    isSecretFieldName(key) ? `${key}: ${formatLeaf(SECRET_MASK)}` : `${key}: ${formatLeaf(v)}`,
  );
  return truncateAndJoin(entries, "{", "}");
}

function truncateAndJoin(entries: string[], open: string, close: string): string {
  if (entries.length <= TRUNCATE_AT) {
    return `${open}${entries.join(", ")}${close}`;
  }

  const shown = entries.slice(0, TRUNCATE_AT);
  return `${open}${shown.join(", ")}, (+${entries.length - TRUNCATE_AT} more)${close}`;
}
