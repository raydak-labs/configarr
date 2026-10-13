# Sonarr v5 features

Status: proposed. Not yet implemented.

Companion to
[2026-10-12-sonarr-v5-api-support-design.md](./2026-10-12-sonarr-v5-api-support-design.md), which
shipped the contract plumbing and deliberately deferred these.

## Why

Contract support alone means configarr against a Sonarr v5 instance configures exactly what it
configured against v4. The features v5 actually added are unreachable, so a user gains nothing from
upgrading except that configarr keeps working.

The gap is not uniform, and the difference decides most of this design:

- **Media management and UI config need no new plumbing.** Those blocks are `passthrough()` schemas
  (`src/types/config.types.ts:265,268`), so a user can already write `seasonPackUpgrade` and it is
  sent through on a v5 server. What is missing is that nothing documents it, nothing validates it,
  the keys must already be API-cased camelCase rather than configarr's snake_case, and on a v4 server
  it silently does nothing (see the failure mode below).
- **Release profiles and quality size limits need real implementation.** Those schemas are strict
  `z.object`, so the new fields have nowhere to go.

## Two signals, not one

The obvious gate for new fields is `api_version`, the contract flag. It is the wrong one for most of
them, and this is the central fact of the design.

Verified against three published Sonarr specs on 2026-10-12:

| Server | Contract | Release profile                                  | Media mgmt                           | UI            | Quality definition sizes | QP item sizes |
| ------ | -------- | ------------------------------------------------ | ------------------------------------ | ------------- | ------------------------ | ------------- |
| v4     | v3       | old shape                                        | old fields                           | old fields    | present                  | absent        |
| v5     | v3       | + air date, + `excludedTags`, scalar `indexerId` | + season pack, + rejected extensions | + `timeZone`  | present                  | present       |
| v5     | v5       | + air date, + `excludedTags`, `indexerIds` array | same as above                        | same as above | **absent**               | present       |

A v5 server gained the new fields on _both_ contracts. So `api_version` says which path a request
takes, not which fields exist. Feature availability is a property of the **server major version**,
which `getSystemStatus()` already returns and which is currently only logged
(`src/arr/mediaPipeline.ts:177`).

The contract gates exactly one thing: `indexerIds` is an array only on the v5 contract, so **multiple
indexers per release profile require `api_version: v5`**.

Note that `SystemClient.getSystemStatus()` is typed `Promise<unknown>`
(`src/clients/capabilities.ts:9`), so any resolver has to narrow explicitly rather than read fields
off the result.

## How a v4 server actually fails today

Worth stating precisely, because it changes the argument for version gating.

`compareObjectsCarr` iterates the _local_ keys and skips any key the server object does not carry
(`src/util.ts:162-164,212-214`). So on a v4 server a config key like `seasonPackUpgrade` makes the
diff report **equal**, writes nothing, and prints no diff entry. It does not produce a perpetual diff.
The failure is a silent no-op, which is why the new keys throw rather than rely on the server to
reject them.

## Shape

### 1. Server major version resolves once

`src/arr/serverVersion.ts` parses the leading integer from the `version` string and memoizes per
client. Sonarr versions are four-part build strings (`4.0.20.3014`, `5.0.0.2569`), so a
leading-integer parse is sufficient and avoids taking a semver dependency for one comparison. No
semver package is a current dependency.

The memo dedupes the resolver's own calls only. `src/arr/mediaPipeline.ts:177` already issues an
unconditional status call, so a full run makes two. Acceptable: the second is one extra request per
instance, and collapsing them means threading a version through `MediaSyncContext`, which is a larger
change than the saving justifies.

Features gate on `serverMajor >= 5`. Behaviour on v4 is unchanged.

### 2. The v3 client has to be regenerated first

configarr's checked-in v3 types predate the new fields: `ReleaseProfileResource`
(`src/__generated__/sonarr/data-contracts.ts:1363-1374`) has only `indexerId` and `tags`, and
`MediaManagementConfigResource` (`:1028-1053`) has none of the new keys. Upstream's V3 DTOs on
`develop` do carry them, and `generate-api.ts:9` points at `develop`.

`develop` is a moving target: on 2026-10-12 regenerating the v3 client produced no diff, and on
2026-10-13 it produced 186 insertions, because the branch gained these fields in between. Slices 2 and
4 would still compile against the stale types, since they write through `ReleaseProfileShared` and a
passthrough record; what regeneration buys is the ability to _read_ the new fields off the
server-response types in `compareFields`. It is the first slice because it changes the types every
later slice writes against, not because the build is red without it.

This also means every generated client is only as stable as `develop`. Pinning the spec URLs to a
revision is the durable fix, but it is a separate operability change and is recorded as an open
question rather than smuggled in here.

### 3. Release profiles gain the v5 fields

