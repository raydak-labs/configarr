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
  E2E_TAG_LISTED,
  E2E_TAG_ORPHAN,
  E2E_TAG_REFERENCED,
  arrConnection,
  cfAssignBlock,
  e2eCustomFormatDefinition,
  e2eMediaSettings,
  instanceTagBlock,
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
  nonE2eLabels,
  restoreMediaBaseline,
  snapshotMediaBaseline,
  syncConfig,
  teardown,
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

  const cleanupSteps = [
    ...media.map((client) => () => cleanupMediaE2e(client)),
    () => cleanupMetadataProfilesE2e(readarr),
    () => cleanupMetadataProfilesE2e(lidarr),
    () => cleanupProwlarrE2e(prowlarr),
  ];

  beforeAll(async () => {
    await teardown(...cleanupSteps);
    for (const client of media) baselines.set(client, await snapshotMediaBaseline(client));
  }, 180_000);

  afterAll(async () => {
    await teardown(
      ...media.map((client) => async () => {
        const baseline = baselines.get(client);
        if (baseline) await restoreMediaBaseline(client, baseline);
      }),
      ...cleanupSteps,
    );
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

  // The instance-level `tags:` / `delete_unmanaged_tags:` block is cross-cutting, so it is
  // asserted here once instead of in all five per-*arr files. The 409 case (a tag held by a
  // resource configarr does not manage) is deliberately not attempted: no client in this repo
  // exposes import lists or notifications, so it cannot be set up. See src/tags/tags.test.ts.
  test("instance tags: block creates listed labels and delete_unmanaged_tags keeps referenced ones", async () => {
    // Seed the orphan directly so the delete pass has something that is neither listed nor
    // referenced by any managed feature.
    await sonarr.createTag({ label: E2E_TAG_ORPHAN });

    const keepLabels = nonE2eLabels(await sonarr.getTags());
    const config = {
      telemetry: false,
      ...mediaInstance("SONARR", {
        ...e2eMediaSettings(),
        ...instanceTagBlock(keepLabels),
      }),
    };

    const first = await syncConfig(config);
    assertPipelineSucceeded(first.result, ["SONARR"]);

    const afterFirst = await sonarr.getTags();
    const labels = afterFirst.map((t) => t.label);
    expect(labels).toContain(E2E_TAG_LISTED);
    // Referenced only by the managed delay profile, never by `tags` or `ignore`.
    expect(labels).toContain(E2E_TAG_REFERENCED);
    expect(labels).not.toContain(E2E_TAG_ORPHAN);
    for (const kept of keepLabels) {
      expect(labels).toContain(kept);
    }

    // The delay profile carrying the referenced tag is the reason it survived the delete pass.
    const delayTagId = afterFirst.find((t) => t.label === E2E_TAG_REFERENCED)?.id;
    if (delayTagId == null) {
      throw new Error(`Tag '${E2E_TAG_REFERENCED}' was not created`);
    }
    const profiles = await sonarr.getDelayProfiles();
    expect(profiles.some((p) => Array.isArray(p.tags) && p.tags.includes(delayTagId))).toBe(true);

    const second = await syncConfig(config, first.workspace);
    assertPipelineSucceeded(second.result, ["SONARR"]);
    assertDiffUpToDate(second.result, ["SONARR"]);
  }, 600_000);
});
