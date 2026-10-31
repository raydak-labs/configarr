import { DiffEntry } from "./diffReport.types";

/** Placeholder rendered in place of a secret value. */
export const SECRET_MASK = "********";

/**
 * Field names whose values must never reach a diff report or the logs.
 *
 * Keyed on the name, not on the value: the same field can come back from a server as
 * `"********"`, `""`, `null` or as the real secret, so the value is not a usable signal.
 */
const SECRET_FIELD_PATTERN = /password|api[_-]?key|secret|token/i;

export function isSecretFieldName(fieldName: string): boolean {
  return SECRET_FIELD_PATTERN.test(fieldName);
}

export function isNotificationUrlFieldName(fieldName: string): boolean {
  const afterFields = fieldName.includes("fields.") ? fieldName.slice(fieldName.lastIndexOf("fields.") + "fields.".length) : fieldName;
  const lastSegment = afterFields.split(".").pop() ?? afterFields;
  return /url/i.test(lastSegment);
}

export function hasUrlCredentials(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) {
      return true;
    }
  } catch {
    // Fall through to check for embedded credential URL substring.
  }
  return /[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s/?#]*[^\s/?#:][^\s/?#]*@[^\s/?#]+/.test(value);
}

/**
 * Redact credential-bearing or path/query token URL values.
 *
 * Reasoning: path and query tokens are provider-specific (Slack, Discord, Telegram, Gotify, ntfy), so only the origin is safe to show.
 */
export function redactUrlValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value !== "string") {
    // Redact nested secrets for non-string values (e.g. object/array).
    return redactSecrets(value);
  }
  if (value === "" || value.trim() === "") {
    return value;
  }

  const trimmed = value.trim();
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    return SECRET_MASK;
  }

  try {
    const parsed = new URL(trimmed);
    if (!parsed.host) {
      return SECRET_MASK;
    }

    const base = `${parsed.protocol}//${parsed.host}`;
    const hasUserInfo = Boolean(parsed.username || parsed.password) || /^[^:]+:\/\/[^/]*@/.test(trimmed);
    const hasPathOtherThanSlash = parsed.pathname !== "" && parsed.pathname !== "/";
    const hasQuery = Boolean(parsed.search) || trimmed.includes("?");
    const hasFragment = Boolean(parsed.hash) || trimmed.includes("#");

    if (hasUserInfo || hasPathOtherThanSlash || hasQuery || hasFragment) {
      return `${base}/${SECRET_MASK}`;
    }

    if (trimmed.endsWith("/")) {
      return `${base}/`;
    }
    return base;
  } catch {
    return SECRET_MASK;
  }
}

/**
 * Mask secret-named keys anywhere inside a value, and mask the `value` of an object whose
 * own `name` is secret-named.
 *
 * Used for object/array field values (e.g. a whole `fields` bag reported as one change),
 * where the secret is nested under a key rather than being the changed field itself.
 * The named case is not hypothetical: custom-format comparison reports a reordered
 * `specifications[].fields` array as a single change, and its elements are `{ name, value }`
 * pairs, so the key alone never says the value is a secret.
 */
export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSecrets);
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  const namedSecret = typeof record.name === "string" && isSecretFieldName(record.name);

  return Object.fromEntries(
    Object.entries(record).map(([key, nested]) => [
      key,
      isSecretFieldName(key) || (namedSecret && key === "value") ? SECRET_MASK : redactSecrets(nested),
    ]),
  );
}

/**
 * Mask both sides of every secret-named field change of a diff entry.
 *
 * `DiffCollector.add` is the one place every diff entry passes through, and both the
 * console formatter and the JSON report file read the entries it hands out, so
 * redacting here covers every sink at once. Unchanged-secret detection runs upstream
 * while the plaintext is still in scope, so a masked-but-equal secret never produces
 * an entry in the first place and redaction cannot turn one into a change.
 */
export function redactDiffEntry(entry: DiffEntry): DiffEntry {
  if (!entry.fieldChanges) {
    return entry;
  }

  const isNotification = entry.resourceType === "Notification";

  return {
    ...entry,
    fieldChanges: entry.fieldChanges.map((change) => {
      if (isSecretFieldName(change.field)) {
        return { ...change, from: SECRET_MASK, to: SECRET_MASK };
      }

      const isNotifUrl = isNotification && isNotificationUrlFieldName(change.field);
      const fromIsUrl = isNotifUrl || hasUrlCredentials(change.from);
      const toIsUrl = isNotifUrl || hasUrlCredentials(change.to);

      return {
        ...change,
        from: fromIsUrl ? redactUrlValue(change.from) : redactSecrets(change.from),
        to: toIsUrl ? redactUrlValue(change.to) : redactSecrets(change.to),
      };
    }),
  };
}