```yml
release_profiles:
  - name: no-early-grabs
    required: ["hevc"]
    ignored: ["xvid"]
    # v5 server only
    air_date_restriction: true
    air_date_grace_period: 14
    allow_season_pack_without_all_episodes_aired: true
    # v5 server only. Tag labels, resolved like every other tag list.
    excluded_tags: ["anime"]
    # v5 contract only, and a list. A single string keeps working.
    indexer: ["MyIndexer", "OtherIndexer"]
    tags: ["e2e-release"]
```

- `indexer` accepts a string or a list of strings, so today's single-name config is unchanged.
- The four new fields throw `ConfigValidationError` against a v4 server. Writing them would be a
  silent no-op, per the failure mode above.
- A list of indexers against a v3 contract throws, because only the v5 contract has `indexerIds`.
- `compareFields` (`src/releaseProfiles/releaseProfileBase.ts:100-137`) is a hand-written field list,
  so it has to gain the new fields. Without that the new keys are written on create only and never
  appear in a diff for an existing profile, which would look like the sync ignoring them.
- `createMissingTags` (`releaseProfileBase.ts:180-192`) scans only `config.tags`, so it has to scan
  `excluded_tags` too, or a configured excluded tag that does not exist yet resolves to no ids.
- `excluded_tags` joins the referenced tag lists at `src/arr/mediaPipeline.ts:521-528`, so
  `delete_unmanaged_tags` keeps a tag a release profile excludes. The server already refuses to
  delete an in-use tag and media arrs run `onInUse: "skip"` (`mediaPipeline.ts:529`), so this is not
  strictly load-bearing against data loss. It is load-bearing against a warning-plus-skip on every
  run, and against `onInUse: "throw"` making it an error.

The multi-indexer write needs a conversion at the point the contract is chosen, the same shape as
the existing `toV5ReleaseProfile` (`src/clients/sonarr-client.ts:170-173`), because the v3 resource
carries a scalar and the v5 resource an array.

### 4. Per-profile quality size limits

v5 moved `minSize` / `maxSize` / `preferredSize` off the quality definition and onto quality profile
items, which makes a per-profile override possible for the first time.

```yml
quality_profiles:
  - name: WEB-1080p
    qualities:
      - name: WEB 1080p
        qualities: ["WEBDL-1080p", "WEBRip-1080p"]
        min: 0
        preferred: 12.4
        max: 199.9
```

The flat `min` / `preferred` / `max` shape matches `TrashQualityDefinitionQualitySchema`
(`src/types/trashguide.types.ts:7-13`), so the vocabulary is one users already know.

Gated on `serverMajor >= 5`, which covers both contracts, since a v5 server carries item sizes on
each. Throws against v4.

A size set on a configured quality **group** lands on that group item. The config names a group, so
that is the item the limit describes, and the member qualities keep their server values. Whether
Sonarr applies a group-level limit to the qualities inside it is not something this repo can
determine and stays an open question.

Two corrections to how this interacts with what already shipped:

- The quality-definition guard stays keyed on the **contract**, not the server version. It is
  already right: on the v5 contract the quality-definition size field genuinely does not exist, and
  on a v5 server reached over v3 it does. Replacing it with a version check would reject a path that
  works, which is a regression for anyone on `api_version: v3`.
- Consequently both mechanisms are writable on a v5 server over the v3 contract. Whether an item
  size overrides the definition-derived one at decision time is a Sonarr question this repo has not
  verified, and is recorded as an open question rather than assumed.

`isOrderOfQualitiesEqual` (`src/qualityProfiles/qualityProfileBase.ts:275-300`) compares only `name`
and `quality.name`, never sizes. So it has to learn the size fields, otherwise changing a size on an
existing profile produces no diff and no write.

**An omitted size means "leave the server value", not "clear it".** `mapQualities` only ever attaches
sizes the config block carries (`qualityProfileBase.ts:193-246`), while a server item carries whatever
the v5 UI or API set. If a missing size counted as a mismatch, `items` would be replaced wholesale
(`qualityProfileBase.ts:668-673`) and every server-side size configarr was never told about would be
nulled on the next run, reported only as a generic items change. That is data loss, and it would hit
every existing profile the moment this feature ships rather than only the ones using it. So a
configured size is written and compared; an absent one is skipped in the comparison.

Skipping the comparison is not enough on its own, and this is the part that is easy to get wrong.
`updatedServerObject.items` is assigned the mapped array wholesale, and that assignment happens for
reasons unrelated to sizes: the quality order differs, a quality was added or removed, and the
predicate is already false (`:668-673`). On any such run `mappedQualities` has no size for the item,
so the write nulls the server value even though the comparison correctly ignored it. So the mapped item
must inherit the server item's size before the array is replaced, matched on the same identity the
quality order uses. An unconfigured size survives a run that changes item membership, which is the case
the test has to cover, not just the case where nothing else forces a replacement.

**Clearing is explicit.** Since an omission preserves, `min: null` (likewise `preferred` and `max`) is
the spelling that clears a previously configured limit. Without it there is no way to remove a size
from config, and a value set once by mistake could only be removed in the Sonarr UI while configarr
preserved it forever.

