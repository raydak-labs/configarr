# Radarr v7 support

Decision date: 2026-10-26. Consolidated at the user's request from the compatibility
and feature-review specs, including the subsequently agreed scope.

[Implementation plan](../plans/2026-10-26-radarr-v7-support.md)

## Compatibility evidence

Compared the official API v3 contracts at
[v5.27.5.10198](https://github.com/Radarr/Radarr/blob/v5.27.5.10198/src/Radarr.Api.V3/openapi.json),
[v6.4.4.10685](https://github.com/Radarr/Radarr/blob/v6.4.4.10685/src/Radarr.Api.V3/openapi.json), and
[v7.0.0.10815](https://github.com/Radarr/Radarr/blob/v7.0.0.10815/src/Radarr.Api.V3/openapi.json).
The [v7 release notes](https://github.com/Radarr/Radarr/releases/tag/v7.0.0.10815)
were published October 25, 2026.

The 48 managed paths retain their methods, query parameters and JSON request
contracts. Managed schemas remain compatible. Release-profile required/ignored
fields only lose nullable annotations on unconstrained types. V7 documents typed
201 create / 202 update responses and more explicit 404 errors. JSON remains
supported. Quality sizes remain global. API-key authentication remains available
alongside the new browser OIDC option.

## Accepted implementation

Preserve Radarr v5/v6 and add v7 using one RadarrClient and API v3. Sonarr's dual
adapter handles changed API routes and semantics; Radarr's compatible contracts
do not require that adapter. Pin generation to the v7 contract and regenerate the
checked-in bindings. Keep the YAML interface unchanged and call the version v7 in
user-facing documentation.

Run the same feature suite against isolated v5/v6/v7 databases, asserting each
connected major version. Transport regressions cover authentication, URL bases,
JSON requests and success responses. The tag-fixture teardown snapshots existing
profile/tag IDs and removes only matching resources created during the suite.
An incomplete setup must not trigger teardown writes.

## Feature review and scope decisions

| Addition                                                        | Agreed handling                                                                                                                               |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Custom score from renamed filename before import                | Automatic import behavior; existing custom formats and naming settings configure its inputs. No new YAML setting.                             |
| OIDC, PEM certificates and localhost authentication bypass      | Separate General/authentication/TLS feature in [#573](https://github.com/raydak-labs/configarr/issues/573), covering Radarr v7 and Sonarr v5. |
| Trakt Smart Lists                                               | Separate import-list sync feature in [#574](https://github.com/raydak-labs/configarr/issues/574).                                             |
| Popularity sorting and Rotten Tomatoes Discover rating          | Browser-local preferences; user explicitly excluded browser preference management.                                                            |
| Reflink handling, .NET 10, FFprobe and platform/runtime changes | Radarr runtime behavior; no Configarr configuration additions.                                                                                |

Sources: [import scoring](https://github.com/Radarr/Radarr/commit/9c7c341),
[Discover preferences](https://github.com/Radarr/Radarr/commit/f5ccd1c), and
[Sonarr v5 General settings contract](https://github.com/Sonarr/Sonarr/blob/57816c149d02f95543973fefb4780c4495f8121c/src/Sonarr.Api.V5/openapi.json).

## Full example

Keep the existing Radarr v6 instance and add v7 on port 6507, with a separate
config volume and example API key. Pin the same v7 image as the compatibility
suite. Demonstrate TRaSH/Recyclarr quality settings, naming, tags and UI settings
using the shared YAML interface. New language-list items do not need dedicated
examples or feature-specific coverage.

## Validation

Run build, unit tests, formatting, typecheck and the Radarr v5/v6/v7 live matrix.
Build the docs, validate Compose and the full example against the input schema,
and smoke-test the v7 example with fixture connection/root paths. Verify tag
cleanup against pre-existing matching fixture labels and profiles.
