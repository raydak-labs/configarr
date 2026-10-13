# Sonarr v5 compatibility notes

Comparison target: Sonarr v4.0.19.2979 and v5.0.0.2569, from v5 source commit `57816c149d02f95543973fefb4780c4495f8121c`.

## API changes that affect Configarr

| Area             | v5 change                                                                                                                  | Configarr handling                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| API and settings | API v5 has versioned routes; settings moved from `/config/...` to `/settings/...`.                                         | Detect the API version through `GET /api` and dispatch to separate generated clients.        |
| Quality sizes    | Sizes moved from global quality definitions to quality-profile items.                                                      | Keep `quality_definition` as the global default and support per-profile `quality_sizes`.     |
| Release profiles | `indexerId` became `indexerIds`; v5 adds excluded tags, air-date policy, grace period, and season-pack policy.             | Preserve `indexer`; add plural `indexers` and v5-only controls.                              |
| Media management | v5 adds `skipFreeSpaceCheckWhenGrabbing`, `seasonPackUpgrade`, `seasonPackUpgradeThreshold`, and `userRejectedExtensions`. | Expose the settings and reject them on v4.                                                   |
| Download clients | Save and test query flags changed from `forceSave`/`forceTest` to `skipTesting`/`skipValidation`.                          | Adapt requests in the v5 client; disabled-client round trips passed against the pinned beta. |
| Custom formats   | The v5 API requires specification metadata not present in minimal Configarr/TRaSH payloads.                                | Load the server's custom-format schema and enrich specifications before writing.             |

The v5 OpenAPI contract also changes settings resource names and nullability. Keep those generated types separate and map them at the Sonarr client boundary. The API difference does not imply that every Sonarr v5 UI or behavior is a Configarr sync feature.

## Runtime findings

- The pinned v4 and v5 containers returned their active API versions from `GET /api`. Configarr uses that response for automatic dispatch.
- The Sonarr e2e suite passed against both pinned versions, including settings, profiles, custom formats, download clients, and idempotent syncs.
- Release-profile `indexerIds: []` means all indexers. Source: [Sonarr release-profile service](https://github.com/Sonarr/Sonarr/blob/v5.0.0.2569/src/NzbDrone.Core/Profiles/Releases/ReleaseProfileService.cs).
- `userRejectedExtensions` only adds a user-defined extension list. An indexer must separately enable its user-defined-extension fail-download option. See [Sonarr rejected-import handling](https://github.com/Sonarr/Sonarr/blob/v5.0.0.2569/src/NzbDrone.Core/Download/RejectedImportService.cs).
- Sonarr warns that downgrading from v5 requires restoring a v4 backup. The v5 test container therefore has an isolated config volume.

## Sources and scope

- [Sonarr v5 beta announcement](https://forums.sonarr.tv/t/sonarr-v5-beta/41099)
- [Pinned v5 OpenAPI](https://github.com/Sonarr/Sonarr/blob/57816c149d02f95543973fefb4780c4495f8121c/src/Sonarr.Api.V5/openapi.json)
- [Sonarr v4.0.19.2979 OpenAPI](https://github.com/Sonarr/Sonarr/blob/v4.0.19.2979/src/Sonarr.Api.V3/openapi.json)
- [Sonarr v5 support plan and configuration example](../plans/2026-10-13-sonarr-v5-support.md)

The tests establish compatibility with these pinned builds only. Rerun the version-matrix e2e suite against later v5 builds; reverse-proxy and URL-base variants remain unverified.
