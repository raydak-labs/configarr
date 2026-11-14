# Quality profile id precedence and preserved cutoff

Status: implemented (2026-11-14)

Extends [quality profile group ids](2026-11-12-quality-profile-group-ids-design.md) and
[quality profile round-trip](2026-11-13-quality-profile-round-trip-design.md).

[Implementation plan](../plans/2026-11-14-quality-profile-id-precedence.md)

## Problem

Three defects remained after the group-id and round-trip work:

1. **Explicit ids did not win.** `mapQualities()` resolved each group in one pass. A group without
   an `id` claimed the server id for its name before a later group's explicit `id` was seen, so the
   explicit id was rejected as a duplicate. This contradicted the documented precedence.
2. **The `>= 1000` bound was schema-only.** Lenient config validation (the default) returns the raw
   input object when _any_ schema check fails, so `id: 5`, `1000.5` or `"1000"` reached
   `mapQualities()` and the API.
3. **Omitted cutoff fields were overwritten.** With `upgrade.allowed: false` and no
   `until_quality`, every update replaced the server cutoff with the highest-priority allowed item
   and replaced `cutoffFormatScore` with `until_score ?? 1`. A value set in the \*arr UI was lost on
   the next sync, even though the apps ignore both fields while upgrades are disabled.

## How the apps use a group id

Confirmed against Radarr and Sonarr v5 source; the other apps are forks:

- `QualityProfileQualityItem.Id` is an `IEmbeddedDocument` field stored inside the profile's items
  JSON. It is not a database key and nothing outside the profile references it.
- On create/update the resource mapper copies the supplied `Id` straight into the model and the
  service persists it. The server does not allocate ids on update; only default profiles start at
  1000 and increment.
- The only validations are group id `!= 0` and ids `> 0` unique within the profile. There is no
  server-side `>= 1000` rule.
- The only consumer is `cutoff`, matched against either a group id or a plain quality id. Because
  both live in one numeric namespace and plain quality ids are small, a group id below 1000 can make
  the cutoff ambiguous (and `SingleOrDefault` can match two items).
- When `upgradeAllowed` is false, `cutoff` and `cutoffFormatScore` are ignored at decision time, but
  the API still validates that `cutoff` points at an allowed item.

Consequences: configarr's group name is the useful key; the id is a profile-local tag that matters
for the payload, the diff and the cutoff. Reusing server ids by name is an idempotency measure, not
referential integrity.

## Decision

1. **Two-pass id resolution in `mapQualities()`.** First reserve every explicit id (validating it),
   then reuse an unclaimed server id by name, then allocate `1000 + index` skipping claimed ids.
   Explicit ids therefore win regardless of declaration order.
2. **Runtime id validation.** Reject non-number, non-integer and `< 1000` ids in `mapQualities()`,
   next to the existing plain-quality-id and duplicate-id checks, so lenient validation cannot
   bypass the contract.
3. **Preserve an unnamed cutoff on update.** When `upgrade.allowed` is false and `until_quality` is
   omitted, translate the server cutoff from its old id to the item name and then to the newly
   assigned id. Keep it if the item is still present and allowed; otherwise fall back to the
   highest-priority allowed item. Both steps use the items that will actually be written
   (`updatedServerObject.items`), so an enabled but undeclared server item keeps the cutoff when the
   order is unchanged. Creating a profile still uses the fallback because no server value exists.
4. **Preserve `cutoffFormatScore` on update** when `until_score` is omitted. `until_score ?? 1` remains
   the create default.
5. Keep matching profiles and groups by name. The numeric id is never treated as an identity outside
   the profile.

## Considered and rejected

- **Reject the explicit collision and document the opposite precedence.** The server has no external
  reference to protect, and the documented contract already says explicit wins. Rejecting would make
  a legitimate pin impossible.
- **Allocate fresh ids that avoid every current server group id.** Unnecessary once the id is known
  to be profile-local and the whole item list is replaced by the PUT. Skipping only claimed ids keeps
  the allocation compact.
- **Preserve the cutoff on create.** There is no previous value; the API still requires a valid
  allowed cutoff.
- **Stop writing the cutoff entirely when upgrades are disabled.** The API validates the field, so
  the payload must contain a valid id.

## Validation

- Unit tests for explicit-id precedence, below-range, non-integer and non-numeric ids, preserving an
  omitted cutoff, and translating a preserved cutoff across a remap.
- Updated Radarr diff test: an omitted cutoff and `cutoffFormatScore` survive an update.
- Existing live e2e group-reorder scenarios continue to cover id stability and the cutoff following
  the group name on all supported apps.
