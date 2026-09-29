import { describe, expect, test, vi } from "vitest";
import { ServerCache } from "./cache";

describe("ServerCache indexers", () => {
  test("loads once and reuses the result", async () => {
    const cache = new ServerCache();
    const loader = vi.fn().mockResolvedValue([{ id: 1, name: "idx" }]);

    await expect(cache.getIndexers(loader)).resolves.toEqual([{ id: 1, name: "idx" }]);
    await expect(cache.getIndexers(loader)).resolves.toEqual([{ id: 1, name: "idx" }]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  test("retries after a failed load", async () => {
    const cache = new ServerCache();
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue([{ id: 2, name: "ok" }]);

    await expect(cache.getIndexers(loader)).rejects.toThrow("boom");
    await expect(cache.getIndexers(loader)).resolves.toEqual([{ id: 2, name: "ok" }]);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  test("skips the loader when indexers were provided", async () => {
    const cache = new ServerCache({ indexers: [{ id: 3, name: "seeded" }] });
    const loader = vi.fn();

    await expect(cache.getIndexers(loader)).resolves.toEqual([{ id: 3, name: "seeded" }]);
    expect(loader).not.toHaveBeenCalled();
  });
});
