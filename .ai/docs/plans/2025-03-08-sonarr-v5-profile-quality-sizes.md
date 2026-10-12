# Plan: Sonarr v5 per-profile quality sizes

Status: implemented (2026-10-12)

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

1. **Confirm the write contract.** Against the pinned v5 image, verify size values survive `GET /api/v5/qualityprofile` and profile update. Preserve omitted/null nested `items` fields when updating profile resources; sizes belong on quality profile items.
2. **Define and validate config.** Extend `InputConfigQualityProfileSchema` with the optional keyed size list. Reject blank/duplicate selectors, non-numeric values, unknown qualities, and ambiguous aliases with useful diagnostics.
3. **Keep the sync model explicit.** Carry per-profile settings through the existing profile load/diff/persist lifecycle. Resolve per-profile overrides and global defaults in the Sonarr-specific adapter; keep generated v5 resource types out of shared quality-profile modules.
4. **Preserve profile state.** Keep existing values for unset fields and preserve nullable/omitted nested item arrays during profile updates.
5. **Integrate legacy defaults.** Keep global TRaSH/`quality_definition` values as defaults for v5 profiles; explicit profile fields take precedence, and v4 retains global behavior unchanged.
6. **Add test coverage.** Unit tests cover config merging, profile-size precedence, implicit disabled quality items, dry-run, state preservation, and v4 rejection. v4/v5 e2e cases verify persisted values and idempotent repeat syncs.
7. **Document migration.** Document `quality_definition` as the global/default form and `quality_profiles[].quality_sizes` as the v5-specific override.

## Design checks before implementation

- Selectors accept canonical quality names or quality titles; ambiguous title/name matches fail validation.
- Sonarr creates disabled entries for definitions omitted from configured `qualities`; they remain valid targets for size settings and global defaults.
- Sonarr v4 rejects per-profile settings during pipeline preflight, before any writes.
- Zero values are meaningful; `undefined` means inherit from the global default or preserve the server value.

## Done when

- [x] Legacy configs retain global v4 behavior and use global sizes as v5 defaults.
- [x] Two v5 profiles can store distinct settings for the same quality; repeat sync is idempotent.
- [x] Existing sizes for unconfigured fields survive updates.
- [x] A v4 server gives a clear error before writes when a v5-only override is requested.
