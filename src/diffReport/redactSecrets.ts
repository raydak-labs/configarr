import type { DiffEntry } from "./diffReport.types";

export const SECRET_MASK = "********";

// Match field names because server values can already be masked, empty, or null.
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

const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;

function isSchemeUrl(value: string): boolean {
  return URL_SCHEME_PATTERN.test(value.trim());
}

/** Redact nested URL trees without mutating the input. */
function redactUrlTree(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactUrlTree);
  }

  if (typeof value === "string") {
    return hasUrlCredentials(value) || isSchemeUrl(value) ? redactUrlValue(value) : value;
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  const namedSecret = typeof record.name === "string" && isSecretFieldName(record.name);

  return Object.fromEntries(
    Object.entries(record).map(([key, nested]) => {
      if (isSecretFieldName(key) || (namedSecret && key === "value")) {
        return [key, SECRET_MASK];
      }
      if (isNotificationUrlFieldName(key)) {
        return [key, redactUrlValue(nested)];
      }
      return [key, redactUrlTree(nested)];
    }),
  );
}

/** Keep only the origin: URL paths and queries can contain provider-specific tokens. */
export function redactUrlValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(redactUrlValue);
  }
  if (typeof value !== "string") {
    return redactUrlTree(value);
  }
  if (value === "" || value.trim() === "") {
    return value;
  }

  const trimmed = value.trim();
  if (!isSchemeUrl(trimmed)) {
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

/** Mask secret-named keys and nested `{ name, value }` pairs. */
export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSecrets);
  }

  if (typeof value === "string" && hasUrlCredentials(value)) {
    return redactUrlValue(value);
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

/** Redact at the collector boundary; secret equality is checked upstream. */
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
