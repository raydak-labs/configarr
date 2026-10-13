import type { SystemClient } from "../clients/capabilities";

/**
 * Sonarr reports its version as a four-part .NET build string, for example `5.0.0.2569`. Only the
 * major part distinguishes feature availability, and only that part is read here.
 *
 * Sonarr v5 added fields to *both* of the API contracts it serves, so the contract a client is bound
 * to says which path a request takes, not which fields exist. A v4 server is missing them. Reading
 * the major version from the system status is therefore the only reliable way to know whether a
 * config key the user wrote can be applied.
 */
export function parseMajorVersion(raw: unknown): number {
  const version = typeof raw === "string" ? raw.trim() : "";
  const match = /^(\d+)/.exec(version);

  if (!match) {
    // Falling back to a guess would silently invert the outcome: defaulting to 4 would disable every
    // v5 feature, and defaulting to 5 would try to configure features the server does not have.
    throw new Error(`Could not read a Sonarr version from '${String(raw)}'.`);
  }

  return Number(match[1]);
}

const resolved = new WeakMap<SystemClient, number>();

/**
 * The server major version for a client, asked once. `getSystemStatus` is typed `Promise<unknown>` on
 * the capability interface, so the shape is narrowed here rather than at every call site.
 */
export async function resolveServerMajorVersion(client: SystemClient): Promise<number> {
  const cached = resolved.get(client);
  if (cached !== undefined) {
    return cached;
  }

  const status = (await client.getSystemStatus()) as { version?: unknown } | undefined;
  const major = parseMajorVersion(status?.version);
  resolved.set(client, major);
  return major;
}
