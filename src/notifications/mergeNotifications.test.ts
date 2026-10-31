import { describe, expect, it } from "vitest";
import { mergeNotifications } from "../config";

describe("mergeNotifications", () => {
  it("replaces an earlier entry with the same name, ignoring case", () => {
    const merged = mergeNotifications(
      {
        data: [
          { name: "Hook", type: "Webhook", fields: { url: "a" } },
          { name: "other", type: "Discord" },
        ],
      },
      { data: [{ name: "hook", type: "Webhook", fields: { url: "b" } }] },
    );
    expect(merged.data).toEqual([
      { name: "hook", type: "Webhook", fields: { url: "b" } },
      { name: "other", type: "Discord" },
    ]);
  });

  it("keeps update_password when the later block omits it", () => {
    expect(mergeNotifications({ update_password: true }, { data: [] }).update_password).toBe(true);
    expect(mergeNotifications({ update_password: true }, { update_password: false }).update_password).toBe(false);
  });

  it("unites delete_unmanaged.ignore while the later block decides enabled", () => {
    const merged = mergeNotifications(
      { delete_unmanaged: { enabled: true, ignore: ["a", "b"] } },
      { delete_unmanaged: { enabled: false, ignore: ["b", "c"] } },
    );
    expect(merged.delete_unmanaged).toEqual({ enabled: false, ignore: ["a", "b", "c"] });
  });

  it("keeps the earlier delete_unmanaged when the later block omits it", () => {
    const merged = mergeNotifications({ delete_unmanaged: { enabled: true, ignore: ["a"] } }, { data: [] });
    expect(merged.delete_unmanaged).toEqual({ enabled: true, ignore: ["a"] });
  });
});
