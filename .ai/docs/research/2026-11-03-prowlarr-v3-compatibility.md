# Prowlarr v3 compatibility research

**Snapshot:** 2026-11-03

**Compared builds:** Prowlarr `v2.7.0.5723` (stable, `master`) and prerelease `v3.0.0.5737` (`develop`). `develop` was already bumped to `3.0.1` the same day.

**Pinned image:** `lscr.io/linuxserver/prowlarr:develop-3.0.0.5737-ls280`

[Plan](../plans/2026-11-03-prowlarr-v3.md)

## Conclusion

v3.0.0.5737 is a .NET 10 platform bump. No REST resource used by Configarr (applications, indexers, indexer proxies, download clients, notifications, tags) was added, removed, or renamed between these tags. No sync-code change is required to run the existing client against v3. A later stable tag can still add commits; `develop` is already `3.0.1`.

## Sources

- [v2.7.0.5723](https://github.com/Prowlarr/Prowlarr/releases/tag/v2.7.0.5723) and [v3.0.0.5737](https://github.com/Prowlarr/Prowlarr/releases/tag/v3.0.0.5737) (prerelease, assets named `Prowlarr.develop.3.0.0.5737.*`)
- [compare v2.7.0.5723...v3.0.0.5737](https://github.com/Prowlarr/Prowlarr/compare/v2.7.0.5723...v3.0.0.5737) — 20 commits: .NET 10, Node 24, dependency bumps, Postgres 15 minimum, reflinks, forms-auth login redirect, translations
- [.NET 10 commit](https://github.com/Prowlarr/Prowlarr/commit/461aa9bc448b6570899b7adae73a57e5c831d9a7) — `Prowlarr.Api.V1` changes are the csproj (`net10.0`), certificate loading, and Swagger host types. No controllers.
- [Bump to 3.0.1](https://github.com/Prowlarr/Prowlarr/commit/69530d9402e43619ae7f5e744d07912183f7b367)
- Branches are only `master` and `develop`. No `v3` branch.
- LinuxServer tags (2026-11-02): `develop-3.0.0.5737-ls280` and `nightly-3.0.1.5738-ls24`. `latest` matches 2.7.0 (2026-10-27).
- hotio: `release`/`latest` = 2.7.0.5723, `testing` = 3.0.0.5737, `nightly` = 3.0.1.5738. https://hotio.dev/containers/prowlarr/

## API

In-tree `src/Prowlarr.Api.V1/openapi.json` on `develop` was last committed 2025-06-07, so it is not a v3 spec. The `api-docs` bot commit [50e6eb0](https://github.com/Prowlarr/Prowlarr/commit/50e6eb01478b0f90d47728699f9a49df8746e854) (2026-11-02, from develop 3.0.1) is the spec refresh. Its diff against that stale file adds:

| Field                                             | Origin                                                |
| ------------------------------------------------- | ----------------------------------------------------- |
| `HostConfigResource.allowedHosts`                 | 2.x, cherry-picked 2026-08-29. Not v3.                |
| `HostConfigResource.trustedNetworks`              | 2.x, cherry-picked 2026-08-29. Not v3.                |
| `SystemResource.isContainerized`                  | Not in the 20 v3 commits. Predates v3.                |
| `Field.value` nullable metadata, top-level `tags` | Swashbuckle / `Microsoft.OpenApi` v2 generator noise. |

Configarr does not sync Prowlarr host config, so those fields are unused.

Provider routes are unchanged: `/api/v1/applications` (`syncLevel`: `disabled`, `addOnly`, `fullSync`), `/api/v1/indexer`, `/api/v1/indexerproxy`, `/api/v1/downloadclient`, `/api/v1/notification`, `/api/v1/tag`.

## Not API

- Postgres minimum is 15 (FluentMigrator). User database concern, not a client change.
- Reflink handling is filesystem-only.
- Unmerged [Gamarr application #2725](https://github.com/Prowlarr/Prowlarr/pull/2725) is not in 3.0.0.5737.

## Uncertainty

The GitHub compare `v2.7.0.5723...v3.0.0.5737` lists all 69 files (20 commits). Under `src/Prowlarr.Api.V1` the only edits are `Prowlarr.Api.V1.csproj` and `Config/CertificateValidator.cs`, plus the test csproj. No controller and no `openapi.json`. A final v3 stable may still include more than 3.0.0.5737; `develop` is already 3.0.1.
