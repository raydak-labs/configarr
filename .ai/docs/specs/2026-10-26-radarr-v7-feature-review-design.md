# Radarr v7 feature review and full example

Decision date: 2026-10-26. Extends the [compatibility decision](2026-10-26-radarr-v7-support-design.md)
after the user requested a full example and explicit review of new v7 features.
The user requested version naming as v7 in user-facing documentation.

## Feature review

Reviewed every new feature in the [v7.0.0.10815 release](https://github.com/Radarr/Radarr/releases/tag/v7.0.0.10815)
against Configarr's managed resources and the upstream implementation.

| Addition                                                                | Configarr handling                                                                                                                  |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Irish language                                                          | Existing server-discovered language mapping supports `language: Irish`; add a live create/update/idempotency test and a v7 example. |
| Custom score from renamed filename before import                        | Automatic import behavior; existing custom formats and naming settings configure its inputs. No new API/YAML setting.               |
| OIDC, remember-me, PEM certificates, localhost authentication bypass    | General/authentication settings are outside Configarr's managed resources. API-key auth continues to work.                          |
| Trakt Smart Lists                                                       | Import lists are not a managed Configarr feature.                                                                                   |
| Popularity sorting and Rotten Tomatoes Discover rating                  | Browser view preferences, outside the server UI-config resource Configarr manages.                                                  |
| Reflink handling changes, .NET 10, FFprobe and platform/runtime updates | Internal Radarr runtime behavior; no Configarr configuration additions.                                                             |

Implementation evidence: [Irish language](https://github.com/Radarr/Radarr/commit/65c3361),
[import scoring](https://github.com/Radarr/Radarr/commit/9c7c341), and
[Discover preferences](https://github.com/Radarr/Radarr/commit/f5ccd1c).
The managed API v3 resource schemas add no v7-specific configuration fields.

## Full example

Keep the existing Radarr v6 instance and add v7 on port 6507, with its own config
volume and example API key. Pin the same image as the compatibility suite. Include
TRaSH/Recyclarr quality settings, naming, tags, UI settings, and an Irish profile.
Retain the same YAML interface on all three supported majors. Document unsupported
feature areas explicitly instead of implying that General settings, import lists,
or browser preferences are synced.

## Validation

Run all repository checks, build the docs, validate Compose and the full example
against the input schema, and rerun the Radarr v5/v6/v7 live matrix. The language
test uses Irish on v7 and English on the older versions, then updates to Any.
