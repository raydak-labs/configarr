# Sonarr v5 features

Spec: [2026-10-13-sonarr-v5-features-design.md](../specs/2026-10-13-sonarr-v5-features-design.md)

Each slice lands in its own commit, foundation first. Slice 0 comes first because it changes the types
every later slice writes against.

## Slice 0: regenerate the v3 client

`generate-api.ts` already points at `develop`, whose V3 DTOs now carry the new fields, while
configarr's checked-in types predate them.

- Run `pnpm generateApi sonarr` and commit the result.
- Confirm the new fields are present on `ReleaseProfileResource`, `MediaManagementConfigResource`,
  `UiConfigResource` and `QualityProfileQualityItemResource`.
- `pnpm typecheck` and `pnpm test` must stay green. Treat that as a hypothesis the gate tests, not a
  certainty. Upstream's V3 DTOs do not match the v5 ones on nullability, `AirDateGracePeriod` being a
  non-nullable `int` on V3 and nullable on v5, so a regeneration can move assignability either way
  through `SonarrReleaseProfileResource` (`src/releaseProfiles/releaseProfile.types.ts:6`) and
  `SonarrMediaManagementResource` (`src/mediaManagement/mediaManagement.types.ts:11`). Read any
  typecheck failure rather than papering over it with a cast.

This is a moving target. Between 2026-10-12 and 2026-10-13 the same command produced no diff and then
186 insertions, so the diff has to be read rather than inferred from the generator's per-file log,
which reports "unchanged" for files it rewrote.

## Slice 1: server major version

- `src/arr/serverVersion.ts`: `parseMajorVersion(raw)` and `resolveServerMajorVersion(client)`,
  memoized per client. Narrows the `unknown` from `SystemClient.getSystemStatus()` explicitly.
- No change to the shipped quality-definition guard. It is keyed on the contract and stays that way;
  see the spec's correction on why a version key would be a regression.
- Test first: `4.0.20.3014` and `5.0.0.2569` parse to 4 and 5; a missing or non-numeric version
  throws rather than defaulting; the resolver issues one status call however many times it is asked.

## Slice 2: release profile fields

- `InputConfigReleaseProfileSchema` gains `excluded_tags`, `air_date_restriction`,
  `air_date_grace_period`, `allow_season_pack_without_all_episodes_aired`, and `indexer` accepting a
  string or a list of strings.
- `ReleaseProfileShared` and `compareFields` gain the new fields, so an existing profile reports a
  diff when they change. Without this they are written on create only.
- `createMissingTags` scans `excluded_tags` as well as `tags`.
- `mapToServer` emits the new fields, gated on server major. A v4 server throws
  `ConfigValidationError` naming the field. A list of indexers against a v3 contract throws.
- `src/arr/mediaPipeline.ts:521-528` adds `release_profiles[].excluded_tags` to the referenced tag
  lists.
- A multi-indexer write needs its conversion at the point the contract is chosen, like the existing
  `toV5ReleaseProfile`, because v3 carries a scalar and v5 an array.
- Test first, through the real client against a local HTTP server as the existing contract test does:
  the four new fields rejected on a v4 status and written on a v5 status; an indexer list rejected on
  a v3 contract; `excluded_tags` labels survive tag cleanup; a changed field on an existing profile
  produces a diff entry.

## Slice 3: per-profile quality size limits

- `InputConfigQualityProfileItemSchema` gains `min`, `preferred`, `max`, each
  `z.number().optional().nullable()`. Both suffixes matter: `.nullable()` on its own makes the key
  _required_ (present, possibly null), so implemented literally every existing quality-profile item
  that omits them would fail validation. `.optional()` keeps them absent by default and `.nullable()`
  supplies `null` as the explicit clearing spelling.
- `mapQualities` carries them onto the mapped item. The config names a group, so the size lands on
  that group item and not on its member qualities, whose server values are preserved exactly as a
  group's are. Whether Sonarr applies a group-level limit to the qualities inside it is the live
  question the spec leaves open.
