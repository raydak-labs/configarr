# Media naming and media management consolidation

**Status:** implemented (2026-11-16)
**Plan:** [2026-11-16-clean-code-yagni.md](../plans/2026-11-16-clean-code-yagni.md)
**Previous spec:** [2026-11-16-media-naming-classes-design.md](./2026-11-16-media-naming-classes-design.md)

## Scope change

A separate `mediaNaming/` feature duplicated ownership: `MediaManagementSync` already handled naming reads,
diffs, and writes. Friendly-name mapping now lives in that same feature instead of separate handler classes.

## Decisions

- `MediaManagementSync.mapNaming()` returns `undefined` by default for apps without friendly-name mapping.
- New `RadarrMediaManagementSync` and existing `SonarrMediaManagementSync` override `mapNaming()`. Each app
  module imports only its own generated contracts.
- Shared TRaSH lookup and logging stay protected on `MediaManagementSync`.
- `mediaPipeline.ts` passes the existing `mm` handler to config merging. No separate handler slot exists.
- Config merging warns on `undefined`; `null` still means TRaSH naming data is unavailable.
- The `mediaNaming/` folder is removed. Tests live beside the base, Radarr, and Sonarr implementations.
