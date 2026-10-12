# Plan: Sonarr v5 release-profile controls

Roadmap: [Sonarr v5 feature parity roadmap](2025-03-08-sonarr-v5-feature-roadmap.md)  
Research: [Sonarr v5 beta compatibility research](../research/2026-10-12-sonarr-v5-beta-configarr-compatibility.md)

## Goal

Expose Sonarr v5 release-profile behavior through Configarr's existing `release_profiles` config, including multiple indexers and v5's air-date and season-pack rules. Preserve existing singular-indexer configuration and its v4 behavior.

## Proposed config behavior

- Add `indexer_ids` as the plural selector. Continue to accept legacy `indexer_id`; reject a profile that sets both rather than guessing precedence.
- On v5, map the plural selector to `indexerIds`; retain current semantics for a missing/zero legacy selector as “all indexers,” and a positive singular selector as one indexer.
- Add optional release-profile fields corresponding to v5's `airDateRestriction`, `airDateGracePeriod`, and `allowSeasonPackWithoutAllEpisodesAired`. Confirm their final public YAML names and server defaults from the final API before implementation.
- Check whether `excludedTags` is new relative to v4 and whether Configarr should expose it alongside its existing `tags` selector; if it is a v5-only capability, apply the same explicit unsupported-version behavior.
- Preserve server values when optional settings are omitted. Do not unconditionally write adapter defaults such as grace period `0` if doing so changes an existing v5 profile.
- Treat the new settings as v5-only unless testing confirms equivalent v4 fields. If a v4 server receives them, report the unsupported option rather than discarding it.

## Implementation steps

1. Verify the pinned v5 create/update/read behavior for each new field, including empty indexer arrays, one and multiple IDs, tags, and excluded tags.
2. Extend `InputConfigReleaseProfileSchema` and internal types. Add validation for duplicate indexer IDs and the conflict between `indexer_id` and `indexer_ids`.
3. Update the Sonarr v5 adapter to round-trip all release-profile fields without changing the shared v4 generated resource contract. Keep conversion localized in `SonarrClient`.
4. Ensure profile matching and diffs distinguish `indexerIds` as an unordered set if the server does not guarantee order. Keep the public config order deterministic for readable diffs.
5. Define missing/empty selector semantics explicitly: omitted means preserve an existing profile or use the documented default for create; an explicit empty list means all indexers only if the API confirms that interpretation.
6. Add unit tests for v4/v5 conversion, old `indexer_id` compatibility, plural-indexer matching, empty values, and unsupported v5-only fields on v4.
7. Extend the Sonarr e2e suite to create, read back, update, and re-sync a multi-indexer profile and each new policy field against v5. Keep a legacy singular-indexer scenario on both versions.
8. Update user docs with migration examples and explain that v4 cannot apply v5-only settings.

## Done when

- Existing YAML with `indexer_id` remains valid and keeps its behavior on v4 and v5.
- A v5 profile can target more than one indexer and round-trip without false diffs.
- Omitted optional fields preserve server-owned values.
- New v5-only settings fail clearly on v4 rather than silently disappearing.
