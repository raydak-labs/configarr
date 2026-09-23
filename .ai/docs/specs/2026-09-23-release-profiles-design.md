Status: implemented (2026-09-23)

# Release profiles

Plan: [`.ai/docs/plans/2026-09-23-release-profiles.md`](../plans/2026-09-23-release-profiles.md)

GitHub: [#541](https://github.com/raydak-labs/configarr/issues/541)

## Goal

Declarative sync of Servarr Release Profiles (`Must Contain` / `Must Not Contain`, indexer scope, tags) for every media *arr.

## Decisions

| #   | Decision                                                                                                                                                                                                                                                                      | Rejected                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | YAML key is `release_profiles:` a list. Undefined skips the feature. Defined list is complete desired state; `[]` deletes every server profile. Unmatched server profiles are always deleted. No `delete_unmanaged` flag.                                                     | Optional unmanaged deletes; delay-profile default/additional split. |
| 2   | Match by `name` when the *arr API has that field and the config entry sets one. Otherwise match a content key: `enabled`, sorted `required`, sorted `ignored`, `indexerId`, sorted tag ids. Duplicate config names (or duplicate content keys) throw `ConfigValidationError`. | Recreate-all; index-based pairing.                                  |
| 3   | `name` is optional. Lidarr and Readarr have no API field; a configured name is ignored with one warning.                                                                                                                                                                      | Require names; skip Lidarr/Readarr.                                 |
| 4   | `indexer` is an indexer **name**. Omitted means any indexer (`indexerId: 0`). Unknown name throws `ConfigValidationError`. Server indexers are loaded at most once per instance via `ServerCache`.                                                                            | Raw indexer ids; always `0`.                                        |
| 5   | Missing tag labels are created before pairing, same as delay profiles / download clients.                                                                                                                                                                                     | Require tags to exist already.                                      |
| 6   | Pattern A: shared `BaseReleaseProfileSync` plus one thin class per *arr. Clients get `ReleaseProfilesClient` and `IndexersClient`. Pipeline constructs the class with the injected client.                                                                                    | Pattern B single module (Lidarr/Readarr drop `name`).               |
| 7   | `required` / `ignored` are string arrays in YAML. Server values that arrive as a comma-separated string are split. Payloads always send arrays.                                                                                                                               | Keep the OpenAPI `any` in YAML.                                     |
| 8   | Template merge overwrites like `delay_profiles` (instance replaces template).                                                                                                                                                                                                 | Concatenate lists.                                                  |
