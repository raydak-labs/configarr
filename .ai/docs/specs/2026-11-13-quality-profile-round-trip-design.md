# Quality profile round-trip

Status: implemented (2026-11-13)

Extends [quality profile group ids](2026-11-12-quality-profile-group-ids-design.md), which is still
valid: ids are reused by name and the diff compares them.

[Implementation plan](../plans/2026-11-13-quality-profile-round-trip.md)

## Problem

With stable group ids, group cutoffs stopped drifting, but a profile that declares a subset of its
items still produced an `items` diff on every run:

1. `mapQualities()` appended every quality the config does not declare to the top (or bottom) of the
   list. In the \*arr apps that array is the preference ranking, so the write reordered the profile.
2. For profiles with `upgrade.allowed: false`, the create path wrote `cutoffFormatScore = 1` and the
   update path forced it back to `1` whenever the server disagreed. `upgrade.until_score` was
   ignored, so a server value of `0` drifted to `1` on every run.

## Decision

- **Keep undeclared qualities in place.** When an existing profile is mapped, each undeclared quality
  is inserted after the closest declared item that precedes it in the server list. Items the server
  does not have yet still go to the top or bottom per `quality_sort`. Creating a profile is
  unchanged.
- **Honour `until_score` when upgrades are disabled.** Both create and update use
  `upgrade.until_score ?? 1`, so an explicit `0` is no longer rewritten; leaving it unset keeps the
  previous `1`.
- **Document the ordering contract.** `qualities` is the preference ranking with the first entry
  highest, i.e. the reverse of the API array and the order shown in the \*arr UI. Declaring the
  entries in the opposite order still intentionally changes the preference order.

## Considered and rejected

- **Forcing the server order whenever the declared set matches the server set.** It would make
  config order meaningless and remove the ability to reorder a profile from YAML.
- **Comparing `allowed`/`enabled` in the items diff.** Still out of scope, for the reason recorded in
  the group-id spec: it would also disable every unlisted quality.

## Validation

- Unit tests for position preservation (undeclared quality before, between and after declared
  groups), for new qualities still landing at the top, and for `cutoffFormatScore` on create and
  update.
- A diff test whose server profile carries three undeclared qualities interleaved with the groups:
  two runs report no changes.
- Verified against a live Lidarr nightly profile with all 38 qualities, two groups and 30+ undeclared
  entries: `calculateQualityProfilesDiff` reports `changed: 0` and the mapped order matches the
  server order exactly.
