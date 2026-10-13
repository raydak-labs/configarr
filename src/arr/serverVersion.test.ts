import { describe, expect, test, vi } from "vitest";
import type { SystemClient } from "../clients/capabilities";
import { parseMajorVersion, resolveServerMajorVersion } from "./serverVersion";

/** A client whose system status reports the given version string. */
const clientWithVersion = (version: unknown): SystemClient =>
  ({ getSystemStatus: vi.fn().mockResolvedValue({ version }) }) as unknown as SystemClient;

describe("parseMajorVersion", () => {
  test("reads the leading integer of a four-part Sonarr build string", () => {
    expect(parseMajorVersion("4.0.20.3014")).toBe(4);
    expect(parseMajorVersion("5.0.0.2569")).toBe(5);
  });

  test("tolerates a develop suffix", () => {
    expect(parseMajorVersion("5.0.0.2569-develop")).toBe(5);
  });

  test("throws on a version it cannot read rather than guessing", () => {
    // Defaulting to 4 here would silently disable every v5 feature, and defaulting to 5 would
    // enable them against a server that has nothing to configure.
    for (const bad of ["", "unknown", null, undefined, 5, { version: "5.0.0" }, "abc.def"]) {
      expect(() => parseMajorVersion(bad), `for ${JSON.stringify(bad)}`).toThrow();
    }
  });
});

describe("resolveServerMajorVersion", () => {
  test("parses the version the system status reports", async () => {
    await expect(resolveServerMajorVersion(clientWithVersion("5.0.0.2569"))).resolves.toBe(5);
    await expect(resolveServerMajorVersion(clientWithVersion("4.0.19.3011"))).resolves.toBe(4);
  });

  test("reads the version off a contract-shaped status object", async () => {
    // Both generated contracts type the status as a union whose members differ in field names and
    // nullability, so narrowing has to survive the shape a real server returns rather than only a
    // bare { version } literal.
    const client = {
      getSystemStatus: vi.fn().mockResolvedValue({
        version: "5.0.0.2569",
        appName: "Sonarr",
        instanceName: "Sonarr",
        authentication: "none",
        sqliteVersion: "3.45.1",
      }),
    } as unknown as SystemClient;

    await expect(resolveServerMajorVersion(client)).resolves.toBe(5);
  });

  test("asks once per client however many times it is called", async () => {
    const getSystemStatus = vi.fn().mockResolvedValue({ version: "5.0.0.2569" });
    const client = { getSystemStatus } as unknown as SystemClient;

    await expect(resolveServerMajorVersion(client)).resolves.toBe(5);
    await expect(resolveServerMajorVersion(client)).resolves.toBe(5);
    await expect(resolveServerMajorVersion(client)).resolves.toBe(5);

    expect(getSystemStatus).toHaveBeenCalledTimes(1);
  });

  test("does not leak the memo across clients", async () => {
    // One configarr run targets one instance at a time, but a memo keyed globally rather than per
    // client would pin every later instance in the same process to the first one's version.
    await expect(resolveServerMajorVersion(clientWithVersion("4.0.19.3011"))).resolves.toBe(4);
    await expect(resolveServerMajorVersion(clientWithVersion("5.0.0.2569"))).resolves.toBe(5);
  });

  test("propagates a failed status read instead of falling back", async () => {
    const client = { getSystemStatus: vi.fn().mockRejectedValue(new Error("connection refused")) } as unknown as SystemClient;
    await expect(resolveServerMajorVersion(client)).rejects.toThrow(/connection refused/);
  });
});
