# Sonarr v5 compatibility research

**Snapshot:** 2026-10-13

**Compared builds:** Sonarr v4.0.19.2979 and v5.0.0.2569

**Pinned v5 source:** commit `57816c149d02f95543973fefb4780c4495f8121c`

This document records the contract comparison, upstream behavior findings, implementation experiments, and unresolved boundaries behind Configarr's dual-version support. OpenAPI describes request/response shapes; source and pinned-container tests establish behavior where the contract is insufficient.

## Sources and version context

Sonarr's [v5 beta announcement](https://forums.sonarr.tv/t/sonarr-v5-beta/41099) introduces API v5 and calls out expanded release profiles that can target multiple indexers. It is a feature-discovery source, not a replacement for the API contract. Sonarr warns that downgrading requires restoring a v4 backup, so v5 must use an isolated database/config volume.

- [Pinned v5 OpenAPI](https://github.com/Sonarr/Sonarr/blob/57816c149d02f95543973fefb4780c4495f8121c/src/Sonarr.Api.V5/openapi.json)
- [Pinned v4.0.19.2979 OpenAPI](https://github.com/Sonarr/Sonarr/blob/v4.0.19.2979/src/Sonarr.Api.V3/openapi.json)
- [Sonarr v5 source tag](https://github.com/Sonarr/Sonarr/tree/v5.0.0.2569) and [commit](https://github.com/Sonarr/Sonarr/commit/57816c149d02f95543973fefb4780c4495f8121c)
- [v5 API documentation](https://sonarr.tv/docs/api/?api=v5) and [v3 API documentation](https://sonarr.tv/docs/api/index) (v3/v4)
- [Consolidated implementation plan](../plans/2026-10-13-sonarr-v5-support.md)

The branch-based `develop` and `v5-develop` OpenAPI URLs are rolling snapshots. The compatibility claims below refer to the pinned artifacts, not future releases.

## OpenAPI comparison

| Area                        | v4 contract                                                                                                     | v5 contract and impact                                                                                                                                                                                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API and settings            | Versioned `/api/v3`; naming, media management, and download-client settings use `/config/...`.                  | Versioned `/api/v5`; these settings move to `/settings/...`, and resource type names change. `recycleBinCleanupDays`, `minimumFreeSpaceWhenImporting`, and `seasonPackUpgradeThreshold` are nullable in v5. Keep generated models separate and adapt at the Sonarr client boundary. |
| Quality profiles            | Supports profile qualities, cutoff, format scores, and CRUD.                                                    | Main payload remains similar; documented success codes differ. Retain shared sync behavior and adapt transport responses.                                                                                                                                                           |
| Quality definitions         | Resource includes `minSize`, `preferredSize`, and `maxSize`; bulk operation is `PUT /qualitydefinition/update`. | Definition resource only has identity/quality/title/weight; bulk route is `PUT /qualitydefinition`. Size fields are on quality-profile quality items. Existing global config cannot represent independent values for the same quality across profiles.                              |
| Custom formats              | Resource contains specifications; v4 contract is less strict about nested schema metadata.                      | Specification fields include required `implementationName`, `infoLink`, and implementation field definitions. Minimal Configarr/TRaSH payloads fail unless enriched from the v5 schema endpoint.                                                                                    |
| Tags and delay profiles     | CRUD under v3 routes.                                                                                           | Core payloads and operations remain materially similar under v5; versioned paths and response codes differ.                                                                                                                                                                         |
| Naming and media management | `/config/naming` and `/config/mediamanagement` with v3 resource types.                                          | `/settings/naming` and `/settings/mediamanagement` with renamed resource types. Naming property `colonReplacementFormat` remains unchanged in the pinned beta.                                                                                                                      |
| Media-management properties | Does not contain v5's grabbing check, season-pack upgrade policy, threshold, or user-rejected extension list.   | Adds `skipFreeSpaceCheckWhenGrabbing`, `seasonPackUpgrade`, `seasonPackUpgradeThreshold`, `userRejectedExtensions`. Other existing fields remain, with the noted nullability differences.                                                                                           |
| Root folders                | CRUD resource contains path/accessibility/space/unmapped-folder data; no update route.                          | Adds `isEmpty`; no update route. Existing behavior needs no feature-specific branch.                                                                                                                                                                                                |
| Download clients            | Create/update/test flags include `forceSave` and `forceTest`.                                                   | Create/update use `skipTesting` and `skipValidation`; test uses `skipValidation`. These are changed request contracts, not safe name substitutions without a live save test.                                                                                                        |
| Release profiles            | One `indexerId`; grace period non-nullable.                                                                     | `indexerIds` is an array; adds `excludedTags`, air-date restriction/grace, and season-pack policy. Existing singular config needs projection; v5 fields need explicit YAML and v4 rejection.                                                                                        |
| Metadata profiles           | No Sonarr metadata-profile CRUD endpoints.                                                                      | Still no metadata-profile CRUD; `/settings/metadata` is not the metadata-profile feature Configarr supports for other applications.                                                                                                                                                 |

The announcement also mentions UI redesign, search/release parsing, qBittorrent tagging, OIDC/authentication UI, and runtime changes. These do not automatically imply Configarr configuration work: they are out of scope unless a stable API setting belongs to a Configarr-managed feature. API-key access was tested against both pinned builds; UI authentication announcements alone do not establish an API-key incompatibility.

## Upstream behavior findings

- **Release-profile indexers:** `ReleaseProfileService.EnabledForTags` matches a profile when its `IndexerIds` contains the release indexer or the list is empty. Thus empty `indexerIds` means all indexers. The resource defaults the list to `[]`. Sources: [service](https://github.com/Sonarr/Sonarr/blob/v5.0.0.2569/src/NzbDrone.Core/Profiles/Releases/ReleaseProfileService.cs), [resource](https://github.com/Sonarr/Sonarr/blob/v5.0.0.2569/src/Sonarr.Api.V5/Profiles/Release/ReleaseProfileResource.cs).
- **Release-profile tags:** empty profile tags or a matching included tag allow application; any matching excluded tag blocks it. The API rejects overlap between included and excluded tag IDs. Sources: [service](https://github.com/Sonarr/Sonarr/blob/v5.0.0.2569/src/NzbDrone.Core/Profiles/Releases/ReleaseProfileService.cs), [controller validation](https://github.com/Sonarr/Sonarr/blob/v5.0.0.2569/src/Sonarr.Api.V5/Profiles/Release/ReleaseProfileController.cs).
- **Air-date policy:** grace is in hours. A missing air date is rejected; for multiple applicable restrictive profiles, Sonarr uses the larger grace period. Source: [AirDateSpecification](https://github.com/Sonarr/Sonarr/blob/v5.0.0.2569/src/NzbDrone.Core/DecisionEngine/Specifications/AirDateSpecification.cs).
- **Season-pack permission:** the v5 setting defaults false. A restrictive profile can prevent early season-pack grabbing even if another applicable profile allows it. Source: [FullSeasonSpecification](https://github.com/Sonarr/Sonarr/blob/v5.0.0.2569/src/NzbDrone.Core/DecisionEngine/Specifications/FullSeasonSpecification.cs).
- **Season-pack quality upgrades:** `all` requires every existing episode to qualify, `threshold` compares the upgradable percentage with the configured 0–100 threshold, and `any` requires one episode. Missing episodes count as upgradable. Source: [UpgradeDiskSpecification](https://github.com/Sonarr/Sonarr/blob/v5.0.0.2569/src/NzbDrone.Core/DecisionEngine/Specifications/UpgradeDiskSpecification.cs).
- **Rejected extensions:** `userRejectedExtensions` is a comma-separated user-defined string, normalized by Sonarr; valid media/archive extensions are rejected as invalid settings. It is separate from built-in dangerous/executable lists. Failing a matching download additionally requires the per-indexer user-defined-extension fail-download option. Sources: [settings controller](https://github.com/Sonarr/Sonarr/blob/v5.0.0.2569/src/Sonarr.Api.V5/Settings/MediaManagementSettingsController.cs), [rejected-import handling](https://github.com/Sonarr/Sonarr/blob/v5.0.0.2569/src/NzbDrone.Core/Download/RejectedImportService.cs), [extension lists](https://github.com/Sonarr/Sonarr/blob/v5.0.0.2569/src/NzbDrone.Core/MediaFiles/FileExtensions.cs).
- **Grabbing free space:** `skipFreeSpaceCheckWhenGrabbing` is a v5-only boolean, defaults false, and is separate from `skipFreeSpaceCheckWhenImporting`. When enabled it bypasses the grab-side capacity check. Sources: [FreeSpaceSpecification](https://github.com/Sonarr/Sonarr/blob/v5.0.0.2569/src/NzbDrone.Core/DecisionEngine/Specifications/FreeSpaceSpecification.cs), [upstream change](https://github.com/Sonarr/Sonarr/pull/8802).

## Runtime findings and implementation consequences

The pinned LinuxServer image digest used for tests/examples reports `5.0.0.2569-ls193`; v4 reports `4.0.19.2979`. With `X-Api-Key`, live `GET /api` returned `{"current":"v3"}` for v4 and `{"current":"v5","deprecated":["v3"]}` for v5. The matching `/api/v3/system/status` and `/api/v5/system/status` endpoints both succeeded. This verifies automatic dispatch for these builds, not reverse proxies or URL-base variants.

Experiments exposed these concrete issues and design rules:

1. **Custom-format writes:** a minimal v5 POST returns HTTP 400 because implementation name, info link, and complete field metadata are required. Fetch `/api/v5/customformat/schema`, enrich requested specifications, then overlay Configarr/TRaSH values. This passed against an actual TRaSH template.
2. **Quality-size location:** v5 definition resources cannot represent global sizes. The v5 adapter reads/writes profile-item sizes. Existing `quality_definition` sizes act as defaults across profiles, while `quality_sizes` overrides them per profile; if neither is configured, preserve server state. Do not treat a possibly common-value projection as authoritative. Preserve null/omitted child arrays and existing leaf sizes during read/modify/write; otherwise requests mutate unrelated profile structure.
3. **Quality-size validation:** validate unknown/ambiguous selectors and duplicates before writes. Profile membership includes nested/disabled items that Sonarr adds implicitly. Dry-run includes defaults for profiles that would be created. A v4 `quality_sizes` request is rejected before any other feature mutation.
4. **Release profiles:** v5 uses `indexerIds`; empty is all indexers. Singular `indexer` remains compatible, plural `indexers` resolves names to IDs, and setting both is invalid. Normalize indexer/tag arrays as sets; normalize omitted/null default policy values. On create, supply the API-required grace period; on update, preserve omitted v5 policy fields rather than clearing them. Compare and write a v4 projection only on v4.
5. **Download clients:** disabled-client create/update worked with `skipTesting` and `skipValidation=all`, confirming the practical behavior needed for disabled clients on this beta.
6. **Media management:** project v5-only fields out of v3 requests, while preserving unknown v3 server fields during updates. A configured v5-only value fails preflight on v4; unrelated settings are not lost.
7. **Deployment:** v4 and v5 require separate `/config` volumes. The v5 beta warns that downgrade requires restoring a v4 backup.

The Sonarr e2e matrix passed 11 tests on each pinned build, including custom formats, quality profiles/sizes, media settings, delay and release profiles, download clients, root folders, and repeated syncs. Unit tests, build, lint, and typecheck passed during implementation (810 unit tests in the recorded full run).

The full example now starts v4 and v5 by default and uses the TRaSH Sonarr WEB-1080p template (`72dae194fc92bf828f32cde7744e51a1`) for v5. The first local run against the whole example stack completed with `SONARR: (2/0/0)` and zero failures across all instances; it imported the TRaSH profile, synchronized custom formats/settings, and created the `/app` root folder and release profile. After setting the example's `until_score` to match Sonarr's default `cutoffFormatScore: 0`, the second run reported the v5 instance as up to date with no changes. Both Sonarr APIs returned their expected versions, and the containers remain running for UI inspection.

## Limits and follow-up

Compatibility is demonstrated for the pinned v4/v5 builds only. Re-run the version matrix and regenerate/review clients when changing the v5 image or OpenAPI source. Reverse-proxy and non-empty URL-base behavior remain unverified. The beta announcement is useful for discovering changes, but UI-only or internal behavior needs a stable API contract before being added to Configarr.

## Source index

- [Sonarr v5 beta announcement](https://forums.sonarr.tv/t/sonarr-v5-beta/41099)
- [Sonarr v5.0.0.2569 release](https://github.com/Sonarr/Sonarr/releases/tag/v5.0.0.2569)
- [Pinned v5 OpenAPI](https://github.com/Sonarr/Sonarr/blob/57816c149d02f95543973fefb4780c4495f8121c/src/Sonarr.Api.V5/openapi.json)
- [Pinned v4 OpenAPI](https://github.com/Sonarr/Sonarr/blob/v4.0.19.2979/src/Sonarr.Api.V3/openapi.json)
