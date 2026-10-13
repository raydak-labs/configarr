# Sonarr v5 support

Status: implemented and tested against Sonarr 4.0.19.2979 and 5.0.0.2569.

Research: [Sonarr v5 compatibility notes](../research/2026-10-13-sonarr-v5-compatibility.md)

## Approach

Use one Sonarr configuration for v4 and v5. Detect the API version at runtime and keep generated clients and payload conversion in `SonarrClient`. Reject v5-only settings on v4 before any writes; never discard them silently. Other *arr clients remain unchanged.

This is not only a route change. Sonarr v5 moves quality sizes onto profile items and adds fields that v4 cannot represent. Preserve existing global `quality_definition` behavior as the default, while exposing new per-profile and v5-only settings explicitly.

## Supported configuration

```yaml
quality_profiles:
  - name: WEB-1080p
    quality_sizes:
      - quality: WEBDL-1080p
        min: 0
        preferred: 75
        max: 200

release_profiles:
  - name: Example policy
    indexers: [Usenet, Torrents]
    excluded_tags: [anime]
    air_date_restriction: true
    air_date_grace_period: 12 # Hours.
    allow_season_pack_without_all_episodes_aired: false

media_management:
  skipFreeSpaceCheckWhenGrabbing: false
  seasonPackUpgrade: threshold
  seasonPackUpgradeThreshold: 80
  userRejectedExtensions: ".xyz"
```

`quality_sizes` values override global `quality_definition` values per profile. Unset values inherit the global value, then preserve the server value if no global value exists. Quality selectors may use a quality name or title; ambiguous or unknown selectors fail validation. Values of zero are valid.

The singular `indexer` selector remains supported on v4 and v5. The plural `indexers` selector requires v5, even when set to an empty list, which means all indexers. Do not set both selectors. Other v5-only release-profile options are `excluded_tags`, `air_date_restriction`, `air_date_grace_period`, and `allow_season_pack_without_all_episodes_aired`. These options and the four media-management settings shown above fail clearly on v4. Omitted optional values preserve existing server settings.

`userRejectedExtensions` is a separate user-defined list, not Sonarr's built-in executable-extension filter. To fail downloads for those extensions, enable the matching fail-download option on the indexer.

The full user-facing reference and runnable example are in [configuration docs](../../../docs/docs/configuration/config-file.md) and [`examples/full/config/config.yml`](../../../examples/full/config/config.yml).

## Verification and limits

The version-matrix e2e suite passed against pinned Sonarr v4.0.19.2979 and v5.0.0.2569 containers. Unit tests, build, lint, and typecheck also passed during implementation. The v5 container uses its own config volume.

This verifies the pinned beta, not every later v5 build or final release. Rerun the Sonarr e2e suite when changing the v5 image. Reverse-proxy and URL-base variants were not verified.
