# Plan: Sonarr v5 media-management controls

Roadmap: [Sonarr v5 feature parity roadmap](2025-03-08-sonarr-v5-feature-roadmap.md)  
Research: [Sonarr v5 beta compatibility research](../research/2026-10-12-sonarr-v5-beta-configarr-compatibility.md)

## Goal

Expose the v5 media-management settings that fit Configarr's existing `media_management` sync, without removing settings from older Sonarr or other *arr applications and without overwriting fields the user has not configured.

## Candidate settings

The pinned v5 OpenAPI resource contains `seasonPackUpgrade`, `seasonPackUpgradeThreshold`, and `userRejectedExtensions`. The client currently preserves unmodeled v5 settings during read/modify/write, but users cannot declare these settings in Configarr. Confirm the official enum values and field behavior against the exact target release before adopting them.

The beta also advertises blocking malicious extensions. Determine whether that behavior is configured by `userRejectedExtensions` or another resource before treating it as the same feature; announcement language alone is not sufficient evidence.

## Implementation steps

1. Probe the pinned v5 API for `GET /api/v5/settings/mediamanagement` and update behavior. Determine whether extension rules are represented as a string, list, or another contract and whether the setting is editable through this endpoint.
2. Compare the final v4 and v5 contracts. Mark each candidate field as shared or v5-only; do not broaden shared media-management types with v5 generated resource types.
3. Add optional Configarr fields to the existing media-management schema using documented enum values and units. Preserve current config defaults when fields are omitted.
4. Extend the Sonarr client adapter to map configured fields into v5 settings and to preserve v5-only values during writes. For v4, reject explicitly configured v5-only fields with a clear unsupported-version error.
5. Confirm the sync diff can represent new fields and that equality is stable for nullable values and list/string normalization. If the common `MediaManagementSync` currently strips the fields, add a narrowly typed capability at the Sonarr boundary rather than making other *arr clients implement fake fields.
6. Add unit tests for schema values, v4/v5 mapping, omitted-field preservation, enum conversion, and unsupported settings on v4.
7. Add v5 e2e coverage that persists the settings and verifies a subsequent run is idempotent. Keep existing media-management tests passing for all other arrs and v4.
8. Document the setting names, accepted values, and version limitation. Avoid claiming the app’s malicious-extension protection is configured until runtime behavior confirms it.

## Done when

- Users can configure each verified v5-only media-management setting without losing unrelated settings.
- Existing v4 and non-Sonarr media-management configuration remains unchanged.
- The exact setting behavior is demonstrated by a v5 read-after-write e2e test.
