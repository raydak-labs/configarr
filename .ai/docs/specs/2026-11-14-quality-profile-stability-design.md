# Quality profile stability

Status: implemented (2026-11-16)

[Implementation plan](../plans/2026-11-14-quality-profile-stability.md)

## Problem

Group ids derived from config positions were renumbered after reordering, which could move cutoffs to the wrong group. Undeclared qualities were moved from their server positions, causing repeat diffs. Explicit-id precedence and validation were incomplete, and omitted cutoff fields could overwrite values set outside Configarr.

## Decisions

- **Group ids:** reserve explicit ids first, then reuse unclaimed server ids by group name, then allocate `1000 + index` while skipping claimed ids. Explicit ids must be unique integers `>= 1000` and are invalid on plain qualities. Runtime checks enforce the same contract when config validation is lenient.
- **Item identity and order:** identify items by kind (`group` or `quality`) plus name, because both kinds may share a display name. On update, undeclared qualities stay near their server positions; qualities absent from the server follow `quality_sort`. Diffs compare ids, names, nesting, and nested item counts.
- **Cutoffs with upgrades disabled:** create uses `until_score ?? 1`. Update honors configured cutoff fields. When they are omitted, preserve the server cutoff and score, translating the cutoff through item identity to a remapped id. Fall back to an allowed item only when the previous target is missing or disabled.

Group ids are profile-local values shared with plain-quality ids in the cutoff namespace. Group names provide identity across syncs; numeric ids must remain unique within each profile.

Comparing `allowed`/`enabled` remains out of scope because enforcing it for every unlisted quality would change existing-profile behavior.

## Validation

- Unit tests cover id precedence and validation, undeclared-quality ordering, same-name groups and qualities, cutoff translation, and second-run idempotency.
- Live e2e covers group reordering, stored ids and cutoffs, and an up-to-date second run on every supported media app.
- Verified before consolidation: `pnpm build`, `pnpm lint`, `pnpm typecheck`, **1080/1080 unit tests**, and **173/173 live e2e tests** passed.
