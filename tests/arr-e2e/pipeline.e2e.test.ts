/**
 * Every *arr plus Prowlarr in a single config.yml, so the multi-instance pipeline in `index.ts`
 * is covered end to end. Touches all containers, so it runs on its own (see `test:e2e:arr`).
 *
 *   cd tests/arr-e2e && PUID=$(id -u) PGID=$(id -g) docker compose up -d
 *   pnpm test:e2e:arr
 */
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { LidarrClient } from "../../src/clients/lidarr-client";
import { RadarrClient } from "../../src/clients/radarr-client";
import { ReadarrClient } from "../../src/clients/readarr-client";
import { SonarrClient } from "../../src/clients/sonarr-client";
import { WhisparrClient } from "../../src/clients/whisparr-client";
import {
  E2E_API_KEY,
  arrConnection,
  cfAssignBlock,
  e2eCustomFormatDefinition,
  e2eMediaSettings,
  mediaInstance,
  prowlarrConnection,
} from "./config";
import {
  MediaArrClient,
  MediaBaseline,
  assertDiffUpToDate,
  assertPipelineSucceeded,
  cleanupMediaE2e,
  cleanupMetadataProfilesE2e,
  cleanupProwlarrE2e,
  createProwlarrClient,
  findNamed,
  restoreMediaBaseline,
  snapshotMediaBaseline,
  syncConfig,
} from "./helpers";

const KINDS = ["SONARR", "RADARR", "WHISPARR", "READARR", "LIDARR", "PROWLARR"] as const;

const legacyDelay = {
  default: {
    enableUsenet: true,
    enableTorrent: true,
    preferredProtocol: "usenet",
    usenetDelay: 1,
    torrentDelay: 0,
    bypassIfHighestQuality: true,
    bypassIfAboveCustomFormatScore: false,
    minimumCustomFormatScore: 0,
  },
};

const lidarrDelay = {
  default: {
    items: [
      { name: "Usenet", protocol: "UsenetDownloadProtocol", allowed: true, delay: 1 },
      { name: "Torrent", protocol: "TorrentDownloadProtocol", allowed: true, delay: 0 },
    ],
    bypassIfHighestQuality: true,
    bypassIfAboveCustomFormatScore: false,
    minimumCustomFormatScore: 0,
  },
};

const qualityProfile = (until_quality: string, qualities: Record<string, unknown>[]) => ({
  name: "e2e-qp",
  upgrade: { allowed: true, until_quality, until_score: 100 },
  min_format_score: 0,
  qualities,
});

/** One YAML with all five media instances and Prowlarr, mirroring a real multi-instance config. */
function pipelineConfig(): Record<string, unknown> {
  const shared = { custom_formats: cfAssignBlock(), ...e2eMediaSettings() };
  return {
    telemetry: false,
    customFormatDefinitions: [e2eCustomFormatDefinition()],
    ...mediaInstance("SONARR", {
      ...shared,
      quality_profiles: [qualityProfile("WEB 1080p", [{ name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] }])],
      delay_profiles: legacyDelay,
    }),
    ...mediaInstance("RADARR", {
      ...shared,
      quality_profiles: [qualityProfile("WEB 1080p", [{ name: "WEB 1080p", qualities: ["WEBDL-1080p", "WEBRip-1080p"] }])],
      delay_profiles: legacyDelay,
    }),
    ...mediaInstance("WHISPARR", {
      ...shared,
      quality_profiles: [qualityProfile("WEBDL-1080p", [{ name: "WEBDL-1080p" }])],
      delay_profiles: legacyDelay,
    }),
    ...mediaInstance("READARR", {
      ...shared,
      quality_profiles: [qualityProfile("EPUB", [{ name: "EPUB" }])],
      delay_profiles: legacyDelay,
    }),
    ...mediaInstance("LIDARR", {
      ...shared,
      quality_profiles: [qualityProfile("FLAC", [{ name: "FLAC" }])],
      delay_profiles: lidarrDelay,
    }),
    prowlarr: {
      e2e: {
        ...prowlarrConnection(),
        tags: ["e2e-tag"],
        sync_profiles: {
          data: [
            {
              name: "e2e-sync",
              enable_rss: true,
              enable_automatic_search: false,
              enable_interactive_search: true,
              minimum_seeders: 2,
            },
          ],
        },
        applications: {
          data: [
            {
              name: "e2e-sonarr",
              type: "Sonarr",
              sync_level: "addOnly",
              fields: { prowlarrUrl: "http://prowlarr:9696", baseUrl: "http://sonarr:8989", apiKey: E2E_API_KEY },
            },
          ],
          sync_indexers: false,
        },
      },
    },
  };
}

describe("configarr full pipeline (live)", () => {
  const sonarr = new SonarrClient(arrConnection("SONARR").baseUrl, arrConnection("SONARR").apiKey);
  const radarr = new RadarrClient(arrConnection("RADARR").baseUrl, arrConnection("RADARR").apiKey);
  const whisparr = new WhisparrClient(arrConnection("WHISPARR").baseUrl, arrConnection("WHISPARR").apiKey);
  const readarr = new ReadarrClient(arrConnection("READARR").baseUrl, arrConnection("READARR").apiKey);
  const lidarr = new LidarrClient(arrConnection("LIDARR").baseUrl, arrConnection("LIDARR").apiKey);
  const prowlarr = createProwlarrClient();
  const media: MediaArrClient[] = [sonarr, radarr, whisparr, readarr, lidarr];
  const baselines = new Map<MediaArrClient, MediaBaseline>();

  const cleanup = async () => {
    for (const client of media) await cleanupMediaE2e(client);
    await cleanupMetadataProfilesE2e(readarr);
    await cleanupMetadataProfilesE2e(lidarr);
    await cleanupProwlarrE2e(prowlarr);
  };

  beforeAll(async () => {
    await cleanup();
    for (const client of media) baselines.set(client, await snapshotMediaBaseline(client));
  }, 180_000);

  afterAll(async () => {
    for (const client of media) {
      const baseline = baselines.get(client);
      if (baseline) await restoreMediaBaseline(client, baseline);
    }
    await cleanup();
  });

  test("create then idempotent second run", async () => {
    const config = pipelineConfig();
    const first = await syncConfig(config);
    assertPipelineSucceeded(first.result, [...KINDS]);

    const second = await syncConfig(config, first.workspace);
    assertPipelineSucceeded(second.result, [...KINDS]);
    assertDiffUpToDate(second.result, [...KINDS]);

    for (const client of media) {
      expect(findNamed(await client.getCustomFormats(), "e2e-rt")).toBeTruthy();
      expect(findNamed(await client.getQualityProfiles(), "e2e-qp")).toBeTruthy();
    }

    expect((await prowlarr.getTags()).some((t) => t.label === "e2e-tag")).toBe(true);
    expect(findNamed(await prowlarr.getApplications(), "e2e-sonarr")).toBeTruthy();
  }, 600_000);
});
