# Quality profile group ids

Status: implemented (2026-11-12)

[Implementation plan](../plans/2026-11-12-quality-profile-group-ids.md)

## Problem

Quality profile groups were expressible in YAML (`qualities` with a nested `qualities` list), but
their ids were not stable. `mapQualities()` synthesised a group id from the position in the config
array:

```ts
id: 1000 + i;
```

The cutoff and `upgrade.until_quality` are then resolved against that synthesised map. Inserting,
removing or reordering a group shifted the ids of every group after it, so a sync rewrote group ids
and pointed the cutoff at a different group than the one named in the config. The result was a diff
on every run after a group reorder, with cutoffs silently following the numbering instead of the
name.

## Decision

Keep the YAML shape and make group identity stable.

1. **Reuse the server id by name.** `mapQualities()` takes the existing server items as an optional
   third argument. For an existing profile, a group keeps the id the server already uses for a group
   with the same name. Only genuinely new groups get a fresh id.
2. **Explicit `id`.** `InputConfigQualityProfileItemSchema` accepts an optional `id`. It wins over
   name matching. Ids must be `>= 1000` (the \*arr group range) and unique; setting `id` on a plain
   quality is rejected.
3. **No id collisions.** Ids claimed by an explicit config `id` or reused from the server are
   reserved, so a new group allocated at `1000 + index` shifts past them instead of duplicating one.
4. **Compare ids in the diff.** `isOrderOfQualitiesEqual()` now compares `id` as well as name and
   nesting. With reconciliation in place an unchanged profile still produces an empty diff, while a
   conflicting explicit id is detected. The nested-length guard is also corrected: it read
   `items1.length` twice, so the `items2` length was never compared directly.

Nothing changes on create: a profile that does not exist on the server still gets `1000 + index`.

## Considered and rejected

- **Deriving ids from the name** (hash or slug): the \*arr apps only accept numeric ids, and a hash
  would still have to be resolved against the server to keep cutoffs valid.
- **Ignoring ids entirely and matching by name at cutoff time only**: the id is part of the payload
  the server stores, so the profile would still be rewritten; it also would not fix a conflicting
  explicit id.
- **Comparing the `allowed` flag in `isOrderOfQualitiesEqual()`**: tracked separately. Today an
  `enabled` flip on an existing profile is not detected, but enforcing `allowed` would also force
  every quality the config does not list to be disabled, which is a behaviour change for profiles
  first created outside Configarr. It needs its own decision.

## Validation

Unit coverage in `qualityProfileBase.test.ts`:

- reuse of a server id that is not `1000 + index`, with the config order differing from the server,
- fresh allocation that skips a reused id,
- explicit id precedence, rejection of `id` on a plain quality, and duplicate-id rejection,
- `isOrderOfQualitiesEqual` id mismatch and nested-length mismatch,
- end-to-end diff: a profile keeps its group id and cutoff across a reorder, and a second
  `calculateQualityProfilesDiff` run reports no changes.

The group ids in these tests (`1002`, `1005`) match what Lidarr returns for profile groups, so the
regression is covered without a live instance.

Live probes against Lidarr nightly, Sonarr v4 and Radarr v6 confirmed the assumption behind the
reuse: each app keeps a group id that configarr sends (`1000`, `1001`), keeps it after the groups are
reordered, and keeps `cutoff` pointing at the same group. Groups need at least two qualities per app
validator, and `minUpgradeFormatScore` must be `>= 1`; the e2e payloads already satisfy both.

Live e2e coverage in `tests/arr-e2e/{lidarr,sonarr,radarr}.e2e.test.ts` creates grouped profiles,
asserts the server ids, reorders the groups, asserts the ids followed their names, and requires an
up-to-date diff on the following run.
