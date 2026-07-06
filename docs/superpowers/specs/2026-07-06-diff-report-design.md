# Diff Report System — Design

- **Issue:** [raydak-labs/configarr#449](https://github.com/raydak-labs/configarr/issues/449) — "Dry Run needs more details"
- **Date:** 2026-07-06
- **Status:** Approved (pending user sign-off on this document)

## Problem

`DRY_RUN=true` output is not useful. Every sync step collapses to a generic
one-liner like `"DryRun: Would update QualityDefinitions."` with no detail
about what would actually change, even though most sync modules already
compute detailed diff information internally — it's either discarded, only
logged at `debug` level, or never computed at all in dry-run mode due to a
short-circuit bug (see "Prerequisite bug fixes" below).

## Goals

- One consistent, detailed diff report per *arr instance, covering every
  resource type this app syncs (quality profiles, quality definitions,
  custom formats, media management/naming, UI config, root folders,
  metadata profiles, download clients, download client config, remote
  paths, delay profiles).
- Same report content in `DRY_RUN=true` ("would change") and real runs
  ("changed") — one collection mechanism, not two.
- Structured data (not pre-formatted prose), so the same diff data can
  drive multiple output formats without re-deriving anything per format.
- Console output (replacing today's scattered per-step summary/DryRun
  lines) ships first; JSON output (opt-in, written to a file) ships in the
  same effort since the formatter is pluggable from day one.
- Not user-facing as a config.yml feature — internal architecture, so we
  have latitude to fix underlying bugs and reshape existing utilities
  where it genuinely helps.

## Non-goals

- Per-element structured diffing of reordered arrays (e.g. quality-profile
  item order changes). These will render as a whole-field `from`/`to`
  swap (see "Known limitation" below) — not a regression from today's
  behavior, but not a full solution either. Explicitly out of scope for v1.
- A generic, standalone deep-diff library for external consumption. This
  is internal to configarr's own sync modules.
- Changing what gets synced or how conflicts are resolved. This is a
  reporting-only feature; execution logic (what gets created/updated/
  deleted) does not change.

## Prerequisite bug fixes (must land before the collector)

These are real, independent bugs found during design review — fixing them
first means every later step is verified against a correct baseline, and a
regression is easy to attribute to the right change.

1. **`compareObjectsCarr` (`src/util.ts`) array-element bug.** When
   comparing array elements, only the *first* differing sub-field per
   element is recorded (`subChanges[0]`) — additional differing fields on
   the same element are silently dropped. Must capture all of them.
2. **`compareObjectsCarr` dead branch.** The check
   `if (!isEqual && changes.length <= 0)` at the end of the array-handling
   loop reads the *outer accumulated `changes` array's total length*, not
   a per-element local — it's dead after the first change found anywhere,
   including on the very first iteration. Remove or fix.
3. **`index.ts` DRY_RUN short-circuit.** For download clients, download
   client config, and remote paths, `index.ts` currently wraps the entire
   sync call in `if (DRY_RUN) { log generic message } else { await
   syncX(...) }` — meaning the diff is **never computed** in dry-run mode
   for these three resource types (the `DRY_RUN` checks inside those
   modules' own sync functions are dead code, unreachable). Fix: always
   call through to compute the diff; branch on `DRY_RUN` only around
   execution, matching the pattern `rootFolderBase.ts` and
   `metadataProfileBase.ts` already use correctly.

## Architecture

### Data model (`src/diffReport/diffReport.types.ts`)

```ts
export type DiffAction = "create" | "update" | "delete" | "unchanged";

export interface FieldChange {
  field: string; // dotted path, e.g. "upgrade.until_score", "customFormats.SDTV.score"
  from: unknown;
  to: unknown;
}

export interface DiffEntry {
  resourceType: string; // "QualityProfile", "QualityDefinition", "CustomFormat", "RootFolder", ...
  name: string;
  action: DiffAction;
  fieldChanges?: FieldChange[]; // only present for "update"
}

export interface InstanceDiffReport {
  arrType: string;
  instanceName: string;
  entries: DiffEntry[];
}
```

Each module produces `{field, from, to}` triples instead of hand-written
prose. This is what makes the model reusable across formats: a console
formatter renders `field: from -> to`; a JSON consumer gets real
structured data; any future format (table, filtered view, etc.) is a new
renderer over the same data, no re-plumbing of every sync module.

**Known limitation (accepted for v1):** for whole-array or whole-object
field replacements (e.g. a quality-profile's `items` array reordered), the
model captures `{field: "items", from: [...], to: [...]}` as one entry —
the full before/after value, not a per-element diff. This matches today's
level of detail (a reorder already collapses to one message), so it's not
a regression, but it means very large nested structures could still render
as a big value dump in console output. Mitigated by the `formatDiffValue`
helper below (truncation for large arrays/objects), but not fully solved.
Revisit only if it proves to be a real pain point in practice.

### `compareObjectsCarr` rework (`src/util.ts`)

Changes return type from `{ equal: boolean; changes: string[] }` to
`{ equal: boolean; changes: FieldChange[] }`, building a dotted field path
as it recurses and capturing actual `from`/`to` values instead of
pre-formatted sentences. Fixes the two bugs above in the same pass.

Verified low-risk: its three call sites (`custom-formats.ts`,
`media-management.ts`, `uiConfigSyncer.ts`) only use `.equal` for control
flow and previously used `.changes` for debug logging/counts — none
inspect string content, and no test in the suite asserts on the string
shape (only `.equal`/`.size`). Reworked in place; not worth introducing a
parallel function to keep in sync for no safety benefit.

### Collector (`src/diffReport/diffCollector.ts`)

```ts
export class DiffCollector {
  private entries: DiffEntry[] = [];
  add(entries: DiffEntry[]): void {
    this.entries.push(...entries);
  }
  getEntries(): DiffEntry[] {
    return this.entries;
  }
}
```

One `DiffCollector` is created per *arr instance at the top of
`pipeline()` in `index.ts`. Each existing diff-calculation call gets a
thin adapter function (colocated with the module it adapts) that converts
that module's own return shape into `DiffEntry[]`, pushed into the
collector. The collector stays scoped to a single instance — it does not
own cross-instance or whole-run state.

Adapters are kept separate from execution logic deliberately: `index.ts`
still uses each module's native return shape (`create`/`changedQPs`/
`noChanges`, etc.) to decide what to actually create/update/delete. The
adapter only produces the *reporting* view. This keeps "what to execute"
and "what to report" as separate concerns, since some callers need the
former without the latter and vice versa.

### Value formatting (`src/diffReport/formatDiffValue.ts`)

A small shared helper, used **only by the console formatter**, responsible
for rendering a `FieldChange`'s `from`/`to` value legibly:

- Scalars (string/number/boolean/null/undefined): render directly (`null`/
  `undefined` render as literal `null`/`undefined`, not empty string).
- Arrays/objects with **5 or fewer** top-level entries: pretty-print
  inline (e.g. `["a", "b", "c"]`).
- Arrays/objects with **more than 5** top-level entries: show the first 5
  and a `(+N more)` suffix (e.g. `["a", "b", "c", "d", "e", (+3 more)]`)
  rather than dumping the full structure.

The JSON formatter does **not** truncate — it serializes `from`/`to`
values in full. The two formats serve different purposes: console is a
human-readable summary (truncation keeps it scannable), JSON is a
complete structured record (truncation there would defeat the point of
offering machine-readable output at all).

Without this, every formatter would reinvent legibility handling, or
console output would regress to unreadable raw dumps for exactly the
diffs (quality-profile items, CF specifications) that matter most.

### Formatters (`src/diffReport/formatters/`)

```ts
export interface DiffFormatter {
  format(report: InstanceDiffReport): void | Promise<void>;
}
```

- **`consoleFormatter.ts`** — always active. Renders one consolidated
  report per instance via the existing `logger`, grouped by
  `resourceType`, replacing today's scattered per-step summary/DryRun log
  lines (e.g. `"Created CFs: 0, Updated CFs: 0..."`,
  `"DryRun: Would update QualityDefinitions."`) with one block:

  ```
  === Diff Report: RADARR / instance1 ===

  QualityDefinitions (1 change)
    ~ SDTV
        minSize: 2 -> 5

  QualityProfiles (1 create, 1 update)
    + ExampleProfile (new)
    ~ Remux-2160p
        minFormatScore: 0 -> 10
        language: English -> Any

  CustomFormats (0 changes)
    (up to date)
  ==========================================
  ```

- **`jsonFormatter.ts`** — opt-in. If a new env var
  (`CONFIGARR_DIFF_OUTPUT_FILE`) is set, every instance's
  `InstanceDiffReport` is appended to an array owned by `run()` (the
  outer per-instance loop in `index.ts` — not threaded through
  `pipeline()`'s signature as a side channel), and written once as a
  single JSON document after the whole run completes. Console output is
  unaffected either way; JSON is additive, not a replacement mode.

  Document shape written to the file:

  ```jsonc
  {
    "generatedAt": "2026-07-06T12:34:56.000Z",
    "dryRun": true,
    "instances": [
      { "arrType": "RADARR", "instanceName": "instance1", "entries": [ /* DiffEntry[] */ ] },
      { "arrType": "SONARR", "instanceName": "main", "entries": [ /* DiffEntry[] */ ] }
    ]
  }
  ```

## Per-module migration plan and effort

| Module | Current state | Work needed |
| --- | --- | --- |
| `compareObjectsCarr` (`util.ts`) | Prose `changes: string[]`, 2 known bugs | Rework return type + fix both bugs (prerequisite, §above) |
| `custom-formats.ts`, `media-management.ts`, `uiConfigSyncer.ts` | Already use `compareObjectsCarr` | Adapt to new shape; inherit structured diffs automatically |
| `quality-definitions.ts` | `changeMap: Map<string, string[]>`, already returned | Convert prose pushes to `{field, from, to}`; add adapter |
| `quality-profiles.ts` | `changeList`/`changes` map computed but fully discarded (dead code) | Convert prose pushes to `{field, from, to}`; actually return/expose it; add adapter |
| `rootFolder`, `metadataProfiles`, `downloadClients` | `{config, server}` pairs, no field diff | Feed pairs through reworked `compareObjectsCarr`; add adapter |
| `remotePaths` | `toUpdate: Array<{id, config}>`, old value discarded before return | Add `server` value back into the tuple (trivial); diff via `compareObjectsCarr`; add adapter |
| `delay-profiles.ts` | Only two booleans, no field detail | Build real field comparison (known, static set of fields); add adapter |
| `index.ts` (downloadClients/downloadClientConfig/remotePaths) | DRY_RUN short-circuits before diff is computed | Prerequisite bug fix (§above) |

## Configuration

One new environment variable:

| Variable | Default | Description |
| --- | --- | --- |
| `CONFIGARR_DIFF_OUTPUT_FILE` | unset | If set, the full structured diff report for the whole run is written as JSON to this file path once the run completes, in addition to (not instead of) console output. |

No format-selection env var — console is always on (it's the replacement
for today's default behavior, not an opt-in), and JSON is purely
additive, toggled by the presence of the output-file path.

## Build order

Each step is independently verifiable against the existing test suite
before moving to the next, isolating risky changes from mechanical ones:

1. Fix + restructure `compareObjectsCarr` alone (prerequisite bug fixes).
2. Update its three consumers to the new shape (still just logging, no
   collector yet) — confirms the rework didn't break anything real.
3. Fix the `index.ts` DRY_RUN short-circuit for downloadClients/
   downloadClientConfig/remotePaths (independent of the collector).
4. Introduce `DiffEntry`/`FieldChange`/`DiffCollector` types + console
   formatter + `formatDiffValue`; wire into `pipeline()`. Migrate modules
   in increasing complexity: quality-definitions → quality-profiles →
   custom-formats/media-management/uiConfig → rootFolder/
   metadataProfiles/downloadClients → remotePaths → delay-profiles
   (largest net-new logic, done last).
5. JSON formatter + `run()`-level accumulation, last — purely additive on
   top of a `DiffEntry[]` model that is by this point exercised by every
   module.

## Testing

- Unit tests for the reworked `compareObjectsCarr` covering the two fixed
  bugs directly (multi-field array-element diffs, the dead-branch case).
- Unit tests per module's new adapter function, asserting the produced
  `DiffEntry[]` shape for create/update/delete/unchanged cases.
- Unit tests for `formatDiffValue` (scalar, small, and truncated-large
  cases).
- Unit tests for the console formatter's rendering of a representative
  `InstanceDiffReport` (snapshot-style is acceptable given this is
  human-readable text).
- Unit tests for the JSON formatter (file written, valid JSON, matches
  the collected entries).
- End-to-end verification against the live `examples/full` stack in both
  `DRY_RUN=true` and a real run, confirming the console report reflects
  actual, correct diffs (same verification approach used throughout this
  session's other work).

## Open questions resolved during design

- **Both dry-run and real runs use the same report** (not dry-run only) —
  confirmed with user.
- **Structured `{field, from, to}` over prose strings** — confirmed with
  user; explicitly license to redesign underlying utilities since this is
  not a user-facing config surface.
- **Report replaces scattered per-step logs** (not additive) — confirmed
  with user.
- **JSON written to a file** (not printed to stdout) — confirmed with
  user; simplified during design review to a single opt-in env var
  (presence of file path) rather than a separate format-selection var,
  since console is always-on and JSON is purely additive.
- **All ~10 modules in one pass** (not phased) — confirmed with user.
