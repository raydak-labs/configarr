# Radarr v7 compatibility

Decision date: 2026-10-26. User confirmed preservation of v5/v6 and addition of v7.

[Implementation plan](../plans/2026-10-26-radarr-v7-support.md)

## Evidence

Compared the official API v3 contracts at
[v5.27.5.10198](https://github.com/Radarr/Radarr/blob/v5.27.5.10198/src/Radarr.Api.V3/openapi.json),
[v6.4.4.10685](https://github.com/Radarr/Radarr/blob/v6.4.4.10685/src/Radarr.Api.V3/openapi.json), and
[v7.0.0.10815](https://github.com/Radarr/Radarr/blob/v7.0.0.10815/src/Radarr.Api.V3/openapi.json).
The [v7 prerelease](https://github.com/Radarr/Radarr/releases/tag/v7.0.0.10815)
was published October 25, 2026.

The 48 managed paths retain their methods, query parameters and JSON request
contracts. Managed schemas remain compatible. Release-profile required/ignored
fields only lose nullable annotations on unconstrained types. V7 documents typed
201 create / 202 update responses and more explicit 404 errors. JSON remains
supported. Quality sizes remain global. API-key authentication remains available
alongside the new browser OIDC option.

## Decision

Retain one RadarrClient and API v3 for v5/v6/v7. Sonarr's dual adapter exists because
its API routes and semantics changed; the Radarr contracts do not justify that
complexity. Pin API generation to the v7 prerelease contract and regenerate checked-in
bindings. Keep YAML unchanged. Add real transport CRUD regression coverage and run
the complete existing Radarr feature suite against isolated v5/v6/v7 containers.
The matrix asserts each server major to prevent testing the wrong image by accident.

V7 is documented as a prerelease. Its test image is pinned by manifest digest.
Runtime changes are required only if live verification identifies a behavioral gap.
