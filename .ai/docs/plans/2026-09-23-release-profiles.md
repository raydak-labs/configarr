# Plan: release profiles (#541)

Spec: [`.ai/docs/specs/2026-09-23-release-profiles-design.md`](../specs/2026-09-23-release-profiles-design.md)

## Steps

1. Zod schema `InputConfigReleaseProfileSchema`, `release_profiles` on the arr instance, `"release_profiles"` on `MappedTemplates`, template/instance merge overwrite, telemetry flag.
2. `ReleaseProfilesClient` + `IndexersClient` on capabilities; implement on the five media clients. Lazy once-load `ServerCache.getIndexers(loader)`.
3. `src/releaseProfiles/`: types, `BaseReleaseProfileSync` (keying, diff, tag create, indexer lookup, CUD, dry-run, diff entries), five thin per-arr classes (`supportsName` true for Sonarr/Radarr/Whisparr).
4. Wire `releaseProfiles` into `MediaFeatureSyncs`, each `*Syncer.ts`, and `completeMediaSync` (run when `config.release_profiles !== undefined`).
5. Unit tests (create/update/delete/`[]`/content-key/duplicate names/missing tags/indexer cache/unknown indexer/dry-run/Lidarr name drop) + e2e CUDI per media *arr + user docs.
