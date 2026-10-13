# Plan: Sonarr v5 release-profile controls

Roadmap: [Sonarr v5 feature parity roadmap](2025-03-08-sonarr-v5-feature-roadmap.md)  
Research: [Sonarr v5 beta compatibility research](../research/2026-10-12-sonarr-v5-beta-configarr-compatibility.md)

## Goal

Expose Sonarr v5 release-profile behavior through Configarr's existing `release_profiles` config, including multiple indexers and v5's air-date and season-pack rules. Preserve existing `indexer` name-based selection and its v4 behavior.

## Proposed config behavior

- The existing public field is `indexer`, a single indexer name resolved to its server ID. Do not invent or preserve an `indexer_id` YAML field.
- Add `indexers` as the plural name-based selector, retaining `indexer` for backward compatibility. Reject a profile that sets both rather than guessing precedence.
- Resolve configured names against the server indexer list and map them to v5 `indexerIds`. Preserve the existing omitted `indexer` behavior (“all indexers”); confirmed from Sonarr's `ReleaseProfileService` that an empty `indexerIds` list also means all indexers.
- Added optional release-profile fields `air_date_restriction`, `air_date_grace_period` (hours), and `allow_season_pack_without_all_episodes_aired`, mapped to v5's `airDateRestriction`, `airDateGracePeriod`, and `allowSeasonPackWithoutAllEpisodesAired`.
- Expose v5 `excludedTags` as `excluded_tags`; reject it on v4 and reject tags that are both included and excluded.
- Preserve server values when optional settings are omitted. Do not unconditionally write adapter defaults such as grace period `0` if doing so changes an existing v5 profile.
- Treat the new settings as v5-only unless testing confirms equivalent v4 fields. If a v4 server receives them, report the unsupported option rather than discarding it.

## Implementation steps

1. **Complete:** Confirmed empty `indexerIds` means all indexers from Sonarr v5 source; tag overlap is rejected by the API; air-date grace is in hours.
2. **Complete:** Extended input validation for plural indexers and v5 policies, including conflicting singular/plural selectors and duplicate names.
3. **Complete:** Keep v5 release-profile resources in the Sonarr-specific sync/client path and explicitly project the v3 resource for Sonarr v4.
4. **Complete:** Compare indexer IDs and tags as sets, normalize nullable policy defaults, preserve omitted v5 policy fields on update, and validate unsupported v5-only config before pipeline writes.
5. **Complete:** Add unit coverage and live e2e coverage for v4 and v5. The v5 e2e test creates two disposable Newznab indexers and checks their IDs and the excluded-tag ID.
6. **Complete:** `pnpm build`, `pnpm test` (59 files, 798 tests), `pnpm lint`, and `pnpm typecheck` pass. Live Sonarr e2e passes on v4 and v5 (11 tests each). Independent review findings were fixed and re-reviewed with no remaining blockers.
7. **Complete:** Updated this plan with the implementation and verification results.

## Done when

- Existing YAML with `indexer` remains valid and keeps its behavior on v4 and v5.
- A v5 profile can target more than one indexer and round-trip without false diffs.
- Omitted optional fields preserve server-owned values.
- New v5-only settings fail clearly on v4 rather than silently disappearing.
