# Sonarr v5 support

Status: implemented (2026-10-13); tested against Sonarr 4.0.19.2979 and 5.0.0.2569.

Research: [Sonarr v5 compatibility findings](../research/2026-10-13-sonarr-v5-compatibility.md)

## Goal and approach

Support v4 and v5 through one Sonarr configuration and one `getClient("SONARR")` entry point. Detect the active API with `GET /api`, cache the result for the run, and dispatch to separately generated v3/v5 clients inside `SonarrClient`. Keep version-specific resource translation at that boundary; do not leak generated v5 models into shared feature modules or change other *arr clients.

This is more than a route rename: v5 relocates quality sizes from global definitions to profile items, changes release-profile shape, adds settings absent from v4, and tightens custom-format payload requirements. Preserve existing v4 configuration and behavior. Reject configured v5-only settings on v4 before any write rather than silently dropping them.

## Configuration and design decisions

```yaml
quality_profiles:
  - name: WEB-1080p
    quality_sizes:
      - quality: WEBDL-1080p
        min: 0
        preferred: 75
        max: 200

release_profiles:
  - name: Example policy
    indexers: [Usenet, Torrents]
    excluded_tags: [anime]
    air_date_restriction: true
    air_date_grace_period: 12 # Hours.
    allow_season_pack_without_all_episodes_aired: false

media_management:
  skipFreeSpaceCheckWhenGrabbing: false
  seasonPackUpgrade: threshold
  seasonPackUpgradeThreshold: 80
  userRejectedExtensions: ".xyz"
```

Quality-size fields resolve independently: a profile's explicit `quality_sizes` value wins, otherwise the matching global `quality_definition` value is applied, otherwise the server value is preserved. `undefined` means “not configured”; zero is a real value. Selectors accept a quality name or title. Unknown, duplicate, or ambiguous selectors are rejected. Disabled and nested quality items that Sonarr adds implicitly remain valid targets. A v4 request using `quality_sizes` fails validation before the pipeline can mutate any resource.

For release profiles, retain the existing name-based singular `indexer` selector on v4 and v5. Add `indexers` for v5 multi-indexer targeting; reject simultaneous singular and plural selectors. An omitted selector, or `indexers: []`, means all indexers (confirmed in Sonarr's release-profile service). Compare indexer and tag IDs as sets. `excluded_tags`, `air_date_restriction`, `air_date_grace_period` (hours), and `allow_season_pack_without_all_episodes_aired` are v5-only; reject them on v4. Excluded tags override included tags, and overlapping tag sets are invalid. Omitted policy values preserve server state; on create, apply the API-required grace-period default without changing updates.

The four v5 media-management settings are `skipFreeSpaceCheckWhenGrabbing`, `seasonPackUpgrade` (`all`, `threshold`, `any`), `seasonPackUpgradeThreshold` (0–100), and `userRejectedExtensions` (comma-separated string). No equivalent fields exist in the pinned v4 resource. `userRejectedExtensions` adds a user-defined list; it is not the built-in dangerous/executable extension filter. An indexer must separately enable its user-defined-extension fail-download option for matching releases to fail.

For v5 custom formats, load the server's custom-format schema and enrich each specification with required implementation metadata before writing; TRaSH's minimal definitions alone are not a valid v5 request. For disabled download clients, translate v4's `forceSave`/`forceTest` behavior to v5's `skipTesting` and `skipValidation` query contract. Do not assume query parameter names imply identical behavior; the disabled-client flow was verified against the pinned beta.

The full user-facing reference and runnable v4/v5 example are in [configuration docs](../../../docs/docs/configuration/config-file.md) and [`examples/full/config/config.yml`](../../../examples/full/config/config.yml).

## Implementation and verification sequence

1. **Pin the contracts.** Generate independent clients from v4's v3 OpenAPI and the pinned v5 OpenAPI. Keep routes and generated resource shapes distinct.
2. **Discover the server API.** Confirm `/api` returns `current: v3` on v4 and `current: v5` on v5. Cache discovery and test API-key access on both.
3. **Adapt stable/shared features.** Test tags, custom formats, quality profiles, delay profiles, root folders, UI, naming, and download-client settings. Preserve unknown server-owned fields during read/modify/write.
4. **Model moved quality sizes.** Add `quality_sizes` and the precedence rules above; cover dry-run, new profiles, implicit items, v4 preflight, null/omitted nested arrays, and preservation when qualities move between groups.
5. **Extend release profiles.** Add the plural selector and v5 policies without changing shared payload models for other arrs. Cover normalized defaults, set equality, v4 rejection, and persisted multi-indexer/excluded-tag state.
6. **Add media-management controls.** Validate enum/range/string inputs, preserve unrelated server settings, and reject v5-only values on v4 before writes.
7. **Run the matrix and example.** Keep isolated v4/v5 `/config` volumes. Run unit/build/lint/typecheck, both versioned Sonarr e2e suites, then the full example with its real TRaSH include; repeat the example to check idempotency.

### Acceptance results

- [x] Existing v4 configuration continues to use the v3 API; the same instance configuration also works against v5 by runtime discovery.
- [x] V5-only options fail before writes on v4; the shared media pipeline and unrelated arr clients remain version-agnostic.
- [x] The pinned API matrix passes for v4.0.19.2979 and v5.0.0.2569; the Sonarr e2e suite passed 11 tests per version.
- [x] Unit suite (810 tests), build, lint, and typecheck passed during implementation. Independent implementation reviews found and resolved issues before changes were committed.
- [x] The full example uses both Sonarr versions by default, imports TRaSH WEB-1080p on v5, and completed with zero failed instances. The second run reported the v5 instance up to date with no changes.

## Verification and limits

The reference v5 target is Sonarr 5.0.0.2569 (source commit `57816c149d02f95543973fefb4780c4495f8121c`) and the pinned LinuxServer image digest in the e2e and full-example Compose files. This is evidence for that beta only, not every later beta or final release. Re-run the API matrix when updating the image. Reverse-proxy and URL-base variants have not been verified. Keep the v5 database volume isolated: upstream says downgrading to v4 requires restoring a v4 backup.
