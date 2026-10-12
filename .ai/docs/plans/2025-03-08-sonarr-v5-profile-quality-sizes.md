# Plan: Sonarr v5 per-profile quality sizes

Roadmap: [Sonarr v5 feature parity roadmap](2025-03-08-sonarr-v5-feature-roadmap.md)  
Research: [Sonarr v5 beta compatibility research](../research/2026-10-12-sonarr-v5-beta-configarr-compatibility.md)

## Goal

Allow Sonarr v5 users to configure different `minSize`, `preferredSize`, and `maxSize` values for the same quality in different quality profiles, while keeping existing global `quality_definition` configuration working unchanged on v4 and v5.

## Recommendation and semantics

Add an optional `quality_sizes` list to each Configarr `quality_profiles` entry, keyed by quality name. This avoids overloading the existing profile quality-group syntax and makes it clear that these are per-profile overrides. Example:

```yaml
quality_profiles:
  - name: WEB-1080p
    quality_sizes:
      - quality: WEB 1080p
        min: 0
        preferred: 3000
        max: 6000
```

Use the existing quality-definition field names (`min`, `preferred`, `max`) where possible. Confirm the exact public YAML spelling against the project's established examples and naming conventions before implementation.

For v5, resolve each profile/quality field independently using this precedence:

1. Explicit `quality_sizes` value on that profile wins.
2. Existing global `quality_definition.qualities` value is the default for profiles without an explicit override.
3. If neither is configured, preserve that profile's current server value.

Do not synthesize one common v5 quality size from all profiles and present it as authoritative. If profiles disagree, that projection is inherently lossy. On v4, preserve existing global `quality_definition` behavior; if a config uses the new per-profile-only setting, return a clear error because v4 has no corresponding storage.

The generated v5 API places size fields on `QualityProfileQualityItemResource`; v5's `QualityDefinitionResource` has no size fields. The current client adapter projects common profile sizes into Configarr's legacy v4-shaped quality-definition interface and applies global configured sizes across profiles. The implementation must replace that lossy projection as the source of truth for profile-specific values without regressing the legacy global workflow.

## Implementation steps

1. **Confirm the write contract.** Against the pinned v5 image, manually verify that size values survive `GET /api/v5/qualityprofile`, `PUT /api/v5/qualityprofile/{id}`, and profile creation. Verify quality names/IDs for nested groups and confirm whether size fields belong on group nodes, leaf nodes, or both.
2. **Define and validate config.** Extend `InputConfigQualityProfileSchema` with the optional keyed size list. Reject duplicate quality selectors in one profile, unknown quality names, and invalid numeric ranges with useful diagnostics.
3. **Keep the sync model explicit.** Carry per-profile settings through the existing profile load/diff/persist lifecycle. Resolve the profile's configured overrides and legacy global defaults in one Sonarr-specific mapping boundary; do not add Sonarr v5 resource types to shared quality-profile modules.
4. **Preserve profile state.** Map all nested v5 quality items without dropping their size properties during create/update. An unset field must retain its current value. Do not rely on process-local caches populated by a preceding quality-definition call as the only source for an update.
5. **Integrate legacy defaults.** Ensure global TRaSH/`quality_definition` values still update every applicable v5 profile when no per-profile override exists. Explicit profile values must win regardless of pipeline stage order.
6. **Add test coverage.** Unit-test schema validation, nested quality selection, field-level precedence, preservation of unset server values, legacy global fallback, conflict handling, and rejection on v4. Add v4/v5 e2e cases for two profiles assigning different sizes to the same quality; run a second sync and assert it is unchanged.
7. **Document migration.** Add user-facing examples and explain that `quality_definition` remains the global/default form while `quality_profiles[].quality_sizes` is the v5-specific override.

## Design checks before implementation

- Decide whether a quality selector should match a leaf quality by its stable API ID, its Sonarr quality name, or both. Prefer name in user YAML and resolve to IDs from the server; treat ambiguous aliases as errors.
- Confirm how a profile group maps to children so one setting cannot accidentally overwrite unrelated qualities.
- Determine whether a per-profile-only config on v4 should fail only when the profile is synchronized or during config validation after version discovery. Prefer validation at sync time so the same config can still load without an API connection.
- Keep zero values meaningful; use `undefined` to mean “inherit/preserve,” not truthiness checks.

## Done when

- Legacy configs produce the same v4 and v5 behavior as before.
- Two v5 profiles can store distinct settings for the same quality and a second run is a no-op.
- Existing sizes for unconfigured fields survive updates.
- A v4 server gives a clear error when a v5-only override is requested.
