# Plan: Sonarr v5 media-management controls

Roadmap: [Sonarr v5 feature parity roadmap](2025-03-08-sonarr-v5-feature-roadmap.md)  
Research: [Sonarr v5 beta compatibility research](../research/2026-10-12-sonarr-v5-beta-configarr-compatibility.md)

## Goal

Expose the v5 media-management settings that fit Configarr's existing `media_management` sync, without removing settings from older Sonarr or other *arr applications and without overwriting fields the user has not configured.

## Candidate settings

The pinned v5 OpenAPI resource contains `skipFreeSpaceCheckWhenGrabbing`, `seasonPackUpgrade`, `seasonPackUpgradeThreshold`, and `userRejectedExtensions`. The client preserves unmodeled settings during read/modify/write, but users cannot declare these settings in Configarr. Confirm the official enum values and field behavior against the exact target release before adopting them.

The fields were verified against Sonarr v5.0.0.2569 at source commit `57816c149d02f95543973fefb4780c4495f8121c`, and compared with v4.0.19.2979:

- `skipFreeSpaceCheckWhenGrabbing` is a v5-only boolean that skips the root-folder capacity check before a release is grabbed. It is separate from the existing `skipFreeSpaceCheckWhenImporting` setting; its default is false.
- `seasonPackUpgrade` accepts `all`, `threshold`, or `any`. `all` requires every existing episode in the pack to qualify as an upgrade; `threshold` uses the configured percentage; `any` requires at least one. Missing episodes count as upgradable.
- `seasonPackUpgradeThreshold` is a percentage from 0 through 100, inclusive, with decimal values accepted. The mode only uses it for `threshold`.
- `userRejectedExtensions` is a comma-separated string, accepts optional leading dots, and is normalized by Sonarr. The settings API rejects valid media and archive extensions.
- None of these four fields exists in the pinned v4 media-management resource.

`userRejectedExtensions` is **not** the built-in executable/potentially-dangerous extension control. It is an additional list; an indexer must also have its separate **User Defined Extensions** fail-download option enabled for matching releases to fail the download.

Primary evidence: [pinned v5 OpenAPI](https://github.com/Sonarr/Sonarr/blob/57816c149d02f95543973fefb4780c4495f8121c/src/Sonarr.Api.V5/openapi.json), [season-pack upgrade decision](https://github.com/Sonarr/Sonarr/blob/57816c149d02f95543973fefb4780c4495f8121c/src/NzbDrone.Core/DecisionEngine/Specifications/UpgradeDiskSpecification.cs), [v5 settings validation](https://github.com/Sonarr/Sonarr/blob/57816c149d02f95543973fefb4780c4495f8121c/src/Sonarr.Api.V5/Settings/MediaManagementSettingsController.cs), [free-space grab check](https://github.com/Sonarr/Sonarr/blob/57816c149d02f95543973fefb4780c4495f8121c/src/NzbDrone.Core/DecisionEngine/Specifications/FreeSpaceSpecification.cs), the [free-space setting PR](https://github.com/Sonarr/Sonarr/pull/8802), and the [user extension feature PR](https://github.com/Sonarr/Sonarr/pull/7907).

## Implementation steps

1. [x] Probe v5 `GET /api/v5/settings/mediamanagement`, compare OpenAPI with v4, and verify exact enum/range/string/boolean semantics from server source.
2. [x] Add typed optional config fields and retain arbitrary server-managed fields.
3. [x] Preserve these v5 fields through the Sonarr adapter’s read/modify/write path; reject configured controls on v4 and other media managers before mutations.
4. [x] Add unit coverage for accepted/rejected schema values, version validation, v5 field round-trip, and preservation of unrelated v4 and v5 settings.
5. [x] Extend Sonarr e2e media-settings coverage to create/update/read back the four controls and fractional thresholds, then verify a subsequent run is up to date on both v4 and v5.
6. [x] Document field meanings, the v5 requirement, and the separate per-indexer prerequisite for failing downloads.

## Done when

- Users can configure each verified v5-only media-management setting without losing unrelated settings.
- Existing v4 and non-Sonarr media-management configuration remains unchanged; unsupported v5-only keys fail before the pipeline writes.
- The exact setting behavior is demonstrated by v4 and v5 read-after-write e2e tests, including an idempotent second run.