This makes sizes the one item field that is not config-authoritative. Configarr does treat the `items`
collection itself as authoritative: `mapQualities` sets `allowed` from `enabled ?? true` for every
configured item and forces `allowed: false` for every quality the config omits
(`qualityProfileBase.ts:193-246,248-261`), and those mapped items then replace the server's wholesale.
The divergence is deliberate and follows the same default the repo already uses for server-side values
the config does not mention, which is what the opt-in `reset_unmatched_scores` block exists to
override (`:586-590`). It is named here because an implementer meets both models inside one function.

The write goes through `toServerProfile` (`:484-488`). Whether the size fields need a conversion there
depends on slice 0: upstream's V3 `QualityProfileQualityItemResource` declares `MinSize`, `MaxSize`
and `PreferredSize`, so once the v3 client is regenerated the fields are already on the v3 type and no
conversion is needed. Verify that after slice 0 rather than assuming it.

### 5. Media management and UI config get a snake_case layer

The blocks stay `passthrough()`, so unknown keys keep flowing through untouched. Configarr
additionally maps the documented snake_case keys to their API names:

```yml
media_management:
  # v5 server only
  season_pack_upgrade: threshold # all | threshold | any
  season_pack_upgrade_threshold: 0.5
  skip_free_space_check_when_grabbing: true
  user_rejected_extensions: ".exe,.scr"

ui_config:
  time_zone: "Europe/Berlin"
```

`threshold` validates against the three values the v5 spec publishes. Version-gated keys throw
against a v4 server, matching the rule the other features follow.

The mapping is one shared staging function keyed on nothing per-arr, per the repo's Pattern B rule
that `arrType` appears only where it is needed for something other than client lookup. It must not
fan out into a per-arr branch. A side effect worth stating: the mapper renames keys for every media
arr, so a Radarr config that sets `season_pack_upgrade` gets it renamed and then silently dropped,
exactly as an unknown camelCase key is dropped today. Harmless, and no worse than the status quo.

That check has to know which arr it is guarding. `syncUiConfig` already receives `arrType`
(`src/uiConfigs/uiConfigSyncer.ts:24`, its second parameter), so it is fine as it stands.
`MediaManagementSync` does not:
its constructor takes only the client (`src/mediaManagement/mediaManagement.ts:49-51`), and it is
constructed once per media arr in each `*Syncer` (`src/arr/sonarrSyncer.ts:28`). Without the arr the
gate would fire for Radarr, Readarr, Whisparr and Lidarr too, none of which has these fields.
`MediaManagementSync` therefore gains an `arrType` constructor argument, matching the shape
`syncUiConfig` already has, and each syncer passes its existing `ARR` constant.

The version check cannot live in config validation: `getConfig` (`src/config.ts:104`) and
`validateConfig` (`:298`) run before any client exists, and
`mergeConfigsAndTemplates` (`:746`, called from `mediaPipeline.ts:192`) is the first config phase that
runs after `configureApi`. So the check belongs in the sync that owns the block
(`MediaManagementSync.persistMediamanagement`, `syncUiConfig`), not in the schema.

### 6. Not in scope

Host-level and action-shaped v5 surface, none of which is persistent per-instance config:
connections and notifications, import lists, indexers, metadata, season passes
(`SeasonPassResource` is a monitoring action), statistics, general and update settings, and auth
including OIDC. Indexer flags and the new `/schema` and `/bulk` endpoints are read or write mechanics,
not configuration. Configarr has no config surface for any of them today.

## Consequences

- A user gains three things from v5 they could not get before: earlier-grab prevention and excluded
  tags on release profiles, multiple indexers per release profile, and per-profile quality size
  limits. Plus documented, validated, snake_case access to season-pack and extension settings that
  were previously reachable only by knowing API field names.
- v4 behaviour is unchanged, including for users on `api_version: v3` against a v5 server. The one
  behaviour change is that quality-definition size limits still throw on the v5 contract, exactly as
  the companion spec shipped.
- Configarr acquires its first server-version notion, and every new field gates on it rather than on
  the contract.

## Open questions

1. Do per-profile item sizes override the definition-derived ones on a v5 server reached over the v3
   contract, where both are writable? Needs a live v5 instance.
2. Does a group-level size limit apply to the member qualities at decision time? The v5 resource
   carries the fields on both levels and configarr now writes only the group, so a live instance is
   needed to see what the UI reflects.
3. `air_date_grace_period` is `int | null`. Whether null means "no restriction" or "server default"
   decides whether omitting it sends null or omits the key.
4. Should the generated clients pin to a revision instead of tracking `develop`? The v3 client drifted
   by 186 insertions in one day while this plan was being written, so every regeneration is a
   reviewable change rather than a no-op. Durable fix, separate change.
5. Is the contract probe reliable enough in the field that multi-indexer release profiles can rely on
   the default, or should `api_version: v5` be documented as required for that one feature?