- `isOrderOfQualitiesEqual` learns the size fields, otherwise changing a size on an existing profile
  produces no diff and no write. A configured size is compared and written; an omitted one is skipped
  in the comparison, so a server-side size configarr was never told about is preserved rather than
  cleared. Treating an omission as a mismatch would null every server-side size on the first run.
- The mapped item must also inherit the matched server item's sizes before
  `updatedServerObject.items` is assigned the mapped array (`qualityProfileBase.ts:668-673`). Skipping
  the comparison alone is not enough: that assignment runs whenever the quality order differs, which
  is unrelated to sizes, so an item replaced for another reason would still null the unconfigured size.
- The write goes through `toServerProfile`. Verify after slice 0 whether the v3 item resource already
  carries the size fields, since upstream's V3 DTO declares them; add the conversion only if it does
  not. Record which outcome the regeneration produced, since it fixes the expected payload shape for
  the tests below.
- Gated on server major; throws against v4.
- Test first: sizes land on the profile item for a v5 server; changing a size on an existing profile
  produces a diff entry; a server-side size with no config counterpart survives a run unchanged; a run
  that changes item membership and leaves that size unconfigured still preserves it; `min: null`
  clears it; the same config against v4 throws.

## Slice 4: media management and UI config keys

- A shared snake_case mapping in `src/config.ts` turns the documented keys into API names for
  `media_management` and `ui_config`, leaving passthrough intact for everything else. One function,
  not a per-arr branch.
- `season_pack_upgrade` validates against `all | threshold | any`.
- The version check lives in the sync that owns the block, not in the schema: `getConfig` and
  `validateConfig` run before any client exists, and `mergeConfigsAndTemplates` is the first config
  phase after `configureApi`. Put it in `MediaManagementSync.persistMediamanagement` and
  `syncUiConfig`.
- The media-management half needs an `arrType` constructor argument on `MediaManagementSync`
  (`src/mediaManagement/mediaManagement.ts:49-51`). The class currently sees only a client, so without
  the arr the gate would fire for Radarr, Readarr, Whisparr and Lidarr too, none of which has these
  fields. `syncUiConfig` already receives `arrType` (`src/uiConfigs/uiConfigSyncer.ts:24`, its second
  parameter), so that
  half needs no signature change.
- Update all seven construction sites for the new argument: the five syncers at
  `src/arr/sonarrSyncer.ts:28`, `radarrSyncer.ts:28`, `readarrSyncer.ts:28`, `whisparrSyncer.ts:27`,
  `lidarrSyncer.ts:27`, each passing its existing `ARR` constant, plus
  `src/mediaManagement/mediaManagement.test.ts:19` and
  `src/arr/mediaPipeline.contracts.test.ts:35`. The two test files fail to compile otherwise, and the
  contracts test is what keeps the per-arr bag type honest, so it has to be updated deliberately
  rather than cast to silence it.
- Test first: snake_case keys reach the API in camelCase; an unknown key still passes through; a
  gated key against a v4 server throws rather than silently doing nothing.

## Slice 5: docs and e2e

- `docs/docs/configuration/config-file.md`: the new blocks with their version and contract notes.
- `docs/docs/configuration/_include/config-file-sample.yml`: commented examples.
- `tests/arr-e2e/sonarrV5.e2e.test.ts`: release profile air date and excluded tags, per-profile size
  limits, season-pack settings.
- `tests/arr-e2e/sonarr.e2e.test.ts`: a negative case asserting a v5-only key against v4 fails
  loudly, which is the only way to cover the v4 side of a gate that v5 does not exercise.

## Verification

Per slice: targeted tests. After slice 5: `pnpm build && pnpm test && pnpm lint && pnpm typecheck`.
Live coverage needs `pnpm test:e2e:arr` with the compose stack up.
