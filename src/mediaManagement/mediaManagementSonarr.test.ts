import { describe, expect, it, vi } from "vitest";
import { MediaManagementSync } from "./mediaManagement";
import { SonarrMediaManagementSync } from "./mediaManagementSonarr";
import { MediaManagementTypeSchema } from "../types/config.types";

describe("MediaManagementTypeSchema Sonarr v5 controls", () => {
  it("accepts documented season-pack modes, percentage thresholds, and extension lists", () => {
    expect(
      MediaManagementTypeSchema.parse({
        skipFreeSpaceCheckWhenGrabbing: true,
        seasonPackUpgrade: "threshold",
        seasonPackUpgradeThreshold: 80.5,
        userRejectedExtensions: ".ext, .xyz",
      }),
    ).toEqual({
      skipFreeSpaceCheckWhenGrabbing: true,
      seasonPackUpgrade: "threshold",
      seasonPackUpgradeThreshold: 80.5,
      userRejectedExtensions: ".ext, .xyz",
    });
  });

  it("rejects unknown modes and thresholds outside the inclusive percentage range", () => {
    expect(() => MediaManagementTypeSchema.parse({ seasonPackUpgrade: "some" })).toThrow();
    expect(() => MediaManagementTypeSchema.parse({ seasonPackUpgradeThreshold: 100.1 })).toThrow();
    expect(() => MediaManagementTypeSchema.parse({ seasonPackUpgradeThreshold: -0.1 })).toThrow();
  });
});

describe("SonarrMediaManagementSync.validateConfig", () => {
  it("rejects v5-only settings on Sonarr v4", async () => {
    const client = { supportsMediaManagementControls: vi.fn().mockResolvedValue(false) };
    const sync = new SonarrMediaManagementSync(client as never);

    await expect(sync.validateConfig({ seasonPackUpgrade: "threshold" })).rejects.toThrow(
      "skipFreeSpaceCheckWhenGrabbing, seasonPackUpgrade, seasonPackUpgradeThreshold, and userRejectedExtensions require Sonarr v5.",
    );
    expect(client.supportsMediaManagementControls).toHaveBeenCalledOnce();
  });

  it("accepts v5-only settings on Sonarr v5", async () => {
    const client = { supportsMediaManagementControls: vi.fn().mockResolvedValue(true) };
    const sync = new SonarrMediaManagementSync(client as never);

    await expect(sync.validateConfig({ seasonPackUpgradeThreshold: 80 })).resolves.toBeUndefined();
  });

  it("does not require v5 when no v5-only settings are configured", async () => {
    const client = { supportsMediaManagementControls: vi.fn() };
    const sync = new SonarrMediaManagementSync(client as never);

    await expect(sync.validateConfig({ recycleBin: "/tmp" })).resolves.toBeUndefined();
    expect(client.supportsMediaManagementControls).not.toHaveBeenCalled();
  });
});

describe("MediaManagementSync.validateConfig", () => {
  it("rejects Sonarr v5-only controls for other media-manager clients", async () => {
    const sync = new MediaManagementSync({} as never);

    await expect(sync.validateConfig({ userRejectedExtensions: ".dog" })).rejects.toThrow(
      "skipFreeSpaceCheckWhenGrabbing, seasonPackUpgrade, seasonPackUpgradeThreshold, and userRejectedExtensions require Sonarr v5.",
    );
  });
});
