/**
 * Live *arr delay-profile e2e for Sonarr, Radarr, Whisparr, Readarr, Lidarr.
 *
 *   cd tests/arr-e2e && PUID=$(id -u) PGID=$(id -g) docker compose up -d
 *   ARR_E2E=1 pnpm test:e2e:arr
 */
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { mapToServerDelayProfile } from "../../src/delay-profiles";
import { InputConfigDelayProfileSchema } from "../../src/types/config.types";
import { MergedDelayProfileResource } from "../../src/types/merged.types";
import {
  ARR_TARGETS,
  LEGACY_DELAY_PROFILE,
  LEGACY_DELAY_PROFILE_RESET,
  arrE2eEnabled,
  defaultDelayProfile,
  resolveArrConnection,
  type DelayProfileClient,
} from "./helpers";

const LEGACY_KINDS = ["sonarr", "radarr", "whisparr", "readarr"] as const;

describe.runIf(arrE2eEnabled)("arr delay profiles (live)", () => {
  for (const target of ARR_TARGETS.filter((t) => (LEGACY_KINDS as readonly string[]).includes(t.kind))) {
    describe(target.kind, () => {
      let client: DelayProfileClient;

      beforeAll(async () => {
        const { baseUrl, apiKey } = resolveArrConnection(target.kind, target.defaultBaseUrl);
        client = target.createClient(baseUrl, apiKey);
        const status = await client.getSystemStatus();
        expect(String(status.version ?? "")).toBeTruthy();
      }, 60_000);

      afterAll(async () => {
        await client.updateDelayProfile("1", LEGACY_DELAY_PROFILE_RESET);
      });

      test("mapToServerDelayProfile legacy payload updates default profile", async () => {
        const parsed = InputConfigDelayProfileSchema.parse({
          enableUsenet: true,
          enableTorrent: true,
          preferredProtocol: "usenet",
          usenetDelay: 7,
          torrentDelay: 3,
          bypassIfHighestQuality: true,
          bypassIfAboveCustomFormatScore: false,
          minimumCustomFormatScore: 0,
        });
        const payload = mapToServerDelayProfile(parsed, []);
        expect(payload.items).toBeUndefined();
        expect(payload.enableUsenet).toBe(true);

        await client.updateDelayProfile("1", payload);

        const profiles = (await client.getDelayProfiles()) as MergedDelayProfileResource[];
        const def = defaultDelayProfile(profiles);
        expect(def).toBeDefined();
        expect(def!.usenetDelay).toBe(7);
        expect(def!.torrentDelay).toBe(3);
        expect(def!.bypassIfHighestQuality).toBe(true);
        expect(def!.preferredProtocol).toBe("usenet");
      });
    });
  }

  describe("lidarr nightly", () => {
    const target = ARR_TARGETS.find((t) => t.kind === "lidarr")!;
    let client: DelayProfileClient;

    beforeAll(async () => {
      const { baseUrl, apiKey } = resolveArrConnection(target.kind, target.defaultBaseUrl);
      client = target.createClient(baseUrl, apiKey);
      const status = await client.getSystemStatus();
      expect(String(status.version ?? "")).toBeTruthy();
    }, 60_000);

    afterAll(async () => {
      await client.updateDelayProfile("1", {
        items: [
          { name: "Usenet", protocol: "UsenetDownloadProtocol", allowed: true, delay: 0 },
          { name: "Torrent", protocol: "TorrentDownloadProtocol", allowed: true, delay: 0 },
        ],
        bypassIfHighestQuality: true,
        bypassIfAboveCustomFormatScore: false,
        minimumCustomFormatScore: 0,
        tags: [],
      });
    });

    test("legacy enableUsenet payload is rejected (Items must not be empty)", async () => {
      await expect(client.updateDelayProfile("1", LEGACY_DELAY_PROFILE)).rejects.toThrow(/400/);
    });

    test("items config maps and updates successfully (#481)", async () => {
      const parsed = InputConfigDelayProfileSchema.parse({
        Items: [
          { name: "Usenet", protocol: "UsenetDownloadProtocol", allowed: true, delay: 2 },
          { name: "Torrent", protocol: "TorrentDownloadProtocol", allowed: true, delay: 0 },
        ],
        bypassIfHighestQuality: true,
        bypassIfAboveCustomFormatScore: true,
        minimumCustomFormatScore: 0,
      });

      const payload = mapToServerDelayProfile(parsed, []);
      expect(payload.items).toHaveLength(2);
      expect(payload).not.toHaveProperty("enableUsenet");

      await client.updateDelayProfile("1", payload);

      const profiles = (await client.getDelayProfiles()) as MergedDelayProfileResource[];
      const def = defaultDelayProfile(profiles);
      expect(def).toBeDefined();
      expect(def!.items).toEqual([
        { name: "Usenet", protocol: "UsenetDownloadProtocol", allowed: true, delay: 2 },
        { name: "Torrent", protocol: "TorrentDownloadProtocol", allowed: true, delay: 0 },
      ]);
      expect(def!.bypassIfHighestQuality).toBe(true);
      expect(def!.bypassIfAboveCustomFormatScore).toBe(true);
    });
  });
});
