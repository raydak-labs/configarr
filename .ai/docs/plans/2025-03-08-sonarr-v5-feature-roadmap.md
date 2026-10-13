# Plan: Sonarr v5 feature parity roadmap

Research: [Sonarr v5 beta compatibility research](../research/2026-10-12-sonarr-v5-beta-configarr-compatibility.md)

## Recommendation

Keep one Configarr Sonarr instance configuration and detect the API version at runtime. The current implementation already queries `GET /api`, caches the result for the run, and dispatches to generated v3 or v5 clients. Keep API-version branching inside the Sonarr client and its adapters; feature syncers should operate on Configarr's shared concepts rather than contain scattered version checks.

The runtime choice is appropriate because Configarr already knows the server URL and credentials, the API publishes its current version, and the v4/v5 paths and payloads differ. It also lets existing v4 configuration continue to work without asking users to declare a version. Where a feature genuinely exists only in v5, fail with an actionable unsupported-version error if a v4 server receives that setting; do not silently ignore it.

The new API location for quality sizes is not only a path/payload relocation. v4 exposes one global value per quality, while v5 stores the values on each quality-profile item. Multiple v5 profiles can therefore have different values for the same quality. Configarr's existing `quality_definition` flow has global semantics, so mapping it directly to a single v5 profile would lose information. Keep the current global config as a backward-compatible default, then add an explicit per-profile override.

## Scope and feature inventory

This roadmap covers Sonarr v5 changes that might affect Configarr's API-driven configuration or sync behavior. It is not a plan to reproduce every Sonarr UI, parsing, or internal feature.

| Sonarr v5 change                                                                                             | Configarr relevance                                                                                            | Disposition                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| API v5, versioned routes, changed settings and request contracts                                             | Required to connect to v5 while preserving v4                                                                  | Implemented and tested against the pinned beta; retain the version-matrix e2e coverage.                                                             |
| Quality sizes on quality-profile items instead of global quality definitions                                 | Existing Configarr quality-definition config remains useful, but cannot express different values per profile   | Implemented; see [per-profile quality sizes](2025-03-08-sonarr-v5-profile-quality-sizes.md).                                                        |
| Multi-indexer release profiles, excluded tags, pre-airdate restrictions, grace period, and season-pack rules | Directly extends a feature Configarr already syncs                                                             | Implemented and e2e-tested against the pinned beta; see [release-profile controls](2025-03-08-sonarr-v5-release-profile-controls.md).               |
| Season-pack upgrade settings and rejected-extension settings in media management                             | Potentially configurable through the existing media-management sync                                            | Implemented and e2e-tested against the pinned beta; see [media-management controls](2025-03-08-sonarr-v5-media-management-controls.md).             |
| TVDB metadata language and series ordering                                                                   | Relevant only if Configarr adds series-level resource management; it currently does not manage series metadata | Defer until a series-management feature is proposed. Reuse v5's series fields then; do not add a separate settings sync just to mirror Sonarr's UI. |
| qBittorrent tagging and other download/grab behavior                                                         | The announcement describes Sonarr behavior, not a demonstrated Configarr-managed setting or API contract       | Do not implement based on announcement text alone. Revisit if the pinned API exposes a stable setting that Configarr owns.                          |
| UI redesign, search/release parsing changes, authentication UI options, and .NET runtime upgrade             | Do not alter Configarr's current configuration payloads. Configarr uses the API key contract for API access.   | Out of scope for sync feature parity; keep connection smoke tests for API-key access.                                                               |

The v5 announcement is useful for identifying product areas, but OpenAPI contracts and runtime tests determine whether Configarr can configure them. The planned Configarr-facing implementation is complete against the pinned beta; recheck the inventory against the final v5 release before declaring compatibility with that release.

## Recommended implementation order

1. **Per-profile quality sizes.** Define the YAML semantics and merge precedence before changing the API adapter. Preserve current global quality-definition behavior for v4 and use it as the v5 default.
2. **Release-profile controls.** Add the multi-indexer selector without breaking existing `indexer_id` configs, then expose the new v5-only policy fields with explicit version behavior.
3. **Media-management controls.** Expose v5 settings that belong to Configarr's existing media-management boundary, while keeping v4 behavior unchanged.
4. **Revalidate the v5 matrix.** Run existing Sonarr e2e cases against v4 and the currently pinned v5 build after each implementation, then repeat against a later beta/final build when available.

## Cross-cutting acceptance criteria

- v4 and v5 continue to work through the same `getClient("SONARR")` path and existing config.
- Version discovery is cached for a run, and unsupported or malformed API-version responses fail clearly.
- Version-specific generated resources stay within `src/clients/sonarr-client.ts`; shared feature modules do not import Sonarr v5 generated types.
- Read/modify/write operations preserve fields owned by Sonarr but not by Configarr.
- User-facing fields that v4 cannot represent are never silently dropped on v4.
- Unit tests cover schemas, version-specific mapping, precedence, and unsupported-version behavior; e2e tests verify persisted values and idempotent second runs on both versions.
- The v5 Compose service keeps its separate disposable database volume and pinned image; never share its `/config` with v4.

## Status

The v3/v5 compatibility layer and per-profile quality sizes are implemented and tested against v4 and the pinned v5 beta. Release-profile controls and media-management controls remain planned in the linked feature plans.
