# Diff Report System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace configarr's scattered, generic `DryRun: Would update X.` log lines with one structured, detailed diff report per *arr instance — same content in dry-run and real runs — rendered to console always, and optionally to a JSON file.

**Architecture:** A `DiffCollector` is created per instance inside `pipeline()` (`src/index.ts`). Every sync module keeps computing its own native diff shape (unchanged, still drives execution); a thin adapter function colocated with each module converts that native shape into `DiffEntry[]` (`{resourceType, name, action, fieldChanges?}`), pushed into the collector. At the end of the instance's pipeline run, the collected entries become one `InstanceDiffReport`, rendered via a pluggable `DiffFormatter` (console always-on; JSON opt-in via `CONFIGARR_DIFF_OUTPUT_FILE`, accumulated across all instances in `run()` and written once at the end).

**Tech Stack:** TypeScript, Vitest, pnpm. No new dependencies.

## Global Constraints

- Package manager: pnpm only, never npm/yarn.
- After every task: `pnpm build && pnpm test && pnpm lint && pnpm typecheck` must all pass before moving to the next task.
- Never edit `CHANGELOG.md` manually.
- Commit message types: this whole effort is internal (not a user-facing config surface — see spec's Goals) but it does fix real bugs and change user-visible log output, so individual commits use `fix:` (bug fixes: compareObjectsCarr, DRY_RUN short-circuit) or `feat:` (new reporting capability) per the project's commit conventions in `AGENTS.md`/`CLAUDE.md`. Do not add yourself as a commit co-author.
- Full design reference: `docs/superpowers/specs/2026-07-06-diff-report-design.md` — read it if any task below is ambiguous; this plan implements it exactly.
- TDD throughout: write the failing test first, confirm it fails for the expected reason, then implement.

---

### Task 1: Rework `compareObjectsCarr` (fix 2 bugs, change return shape)

**Files:**
- Create: `src/diffReport/diffReport.types.ts`
- Modify: `src/util.ts:1-210` (the `compareObjectsCarr`, `compareCustomFormats`, `compareNaming`, `compareMediamanagement` functions)
- Test: `src/util.test.ts`

**Interfaces:**
- Produces: `FieldChange { field: string; from: unknown; to: unknown }`, `DiffAction = "create" | "update" | "delete" | "unchanged"`, `DiffEntry { resourceType: string; name: string; action: DiffAction; fieldChanges?: FieldChange[] }`, `InstanceDiffReport { arrType: string; instanceName: string; entries: DiffEntry[] }` — all in `src/diffReport/diffReport.types.ts`.
- Produces: `compareObjectsCarr(serverObject: any, localObject: any, parent?: string): { equal: boolean; changes: FieldChange[] }` (return type changed from `{ changes: string[] }`).

This task fixes the two prerequisite bugs from the spec: (1) only `subChanges[0]` was kept per array element, dropping the rest; (2) the `if (!isEqual && changes.length <= 0)` branch checked the outer accumulated array, not a per-element local, making it dead after the first change anywhere.

- [ ] **Step 1: Create the diff report types file**

```ts
// src/diffReport/diffReport.types.ts
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

- [ ] **Step 2: Write failing tests for the two bug fixes and the new return shape**

Add to `src/util.test.ts` (find the existing `describe`/`test` blocks for `compareObjectsCarr`-related behavior — if there is no direct `describe("compareObjectsCarr"...)` block yet, add a new one; the existing tests in this file only call `compareCustomFormats(...).equal` and must keep passing unmodified):

```ts
import { compareObjectsCarr } from "./util";

describe("compareObjectsCarr", () => {
  test("returns FieldChange[] with field/from/to for a scalar mismatch", () => {
    const server = { name: "SDTV", minSize: 2 };
    const local = { name: "SDTV", minSize: 5 };

    const result = compareObjectsCarr(server, local);

    expect(result.equal).toBe(false);
    expect(result.changes).toEqual([{ field: "minSize", from: 2, to: 5 }]);
  });

  test("captures ALL differing sub-fields per array element, not just the first", () => {
    const server = { items: [{ name: "a", score: 1, enabled: true }] };
    const local = { items: [{ name: "a", score: 2, enabled: false }] };

    const result = compareObjectsCarr(server, local);

    expect(result.equal).toBe(false);
    expect(result.changes).toEqual([
      { field: "items[0].score", from: 1, to: 2 },
      { field: "items[0].enabled", from: true, to: false },
    ]);
  });

  test("detects a mismatch on the second array element even when the first element already matched", () => {
    const server = { items: [{ score: 1 }, { score: 10 }] };
    const local = { items: [{ score: 1 }, { score: 20 }] };

    const result = compareObjectsCarr(server, local);

    expect(result.equal).toBe(false);
    expect(result.changes).toEqual([{ field: "items[1].score", from: 10, to: 20 }]);
  });

  test("builds dotted paths for nested objects", () => {
    const server = { upgrade: { until_score: 5 } };
    const local = { upgrade: { until_score: 10 } };

    const result = compareObjectsCarr(server, local);

    expect(result.changes).toEqual([{ field: "upgrade.until_score", from: 5, to: 10 }]);
  });

  test("equal objects return equal: true and no changes", () => {
    const server = { name: "SDTV", minSize: 2 };
    const local = { name: "SDTV", minSize: 2 };

    const result = compareObjectsCarr(server, local);

    expect(result.equal).toBe(true);
    expect(result.changes).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test -- util.test.ts -t "compareObjectsCarr"`
Expected: FAIL — current implementation returns `changes: string[]`, so `toEqual([{ field: ..., from: ..., to: ... }])` assertions fail (string vs object mismatch), and the array-element and second-element tests fail because of the two known bugs.

- [ ] **Step 4: Rewrite `compareObjectsCarr` in `src/util.ts`**

Replace the existing `compareObjectsCarr` function (and update the three wrapper functions' return-type annotations, which change automatically via `ReturnType<typeof compareObjectsCarr>`) with:

```ts
import { FieldChange } from "./diffReport/diffReport.types";

export function compareObjectsCarr(serverObject: any, localObject: any, parent?: string): { equal: boolean; changes: FieldChange[] } {
  const changes: FieldChange[] = [];

  for (const key in localObject) {
    if (Object.prototype.hasOwnProperty.call(localObject, key)) {
      if (Object.prototype.hasOwnProperty.call(serverObject, key)) {
        const serverProperty = serverObject[key];
        const localProperty = localObject[key];
        const path = parent ? `${parent}.${key}` : key;

        if (Array.isArray(serverProperty)) {
          if (!Array.isArray(localProperty)) {
            changes.push({ field: path, from: serverProperty, to: localProperty });
            continue;
          }

          let arrayLengthMismatch = false;

          if (key === "fields") {
            arrayLengthMismatch = serverProperty.length < localProperty.length;
          } else if (serverProperty.length != localProperty.length) {
            arrayLengthMismatch = true;
          }

          if (arrayLengthMismatch) {
            changes.push({ field: path, from: serverProperty, to: localProperty });
            continue;
          }

          for (let i = 0; i < serverProperty.length; i++) {
            const { changes: subChanges } = compareObjectsCarr(serverProperty[i], localProperty[i]);
            changes.push(...subChanges.map((subChange) => ({ ...subChange, field: `${path}[${i}].${subChange.field}` })));
          }
        } else if (typeof localProperty === "object" && localProperty !== null) {
          if (typeof serverProperty !== "object" || serverProperty === null) {
            changes.push({ field: path, from: serverProperty, to: localProperty });
            continue;
          }

          const { changes: subChanges } = compareObjectsCarr(serverProperty, localProperty, path);
          changes.push(...subChanges);
        } else {
          if (serverProperty !== localProperty) {
            changes.push({ field: path, from: serverProperty, to: localProperty });
          }
        }
      } else {
        logger.debug(`Ignore unknown key '${key}' for comparison.`);
      }
    }
  }

  const equal = changes.length === 0;
  return { equal, changes };
}
```

Note: the array-element recursive call no longer passes `key` as `parent` (it built `${key}[${i}].${subChanges[0]}` before) — instead each returned sub-change's own `field` is prefixed with `${path}[${i}].` after the recursive call returns, which is what fixes bug #1 (all sub-changes are now mapped, not just index `[0]`). The nested-object branch still passes `path` as `parent` for the recursive call, since dotted paths compose naturally there. The dead `if (!isEqual && changes.length <= 0)` branch is deleted entirely (bug #2) — a per-element mismatch is now always fully represented by its own `FieldChange` entries, so the redundant boolean marker added nothing.

Also remove the two now-unused `Mismatch found for key` / `Expected array for key` / `Expected object for key` prose branches — replaced above by structured `FieldChange` pushes using the actual values, which the console formatter (Task 4) will render legibly.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test -- util.test.ts`
Expected: PASS — all new `compareObjectsCarr` tests pass, and all pre-existing tests in `util.test.ts` and `custom-formats.test.ts` still pass (they only assert `.equal`, confirmed unaffected by this shape change).

- [ ] **Step 6: Run full verification and commit**

Run: `pnpm build && pnpm test && pnpm lint && pnpm typecheck`
Expected: all pass.

```bash
git add src/util.ts src/util.test.ts src/diffReport/diffReport.types.ts
git commit -m "$(cat <<'EOF'
fix: capture all field-level differences in compareObjectsCarr

Array-element comparisons only recorded the first differing sub-field
and a dead length check masked further mismatches. Return type also
changes from prose strings to structured FieldChange{field,from,to}
entries, laying the groundwork for a structured diff report.
EOF
)"
```

---

### Task 2: Fix the 3 `compareObjectsCarr` consumers' debug logging for the new shape

**Files:**
- Modify: `src/custom-formats.ts:58`
- Modify: `src/uiConfigs/uiConfigSyncer.ts:46`
- Test: none new (existing `custom-formats.test.ts` and `uiConfigSyncer` tests, if any, must keep passing)

**Interfaces:**
- Consumes: `FieldChange` from Task 1 (`{ field, from, to }`), `compareCustomFormats`/`compareObjectsCarr` returning `{ equal, changes: FieldChange[] }`.

`src/media-management.ts` needs no code change: its `logger.debug(changes, ...)` calls already pass `changes` as a structured object to the pino-style logger (object-then-message signature), so they render correctly with either `string[]` or `FieldChange[]` — only the two call sites below use string-only formatting (template-literal interpolation / `.join()`) that breaks with objects.

- [ ] **Step 1: Fix `src/custom-formats.ts:58`**

Old:
```ts
logger.debug(`Found mismatch for ${requestConfig.name}: ${comparison.changes}`);
```

New:
```ts
logger.debug(comparison.changes, `Found mismatch for ${requestConfig.name}`);
```

- [ ] **Step 2: Fix `src/uiConfigs/uiConfigSyncer.ts:46`**

Old:
```ts
logger.debug(`UI config changes: ${changes.join(", ")}`);
```

New:
```ts
logger.debug(changes, `UI config changes for ${arrType}`);
```

- [ ] **Step 3: Run full verification**

Run: `pnpm build && pnpm test && pnpm lint && pnpm typecheck`
Expected: all pass — this is a debug-log-only fix, no behavior or test assertions change.

- [ ] **Step 4: Commit**

```bash
git add src/custom-formats.ts src/uiConfigs/uiConfigSyncer.ts
git commit -m "$(cat <<'EOF'
fix: correct debug log formatting for structured FieldChange diffs

These two call sites stringified the changes array via template
literals / .join(), which produced "[object Object]" once
compareObjectsCarr started returning FieldChange objects instead of
prose strings.
EOF
)"
```

---

### Task 3: Fix `index.ts` DRY_RUN short-circuit for downloadClients/downloadClientConfig/remotePaths

**Files:**
- Modify: `src/index.ts:314-357`

**Interfaces:**
- Consumes: `syncDownloadClients(arrType, config, serverCache)`, `syncDownloadClientConfig(arrType, config, serverCache)`, `syncRemotePaths(arrType, config)` — unchanged signatures. Each of these already has its own correct `if (getEnvs().DRY_RUN) { ...; return }` branch internally (`downloadClientBase.ts:425`, `downloadClientConfigSyncer.ts:122`, `remotePathSyncer.ts:120`), placed *after* diff calculation — so calling them unconditionally is safe and is what actually fixes the bug (today `index.ts` never lets execution reach those internal checks in dry-run mode, because it short-circuits one level higher).

No test exercises `pipeline()` directly (it requires a live/mocked `*arr` API and there is no `index.test.ts`); this task is verified by the full test suite (no regressions in the three modules' own tests) plus the end-to-end Docker verification in Task 12.

- [ ] **Step 1: Remove the outer `DRY_RUN` wrapper for all three call sites in `src/index.ts`**

Replace lines 314-357 (the `// Download Clients` / `// Download Client Configuration` / `// Sync remote path mappings` blocks) with:

```ts
  // Download Clients
  if (config.download_clients?.data || config.download_clients?.delete_unmanaged?.enabled) {
    try {
      await syncDownloadClients(arrType, config, serverCache);
    } catch (err: any) {
      logger.error(`Failed to sync download clients: ${err.message}`);
    }
  }

  // Download Client Configuration
  if (config.download_clients?.config) {
    try {
      await syncDownloadClientConfig(arrType, config, serverCache);
    } catch (err: any) {
      logger.error(`Failed to sync download client config: ${err.message}`);
    }
  }

  // Sync remote path mappings
  if (
    config.download_clients?.remote_paths !== undefined &&
    (config.download_clients.remote_paths.length > 0 || config.download_clients.delete_unmanaged_remote_paths)
  ) {
    logger.debug(`[DEBUG] About to sync remote paths for ${arrType}. Count: ${config.download_clients.remote_paths.length}`);
    try {
      await syncRemotePaths(arrType, config);
    } catch (err: any) {
      logger.error(`Failed to sync remote path mappings: ${err.message}`);
    }
  } else {
    logger.debug(`[DEBUG] No remote paths to sync for ${arrType}. download_clients: ${JSON.stringify(config.download_clients)}`);
  }
```

- [ ] **Step 2: Run full verification**

Run: `pnpm build && pnpm test && pnpm lint && pnpm typecheck`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "$(cat <<'EOF'
fix: compute download client/config/remote-path diffs in dry-run mode

index.ts wrapped these three sync calls entirely inside an
if (DRY_RUN) branch that only logged a generic message, so the diff
was never computed in dry-run mode — the DRY_RUN checks inside each
module's own sync function were unreachable dead code. Now the calls
always execute; each module's existing internal DRY_RUN branch (which
runs after diff calculation) correctly skips only the write.
EOF
)"
```

---

### Task 4: `DiffCollector`, `formatDiffValue`, `DiffFormatter`/console formatter

**Files:**
- Modify: `src/diffReport/diffReport.types.ts` (add `DiffFormatter` interface, from Task 1)
- Create: `src/diffReport/diffCollector.ts`
- Create: `src/diffReport/diffCollector.test.ts`
- Create: `src/diffReport/formatDiffValue.ts`
- Create: `src/diffReport/formatDiffValue.test.ts`
- Create: `src/diffReport/formatters/consoleFormatter.ts`
- Create: `src/diffReport/formatters/consoleFormatter.test.ts`

**Interfaces:**
- Consumes: `DiffEntry`, `FieldChange`, `InstanceDiffReport` from `src/diffReport/diffReport.types.ts` (Task 1).
- Produces: `class DiffCollector { add(entries: DiffEntry[]): void; getEntries(): DiffEntry[] }`, `function formatDiffValue(value: unknown): string`, `interface DiffFormatter { format(report: InstanceDiffReport): void | Promise<void> }`, `class ConsoleDiffFormatter implements DiffFormatter`.

This is the core reporting machinery — no sync module is touched yet in this task; Task 5 onward wires real modules into it.

- [ ] **Step 1: Add `DiffFormatter` to the types file**

Append to `src/diffReport/diffReport.types.ts`:

```ts
export interface DiffFormatter {
  format(report: InstanceDiffReport): void | Promise<void>;
}
```

- [ ] **Step 2: Write failing test for `DiffCollector`**

```ts
// src/diffReport/diffCollector.test.ts
import { describe, expect, test } from "vitest";
import { DiffCollector } from "./diffCollector";
import { DiffEntry } from "./diffReport.types";

describe("DiffCollector", () => {
  test("accumulates entries across multiple add() calls", () => {
    const collector = new DiffCollector();
    const first: DiffEntry[] = [{ resourceType: "QualityProfile", name: "HD-1080p", action: "create" }];
    const second: DiffEntry[] = [{ resourceType: "CustomFormat", name: "SDTV", action: "update", fieldChanges: [{ field: "score", from: 0, to: 10 }] }];

    collector.add(first);
    collector.add(second);

    expect(collector.getEntries()).toEqual([...first, ...second]);
  });

  test("starts empty", () => {
    const collector = new DiffCollector();
    expect(collector.getEntries()).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test -- diffCollector.test.ts`
Expected: FAIL — `./diffCollector` module does not exist yet.

- [ ] **Step 4: Implement `DiffCollector`**

```ts
// src/diffReport/diffCollector.ts
import { DiffEntry } from "./diffReport.types";

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

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test -- diffCollector.test.ts`
Expected: PASS.

- [ ] **Step 6: Write failing test for `formatDiffValue`**

```ts
// src/diffReport/formatDiffValue.test.ts
import { describe, expect, test } from "vitest";
import { formatDiffValue } from "./formatDiffValue";

describe("formatDiffValue", () => {
  test("renders scalars directly", () => {
    expect(formatDiffValue(5)).toBe("5");
    expect(formatDiffValue("English")).toBe("English");
    expect(formatDiffValue(true)).toBe("true");
  });

  test("renders null and undefined as literal words", () => {
    expect(formatDiffValue(null)).toBe("null");
    expect(formatDiffValue(undefined)).toBe("undefined");
  });

  test("renders a small array inline with quoted string elements", () => {
    expect(formatDiffValue(["a", "b", "c"])).toBe('["a", "b", "c"]');
  });

  test("truncates arrays with more than 5 entries", () => {
    expect(formatDiffValue(["a", "b", "c", "d", "e", "f", "g", "h"])).toBe('["a", "b", "c", "d", "e", (+3 more)]');
  });

  test("renders a small object inline", () => {
    expect(formatDiffValue({ a: 1, b: 2 })).toBe("{a: 1, b: 2}");
  });

  test("truncates objects with more than 5 top-level keys", () => {
    const value = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7 };
    expect(formatDiffValue(value)).toBe("{a: 1, b: 2, c: 3, d: 4, e: 5, (+2 more)}");
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `pnpm test -- formatDiffValue.test.ts`
Expected: FAIL — `./formatDiffValue` module does not exist yet.

- [ ] **Step 8: Implement `formatDiffValue`**

```ts
// src/diffReport/formatDiffValue.ts
const TRUNCATE_AT = 5;

export function formatDiffValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value !== "object") return String(value);
  return formatContainer(value);
}

function formatLeaf(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "object") return formatContainer(value as object);
  if (typeof value === "string") return JSON.stringify(value);
  return String(value);
}

function formatContainer(value: object): string {
  if (Array.isArray(value)) {
    return truncateAndJoin(
      value.map((v) => formatLeaf(v)),
      "[",
      "]",
    );
  }

  const entries = Object.entries(value as Record<string, unknown>).map(([key, v]) => `${key}: ${formatLeaf(v)}`);
  return truncateAndJoin(entries, "{", "}");
}

function truncateAndJoin(entries: string[], open: string, close: string): string {
  if (entries.length <= TRUNCATE_AT) {
    return `${open}${entries.join(", ")}${close}`;
  }

  const shown = entries.slice(0, TRUNCATE_AT);
  return `${open}${shown.join(", ")}, (+${entries.length - TRUNCATE_AT} more)${close}`;
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `pnpm test -- formatDiffValue.test.ts`
Expected: PASS.

- [ ] **Step 10: Write failing test for the console formatter**

```ts
// src/diffReport/formatters/consoleFormatter.test.ts
import { describe, expect, test, vi, afterEach } from "vitest";
import { logger } from "../../logger";
import { ConsoleDiffFormatter } from "./consoleFormatter";
import { InstanceDiffReport } from "../diffReport.types";

describe("ConsoleDiffFormatter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("renders a report with creates, updates, and field changes", () => {
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => undefined as any);

    const report: InstanceDiffReport = {
      arrType: "RADARR",
      instanceName: "instance1",
      entries: [
        {
          resourceType: "QualityDefinitions",
          name: "SDTV",
          action: "update",
          fieldChanges: [{ field: "minSize", from: 2, to: 5 }],
        },
        { resourceType: "QualityProfiles", name: "ExampleProfile", action: "create" },
        {
          resourceType: "QualityProfiles",
          name: "Remux-2160p",
          action: "update",
          fieldChanges: [
            { field: "minFormatScore", from: 0, to: 10 },
            { field: "language", from: "English", to: "Any" },
          ],
        },
      ],
    };

    new ConsoleDiffFormatter().format(report);

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const output = infoSpy.mock.calls[0][0] as string;

    expect(output).toContain("=== Diff Report: RADARR / instance1 ===");
    expect(output).toContain("QualityDefinitions (1 change)");
    expect(output).toContain("~ SDTV");
    expect(output).toContain("minSize: 2 -> 5");
    expect(output).toContain("QualityProfiles (1 create, 1 update)");
    expect(output).toContain("+ ExampleProfile (new)");
    expect(output).toContain("~ Remux-2160p");
    expect(output).toContain("minFormatScore: 0 -> 10");
    expect(output).toContain("language: English -> Any");
    expect(output).toContain("==========================================");
  });

  test("renders an up-to-date message when there are no entries", () => {
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => undefined as any);

    new ConsoleDiffFormatter().format({ arrType: "SONARR", instanceName: "main", entries: [] });

    const output = infoSpy.mock.calls[0][0] as string;
    expect(output).toContain("up to date");
  });
});
```

- [ ] **Step 11: Run test to verify it fails**

Run: `pnpm test -- consoleFormatter.test.ts`
Expected: FAIL — `./consoleFormatter` module does not exist yet.

- [ ] **Step 12: Implement `ConsoleDiffFormatter`**

```ts
// src/diffReport/formatters/consoleFormatter.ts
import { logger } from "../../logger";
import { formatDiffValue } from "../formatDiffValue";
import { DiffEntry, DiffFormatter, InstanceDiffReport } from "../diffReport.types";

export class ConsoleDiffFormatter implements DiffFormatter {
  format(report: InstanceDiffReport): void {
    const lines: string[] = [`=== Diff Report: ${report.arrType} / ${report.instanceName} ===`, ""];

    if (report.entries.length === 0) {
      lines.push("  (up to date - no changes)");
    } else {
      for (const [resourceType, entries] of groupByResourceType(report.entries)) {
        lines.push(`${resourceType} (${summarizeCounts(entries)})`);
        for (const entry of entries) {
          lines.push(...renderEntry(entry));
        }
        lines.push("");
      }
    }

    lines.push("==========================================");
    logger.info(lines.join("\n"));
  }
}

function groupByResourceType(entries: DiffEntry[]): Map<string, DiffEntry[]> {
  const groups = new Map<string, DiffEntry[]>();
  for (const entry of entries) {
    const group = groups.get(entry.resourceType) ?? [];
    group.push(entry);
    groups.set(entry.resourceType, group);
  }
  return groups;
}

function summarizeCounts(entries: DiffEntry[]): string {
  const creates = entries.filter((e) => e.action === "create").length;
  const updates = entries.filter((e) => e.action === "update").length;
  const deletes = entries.filter((e) => e.action === "delete").length;

  if (creates === 0 && deletes === 0) {
    return `${updates} change${updates === 1 ? "" : "s"}`;
  }

  const parts: string[] = [];
  if (creates > 0) parts.push(`${creates} create`);
  if (updates > 0) parts.push(`${updates} update`);
  if (deletes > 0) parts.push(`${deletes} delete`);
  return parts.join(", ");
}

function renderEntry(entry: DiffEntry): string[] {
  if (entry.action === "create") {
    return [`  + ${entry.name} (new)`];
  }
  if (entry.action === "delete") {
    return [`  - ${entry.name} (removed)`];
  }

  const lines = [`  ~ ${entry.name}`];
  for (const change of entry.fieldChanges ?? []) {
    lines.push(`      ${change.field}: ${formatDiffValue(change.from)} -> ${formatDiffValue(change.to)}`);
  }
  return lines;
}
```

Note: `summarizeCounts` treats an "unchanged"-only group the same as zero creates/deletes (falls into the `${updates} change(s)` branch with `updates` counting only `action === "update"` entries) — since no adapter emits `"unchanged"` action entries in this plan (see Task 5's note on why), this is dead-but-harmless for now and intentionally forward-compatible with the `DiffAction` union already including `"unchanged"`.

- [ ] **Step 13: Run test to verify it passes**

Run: `pnpm test -- consoleFormatter.test.ts`
Expected: PASS.

- [ ] **Step 14: Run full verification and commit**

Run: `pnpm build && pnpm test && pnpm lint && pnpm typecheck`
Expected: all pass.

```bash
git add src/diffReport/
git commit -m "$(cat <<'EOF'
feat: add diff report collector, value formatter, and console formatter

Introduces the core reporting machinery (DiffCollector, formatDiffValue,
ConsoleDiffFormatter) with no sync module wired in yet. Task 5 onward
starts populating real diffs into a collector per instance.
EOF
)"
```

---

### Task 5: Wire the collector into `pipeline()`/`runArrType()`/`run()`; migrate `quality-definitions.ts`

**Files:**
- Modify: `src/index.ts` (imports, `pipeline()` signature/body, `runArrType()`, `run()`)
- Modify: `src/quality-definitions.ts` (change `changeMap` to `FieldChange[]`, add adapter)
- Test: `src/quality-definitions.test.ts`

**Interfaces:**
- Consumes: `DiffCollector`, `ConsoleDiffFormatter`, `InstanceDiffReport`, `FieldChange`, `DiffEntry` from Task 4/1.
- Produces: `calculateQualityDefinitionDiff(...)` now returns `{ changeMap: Map<string, FieldChange[]>; restData: MergedQualityDefinitionResource[] }` (was `Map<string, string[]>`). New: `qualityDefinitionsToDiffEntries(changeMap: Map<string, FieldChange[]>): DiffEntry[]`.
- Produces: `pipeline(globalConfig, instanceConfig, arrType, instanceName): Promise<InstanceDiffReport>` (was `Promise<void>`, no `instanceName` param). `runArrType(...)` now returns `Promise<{ status: { success: number; failure: number; skipped: number }; reports: InstanceDiffReport[] }>` (was `Promise<{success,failure,skipped}>` directly).

This task establishes the full plumbing that every later module migration (Tasks 6-10) plugs into: a `DiffCollector` created once per instance inside `pipeline()`, entries added via each module's adapter, one `InstanceDiffReport` returned per instance, printed to console immediately after each instance completes (same place/order as today's per-instance logs), and accumulated across all instances into `allReports` in `run()` for Task 11's JSON output.

- [ ] **Step 1: Convert `changeMap` to `FieldChange[]` and add the adapter in `src/quality-definitions.ts`**

Add the import at the top:

```ts
import { DiffEntry, FieldChange } from "./diffReport/diffReport.types";
```

Replace the body of `calculateQualityDefinitionDiff`'s per-quality loop (the `const changeMap = new Map<string, string[]>();` declaration and the four `changes.push(...)` prose lines):

```ts
  const changeMap = new Map<string, FieldChange[]>();
```

```ts
    if (serverQuality) {
      const newData = cloneWithJSON(serverQuality);

      const changes: FieldChange[] = [];

      if (clonedQuality.min != null && serverQuality.minSize !== clonedQuality.min) {
        changes.push({ field: "minSize", from: serverQuality.minSize, to: clonedQuality.min });
        newData.minSize = clonedQuality.min;
      }
      if (clonedQuality.max != null && serverQuality.maxSize !== clonedQuality.max) {
        changes.push({ field: "maxSize", from: serverQuality.maxSize, to: clonedQuality.max });
        newData.maxSize = clonedQuality.max;
      }

      if (clonedQuality.preferred && serverQuality.preferredSize !== clonedQuality.preferred) {
        changes.push({ field: "preferredSize", from: serverQuality.preferredSize, to: clonedQuality.preferred });
        newData.preferredSize = clonedQuality.preferred;
      }

      if (clonedQuality.title && serverQuality.title !== clonedQuality.title) {
        changes.push({ field: "title", from: serverQuality.title, to: clonedQuality.title });
        newData.title = clonedQuality.title;
      }

      if (changes.length > 0) {
        changeMap.set(serverQuality.quality!.name!, changes);
        restData.push(newData);
      } else {
        restData.push(serverQuality);
      }
    } else {
```

Add the adapter at the end of the file:

```ts
export function qualityDefinitionsToDiffEntries(changeMap: Map<string, FieldChange[]>): DiffEntry[] {
  return Array.from(changeMap.entries()).map(([name, fieldChanges]) => ({
    resourceType: "QualityDefinitions",
    name,
    action: "update" as const,
    fieldChanges,
  }));
}
```

- [ ] **Step 2: Write failing tests for the structured shape and the new adapter**

Add to `src/quality-definitions.test.ts` (add `qualityDefinitionsToDiffEntries` to the existing import from `./quality-definitions`):

```ts
  test("calculateQualityDefinitionDiff - min size diff produces a structured FieldChange", async ({}) => {
    const clone: TrashQualityDefinition = JSON.parse(JSON.stringify(client));
    clone.qualities[0]!.min = 3;

    const result = calculateQualityDefinitionDiff(server, clone.qualities);

    expect(result.changeMap.get("SDTV")).toEqual([{ field: "minSize", from: 2, to: 3 }]);
  });

  test("qualityDefinitionsToDiffEntries - converts a changeMap into DiffEntry[]", () => {
    const changeMap = new Map([["SDTV", [{ field: "minSize", from: 2, to: 3 }]]]);

    const entries = qualityDefinitionsToDiffEntries(changeMap);

    expect(entries).toEqual([
      { resourceType: "QualityDefinitions", name: "SDTV", action: "update", fieldChanges: [{ field: "minSize", from: 2, to: 3 }] },
    ]);
  });
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test -- quality-definitions.test.ts`
Expected: FAIL — `qualityDefinitionsToDiffEntries` doesn't exist yet, and `changeMap.get("SDTV")` still returns a prose string array.

- [ ] **Step 4: Run test to verify it passes** (implementation already written in Step 1)

Run: `pnpm test -- quality-definitions.test.ts`
Expected: PASS — all existing tests (`changeMap.size`, `restData.length`) plus the two new tests pass.

- [ ] **Step 5: Wire the collector into `src/index.ts`**

Add imports:

```ts
import { DiffCollector } from "./diffReport/diffCollector";
import { ConsoleDiffFormatter } from "./diffReport/formatters/consoleFormatter";
import { InstanceDiffReport } from "./diffReport/diffReport.types";
```

Change the `quality-definitions` import to include the new adapter:

```ts
import { calculateQualityDefinitionDiff, loadQualityDefinitionFromServer, qualityDefinitionsToDiffEntries } from "./quality-definitions";
```

Change the `pipeline` signature (currently `const pipeline = async (globalConfig: InputConfigSchema, instanceConfig: InputConfigArrInstance, arrType: ArrType) => {`) to:

```ts
const pipeline = async (
  globalConfig: InputConfigSchema,
  instanceConfig: InputConfigArrInstance,
  arrType: ArrType,
  instanceName: string,
): Promise<InstanceDiffReport> => {
```

Immediately after the `const api = getUnifiedClient();` line at the top of `pipeline()`, add:

```ts
  const diffCollector = new DiffCollector();
```

At the very end of `pipeline()` (replacing the function's final closing, i.e. after the "Sync remote path mappings" block and before the function's closing `};`), add:

```ts
  return { arrType, instanceName, entries: diffCollector.getEntries() };
};
```

(This replaces the bare `};` that currently closes `pipeline`.)

Inside the quality-definitions block, wire the adapter into the collector:

```ts
    const { changeMap, restData } = calculateQualityDefinitionDiff(serverCache.qd, mergedQDs);

    if (changeMap.size > 0) {
      diffCollector.add(qualityDefinitionsToDiffEntries(changeMap));

      if (getEnvs().DRY_RUN) {
        logger.info("DryRun: Would update QualityDefinitions.");
      } else {
        logger.info(`Diffs in quality definitions found ${changeMap.values()}`);
        await api.updateQualityDefinitions(restData);
        // refresh QDs
        serverCache.qd = await loadQualityDefinitionFromServer();
        logger.info(`Updated QualityDefinitions`);
      }
    } else {
      logger.info(`QualityDefinitions do not need update!`);
    }
```

- [ ] **Step 6: Update `runArrType` to consume and print the report**

Change:

```ts
const runArrType = async (
  arrType: ArrType,
  globalConfig: InputConfigSchema,
  arrEntry: Record<string, InputConfigArrInstance> | undefined,
) => {
  const status = {
    success: 0,
    failure: 0,
    skipped: 0,
  };

  if (!arrEntry || typeof arrEntry !== "object" || Object.keys(arrEntry).length === 0) {
    logHeading(`No ${arrType} instances defined.`);
    return status;
  }

  logHeading(`Processing ${arrType} ...`);

  for (const [instanceName, instance] of Object.entries(arrEntry)) {
    logInstanceHeading(`Processing ${arrType} Instance: ${instanceName} ...`);

    if (instance.enabled === false) {
      logger.info(`Instance ${arrType} - ${instanceName} is disabled!`);
      status.skipped++;
      continue;
    }

    try {
      await configureApi(arrType, instance.base_url, instance.api_key);
      await pipeline(globalConfig, instance, arrType);
      status.success++;
    } catch (err: any) {
```

to:

```ts
const runArrType = async (
  arrType: ArrType,
  globalConfig: InputConfigSchema,
  arrEntry: Record<string, InputConfigArrInstance> | undefined,
) => {
  const status = {
    success: 0,
    failure: 0,
    skipped: 0,
  };
  const reports: InstanceDiffReport[] = [];

  if (!arrEntry || typeof arrEntry !== "object" || Object.keys(arrEntry).length === 0) {
    logHeading(`No ${arrType} instances defined.`);
    return { status, reports };
  }

  logHeading(`Processing ${arrType} ...`);

  for (const [instanceName, instance] of Object.entries(arrEntry)) {
    logInstanceHeading(`Processing ${arrType} Instance: ${instanceName} ...`);

    if (instance.enabled === false) {
      logger.info(`Instance ${arrType} - ${instanceName} is disabled!`);
      status.skipped++;
      continue;
    }

    try {
      await configureApi(arrType, instance.base_url, instance.api_key);
      const report = await pipeline(globalConfig, instance, arrType, instanceName);
      new ConsoleDiffFormatter().format(report);
      reports.push(report);
      status.success++;
    } catch (err: any) {
```

The rest of the `catch`/`finally` block and the trailing `logger.info("");` inside the loop are unchanged. Change the function's final `return status;` to `return { status, reports };`.

- [ ] **Step 7: Update `run()` to accumulate reports across all *arr types**

Change:

```ts
  const totalStatus: string[] = [];

  const disabledArrs: string[] = [];
```

to:

```ts
  const totalStatus: string[] = [];

  const disabledArrs: string[] = [];

  const allReports: InstanceDiffReport[] = [];
```

Change:

```ts
  for (const { type, enabled, config } of arrTypes) {
    if (enabled == null || enabled) {
      const result = await runArrType(type as ArrType, globalConfig, config);
      totalStatus.push(`${type}: (${result.success}/${result.failure}/${result.skipped})`);
    } else {
```

to:

```ts
  for (const { type, enabled, config } of arrTypes) {
    if (enabled == null || enabled) {
      const result = await runArrType(type as ArrType, globalConfig, config);
      totalStatus.push(`${type}: (${result.status.success}/${result.status.failure}/${result.status.skipped})`);
      allReports.push(...result.reports);
    } else {
```

`allReports` is not consumed yet in this task (Task 11 adds the JSON write that reads it) — it is referenced via `.push(...)` so it compiles cleanly under the `noUnusedLocals`-style lint rules already in place; there is no dead-code warning to suppress.

- [ ] **Step 8: Run full verification**

Run: `pnpm build && pnpm test && pnpm lint && pnpm typecheck`
Expected: all pass. There is no `index.test.ts`, so this task's correctness for the plumbing itself is confirmed by successful compilation/lint plus the passing `quality-definitions.test.ts`; full behavioral confirmation happens in Task 12's live Docker run.

- [ ] **Step 9: Commit**

```bash
git add src/index.ts src/quality-definitions.ts src/quality-definitions.test.ts
git commit -m "$(cat <<'EOF'
feat: wire per-instance diff collection into the sync pipeline

pipeline() now creates a DiffCollector, returns an InstanceDiffReport,
and index.ts prints it via ConsoleDiffFormatter right after each
instance completes - replacing the old scattered per-step DryRun log
lines for QualityDefinitions with real field-level detail. Reports are
also accumulated across all instances for the JSON formatter (Task 11).
EOF
)"
```

---

### Task 6: Migrate `quality-profiles.ts` — expose the previously-dead `changeList`

**Files:**
- Modify: `src/quality-profiles.ts`
- Modify: `src/index.ts`
- Test: `src/quality-profiles.test.ts`

**Interfaces:**
- Consumes: `FieldChange`, `DiffEntry` (Task 1), `DiffCollector` (already wired into `pipeline()` by Task 5).
- Produces: `calculateQualityProfilesDiff(...)` now returns `{ changedQPs, create, noChanges, changes: Map<string, FieldChange[]> }` (added `changes` — the previously write-only `changes` map, per the spec's "Prerequisite" analysis, is now actually returned). New: `qualityProfilesToDiffEntries(create: MergedQualityProfileResource[], changedQPs: MergedQualityProfileResource[], changes: Map<string, FieldChange[]>): DiffEntry[]`.

The function already built a `changes = new Map<string, string[]>()` and populated it with a `changeList` per profile — for both the managed loop (`qpMerged`) and the unmanaged-QP loop — but never returned it or read it back; this task converts the prose pushes to structured `FieldChange` pushes and finally returns the map.

- [ ] **Step 1: Add the `FieldChange`/`DiffEntry` import**

Add to the top of `src/quality-profiles.ts`:

```ts
import { DiffEntry, FieldChange } from "./diffReport/diffReport.types";
```

- [ ] **Step 2: Convert the managed-QP loop's `changeList: string[]` to `fieldChanges: FieldChange[]`**

Replace (around line 424):

```ts
    const changeList: string[] = [];
    changes.set(serverMatch.name!, changeList);
```

with:

```ts
    const fieldChanges: FieldChange[] = [];
    changes.set(serverMatch.name!, fieldChanges);
```

Then replace each of the following `changeList.push(...)` prose calls in that same loop with their structured equivalent (all still under the same `if`/`else` conditions they already sit in — only the pushed value changes):

| Old | New |
| --- | --- |
| `changeList.push(\`QualityProfile quality order does not match\`);` | `fieldChanges.push({ field: "items", from: serverMatch.items, to: mappedQualities });` |
| `changeList.push(\`MinFormatScore diff: server: ${serverMatch.minFormatScore} - expected: ${value.min_format_score}\`);` | `fieldChanges.push({ field: "minFormatScore", from: serverMatch.minFormatScore, to: value.min_format_score });` |
| `changeList.push(\`UpgradeAllowed diff: server: ${serverMatch.upgradeAllowed} - expected: ${value.upgrade.allowed}\`);` | `fieldChanges.push({ field: "upgradeAllowed", from: serverMatch.upgradeAllowed, to: value.upgrade.allowed });` |
| `changeList.push(\`Upgrade until quality diff: server: ${serverMatch.cutoff} - expected: ${upgradeUntil}\`);` | `fieldChanges.push({ field: "cutoff", from: serverMatch.cutoff, to: upgradeUntil });` |
| `changeList.push(\`Upgrade until score diff: server: ${serverMatch.cutoffFormatScore} - expected: ${value.upgrade.until_score}\`);` | `fieldChanges.push({ field: "cutoffFormatScore", from: serverMatch.cutoffFormatScore, to: value.upgrade.until_score });` |
| `changeList.push(\`Min upgrade format score diff: server: ${serverMatch.cutoffFormatScore} - expected: ${configMinUpgradeFormatScore}\`);` | `fieldChanges.push({ field: "minUpgradeFormatScore", from: serverMatch.minUpgradeFormatScore, to: configMinUpgradeFormatScore });` |
| `changeList.push(\`Cutoff diff for upgrade disabled: server: ${serverMatch.cutoff} - expected: ${cutoffId}\`);` | `fieldChanges.push({ field: "cutoff", from: serverMatch.cutoff, to: cutoffId });` |
| `changeList.push(\`CutoffFormatScore diff for upgrade disabled: server: ${serverMatch.cutoffFormatScore} - expected: 1\`);` | `fieldChanges.push({ field: "cutoffFormatScore", from: serverMatch.cutoffFormatScore, to: 1 });` |
| `changeList.push(\`MinUpgradeFormatScore diff for upgrade disabled: server: ${serverMatch.minUpgradeFormatScore} - expected: 1\`);` | `fieldChanges.push({ field: "minUpgradeFormatScore", from: serverMatch.minUpgradeFormatScore, to: 1 });` |
| `changeList.push(\`Language diff: server: ${serverMatch.language?.name} - expected: ${profileLanguage?.name}\`);` | `fieldChanges.push({ field: "language", from: serverMatch.language?.name, to: profileLanguage?.name });` |
| `changeList.push(\`CF resetting score '${scoreValue.name}': server ${serverCF?.score} - client: 0\`);` (both occurrences — inside the scoring loop and the missing-CFs reduce) | `fieldChanges.push({ field: \`customFormats.${scoreValue.name}\`, from: serverCF?.score, to: 0 });` (use `cfName` instead of `scoreValue.name` in the missing-CFs occurrence, matching that block's variable name) |
| `changeList.push(\`CF diff ${scoreValue.name}: server: ${serverCF?.score} - expected: ${scoreValue.score}\`);` | `fieldChanges.push({ field: \`customFormats.${scoreValue.name}\`, from: serverCF?.score, to: scoreValue.score });` |

Note the `Min upgrade format score` fix: the original prose read `server: ${serverMatch.cutoffFormatScore}` even though the field actually being changed two lines later is `updatedServerObject.minUpgradeFormatScore` — a pre-existing copy-paste bug in the log message. The structured version above uses the correct `serverMatch.minUpgradeFormatScore` as `from`, fixing this incidentally.

Update the two `logger.debug` calls referencing `changeList.length` (around lines 588 and 598) to `fieldChanges.length` / `fieldChanges`.

- [ ] **Step 3: Convert the unmanaged-QP loop the same way**

Replace (around line 616):

```ts
    const changeList: string[] = [];
```

with:

```ts
    const fieldChanges: FieldChange[] = [];
    changes.set(unmanagedServerQp.name!, fieldChanges);
```

(This loop's `changeList` was never added to the `changes` map at all before — unmanaged QPs that get pushed into `changedQPs` via `scoringDiff` need their diffs discoverable the same way managed ones are.)

Replace:

```ts
            changeList.push(`CF diff '${scoreValue.name}': server: '${serverCF?.score}' - expected: '${scoreValue.score}'`);
```

with:

```ts
            fieldChanges.push({ field: `customFormats.${scoreValue.name}`, from: serverCF?.score, to: scoreValue.score });
```

Update the trailing `logger.debug` calls in this loop from `changeList` to `fieldChanges` the same way as Step 2.

- [ ] **Step 4: Return `changes` from `calculateQualityProfilesDiff` and add the adapter**

Change the function's return type annotation:

```ts
): Promise<{
  changedQPs: MergedQualityProfileResource[];
  create: MergedQualityProfileResource[];
  noChanges: string[];
  changes: Map<string, FieldChange[]>;
}> => {
```

Change the final `return` statement:

```ts
  return { create: createQPs, changedQPs: changedQPs, noChanges: noChangedQPs, changes };
```

Add the adapter at the end of the file:

```ts
export function qualityProfilesToDiffEntries(
  create: MergedQualityProfileResource[],
  changedQPs: MergedQualityProfileResource[],
  changes: Map<string, FieldChange[]>,
): DiffEntry[] {
  const entries: DiffEntry[] = create.map((qp) => ({
    resourceType: "QualityProfile",
    name: qp.name!,
    action: "create" as const,
  }));

  for (const qp of changedQPs) {
    entries.push({
      resourceType: "QualityProfile",
      name: qp.name!,
      action: "update",
      fieldChanges: changes.get(qp.name!) ?? [],
    });
  }

  return entries;
}
```

- [ ] **Step 5: Write failing tests for the newly-exposed diffs**

Add to `src/quality-profiles.test.ts` (add `qualityProfilesToDiffEntries` to the existing import from `./quality-profiles`):

```ts
  test("calculateQualityProfilesDiff - exposes minFormatScore diff as a structured FieldChange", async ({}) => {
    const cfMap: CFProcessing = { carrIdMapping: new Map(), cfNameToCarrConfig: new Map() };

    const fromConfig: ConfigQualityProfileItem[] = [{ name: "HDTV-1080p", enabled: false }];

    const resources: MergedQualityDefinitionResource[] = [
      { id: 1, title: "HDTV-1080p", weight: 2, quality: { id: 1, name: "HDTV-1080p" } },
    ];

    const profile: ConfigQualityProfile = {
      name: "hi",
      min_format_score: 2,
      qualities: fromConfig,
      quality_sort: "top",
      upgrade: { allowed: true, until_quality: "HDTV-1080p", until_score: 1000 },
      score_set: "default",
    };

    const config: MergedConfigInstance = {
      custom_formats: [],
      quality_profiles: [profile],
      customFormatDefinitions: [],
      media_management: {},
      media_naming: {},
    };

    const serverProfile = cloneWithJSON(sampleQualityProfile);
    serverProfile.name = "hi";
    serverProfile.formatItems = [];
    serverProfile.minUpgradeFormatScore = 3;
    serverProfile.minFormatScore = 3;
    serverProfile.cutoff = 1;
    serverProfile.items = [{ allowed: false, items: [], quality: { id: 1, name: "HDTV-1080p" } }];

    const serverQP: MergedQualityProfileResource[] = [serverProfile];
    const serverQD: MergedQualityDefinitionResource[] = resources;
    const serverCF: MergedCustomFormatResource[] = [cloneWithJSON(sampleCustomFormat)];

    const serverCache = new ServerCache(serverQD, serverQP, serverCF, []);

    const diff = await calculateQualityProfilesDiff("RADARR", cfMap, config, serverCache);

    const fieldChanges = diff.changes.get("hi");
    expect(fieldChanges).toContainEqual({ field: "minFormatScore", from: 3, to: 2 });
  });

  test("qualityProfilesToDiffEntries - builds create and update entries with field changes", () => {
    const create = [{ name: "NewProfile" } as MergedQualityProfileResource];
    const changedQPs = [{ name: "ExistingProfile" } as MergedQualityProfileResource];
    const changes = new Map([["ExistingProfile", [{ field: "minFormatScore", from: 0, to: 10 }]]]);

    const entries = qualityProfilesToDiffEntries(create, changedQPs, changes);

    expect(entries).toEqual([
      { resourceType: "QualityProfile", name: "NewProfile", action: "create" },
      {
        resourceType: "QualityProfile",
        name: "ExistingProfile",
        action: "update",
        fieldChanges: [{ field: "minFormatScore", from: 0, to: 10 }],
      },
    ]);
  });
```

- [ ] **Step 6: Run test to verify it fails, then implement (already done in Steps 1-4), then verify it passes**

Run: `pnpm test -- quality-profiles.test.ts`
Expected: first FAIL (`changes` is `undefined` on the returned diff, `qualityProfilesToDiffEntries` doesn't exist), then PASS after Steps 1-4's implementation is in place.

- [ ] **Step 7: Wire the adapter into `src/index.ts`**

Update the quality-profiles import to include the adapter:

```ts
import {
  calculateQualityProfilesDiff,
  checkForConflictingCFs,
  deleteQualityProfile,
  getUnmanagedQualityProfiles,
  loadQualityProfilesFromServer,
  qualityProfilesToDiffEntries,
} from "./quality-profiles";
```

Update the call site:

```ts
  // calculate diff from server <-> what we want to be there
  const { changedQPs, create, noChanges, changes: qpChanges } = await calculateQualityProfilesDiff(arrType, mergedCFs, config, serverCache);

  diffCollector.add(qualityProfilesToDiffEntries(create, changedQPs, qpChanges));
```

- [ ] **Step 8: Run full verification**

Run: `pnpm build && pnpm test && pnpm lint && pnpm typecheck`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add src/quality-profiles.ts src/quality-profiles.test.ts src/index.ts
git commit -m "$(cat <<'EOF'
feat: expose quality profile field-level diffs in the diff report

calculateQualityProfilesDiff built a changeList per profile (both
managed and unmanaged) into a `changes` map that was populated but
never returned or read - dead code. It's now returned as
Map<string, FieldChange[]> and surfaced through a new adapter into the
per-instance diff report.
EOF
)"
```

---

### Task 7: Migrate `custom-formats.ts`, `media-management.ts`, `uiConfigSyncer.ts`

**Files:**
- Modify: `src/custom-formats.ts` (`manageCf`, and the `delete_unmanaged_custom_formats` block in `index.ts`)
- Modify: `src/media-management.ts`
- Modify: `src/uiConfigs/uiConfigSyncer.ts`
- Modify: `src/uiConfigs/uiConfig.types.ts`
- Modify: `src/index.ts`
- Test: `src/custom-formats.test.ts`

**Interfaces:**
- Consumes: `FieldChange`, `DiffEntry` (Task 1), `DiffCollector` already created in `pipeline()` (Task 5).
- Produces: `manageCf(...)` return type gains `diffEntries: DiffEntry[]`. `UiConfigSyncResult` gains `fieldChanges: FieldChange[]`. New: `uiConfigDiffToDiffEntries(result: UiConfigSyncResult): DiffEntry[]`.

These three modules already produce `FieldChange[]` as of Task 1/2 (`compareCustomFormats`/`compareNaming`/`compareMediamanagement`/`compareObjectsCarr` all return the new shape) — this task is purely about capturing that data into `DiffEntry[]` and threading it into the collector; no comparison logic changes.

- [ ] **Step 1: Add `diffEntries` accumulation to `manageCf` in `src/custom-formats.ts`**

Add the import:

```ts
import { DiffEntry } from "./diffReport/diffReport.types";
```

Modify `manageCf`:

```ts
export const manageCf = async (cfProcessing: CFProcessing, serverCfs: Map<string, MergedCustomFormatResource>) => {
  const { cfNameToCarrConfig } = cfProcessing;
  const api = getUnifiedClient();

  let updatedCFs: MergedCustomFormatResource[] = [];
  let errorCFs: string[] = [];
  const validCFs: ConfigarrCF[] = [];
  let createCFs: MergedCustomFormatResource[] = [];
  const diffEntries: DiffEntry[] = [];

  const manageSingle = async (cfName: string, carrConfig: ConfigarrCF) => {
    const requestConfig = mapImportCfToRequestCf(carrConfig);
    const existingCf = serverCfs.get(cfName);

    if (existingCf) {
      // Update if necessary
      const comparison = compareCustomFormats(existingCf, requestConfig);

      if (!comparison.equal) {
        logger.debug(comparison.changes, `Found mismatch for ${requestConfig.name}`);
        diffEntries.push({ resourceType: "CustomFormat", name: requestConfig.name!, action: "update", fieldChanges: comparison.changes });

        try {
          if (getEnvs().DRY_RUN) {
            logger.info(`DryRun: Would update CF: ${existingCf.id} - ${existingCf.name}`);
            updatedCFs.push(existingCf);
          } else {
            const updatedCf = await api.updateCustomFormat(existingCf.id + "", {
              id: existingCf.id,
              ...requestConfig,
            });
            logger.debug(`Updated CF ${requestConfig.name}`);
            updatedCFs.push(updatedCf);
          }
        } catch (err: any) {
          const data = err?.response?.data;
          const dataMessage = typeof data === "object" ? (data?.message ?? data?.errorMessage) : data;
          const errorMessage = dataMessage ?? err?.message ?? String(err);
          logger.error(errorMessage, `Failed updating CF ${requestConfig.name}`);
          errorCFs.push(carrConfig.configarr_id ?? requestConfig.name ?? "unknown");
          throw new Error(`Failed updating CF '${requestConfig.name}'. Message: ${errorMessage}`, { cause: err });
        }
      } else {
        validCFs.push(carrConfig);
      }
    } else {
      // Create
      diffEntries.push({ resourceType: "CustomFormat", name: requestConfig.name!, action: "create" });

      try {
        if (getEnvs().DRY_RUN) {
          logger.info(`Would create CF: ${requestConfig.name}`);
        } else {
          const createResult = await api.createCustomFormat(requestConfig);
          logger.info(`Created CF ${requestConfig.name}`);
          createCFs.push(createResult);
          serverCfs.set(createResult.name!, createResult);
        }
      } catch (err: any) {
        const data = err?.response?.data;
        const dataMessage = typeof data === "object" ? (data?.message ?? data?.errorMessage) : data;
        const errorMessage = dataMessage ?? err?.message ?? String(err);
        logger.error(errorMessage, `Failed creating CF ${requestConfig.name}`);
        errorCFs.push(carrConfig.configarr_id ?? requestConfig.name ?? "unknown");
        throw new Error(`Failed creating CF '${requestConfig.name}'. Message: ${errorMessage}`, { cause: err });
      }
    }
  };

  for (const [cfName, carrConfig] of cfNameToCarrConfig) {
    await manageSingle(cfName, carrConfig);
  }

  if (validCFs.length > 0) {
    logger.debug(
      validCFs.map((e) => `${e.name}`),
      `CFs with no update:`,
    );
  }
  logger.info(
    `Created CFs: ${createCFs.length}, Updated CFs: ${updatedCFs.length}, Untouched CFs: ${validCFs.length}, Error CFs: ${errorCFs.length}`,
  );

  return { createCFs, updatedCFs, validCFs, errorCFs, diffEntries };
};
```

(Only the `diffEntries` declaration and its two `.push()` calls are new; every other line is unchanged from the current implementation.)

- [ ] **Step 2: Write failing tests for `diffEntries`**

Add to `src/custom-formats.test.ts`, inside a new `describe("manageCf - diffEntries", ...)` block:

```ts
  describe("manageCf - diffEntries", () => {
    it("emits a create DiffEntry for a new CF", async () => {
      vi.spyOn(env, "getEnvs").mockReturnValue({ DRY_RUN: false } as ReturnType<typeof env.getEnvs>);

      const carrConfig = { configarr_id: "id-a", name: "NewCF", specifications: [] } as unknown as ConfigarrCF;
      const requestConfig = util.mapImportCfToRequestCf(carrConfig);

      const cfProcessing: CFProcessing = {
        carrIdMapping: new Map([["id-a", { carrConfig, requestConfig }]]),
        cfNameToCarrConfig: new Map([[carrConfig.name!, carrConfig]]),
      };

      const serverCfs = new Map<string, MergedCustomFormatResource>();

      vi.spyOn(unifiedClient, "getUnifiedClient").mockReturnValue({
        createCustomFormat: vi.fn().mockResolvedValue({ id: 1, name: "NewCF", ...requestConfig }),
        updateCustomFormat: vi.fn(),
      } as unknown as ReturnType<typeof unifiedClient.getUnifiedClient>);

      const out = await manageCf(cfProcessing, serverCfs);

      expect(out.diffEntries).toEqual([{ resourceType: "CustomFormat", name: "NewCF", action: "create" }]);
    });

    it("emits an update DiffEntry with fieldChanges for a changed CF", async () => {
      vi.spyOn(env, "getEnvs").mockReturnValue({ DRY_RUN: true } as ReturnType<typeof env.getEnvs>);

      const specifications = [
        { name: "S0", implementation: "ReleaseGroupSpecification" as const, negate: false, required: false, fields: { value: "^(0)$" } },
      ];
      const carrConfig = { configarr_id: "id-a", name: "ChangedCF", specifications } as unknown as ConfigarrCF;
      const requestConfig = util.mapImportCfToRequestCf(carrConfig);

      const cfProcessing: CFProcessing = {
        carrIdMapping: new Map([["id-a", { carrConfig, requestConfig }]]),
        cfNameToCarrConfig: new Map([[carrConfig.name!, carrConfig]]),
      };

      const existingCf: MergedCustomFormatResource = JSON.parse(JSON.stringify({ id: 1, ...requestConfig }));
      existingCf.specifications[0].negate = true;
      const serverCfs = new Map<string, MergedCustomFormatResource>([["ChangedCF", existingCf]]);

      vi.spyOn(unifiedClient, "getUnifiedClient").mockReturnValue({
        createCustomFormat: vi.fn(),
        updateCustomFormat: vi.fn(),
      } as unknown as ReturnType<typeof unifiedClient.getUnifiedClient>);

      const out = await manageCf(cfProcessing, serverCfs);

      expect(out.diffEntries).toHaveLength(1);
      expect(out.diffEntries[0]!.resourceType).toBe("CustomFormat");
      expect(out.diffEntries[0]!.action).toBe("update");
      expect(out.diffEntries[0]!.fieldChanges).toContainEqual({ field: "specifications[0].negate", from: true, to: false });
    });
  });
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test -- custom-formats.test.ts -t "diffEntries"`
Expected: FAIL — `out.diffEntries` is `undefined` before Step 1's implementation.

- [ ] **Step 4: Run test to verify it passes** (implementation already written in Step 1)

Run: `pnpm test -- custom-formats.test.ts`
Expected: PASS — new tests plus all existing `custom-formats.test.ts` tests.

- [ ] **Step 5: Add adapters to `src/media-management.ts`**

Add the import:

```ts
import { DiffEntry, FieldChange } from "./diffReport/diffReport.types";
```

Add at the end of the file:

```ts
export function namingDiffToDiffEntries(namingDiff: { changes: FieldChange[] }): DiffEntry[] {
  return [{ resourceType: "MediaNaming", name: "MediaNaming", action: "update", fieldChanges: namingDiff.changes }];
}

export function mediamanagementDiffToDiffEntries(managementDiff: { changes: FieldChange[] }): DiffEntry[] {
  return [{ resourceType: "MediaManagement", name: "MediaManagement", action: "update", fieldChanges: managementDiff.changes }];
}
```

(`calculateNamingDiff`/`calculateMediamanagementDiff` already return `{ changes: FieldChange[]; updatedData }` as of Task 1's rework — no changes needed to those functions themselves. There is only ever one naming/management config per instance, hence the fixed name `"MediaNaming"`/`"MediaManagement"` rather than a per-item name.)

- [ ] **Step 6: Add `fieldChanges` to `UiConfigSyncResult` and the adapter in `src/uiConfigs/`**

Modify `src/uiConfigs/uiConfig.types.ts`:

```ts
import { ArrType } from "../types/common.types";
import { FieldChange } from "../diffReport/diffReport.types";

/**
 * Result of a UI config sync operation
 */
export interface UiConfigSyncResult {
  updated: boolean;
  arrType: ArrType;
  fieldChanges: FieldChange[];
}
```

Modify `src/uiConfigs/uiConfigSyncer.ts` — every existing `return { updated: ..., arrType }` gains a `fieldChanges` value:

```ts
export async function syncUiConfig(arrType: ArrType, uiConfig: UiConfigType | undefined): Promise<UiConfigSyncResult> {
  // If ui_config is undefined/not present, skip management entirely
  if (uiConfig === undefined) {
    logger.debug(`No UI config specified for ${arrType}`);
    return { updated: false, arrType, fieldChanges: [] };
  }

  try {
    // Get specific client for this arrType - TypeScript infers the correct type
    const client = getSpecificClient(arrType);

    // Fetch current server UI config
    logger.debug(`Fetching UI config from ${arrType}...`);
    const serverConfig = await client.getUiConfig();

    // Cast to generic record for comparison - generated types don't have index signatures
    const serverConfigRecord = serverConfig as Record<string, unknown>;

    // Calculate diff directly using compareObjectsCarr
    const { changes, equal } = compareObjectsCarr(serverConfigRecord, uiConfig);

    if (equal) {
      logger.info(`UI config for ${arrType} is already up-to-date`);
      return { updated: false, arrType, fieldChanges: [] };
    }

    logger.info(`UI config changes detected for ${arrType}: ${changes.length} differences`);
    logger.debug(changes, `UI config changes for ${arrType}`);

    // Respect dry-run mode
    if (getEnvs().DRY_RUN) {
      logger.info(`DryRun: Would update UI config for ${arrType}`);
      return { updated: true, arrType, fieldChanges: changes };
    }

    // Validate server config has required id field
    if (!hasValidId(serverConfigRecord)) {
      throw new Error(`UI config for ${arrType} is missing required 'id' field`);
    }

    // Execute update - merge server config with local config
    const updatedConfig = {
      ...serverConfig,
      ...uiConfig,
    };

    await client.updateUiConfig(serverConfigRecord.id.toString(), updatedConfig);
    logger.info(`Successfully updated UI config for ${arrType}`);
    return { updated: true, arrType, fieldChanges: changes };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to sync UI config for ${arrType}: ${errorMessage}`);
    throw new Error(`UI config sync failed for ${arrType}: ${errorMessage}`);
  }
}

export function uiConfigDiffToDiffEntries(result: UiConfigSyncResult): DiffEntry[] {
  if (!result.updated) {
    return [];
  }
  return [{ resourceType: "UiConfig", name: result.arrType, action: "update", fieldChanges: result.fieldChanges }];
}
```

Add `DiffEntry` to the existing `uiConfigSyncer.ts` imports:

```ts
import { DiffEntry } from "../diffReport/diffReport.types";
```

- [ ] **Step 7: Wire all three adapters into `src/index.ts`**

Update the `custom-formats` import:

```ts
import { calculateCFsToManage, deleteCustomFormat, loadCustomFormatDefinitions, loadServerCustomFormats, manageCf } from "./custom-formats";
```

stays the same (no new export name needed — `manageCf`'s return value already carries `diffEntries`); update the `media-management` import:

```ts
import { calculateMediamanagementDiff, calculateNamingDiff, mediamanagementDiffToDiffEntries, namingDiffToDiffEntries } from "./media-management";
```

update the `uiConfigs` import:

```ts
import { syncUiConfig, uiConfigDiffToDiffEntries } from "./uiConfigs/uiConfigSyncer";
```

Update the `cfUpdateResult` call site:

```ts
  const cfUpdateResult = await manageCf(mergedCFs, serverCFMapping);
  diffCollector.add(cfUpdateResult.diffEntries);
```

Update the `delete_unmanaged_custom_formats` block to report deletions (both DRY_RUN and real run report the same intended deletions):

```ts
    if (cfsToDelete.length > 0) {
      diffCollector.add(cfsToDelete.map((e) => ({ resourceType: "CustomFormat", name: e.name!, action: "delete" as const })));

      if (getEnvs().DRY_RUN) {
        logger.info(`DryRun: Would delete CF: ${cfsToDelete.map((e) => e.name).join(", ")}`);
      } else {
        logger.info(`Deleting ${cfsToDelete.length} CustomFormats ...`);
        logger.debug(
          cfsToDelete.map((e) => e.name),
          `This CustomFormats will be deleted:`,
        );

        for (const element of cfsToDelete) {
          await deleteCustomFormat(element);
        }
      }
    }
```

Update the naming/management diff blocks:

```ts
  const namingDiff = await calculateNamingDiff(config.media_naming_api);

  if (namingDiff) {
    diffCollector.add(namingDiffToDiffEntries(namingDiff));

    if (getEnvs().DRY_RUN) {
      logger.info("DryRun: Would update MediaNaming.");
    } else {
      // TODO this will need a radarr/sonarr separation for sure to have good and correct typings
      await api.updateNaming(namingDiff.updatedData.id! + "", namingDiff.updatedData as any); // Ignore types
      logger.info(`Updated MediaNaming`);
    }
  }

  const managementDiff = await calculateMediamanagementDiff(config.media_management);

  if (managementDiff) {
    diffCollector.add(mediamanagementDiffToDiffEntries(managementDiff));

    if (getEnvs().DRY_RUN) {
      logger.info("DryRun: Would update MediaManagement.");
    } else {
      // TODO this will need a radarr/sonarr separation for sure to have good and correct typings
      await api.updateMediamanagement(managementDiff.updatedData.id! + "", managementDiff.updatedData as any); // Ignore types
      logger.info(`Updated MediaManagement`);
    }
  }

  const uiConfigResult = await syncUiConfig(arrType, config.ui_config);
  diffCollector.add(uiConfigDiffToDiffEntries(uiConfigResult));
```

(The last line replaces the current `await syncUiConfig(arrType, config.ui_config);` which discarded the return value entirely.)

- [ ] **Step 8: Run full verification**

Run: `pnpm build && pnpm test && pnpm lint && pnpm typecheck`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add src/custom-formats.ts src/custom-formats.test.ts src/media-management.ts src/uiConfigs/uiConfig.types.ts src/uiConfigs/uiConfigSyncer.ts src/index.ts
git commit -m "$(cat <<'EOF'
feat: report custom format, media management, and UI config diffs

manageCf, calculateNamingDiff/calculateMediamanagementDiff, and
syncUiConfig already computed structured FieldChange data internally
(directly or via compareObjectsCarr) - it just wasn't captured
anywhere. Each now surfaces it through a small adapter into the
per-instance diff report; syncUiConfig's return value in particular
was previously discarded outright.
EOF
)"
```

---

### Task 8: Migrate `rootFolder`, `metadataProfiles`, `downloadClients`, `downloadClientConfig`

**Files:**
- Modify: `src/rootFolder/rootFolder.types.ts`, `src/rootFolder/rootFolderBase.ts`, `src/rootFolder/rootFolderLidarr.ts`, `src/rootFolder/rootFolderReadarr.ts`, `src/rootFolder/rootFolderSyncer.ts`
- Modify: `src/metadataProfiles/metadataProfile.types.ts`, `src/metadataProfiles/metadataProfileBase.ts`, `src/metadataProfiles/metadataProfileLidarr.ts`, `src/metadataProfiles/metadataProfileReadarr.ts`
- Modify: `src/types/download-client.types.ts`, `src/downloadClients/downloadClientGeneric.ts`, `src/downloadClients/downloadClientBase.ts`
- Modify: `src/downloadClientConfig/downloadClientConfig.types.ts`, `src/downloadClientConfig/downloadClientConfigSyncer.ts`
- Modify: `src/index.ts`
- Test: `src/rootFolder/rootFolderLidarr.test.ts`, `src/metadataProfiles/metadataProfileReadarr.test.ts`, `src/downloadClients/downloadClientGeneric.test.ts`, `src/downloadClientConfig/downloadClientConfigSyncer.test.ts`

This is the largest task: four modules where `{config, server}` pairs exist internally but no field-level diff is captured or returned. In every case the fix follows the same shape — the class already computes a boolean "is this different" answer; it's changed to also return *which* fields differ, computed at the same place (no re-fetching, no calling `resolveConfig` twice).

**Interfaces:**
- Consumes: `FieldChange`, `DiffEntry` (Task 1), `compareObjectsCarr` (Task 1's fixed version), `DiffCollector` (already wired in `pipeline()`).
- Produces: `RootFolderDiff.changed[].fieldChanges: FieldChange[]`, `RootFolderSyncResult.diffEntries: DiffEntry[]`, `rootFolderDiffToDiffEntries(diff: RootFolderDiff): DiffEntry[]`. `MetadataProfileDiff.changed[].fieldChanges: FieldChange[]`, `MetadataProfileSyncResult.diffEntries: DiffEntry[]`, `metadataProfileDiffToDiffEntries(diff: MetadataProfileDiff): DiffEntry[]`. `DownloadClientDiff.update[].fieldChanges: FieldChange[]`, `DownloadClientSyncResult.diffEntries: DiffEntry[]`, `downloadClientDiffToDiffEntries(diff: DownloadClientDiff, unmanagedToDelete: DownloadClientResource[]): DiffEntry[]`. `DownloadClientConfigSyncResult.fieldChanges: FieldChange[]`, `downloadClientConfigDiffToDiffEntries(result: DownloadClientConfigSyncResult): DiffEntry[]`.

#### 8a. Root folders

- [ ] **Step 1: Add `fieldChanges` to `RootFolderDiff.changed` and `diffEntries` to `RootFolderSyncResult`**

Modify `src/rootFolder/rootFolder.types.ts`:

```ts
import { InputConfigRootFolder } from "../types/config.types";
import { MergedRootFolderResource } from "../types/merged.types";
import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";

// Shared types for root folder operations
export interface RootFolderDiff<TConfig extends InputConfigRootFolder = InputConfigRootFolder> {
  missingOnServer: TConfig[];
  notAvailableAnymore: MergedRootFolderResource[];
  changed: Array<{ config: TConfig; server: MergedRootFolderResource; fieldChanges: FieldChange[] }>;
}

export interface RootFolderSyncResult {
  added: number;
  removed: number;
  updated: number;
  diffEntries: DiffEntry[];
}
```

- [ ] **Step 2: Update the two existing `calculateDiff` tests that assert on the whole result, and add one new test**

`src/rootFolder/rootFolderLidarr.test.ts` already has a `describe("calculateDiff", ...)` block (mocking `mockApi.getRootfolders`, with `loadQualityProfilesFromServer` and `mockApi.getMetadataProfiles` already mocked in `beforeEach`). Its two existing tests assert on the *entire* returned object via `toEqual({...})`, including `changed: [{ config, server }]` with no `fieldChanges` key — adding a required `fieldChanges` field to each `changed` entry will make both fail with an "unexpected property" mismatch. Replace both with equivalent per-field assertions (avoids hand-computing `compareObjectsCarr`'s exact key-enumeration order/output, while still proving real diffs are captured), and add one new test for the field-level content itself:

```ts
    it("should handle object root folders", async () => {
      mockApi.getRootfolders.mockResolvedValue(["/existing"]);

      const sync = new LidarrRootFolderSync();
      const result = await sync.calculateDiff(
        [
          { path: "/existing", name: "existing", metadata_profile: "Standard", quality_profile: "Any" },
          { path: "/new", name: "new", metadata_profile: "Standard", quality_profile: "Any" },
        ],
        serverCache,
      );

      expect(result?.missingOnServer).toEqual([{ path: "/new", name: "new", metadata_profile: "Standard", quality_profile: "Any" }]);
      expect(result?.notAvailableAnymore).toEqual([]);
      expect(result?.changed).toHaveLength(1);
      expect(result?.changed[0]?.config).toEqual({
        path: "/existing",
        name: "existing",
        metadata_profile: "Standard",
        quality_profile: "Any",
      });
      expect(result?.changed[0]?.server).toEqual("/existing");
      expect(result?.changed[0]?.fieldChanges.length).toBeGreaterThan(0);
    });

    it("should handle server returning objects", async () => {
      mockApi.getRootfolders.mockResolvedValue([
        { path: "/server-folder", id: 1, name: "Server Folder" },
        { path: "/old-server", id: 2, name: "Old Server" },
      ]);

      const sync = new LidarrRootFolderSync();
      const result = await sync.calculateDiff(
        [
          { path: "/server-folder", name: "Config Folder", metadata_profile: "Standard", quality_profile: "Any" },
          { path: "/new-config", name: "New Config", metadata_profile: "Standard", quality_profile: "Any" },
        ],
        serverCache,
      );

      expect(result?.missingOnServer).toEqual([{ path: "/new-config", name: "New Config", metadata_profile: "Standard", quality_profile: "Any" }]);
      expect(result?.notAvailableAnymore).toEqual([{ path: "/old-server", id: 2, name: "Old Server" }]);
      expect(result?.changed).toHaveLength(1);
      expect(result?.changed[0]?.config).toEqual({
        path: "/server-folder",
        name: "Config Folder",
        metadata_profile: "Standard",
        quality_profile: "Any",
      });
      expect(result?.changed[0]?.server).toEqual({ path: "/server-folder", id: 1, name: "Server Folder" });
      expect(result?.changed[0]?.fieldChanges.length).toBeGreaterThan(0);
    });

    it("exposes structured fieldChanges for a changed root folder", async () => {
      mockApi.getRootfolders.mockResolvedValue([
        { path: "/music", id: 1, name: "old-name", defaultQualityProfileId: 1, defaultMetadataProfileId: 10, defaultTags: [] },
      ]);

      const sync = new LidarrRootFolderSync();
      const result = await sync.calculateDiff(
        [{ path: "/music", name: "new-name", metadata_profile: "Standard", quality_profile: "Any" }],
        serverCache,
      );

      expect(result?.changed).toHaveLength(1);
      expect(result?.changed[0]?.fieldChanges).toContainEqual({ field: "name", from: "old-name", to: "new-name" });
    });
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test -- rootFolderLidarr.test.ts`
Expected: FAIL — the two updated tests fail because `changed[0].fieldChanges` doesn't exist yet (`compareRootFolderConfig` isn't implemented), and the new test fails the same way.

- [ ] **Step 4: Apply the identical existing-test fix to `src/rootFolder/rootFolderReadarr.test.ts`**

Its `describe("calculateDiff", ...)` block (lines 211-259) has the exact same two whole-object `toEqual` tests. Replace them the same way:

```ts
    it("should handle object root folders", async () => {
      mockApi.getRootfolders.mockResolvedValue(["/existing"]);

      const sync = new ReadarrRootFolderSync();
      const result = await sync.calculateDiff(
        [
          { path: "/existing", name: "existing", metadata_profile: "Standard", quality_profile: "eBook" },
          { path: "/new", name: "new", metadata_profile: "Standard", quality_profile: "eBook" },
        ],
        serverCache,
      );

      expect(result?.missingOnServer).toEqual([{ path: "/new", name: "new", metadata_profile: "Standard", quality_profile: "eBook" }]);
      expect(result?.notAvailableAnymore).toEqual([]);
      expect(result?.changed).toHaveLength(1);
      expect(result?.changed[0]?.config).toEqual({
        path: "/existing",
        name: "existing",
        metadata_profile: "Standard",
        quality_profile: "eBook",
      });
      expect(result?.changed[0]?.server).toEqual("/existing");
      expect(result?.changed[0]?.fieldChanges.length).toBeGreaterThan(0);
    });

    it("should handle server returning objects", async () => {
      mockApi.getRootfolders.mockResolvedValue([
        { path: "/server-folder", id: 1, name: "Server Folder" },
        { path: "/old-server", id: 2, name: "Old Server" },
      ]);

      const sync = new ReadarrRootFolderSync();
      const result = await sync.calculateDiff(
        [
          { path: "/server-folder", name: "Config Folder", metadata_profile: "Standard", quality_profile: "eBook" },
          { path: "/new-config", name: "New Config", metadata_profile: "Standard", quality_profile: "eBook" },
        ],
        serverCache,
      );

      expect(result?.missingOnServer).toEqual([{ path: "/new-config", name: "New Config", metadata_profile: "Standard", quality_profile: "eBook" }]);
      expect(result?.notAvailableAnymore).toEqual([{ path: "/old-server", id: 2, name: "Old Server" }]);
      expect(result?.changed).toHaveLength(1);
      expect(result?.changed[0]?.config).toEqual({
        path: "/server-folder",
        name: "Config Folder",
        metadata_profile: "Standard",
        quality_profile: "eBook",
      });
      expect(result?.changed[0]?.server).toEqual({ path: "/server-folder", id: 1, name: "Server Folder" });
      expect(result?.changed[0]?.fieldChanges.length).toBeGreaterThan(0);
    });
```

- [ ] **Step 5: Implement — convert `isRootFolderConfigEqual` to `compareRootFolderConfig` in `src/rootFolder/rootFolderLidarr.ts`**

Add the import:

```ts
import { FieldChange } from "../diffReport/diffReport.types";
```

Replace `isRootFolderConfigEqual`:

```ts
  private compareRootFolderConfig(
    resolvedConfig: RootFolderResource,
    serverFolder: RootFolderResource,
  ): { equal: boolean; changes: FieldChange[] } {
    // Only compare the configurable fields, filter out server-only fields like id, accessible, freeSpace, etc.
    const configFields = {
      name: resolvedConfig.name,
      path: resolvedConfig.path,
      defaultMetadataProfileId: resolvedConfig.defaultMetadataProfileId,
      defaultQualityProfileId: resolvedConfig.defaultQualityProfileId,
      defaultMonitorOption: resolvedConfig.defaultMonitorOption,
      defaultNewItemMonitorOption: resolvedConfig.defaultNewItemMonitorOption,
      defaultTags: resolvedConfig.defaultTags,
    };

    // For Lidarr, we know the server folder has the Lidarr-specific fields
    const lidarrServerFolder = serverFolder as RootFolderResource & {
      name?: string;
      defaultMetadataProfileId?: number;
      defaultQualityProfileId?: number;
      defaultMonitorOption?: string;
      defaultNewItemMonitorOption?: string;
      defaultTags?: number[];
    };

    const serverFields = {
      name: lidarrServerFolder.name,
      path: lidarrServerFolder.path,
      defaultMetadataProfileId: lidarrServerFolder.defaultMetadataProfileId,
      defaultQualityProfileId: lidarrServerFolder.defaultQualityProfileId,
      defaultMonitorOption: lidarrServerFolder.defaultMonitorOption,
      defaultNewItemMonitorOption: lidarrServerFolder.defaultNewItemMonitorOption,
      defaultTags: lidarrServerFolder.defaultTags,
    };

    return compareObjectsCarr(serverFields, configFields);
  }
```

Update `calculateDiff`'s `changed` array type and its population:

```ts
    const missingOnServer: InputConfigRootFolderLidarr[] = [];
    const notAvailableAnymore: RootFolderResource[] = [];
    const changed: Array<{ config: InputConfigRootFolderLidarr; server: RootFolderResource; fieldChanges: FieldChange[] }> = [];
```

```ts
      } else {
        // Folder exists, check if configuration matches
        const resolvedConfig = await this.resolveRootFolderConfig(configFolder, serverCache);
        const comparison = this.compareRootFolderConfig(
          resolvedConfig,
          typeof serverFolder === "string" ? { path: serverFolder } : serverFolder,
        );
        if (!comparison.equal) {
          changed.push({ config: configFolder, server: serverFolder, fieldChanges: comparison.changes });
        }
        // Remove from serverByPath so it won't be considered "not available anymore"
        serverByPath.delete(configPath);
      }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test -- rootFolderLidarr.test.ts`
Expected: PASS.

- [ ] **Step 7: Apply the identical change to `src/rootFolder/rootFolderReadarr.ts`**

Add the import:

```ts
import { FieldChange } from "../diffReport/diffReport.types";
```

Rename `isRootFolderConfigEqual` to `compareRootFolderConfig`, keeping its existing `configFields`/`serverFields` objects (including the Calibre fields) exactly as they are, and change only its final line and signature:

```ts
  private compareRootFolderConfig(
    resolvedConfig: RootFolderResource,
    serverFolder: RootFolderResource,
  ): { equal: boolean; changes: FieldChange[] } {
    // ... (configFields / serverFields objects unchanged from the current implementation, including Calibre fields) ...
    return compareObjectsCarr(serverFields, configFields);
  }
```

Update `calculateDiff` the same way as Step 4:

```ts
    const missingOnServer: InputConfigRootFolderReadarr[] = [];
    const notAvailableAnymore: RootFolderResource[] = [];
    const changed: Array<{ config: InputConfigRootFolderReadarr; server: RootFolderResource; fieldChanges: FieldChange[] }> = [];
```

```ts
      } else {
        // Folder exists, check if configuration matches
        const resolvedConfig = await this.resolveRootFolderConfig(configFolder, serverCache);
        const comparison = this.compareRootFolderConfig(
          resolvedConfig,
          typeof serverFolder === "string" ? { path: serverFolder } : serverFolder,
        );
        if (!comparison.equal) {
          changed.push({ config: configFolder, server: serverFolder, fieldChanges: comparison.changes });
        }
        // Remove from serverByPath so it won't be considered "not available anymore"
        serverByPath.delete(configPath);
      }
```

- [ ] **Step 8: Add the adapter and wire `diffEntries` into `BaseRootFolderSync.syncRootFolders` in `src/rootFolder/rootFolderBase.ts`**

Add the import:

```ts
import { DiffEntry } from "../diffReport/diffReport.types";
import { InputConfigRootFolder } from "../types/config.types";
```

(the second import already exists — only `DiffEntry` is new)

Add the adapter function (module-level, above or below the class):

```ts
export function rootFolderDiffToDiffEntries(diff: RootFolderDiff): DiffEntry[] {
  const entries: DiffEntry[] = diff.missingOnServer.map((folder) => ({
    resourceType: "RootFolder",
    name: typeof folder === "string" ? folder : (folder.path ?? "unknown"),
    action: "create" as const,
  }));

  for (const { config, server, fieldChanges } of diff.changed) {
    entries.push({
      resourceType: "RootFolder",
      name: typeof config === "string" ? config : (config.path ?? server.path ?? "unknown"),
      action: "update",
      fieldChanges,
    });
  }

  entries.push(
    ...diff.notAvailableAnymore.map((folder) => ({
      resourceType: "RootFolder",
      name: folder.path ?? "unknown",
      action: "delete" as const,
    })),
  );

  return entries;
}
```

Update `syncRootFolders`:

```ts
  async syncRootFolders(rootFolders: TConfig[], serverCache: ServerCache): Promise<RootFolderSyncResult> {
    const diff = await this.calculateDiff(rootFolders, serverCache);

    if (!diff) {
      return { added: 0, removed: 0, updated: 0, diffEntries: [] };
    }

    const diffEntries = rootFolderDiffToDiffEntries(diff);

    if (getEnvs().DRY_RUN) {
      this.logger.info("DryRun: Would update RootFolders.");
      return { added: diff.missingOnServer.length, removed: diff.notAvailableAnymore.length, updated: diff.changed.length, diffEntries };
    }

    let added = 0,
      removed = 0,
      updated = 0;

    // Remove folders not in config
    for (const folder of diff.notAvailableAnymore) {
      this.logger.info(`Deleting RootFolder not available anymore: ${folder.path}`);
      await this.api.deleteRootFolder(`${folder.id}`);
      removed++;
    }

    // Add missing folders
    for (const folder of diff.missingOnServer) {
      this.logger.info(`Adding RootFolder missing on server: ${typeof folder === "string" ? folder : folder.path}`);
      const resolvedConfig = await this.resolveRootFolderConfig(folder, serverCache);
      await this.api.addRootFolder(resolvedConfig);
      added++;
    }

    // Update changed folders
    for (const { config, server } of diff.changed) {
      this.logger.info(`Updating RootFolder: ${typeof config === "string" ? config : config.path}`);
      const resolvedConfig = await this.resolveRootFolderConfig(config, serverCache);
      await this.api.updateRootFolder(`${server.id}`, resolvedConfig);
      updated++;
    }

    if (added > 0 || removed > 0 || updated > 0) {
      this.logger.info(`Updated RootFolders: +${added} -${removed} ~${updated}`);
    }

    return { added, removed, updated, diffEntries };
  }
```

- [ ] **Step 9: Update the `!rootFolders` early return in `src/rootFolder/rootFolderSyncer.ts`**

```ts
export async function syncRootFolders(
  arrType: ArrType,
  rootFolders: InputConfigRootFolder[] | undefined,
  serverCache: ServerCache,
): Promise<RootFolderSyncResult> {
  if (!rootFolders) {
    return { added: 0, removed: 0, updated: 0, diffEntries: [] };
  }

  const sync = createRootFolderSync(arrType);
  return sync.syncRootFolders(rootFolders, serverCache);
}
```

- [ ] **Step 10: Run full verification for root folders**

Run: `pnpm test -- rootFolder`
Expected: PASS — all existing rootFolder tests plus the new one from Step 2.

#### 8b. Metadata profiles

- [ ] **Step 11: Add `fieldChanges` to `MetadataProfileDiff.changed` and `diffEntries` to `MetadataProfileSyncResult`**

Modify `src/metadataProfiles/metadataProfile.types.ts`:

```ts
import { InputConfigMetadataProfile } from "../types/config.types";
import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";

// Common interface for all metadata profile resources
// All metadata profiles must have at least id and name
export interface BaseMetadataProfileResource {
  id?: number;
  name?: string | null;
}

// Shared types for metadata profile operations
// Generic type T represents the specific MetadataProfileResource type (Lidarr, Readarr, etc.)
export interface MetadataProfileDiff<T extends BaseMetadataProfileResource = any> {
  missingOnServer: InputConfigMetadataProfile[];
  changed: Array<{ config: InputConfigMetadataProfile; server: T; fieldChanges: FieldChange[] }>;
  noChanges: T[];
}

export interface MetadataProfileSyncResult {
  added: number;
  removed: number;
  updated: number;
  diffEntries: DiffEntry[];
}
```

- [ ] **Step 12: Fix the existing whole-object `toEqual` test in `src/metadataProfiles/metadataProfileReadarr.test.ts`**

Its `"should detect configuration changes"` test (lines 181-204) asserts `toEqual({ missingOnServer, noChanges, changed: [{ config, server: serverProfile }] })`. `ReadarrMetadataProfileSync`'s comparison logic already funnels straight through `compareObjectsCarr` unchanged (Step 14 below only makes it also capture `.changes`), so the exact resulting `fieldChanges` can be predicted precisely here (unlike the Lidarr per-category case) — no need to relax this one to a looser assertion. Replace:

```ts
      const result = await sync.calculateDiff([config], serverCache);

      expect(result?.missingOnServer).toEqual([]);
      expect(result?.noChanges).toEqual([]);
      expect(result?.changed).toHaveLength(1);
      expect(result?.changed[0]?.config).toEqual(config);
      expect(result?.changed[0]?.server).toEqual(serverProfile);
      expect(result?.changed[0]?.fieldChanges).toEqual([
        { field: "minPopularity", from: 50, to: 75 },
        { field: "skipMissingDate", from: false, to: true },
      ]);
```

- [ ] **Step 13: Fix the existing whole-object `toEqual` test in `src/metadataProfiles/metadataProfileLidarr.test.ts`**

Its `"should detect changes when enabled types differ"` test (lines 301-329) has config `primary_types: ["Album", "EP"]` against a server where `EP` is `allowed: false` — a single-category mismatch. Replace the final assertion:

```ts
      const result = await sync.calculateDiff([config], serverCache);

      expect(result?.missingOnServer).toEqual([]);
      expect(result?.noChanges).toEqual([]);
      expect(result?.changed).toHaveLength(1);
      expect(result?.changed[0]?.config).toEqual(config);
      expect(result?.changed[0]?.server).toEqual(serverProfile);
      expect(result?.changed[0]?.fieldChanges).toEqual([{ field: "primaryAlbumTypes", from: ["Album"], to: ["Album", "EP"] }]);
```

- [ ] **Step 14: Run tests to verify they fail**

Run: `pnpm test -- metadataProfile`
Expected: FAIL — `changed[0].fieldChanges` doesn't exist yet on either subclass.

- [ ] **Step 15: Implement — `src/metadataProfiles/metadataProfileReadarr.ts` (the simple case)**

Add the import:

```ts
import { FieldChange } from "../diffReport/diffReport.types";
```

Replace `isConfigEqual` with `compareConfig`:

```ts
  private compareConfig(resolvedConfig: MetadataProfileResource, serverProfile: MetadataProfileResource): { equal: boolean; changes: FieldChange[] } {
    // Normalize both for comparison
    const normalizeForComparison = (profile: MetadataProfileResource) => {
      const rawIgnored = profile.ignored ?? [];
      const ignoredArray = Array.isArray(rawIgnored) ? rawIgnored : [String(rawIgnored)];

      const normalizedAllowed = this.normalizeReadarrAllowedLanguages(profile.allowedLanguages ?? null);

      return {
        name: profile.name ?? "",
        minPopularity: profile.minPopularity ?? 0,
        skipMissingDate: Boolean(profile.skipMissingDate),
        skipMissingIsbn: Boolean(profile.skipMissingIsbn),
        skipPartsAndSets: Boolean(profile.skipPartsAndSets),
        skipSeriesSecondary: Boolean(profile.skipSeriesSecondary),
        allowedLanguages: normalizedAllowed,
        minPages: profile.minPages ?? 0,
        ignored: ignoredArray.slice().sort(),
      };
    };

    const normalizedConfig = normalizeForComparison(resolvedConfig);
    const normalizedServer = normalizeForComparison(serverProfile);

    return compareObjectsCarr(normalizedServer, normalizedConfig);
  }
```

Update `calculateDiff`'s `changed` type and population:

```ts
    const missingOnServer: InputConfigMetadataProfile[] = [];
    const changed: Array<{ config: InputConfigMetadataProfile; server: MetadataProfileResource; fieldChanges: FieldChange[] }> = [];
    const noChanges: MetadataProfileResource[] = [];
```

```ts
      } else {
        // Profile exists, check if configuration matches
        const resolvedConfig = await this.resolveConfig(configProfile, serverCache);
        const comparison = this.compareConfig(resolvedConfig, serverProfile);
        if (!comparison.equal) {
          changed.push({ config: configProfile, server: serverProfile, fieldChanges: comparison.changes });
        } else {
          noChanges.push(serverProfile);
        }
        // Remove from serverByName so we know it was managed
        serverByName.delete(configProfile.name);
      }
```

- [ ] **Step 16: Implement — `src/metadataProfiles/metadataProfileLidarr.ts` (per-category comparison)**

Add the import:

```ts
import { FieldChange } from "../diffReport/diffReport.types";
```

Replace `isConfigEqual` with `compareConfig`, which keeps the exact same `normalizeForComparison` helper and enabled-set building, but instead of early-returning `false` on the first differing category, compares each category's *sorted enabled-name list* as a whole and pushes one `FieldChange` per differing category (matching the spec's accepted "whole-array replacement" fallback for collection-shaped fields):

```ts
  private compareConfig(
    resolvedConfig: MetadataProfileResource,
    serverProfile: MetadataProfileResource,
    originalConfig: InputConfigLidarrMetadataProfile,
  ): { equal: boolean; changes: FieldChange[] } {
    const normalizeForComparison = (profile: MetadataProfileResource) => {
      const extractName = (item: any): string => {
        // Handle both nested {albumType: {name: "X"}} and flat {albumType: "X"}
        if (typeof item === "string") return item;
        if (item?.name) return item.name;
        return "";
      };

      return {
        name: profile.name ?? "",
        primaryAlbumTypes:
          profile.primaryAlbumTypes
            ?.map((item) => ({
              name: extractName(item.albumType),
              allowed: item.allowed ?? false,
            }))
            .sort((a, b) => a.name.localeCompare(b.name)) ?? [],
        secondaryAlbumTypes:
          profile.secondaryAlbumTypes
            ?.map((item) => ({
              name: extractName(item.albumType),
              allowed: item.allowed ?? false,
            }))
            .sort((a, b) => a.name.localeCompare(b.name)) ?? [],
        releaseStatuses:
          profile.releaseStatuses
            ?.map((item) => ({
              name: extractName(item.releaseStatus),
              allowed: item.allowed ?? false,
            }))
            .sort((a, b) => a.name.localeCompare(b.name)) ?? [],
      };
    };

    const normalizedConfig = normalizeForComparison(resolvedConfig);
    const normalizedServer = normalizeForComparison(serverProfile);

    const enabledNames = (items: Array<{ name: string; allowed: boolean }>) =>
      items
        .filter((t) => t.allowed)
        .map((t) => t.name)
        .sort();

    const changes: FieldChange[] = [];

    const categories: Array<{
      field: string;
      enabled: boolean;
      server: Array<{ name: string; allowed: boolean }>;
      config: Array<{ name: string; allowed: boolean }>;
    }> = [
      { field: "primaryAlbumTypes", enabled: originalConfig.primary_types !== undefined, server: normalizedServer.primaryAlbumTypes, config: normalizedConfig.primaryAlbumTypes },
      { field: "secondaryAlbumTypes", enabled: originalConfig.secondary_types !== undefined, server: normalizedServer.secondaryAlbumTypes, config: normalizedConfig.secondaryAlbumTypes },
      { field: "releaseStatuses", enabled: originalConfig.release_statuses !== undefined, server: normalizedServer.releaseStatuses, config: normalizedConfig.releaseStatuses },
    ];

    for (const category of categories) {
      // Only compare a category if it's actually defined in config - matches the original
      // isConfigEqual behavior of leaving undefined-in-config categories untouched.
      if (!category.enabled) continue;

      const serverEnabled = enabledNames(category.server);
      const configEnabled = enabledNames(category.config);

      if (JSON.stringify(serverEnabled) !== JSON.stringify(configEnabled)) {
        changes.push({ field: category.field, from: serverEnabled, to: configEnabled });
      }
    }

    return { equal: changes.length === 0, changes };
  }
```

Update `calculateDiff`'s `changed` type and population:

```ts
    const missingOnServer: InputConfigMetadataProfile[] = [];
    const changed: Array<{ config: InputConfigMetadataProfile; server: MetadataProfileResource; fieldChanges: FieldChange[] }> = [];
    const noChanges: MetadataProfileResource[] = [];
```

```ts
      } else {
        // Profile exists, check if configuration matches
        // For comparison, create resolved config WITHOUT server data (simple structure)
        const lidarrConfig = configProfile as InputConfigLidarrMetadataProfile;
        const simpleResolvedConfig: MetadataProfileResource = {
          name: lidarrConfig.name,
          primaryAlbumTypes: lidarrConfig.primary_types?.map((typeName) => ({
            albumType: typeName as PrimaryAlbumType,
            allowed: true,
          })),
          secondaryAlbumTypes: lidarrConfig.secondary_types?.map((typeName) => ({
            albumType: typeName as SecondaryAlbumType,
            allowed: true,
          })),
          releaseStatuses: lidarrConfig.release_statuses?.map((statusName) => ({
            releaseStatus: statusName as ReleaseStatus,
            allowed: true,
          })),
        };

        const comparison = this.compareConfig(simpleResolvedConfig, serverProfile, lidarrConfig);
        if (!comparison.equal) {
          changed.push({ config: configProfile, server: serverProfile, fieldChanges: comparison.changes });
        } else {
          noChanges.push(serverProfile);
        }
        // Remove from serverByName so we know it was managed
        serverByName.delete(configProfile.name);
      }
```

- [ ] **Step 17: Run tests to verify they pass**

Run: `pnpm test -- metadataProfile`
Expected: PASS.

- [ ] **Step 18: Add the adapter and wire `diffEntries` into `BaseMetadataProfileSync` in `src/metadataProfiles/metadataProfileBase.ts`**

Add the import:

```ts
import { DiffEntry } from "../diffReport/diffReport.types";
```

Add the adapter function:

```ts
export function metadataProfileDiffToDiffEntries(diff: MetadataProfileDiff): DiffEntry[] {
  const entries: DiffEntry[] = diff.missingOnServer.map((profile) => ({
    resourceType: "MetadataProfile",
    name: profile.name,
    action: "create" as const,
  }));

  for (const { config, fieldChanges } of diff.changed) {
    entries.push({ resourceType: "MetadataProfile", name: config.name, action: "update", fieldChanges });
  }

  return entries;
}
```

Update `syncMetadataProfiles`, `performSync`, and `performDeletion` — deletion reporting is included too, for parity with root folders:

```ts
  async syncMetadataProfiles(config: MergedConfigInstance, serverCache: ServerCache): Promise<MetadataProfileSyncResult> {
    const profiles = config.metadata_profiles || [];
    const deleteConfig = config.delete_unmanaged_metadata_profiles;

    // Step 1: Perform sync (add/update)
    const { added, updated, diffEntries } = await this.performSync(profiles, serverCache);

    // Step 2: Handle deletion if requested
    let removed = 0;
    let deletionDiffEntries: DiffEntry[] = [];
    if (deleteConfig) {
      const deletionResult = await this.performDeletion(profiles, deleteConfig);
      removed = deletionResult.removed;
      deletionDiffEntries = deletionResult.diffEntries;
    }

    // Combine results
    const totalChanges = added + updated + removed;
    if (totalChanges > 0) {
      this.logger.info(`Updated MetadataProfiles: +${added} ~${updated} -${removed}`);
    }

    return {
      added,
      updated,
      removed,
      diffEntries: [...diffEntries, ...deletionDiffEntries],
    };
  }

  private async performSync(
    profiles: InputConfigMetadataProfile[],
    serverCache: ServerCache,
  ): Promise<{ added: number; updated: number; diffEntries: DiffEntry[] }> {
    const diff = await this.calculateDiff(profiles, serverCache);

    if (!diff) {
      return { added: 0, updated: 0, diffEntries: [] };
    }

    const diffEntries = metadataProfileDiffToDiffEntries(diff);

    if (getEnvs().DRY_RUN) {
      this.logger.info("DryRun: Would update MetadataProfiles.");
      return {
        added: diff.missingOnServer.length,
        updated: diff.changed.length,
        diffEntries,
      };
    }

    let added = 0,
      updated = 0;

    // Add missing profiles
    for (const profile of diff.missingOnServer) {
      this.logger.info(`Adding MetadataProfile missing on server: ${profile.name}`);
      const resolvedConfig = await this.resolveConfig(profile, serverCache);
      await this.createMetadataProfile(resolvedConfig);
      added++;
    }

    // Update changed profiles
    for (const { config, server } of diff.changed) {
      this.logger.info(`Updating MetadataProfile: ${config.name}`);
      const resolvedConfig = await this.resolveConfig(config, serverCache);
      await this.updateMetadataProfile(String(server.id), resolvedConfig);
      updated++;
    }

    return { added, updated, diffEntries };
  }
```

Update `performDeletion`'s return type and add the diff entries for deleted profiles (found the same way the existing deletion logic already finds them — no new lookups):

```ts
  private async performDeletion(
    managedProfiles: InputConfigMetadataProfile[],
    deleteConfig: NonNullable<MergedConfigInstance["delete_unmanaged_metadata_profiles"]>,
  ): Promise<{ removed: number; diffEntries: DiffEntry[] }> {
    const shouldDelete = deleteConfig.enabled;

    if (!shouldDelete) {
      return { removed: 0, diffEntries: [] };
    }

    const ignoreList = deleteConfig.ignore ?? [];
    const serverProfiles = await this.loadFromServer();
    const managedNames = new Set(managedProfiles.map((p) => p.name));
    const ignoreSet = new Set(ignoreList);

    // Always ignore the built-in 'None' metadata profile by default (e.g. Readarr, Lidarr).
    ignoreSet.add("None");

    const toDelete = serverProfiles.filter((p: any) => p.name && !managedNames.has(p.name) && !ignoreSet.has(p.name));

    if (toDelete.length === 0) {
      return { removed: 0, diffEntries: [] };
    }

    const diffEntries: DiffEntry[] = toDelete.map((p: any) => ({
      resourceType: "MetadataProfile",
      name: p.name,
      action: "delete" as const,
    }));

    if (getEnvs().DRY_RUN) {
      this.logger.info(
        `DryRun: Would delete ${toDelete.length} unmanaged MetadataProfiles: ${toDelete.map((p: any) => p.name).join(", ")}`,
      );
      return { removed: toDelete.length, diffEntries };
    }

    this.logger.info(`Deleting ${toDelete.length} unmanaged MetadataProfiles ...`);
    let deleted = 0;

    for (const profile of toDelete) {
      try {
        await this.deleteProfile(String(profile.id));
        this.logger.info(`Deleted MetadataProfile: '${profile.name || profile.id}'`);
        deleted++;
      } catch (err: any) {
        // Check if profile is in use
        const errorMessage = err?.message || err?.toString() || "";
        const isInUse = errorMessage.toLowerCase().includes("in use") || errorMessage.toLowerCase().includes("being used");

        if (isInUse) {
          this.logger.info(`Metadata profile "${profile.name ?? profile.id}" is in use and could not be deleted.`);
        } else {
          this.logger.error(
            `Failed deleting MetadataProfile (${profile.name ?? profile.id}). ` +
              "This profile will be left in place; check your Arr logs if you expected it to be removable.",
          );
          this.logger.debug(err, "Error while deleting MetadataProfile");
        }
        // Continue with other profiles; deleting unmanaged metadata profiles is best-effort.
      }
    }

    return { removed: deleted, diffEntries };
  }
```

- [ ] **Step 19: Run full verification for metadata profiles**

Run: `pnpm test -- metadataProfile`
Expected: PASS.

#### 8c. Download clients

`isDownloadClientEqual` (`src/downloadClients/downloadClientGeneric.ts`) is directly unit-tested (~8 call sites across `downloadClientSyncer.test.ts` and `downloadClientGeneric.test.ts`) asserting its boolean return — it is **not** modified. Instead, a new sibling method computes the structured field changes only for entries `calculateDiff` already decided are an update, keeping the well-tested boolean logic untouched.

- [ ] **Step 20: Add `fieldChanges` to `DownloadClientDiff.update` and `diffEntries` to `DownloadClientSyncResult`**

Modify `src/types/download-client.types.ts` — add the import and extend the two types:

```ts
import { DiffEntry, FieldChange } from "../diffReport/diffReport.types";
```

```ts
export type DownloadClientDiff = {
  create: InputConfigDownloadClient[];
  update: { config: InputConfigDownloadClient; server: DownloadClientResource; partialUpdate: boolean; fieldChanges: FieldChange[] }[];
  unchanged: { config: InputConfigDownloadClient; server: DownloadClientResource }[];
  deleted: DownloadClientResource[];
};

export interface DownloadClientSyncResult {
  added: number;
  updated: number;
  removed: number;
  diffEntries: DiffEntry[];
}
```

- [ ] **Step 21: Write a failing test for the new field-change method**

Add to `src/downloadClients/downloadClientGeneric.test.ts` (it already has a `getTestSync()`-style helper and `cache`/`serverClient`/`configClient` fixtures used by the existing `isDownloadClientEqual` tests around line 100-320 — reuse that same fixture style):

```ts
  describe("getDownloadClientFieldChanges", () => {
    it("reports a changed top-level field", () => {
      const sync = new GenericDownloadClientSync("RADARR");
      const cache = new ServerCache([], [], [], []);

      const config: InputConfigDownloadClient = { name: "qBit", type: "qbittorrent", priority: 5 };
      const server: DownloadClientResource = { name: "qBit", implementation: "qbittorrent", priority: 1, fields: [], tags: [] };

      const changes = sync.getDownloadClientFieldChanges(config, server, cache);

      expect(changes).toContainEqual({ field: "priority", from: 1, to: 5 });
    });

    it("reports a changed field value", () => {
      const sync = new GenericDownloadClientSync("RADARR");
      const cache = new ServerCache([], [], [], []);

      const config: InputConfigDownloadClient = { name: "qBit", type: "qbittorrent", fields: { host: "new-host" } };
      const server: DownloadClientResource = {
        name: "qBit",
        implementation: "qbittorrent",
        fields: [{ name: "host", value: "old-host" }],
        tags: [],
      };

      const changes = sync.getDownloadClientFieldChanges(config, server, cache);

      expect(changes).toContainEqual({ field: "fields.host", from: "old-host", to: "new-host" });
    });
  });
```

Add `ServerCache` to the file's imports if not already present: `import { ServerCache } from "../cache";`; add `DownloadClientResource` and `InputConfigDownloadClient` too if not already imported (check the existing import block at the top of the file first).

- [ ] **Step 22: Run test to verify it fails**

Run: `pnpm test -- downloadClientGeneric.test.ts -t "getDownloadClientFieldChanges"`
Expected: FAIL — `sync.getDownloadClientFieldChanges` is not a function yet.

- [ ] **Step 23: Implement `getDownloadClientFieldChanges` in `src/downloadClients/downloadClientGeneric.ts`**

Add the import:

```ts
import { FieldChange } from "../diffReport/diffReport.types";
```

Add the new method (alongside `isDownloadClientEqual`, which is left completely unchanged):

```ts
  public getDownloadClientFieldChanges(
    config: InputConfigDownloadClient,
    server: DownloadClientResource,
    cache: ServerCache,
    updatePassword: boolean = false,
  ): FieldChange[] {
    const changes: FieldChange[] = [];

    if (config.enable !== undefined && config.enable !== server.enable) {
      changes.push({ field: "enable", from: server.enable, to: config.enable });
    }
    if (config.priority !== undefined && config.priority !== server.priority) {
      changes.push({ field: "priority", from: server.priority, to: config.priority });
    }
    if (config.remove_completed_downloads !== undefined && config.remove_completed_downloads !== server.removeCompletedDownloads) {
      changes.push({ field: "removeCompletedDownloads", from: server.removeCompletedDownloads, to: config.remove_completed_downloads });
    }
    if (config.remove_failed_downloads !== undefined && config.remove_failed_downloads !== server.removeFailedDownloads) {
      changes.push({ field: "removeFailedDownloads", from: server.removeFailedDownloads, to: config.remove_failed_downloads });
    }

    const normalizedConfigFields = this.normalizeConfigFields(config.fields || {}, this.arrType);
    const serverFields = server.fields || [];

    for (const serverField of serverFields) {
      const fieldName = serverField.name;
      if (!fieldName) continue;

      const configValue = normalizedConfigFields[fieldName];
      if (configValue === undefined) continue;

      const serverValue = serverField.value;
      let valuesMatch = JSON.stringify(configValue) === JSON.stringify(serverValue);

      if (
        !valuesMatch &&
        (fieldName.toLowerCase().includes("password") || fieldName.toLowerCase().includes("apikey")) &&
        serverValue === "********" &&
        typeof configValue === "string" &&
        configValue.length > 0 &&
        !updatePassword
      ) {
        valuesMatch = true;
      }

      if (!valuesMatch) {
        changes.push({ field: `fields.${fieldName}`, from: serverValue, to: configValue });
      }
    }

    const configTags = config.tags ?? [];
    const { ids: resolvedTagIds } = this.resolveTagNamesToIds(configTags, cache.tags);
    const serverTags = server.tags ?? [];

    const sortedConfigTagIds = [...resolvedTagIds].sort();
    const sortedServerTags = [...serverTags].sort();

    if (JSON.stringify(sortedConfigTagIds) !== JSON.stringify(sortedServerTags)) {
      changes.push({ field: "tags", from: sortedServerTags, to: sortedConfigTagIds });
    }

    return changes;
  }
```

Update `calculateDiff` to call it once an update is already decided (via the untouched `isDownloadClientEqual`):

```ts
  async calculateDiff(
    configClients: InputConfigDownloadClient[],
    serverClients: DownloadClientResource[],
    cache: ServerCache,
    updatePassword: boolean = false,
  ): Promise<DownloadClientDiff> {
    const create: InputConfigDownloadClient[] = [];
    const update: { config: InputConfigDownloadClient; server: DownloadClientResource; partialUpdate: boolean; fieldChanges: FieldChange[] }[] =
      [];
    const unchanged: { config: InputConfigDownloadClient; server: DownloadClientResource }[] = [];

    for (const config of configClients) {
      // Use composite key (name + type) to match clients
      const serverClient = serverClients.find(
        (s: DownloadClientResource) => s.name === config.name && s.implementation?.toLowerCase() === config.type.toLowerCase(),
      );

      if (!serverClient) {
        create.push(config);
      } else if (!this.isDownloadClientEqual(config, serverClient, cache, updatePassword)) {
        const partialUpdate = this.shouldUsePartialUpdate(config);
        const fieldChanges = this.getDownloadClientFieldChanges(config, serverClient, cache, updatePassword);
        update.push({ config, server: serverClient, partialUpdate, fieldChanges });
      } else {
        unchanged.push({ config, server: serverClient });
      }
    }

    // Find clients to delete (on server but not in config) using composite keys
    const configKeys = new Set(configClients.map((c: InputConfigDownloadClient) => `${c.name}::${c.type.toLowerCase()}`));
    const deleted = serverClients.filter(
      (s: DownloadClientResource) => !configKeys.has(`${s.name ?? ""}::${s.implementation?.toLowerCase() ?? ""}`),
    );

    return { create, update, unchanged, deleted };
  }
```

- [ ] **Step 24: Run test to verify it passes**

Run: `pnpm test -- downloadClientGeneric.test.ts`
Expected: PASS.

- [ ] **Step 25: Add the adapter and wire `diffEntries` into `syncDownloadClients` in `src/downloadClients/downloadClientBase.ts`**

Add the import:

```ts
import { DiffEntry } from "../diffReport/diffReport.types";
```

Add the adapter function. It takes the *actually-will-be-deleted* set (already filtered by `delete_unmanaged.enabled`/`ignore` via the existing `filterUnmanagedClients`) rather than `diff.deleted` directly, since `diff.deleted` is "server minus config" unconditionally and does not by itself reflect whether deletion is even enabled — reporting deletions that will not actually happen would be worse than the old generic message:

```ts
export function downloadClientDiffToDiffEntries(diff: DownloadClientDiff, unmanagedToDelete: DownloadClientResource[]): DiffEntry[] {
  const entries: DiffEntry[] = diff.create.map((c) => ({
    resourceType: "DownloadClient",
    name: c.name,
    action: "create" as const,
  }));

  for (const { config, fieldChanges } of diff.update) {
    entries.push({ resourceType: "DownloadClient", name: config.name, action: "update", fieldChanges });
  }

  entries.push(
    ...unmanagedToDelete.map((c) => ({
      resourceType: "DownloadClient",
      name: c.name ?? "unknown",
      action: "delete" as const,
    })),
  );

  return entries;
}
```

Update `syncDownloadClients`:

```ts
  public async syncDownloadClients(config: MergedConfigInstance, serverCache: ServerCache): Promise<DownloadClientSyncResult> {
    const configClients = config.download_clients?.data ?? [];
    const updatePassword = config.download_clients?.update_password ?? false;

    if (configClients.length === 0 && !config.download_clients?.delete_unmanaged?.enabled) {
      this.logger.info("No download clients configured and delete_unmanaged not enabled, skipping");
      return { added: 0, updated: 0, removed: 0, diffEntries: [] };
    }

    // Get schema and server clients
    this.logger.debug("Fetching download client schema...");
    const schema = await this.getDownloadClientSchema(serverCache);

    this.logger.debug("Fetching existing download clients...");
    const serverClients = await this.getApi().getDownloadClients();

    this.logger.info(`Found ${serverClients.length} download client(s) on server`);

    // Validate configurations
    this.logger.debug("Validating download client configurations...");
    const { validClients } = await this.validateConfigClients(configClients, schema);

    // Create missing tags
    await this.createMissingTags(validClients, serverCache);

    // Calculate diff
    const diff = await this.calculateDiff(validClients, serverClients, serverCache, updatePassword);

    this.logger.info(
      `Download clients diff - Create: ${diff.create.length}, Update: ${diff.update.length}, Unchanged: ${diff.unchanged.length}`,
    );

    const unmanagedToDelete = config.download_clients?.delete_unmanaged?.enabled
      ? this.filterUnmanagedClients(serverClients, configClients, config.download_clients.delete_unmanaged)
      : [];

    const diffEntries = downloadClientDiffToDiffEntries(diff, unmanagedToDelete);

    if (getEnvs().DRY_RUN) {
      this.logger.info("DryRun: Would update download clients.");
      return {
        added: diff.create.length,
        updated: diff.update.length,
        removed: diff.deleted.length,
        diffEntries,
      };
    }

    // Execute changes
    const [added, updated] = await Promise.all([
      this.createClients(diff.create, serverCache),
      this.updateClients(diff.update, serverCache),
    ]);

    const removed = config.download_clients?.delete_unmanaged?.enabled ? await this.deleteUnmanagedClients(unmanagedToDelete) : 0;

    if (added > 0 || updated > 0 || removed > 0) {
      this.logger.info(`Download client synchronization complete: +${added} ~${updated} -${removed}`);
    } else {
      this.logger.info("Download client synchronization complete - no changes needed");
    }

    return { added, updated, removed, diffEntries };
  }
```

(This also removes the duplicate `filterUnmanagedClients(...)` call that previously appeared inline inside the `removed = ... ? await this.deleteUnmanagedClients(this.filterUnmanagedClients(...)) : 0` expression — it's now computed once as `unmanagedToDelete` and reused for both the report and the actual deletion, guaranteeing they can never disagree.)

- [ ] **Step 26: Run full verification for download clients**

Run: `pnpm test -- downloadClient`
Expected: PASS.

#### 8d. Download client configuration

- [ ] **Step 27: Add `fieldChanges` to `DownloadClientConfigSyncResult`**

Modify `src/downloadClientConfig/downloadClientConfig.types.ts`:

```ts
import { FieldChange } from "../diffReport/diffReport.types";

/**
 * Download Client Configuration sync types
 * Handles instance-specific configuration for download clients
 */
export type DownloadClientConfigSyncResult = {
  updated: boolean;
  arrType: string;
  fieldChanges: FieldChange[];
};
```

- [ ] **Step 28: Write a failing test for structured field changes**

Add to `src/downloadClientConfig/downloadClientConfigSyncer.test.ts` (it already has tests asserting `result.updated`/`result.arrType` around lines 81-153 with a mocked `getSpecificClient` — reuse that same mock setup style):

```ts
  it("returns structured fieldChanges when config differs", async () => {
    vi.spyOn(unifiedClient, "getSpecificClient").mockReturnValue({
      getDownloadClientConfig: vi.fn().mockResolvedValue({ id: 1, enableCompletedDownloadHandling: false }),
      updateDownloadClientConfig: vi.fn(),
    } as any);
    vi.spyOn(env, "getEnvs").mockReturnValue({ DRY_RUN: true } as ReturnType<typeof env.getEnvs>);

    const config = {
      download_clients: { config: { enable_completed_download_handling: true } },
    } as unknown as MergedConfigInstance;

    const result = await syncDownloadClientConfig("RADARR", config, serverCache);

    expect(result.updated).toBe(true);
    expect(result.fieldChanges).toContainEqual({
      field: "enableCompletedDownloadHandling",
      from: false,
      to: true,
    });
  });
```

Check the file's existing imports for `unifiedClient`/`env`/`serverCache` aliases before adding — reuse whatever names the file already uses for its other tests rather than introducing new ones.

- [ ] **Step 29: Run test to verify it fails**

Run: `pnpm test -- downloadClientConfigSyncer.test.ts -t "structured fieldChanges"`
Expected: FAIL — `result.fieldChanges` is `undefined`.

- [ ] **Step 30: Implement — replace `configHasChanges` with `compareObjectsCarr` in `src/downloadClientConfig/downloadClientConfigSyncer.ts`**

Add the import:

```ts
import { DiffEntry } from "../diffReport/diffReport.types";
import { compareObjectsCarr } from "../util";
```

Delete the now-unused `configHasChanges` function (it has no other callers — confirmed via repo-wide search).

Replace the body of `syncDownloadClientConfig`:

```ts
export async function syncDownloadClientConfig(
  arrType: ArrType,
  config: MergedConfigInstance,
  serverCache: ServerCache,
): Promise<DownloadClientConfigSyncResult> {
  const downloadClientConfig = config.download_clients?.config;

  if (!downloadClientConfig) {
    logger.debug(`No download client config specified for ${arrType}`);
    return { updated: false, arrType, fieldChanges: [] };
  }

  try {
    // Get specific client for this arrType - TypeScript infers the correct type
    const client = getSpecificClient(arrType);

    // Fetch current server config
    logger.debug(`Fetching download client config from ${arrType}...`);
    const serverConfig = await client.getDownloadClientConfig();

    // Normalize and filter desired config
    const normalizedConfig = normalizeConfigFields(downloadClientConfig);
    const desiredConfig = filterFieldsByArrType(normalizedConfig, arrType);

    logger.debug(`Server config: ${JSON.stringify(serverConfig)}`);
    logger.debug(`Desired config: ${JSON.stringify(desiredConfig)}`);

    // Check if changes are needed
    const { changes, equal } = compareObjectsCarr(serverConfig, desiredConfig);

    if (equal) {
      logger.info(`Download client config for ${arrType} is already up-to-date`);
      return { updated: false, arrType, fieldChanges: [] };
    }

    logger.info(`Download client config changes detected for ${arrType}`);

    if (getEnvs().DRY_RUN) {
      logger.info("DryRun: Would update download client config.");
      return { updated: true, arrType, fieldChanges: changes };
    }

    // Merge with server config to preserve unmanaged fields
    const mergedConfig = { ...serverConfig, ...desiredConfig };

    // Update the config
    const configId = serverConfig.id?.toString() || "1";
    logger.info(`Updating download client config for ${arrType}...`);
    await client.updateDownloadClientConfig(configId, mergedConfig);

    logger.info(`Successfully updated download client config for ${arrType}`);
    return { updated: true, arrType, fieldChanges: changes };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to sync download client config for ${arrType}: ${errorMessage}`);
    throw new Error(`Download client config sync failed for ${arrType}: ${errorMessage}`);
  }
}

export function downloadClientConfigDiffToDiffEntries(result: DownloadClientConfigSyncResult): DiffEntry[] {
  if (!result.updated) {
    return [];
  }
  return [{ resourceType: "DownloadClientConfig", name: result.arrType, action: "update", fieldChanges: result.fieldChanges }];
}
```

- [ ] **Step 31: Run test to verify it passes**

Run: `pnpm test -- downloadClientConfigSyncer.test.ts`
Expected: PASS — the new test plus all existing ones (they only assert `.updated`/`.arrType`).

#### 8e. Wire all four adapters into `src/index.ts`

- [ ] **Step 32: Update imports and call sites**

Update the `rootFolder` import:

```ts
import { syncRootFolders } from "./rootFolder/rootFolderSyncer";
```

(unchanged — the adapter lives in `rootFolderBase.ts` and is invoked from inside `syncRootFolders`, not from `index.ts` directly, since `RootFolderSyncResult` already carries `diffEntries`)

Update the `metadataProfiles` import:

```ts
import { syncMetadataProfiles } from "./metadataProfiles/metadataProfileSyncer";
```

(also unchanged for the same reason — `syncMetadataProfiles`'s return already carries `diffEntries`)

Update the `downloadClients`/`downloadClientConfig` imports — unchanged as well, same reasoning.

Update the call sites in `pipeline()`:

```ts
  // Handle metadata profiles (Lidarr / Readarr) - unified sync with optional deletion
  const metadataProfileResult = await syncMetadataProfiles(arrType, config, serverCache);
  diffCollector.add(metadataProfileResult.diffEntries);

  const rootFolderResult = await syncRootFolders(arrType, config.root_folders, serverCache);
  diffCollector.add(rootFolderResult.diffEntries);
```

(these replace the current `await syncMetadataProfiles(arrType, config, serverCache);` and `await syncRootFolders(arrType, config.root_folders, serverCache);`, both of which currently discard their return value entirely)

```ts
  // Download Clients
  if (config.download_clients?.data || config.download_clients?.delete_unmanaged?.enabled) {
    try {
      const downloadClientsResult = await syncDownloadClients(arrType, config, serverCache);
      diffCollector.add(downloadClientsResult.diffEntries);
    } catch (err: any) {
      logger.error(`Failed to sync download clients: ${err.message}`);
    }
  }

  // Download Client Configuration
  if (config.download_clients?.config) {
    try {
      const downloadClientConfigResult = await syncDownloadClientConfig(arrType, config, serverCache);
      diffCollector.add(downloadClientConfigDiffToDiffEntries(downloadClientConfigResult));
    } catch (err: any) {
      logger.error(`Failed to sync download client config: ${err.message}`);
    }
  }
```

(these replace Task 3's `await syncDownloadClients(arrType, config, serverCache);` and `await syncDownloadClientConfig(arrType, config, serverCache);`)

Update the `downloadClientConfig` import to include the new adapter:

```ts
import { syncDownloadClientConfig } from "./downloadClientConfig/downloadClientConfigSyncer";
```

becomes:

```ts
import { downloadClientConfigDiffToDiffEntries, syncDownloadClientConfig } from "./downloadClientConfig/downloadClientConfigSyncer";
```

- [ ] **Step 33: Run full verification**

Run: `pnpm build && pnpm test && pnpm lint && pnpm typecheck`
Expected: all pass.

- [ ] **Step 34: Commit**

```bash
git add src/rootFolder src/metadataProfiles src/types/download-client.types.ts src/downloadClients src/downloadClientConfig src/index.ts
git commit -m "$(cat <<'EOF'
feat: report field-level diffs for root folders/metadata profiles/download clients

Each module already computed a config/server pair when deciding
whether to update - none captured which fields actually differed.
Root folders and metadata profiles (Lidarr/Readarr) now compare
structured fields directly; download clients get a new sibling method
alongside the existing (untested-safe, unchanged) equality check so
the diff report doesn't touch any already-tested boolean logic.
EOF
)"
```

---

### Task 9: Migrate `remotePaths`

**Files:**
- Modify: `src/remotePaths/remotePath.types.ts`
- Modify: `src/remotePaths/remotePathSyncer.ts`
- Modify: `src/index.ts`
- Test: `src/remotePaths/remotePathSyncer.test.ts`

**Interfaces:**
- Consumes: `DiffEntry`, `FieldChange` (Task 1), `DiffCollector` (already wired).
- Produces: `RemotePathDiff.toUpdate[].server: RemotePathMappingResource` (was discarded before the function returned — the spec identified this as a trivial fix, not a structural blocker). `RemotePathDiff.toDelete[]` gains `host`/`remotePath` (was `{ id: number }` only, losing the name needed for reporting). `RemotePathSyncResult.diffEntries: DiffEntry[]`. New: `remotePathsToDiffEntries(diff: RemotePathDiff): DiffEntry[]`.

- [ ] **Step 1: Extend `RemotePathDiff`/`RemotePathSyncResult` types**

Modify `src/remotePaths/remotePath.types.ts` — add the import and extend the three affected interfaces (the `RemotePathConfigSchema` Zod schema and `RemotePathMappingResource` are unchanged):

```ts
import { DiffEntry } from "../diffReport/diffReport.types";
```

```ts
export interface RemotePathSyncResult {
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
  arrType: ArrType;
  diffEntries: DiffEntry[];
}
```

```ts
export interface RemotePathDiff {
  toCreate: InputConfigRemotePath[];
  toUpdate: Array<{ id: number; config: InputConfigRemotePath; server: RemotePathMappingResource }>;
  toDelete: Array<{ id: number; host?: string | null; remotePath?: string | null }>;
  unchanged: number;
}
```

- [ ] **Step 2: Fix the one existing whole-object `toEqual` test**

`src/remotePaths/remotePathSyncer.test.ts`'s `"should return early when no remote_paths in config"` test (line 38) asserts the full result object. Add the new field:

```ts
    expect(result).toEqual({
      created: 0,
      updated: 0,
      deleted: 0,
      unchanged: 0,
      arrType: "RADARR",
      diffEntries: [],
    });
```

- [ ] **Step 3: Write failing tests for the new adapter and the retained `server` value**

Add to `src/remotePaths/remotePathSyncer.test.ts` (importing `remotePathsToDiffEntries` alongside the existing `syncRemotePaths` import):

```ts
describe("remotePathsToDiffEntries", () => {
  it("builds create, update, and delete entries", () => {
    const diff = {
      toCreate: [{ host: "host1", remote_path: "/remote", local_path: "/local" }],
      toUpdate: [
        {
          id: 1,
          config: { host: "host2", remote_path: "/remote2", local_path: "/new-local" },
          server: { id: 1, host: "host2", remotePath: "/remote2", localPath: "/old-local" },
        },
      ],
      toDelete: [{ id: 2, host: "host3", remotePath: "/remote3" }],
      unchanged: 0,
    };

    const entries = remotePathsToDiffEntries(diff);

    expect(entries).toEqual([
      { resourceType: "RemotePathMapping", name: "host1 -> /remote", action: "create" },
      {
        resourceType: "RemotePathMapping",
        name: "host2 -> /remote2",
        action: "update",
        fieldChanges: [{ field: "localPath", from: "/old-local", to: "/new-local" }],
      },
      { resourceType: "RemotePathMapping", name: "host3 -> /remote3", action: "delete" },
    ]);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm test -- remotePathSyncer.test.ts`
Expected: FAIL — `remotePathsToDiffEntries` doesn't exist yet, and the Step 2 assertion fails since `diffEntries` isn't in the current return value.

- [ ] **Step 5: Implement — update `calculateDiff`, add the adapter, wire `diffEntries` into `syncRemotePaths`**

In `src/remotePaths/remotePathSyncer.ts`, add the import:

```ts
import { DiffEntry } from "../diffReport/diffReport.types";
```

Update `calculateDiff`'s `toUpdate`/`toDelete` population:

```ts
function calculateDiff(configs: InputConfigRemotePath[], serverMappings: RemotePathMappingResource[]): RemotePathDiff {
  const configMap = new Map<string, InputConfigRemotePath>();
  const serverMap = new Map<string, RemotePathMappingResource>();

  // Build config map
  for (const config of configs) {
    const key = createCompositeKey(config.host, config.remote_path);
    configMap.set(key, config);
  }

  // Build server map
  for (const mapping of serverMappings) {
    if (mapping.host && mapping.remotePath) {
      const key = createCompositeKey(mapping.host, mapping.remotePath);
      serverMap.set(key, mapping);
    }
  }

  const toCreate: InputConfigRemotePath[] = [];
  const toUpdate: Array<{ id: number; config: InputConfigRemotePath; server: RemotePathMappingResource }> = [];
  let unchanged = 0;

  // Find items to create or update
  for (const [key, config] of configMap) {
    const serverMapping = serverMap.get(key);
    if (!serverMapping) {
      toCreate.push(config);
    } else if (serverMapping.localPath !== config.local_path) {
      if (serverMapping.id) {
        toUpdate.push({ id: serverMapping.id, config, server: serverMapping });
      }
    } else {
      unchanged++;
    }
  }

  // Find items to delete
  const toDelete = Array.from(serverMap.entries())
    .filter(([key]) => !configMap.has(key))
    .filter(([, mapping]) => !!mapping.id)
    .map(([, mapping]) => ({ id: mapping.id!, host: mapping.host, remotePath: mapping.remotePath }));

  return { toCreate, toUpdate, toDelete, unchanged };
}
```

Add the adapter (module-level export, alongside `calculateDiff`):

```ts
export function remotePathsToDiffEntries(diff: RemotePathDiff): DiffEntry[] {
  const entries: DiffEntry[] = diff.toCreate.map((c) => ({
    resourceType: "RemotePathMapping",
    name: `${c.host} -> ${c.remote_path}`,
    action: "create" as const,
  }));

  for (const { config, server } of diff.toUpdate) {
    entries.push({
      resourceType: "RemotePathMapping",
      name: `${config.host} -> ${config.remote_path}`,
      action: "update",
      fieldChanges: [{ field: "localPath", from: server.localPath, to: config.local_path }],
    });
  }

  entries.push(
    ...diff.toDelete.map((d) => ({
      resourceType: "RemotePathMapping",
      name: d.host && d.remotePath ? `${d.host} -> ${d.remotePath}` : `id:${d.id}`,
      action: "delete" as const,
    })),
  );

  return entries;
}
```

Update every return site in `syncRemotePaths` to include `diffEntries`:

```ts
export async function syncRemotePaths(arrType: ArrType, config: MergedConfigInstance): Promise<RemotePathSyncResult> {
  const remotePaths = config.download_clients?.remote_paths;
  const deleteUnmanaged = config.download_clients?.delete_unmanaged_remote_paths ?? false;

  // If remote_paths is undefined/not present, skip management entirely
  if (remotePaths === undefined) {
    logger.debug(`No remote path mappings specified for ${arrType}`);
    return { created: 0, updated: 0, deleted: 0, unchanged: 0, arrType, diffEntries: [] };
  }

  // If remote_paths is empty array [], skip unless delete_unmanaged is enabled
  if (remotePaths.length === 0) {
    if (!deleteUnmanaged) {
      logger.debug(`No remote path mappings specified for ${arrType}`);
      return { created: 0, updated: 0, deleted: 0, unchanged: 0, arrType, diffEntries: [] };
    }
    logger.debug(`Empty remote_paths with delete_unmanaged_remote_paths enabled for ${arrType} - will delete all existing mappings`);
  }

  try {
    const client = getSpecificClient(arrType);

    logger.debug(`Fetching remote path mappings from ${arrType}...`);
    const serverMappings = await client.getRemotePathMappings();

    const diff = calculateDiff(remotePaths, serverMappings);
    const diffEntries = remotePathsToDiffEntries(diff);

    logger.debug(
      `Remote path mapping diff for ${arrType}: create=${diff.toCreate.length}, update=${diff.toUpdate.length}, delete=${diff.toDelete.length}, unchanged=${diff.unchanged}`,
    );

    if (diff.toCreate.length === 0 && diff.toUpdate.length === 0 && diff.toDelete.length === 0) {
      logger.info(`Remote path mappings for ${arrType} are already up-to-date`);
      return { created: 0, updated: 0, deleted: 0, unchanged: diff.unchanged, arrType, diffEntries };
    }

    logger.info(`Remote path mapping changes detected for ${arrType}`);

    if (getEnvs().DRY_RUN) {
      logger.info(
        `DryRun: Would create ${diff.toCreate.length}, update ${diff.toUpdate.length}, delete ${diff.toDelete.length} remote path mappings for ${arrType}`,
      );
      return {
        created: diff.toCreate.length,
        updated: diff.toUpdate.length,
        deleted: diff.toDelete.length,
        unchanged: diff.unchanged,
        arrType,
        diffEntries,
      };
    }

    // Execute operations (unchanged from the current implementation)
    let created = 0;
    let updated = 0;
    let deleted = 0;

    for (const config of diff.toCreate) {
      try {
        await client.createRemotePathMapping({
          host: config.host,
          remotePath: config.remote_path,
          localPath: config.local_path,
        });
        created++;
        logger.info(`Created remote path mapping: ${config.host} => ${config.remote_path} -> ${config.local_path}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes("RemotePath already configured") || errorMsg.includes("already exists")) {
          const normalizedConfigPath = normalizePath(config.remote_path);
          const existingMapping = serverMappings.find(
            (m: RemotePathMappingResource) =>
              m.host === config.host && m.remotePath && normalizePath(m.remotePath) === normalizedConfigPath,
          );
          if (existingMapping && existingMapping.id) {
            logger.debug(`RemotePath '${config.host} + ${config.remote_path}' already exists. Attempting to update instead.`);
            try {
              await client.updateRemotePathMapping(existingMapping.id.toString(), {
                id: existingMapping.id,
                host: config.host,
                remotePath: config.remote_path,
                localPath: config.local_path,
              });
              updated++;
              logger.info(`Updated existing remote path mapping: ${config.host} => ${config.remote_path} -> ${config.local_path}`);
              continue;
            } catch (updateError) {
              logger.error(
                `Failed to update remote path mapping: ${updateError instanceof Error ? updateError.message : String(updateError)}`,
              );
              throw updateError;
            }
          }
        }
        logger.error(`Failed to create remote path mapping for ${config.host}/${config.remote_path}: ${errorMsg}`);
        throw error;
      }
    }

    for (const { id, config } of diff.toUpdate) {
      try {
        await client.updateRemotePathMapping(id.toString(), {
          id,
          host: config.host,
          remotePath: config.remote_path,
          localPath: config.local_path,
        });
        updated++;
        logger.info(`Updated remote path mapping: ${config.host} => ${config.remote_path} -> ${config.local_path}`);
      } catch (error) {
        logger.error(`Failed to update remote path mapping ${id}: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }

    for (const { id } of diff.toDelete) {
      try {
        await client.deleteRemotePathMapping(id.toString());
        deleted++;
        logger.info(`Deleted remote path mapping: ${id}`);
      } catch (error) {
        logger.error(`Failed to delete remote path mapping ${id}: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }

    logger.info(`Successfully synced remote path mappings for ${arrType}: created=${created}, updated=${updated}, deleted=${deleted}`);
    return { created, updated, deleted, unchanged: diff.unchanged, arrType, diffEntries };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to sync remote path mappings for ${arrType}: ${errorMessage}`);
    throw new Error(`Remote path mapping sync failed for ${arrType}: ${errorMessage}`);
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test -- remotePathSyncer.test.ts`
Expected: PASS.

- [ ] **Step 7: Wire into `src/index.ts`**

Update the call site:

```ts
    logger.debug(`[DEBUG] About to sync remote paths for ${arrType}. Count: ${config.download_clients.remote_paths.length}`);
    try {
      const remotePathsResult = await syncRemotePaths(arrType, config);
      diffCollector.add(remotePathsResult.diffEntries);
    } catch (err: any) {
      logger.error(`Failed to sync remote path mappings: ${err.message}`);
    }
```

- [ ] **Step 8: Run full verification**

Run: `pnpm build && pnpm test && pnpm lint && pnpm typecheck`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add src/remotePaths/ src/index.ts
git commit -m "$(cat <<'EOF'
feat: report field-level diffs for remote path mappings

toUpdate discarded the old server value before returning it, and
toDelete carried only an id - both needed for a meaningful diff
report. Both are now retained; a new adapter converts the diff into
DiffEntry[] for the per-instance report.
EOF
)"
```

---

### Task 10: Migrate `delay-profiles.ts` — build real field-level comparison

**Files:**
- Modify: `src/delay-profiles.ts`
- Modify: `src/index.ts`
- Test: `src/delay-profiles.test.ts`

**Interfaces:**
- Consumes: `FieldChange`, `DiffEntry` (Task 1), `DiffCollector` (already wired).
- Produces: new exported `DelayProfilesDiff` interface (replacing the previously-anonymous return type of `calculateDelayProfilesDiff`), which gains `defaultProfileFieldChanges: FieldChange[]` and `additionalProfilesFieldChanges: FieldChange[][]`. New: `delayProfilesToDiffEntries(diff: DelayProfilesDiff): DiffEntry[]`.

This module currently only produces two booleans (`defaultProfileChanged`/`additionalProfilesChanged`) — the most net-new logic in this migration, since (unlike every other module so far) there is no existing prose/dead-code diff to convert. `isDefaultProfileDifferent`/`isProfileDifferent` are private, not exported, and not directly unit-tested (only the exported `calculateDelayProfilesDiff` is, and only via per-field assertions — confirmed no whole-object `toEqual` on its result) — safe to change their shape.

Real execution for "additional" profiles is always delete-all-then-recreate-all (`deleteAdditionalDelayProfiles()` followed by creating every configured profile), never a targeted per-profile update — but per-index field comparison against the old server profile at the same position is still the most useful signal for *what the user will see change*, so that's what's reported (each additional profile as an `"update"` entry), even though the underlying execution mechanism is delete+recreate.

- [ ] **Step 1: Write failing tests for the new field-level output**

The file mocks `getUnifiedClient` at the top via a hoisted `mockGetDelayProfiles = vi.hoisted(() => vi.fn())`, then each test calls `mockGetDelayProfiles.mockResolvedValue(serverProfiles)` and dynamically `const { calculateDelayProfilesDiff } = await import("./delay-profiles");` — reuse that exact pattern. Add to `src/delay-profiles.test.ts`:

```ts
  test("calculateDelayProfilesDiff - default profile change exposes structured fieldChanges", async () => {
    const configProfiles = {
      default: {
        enableUsenet: true,
        enableTorrent: true,
        preferredProtocol: "usenet",
        usenetDelay: 10,
        torrentDelay: 0,
        bypassIfHighestQuality: false,
        bypassIfAboveCustomFormatScore: false,
        minimumCustomFormatScore: 0,
        order: 1,
      },
    };

    const serverProfiles: MergedDelayProfileResource[] = [
      {
        id: 1,
        tags: [],
        enableUsenet: true,
        enableTorrent: true,
        preferredProtocol: "usenet" as any,
        usenetDelay: 0,
        torrentDelay: 0,
        bypassIfHighestQuality: false,
        bypassIfAboveCustomFormatScore: false,
        minimumCustomFormatScore: 0,
        order: 1,
      },
    ];

    mockGetDelayProfiles.mockResolvedValue(serverProfiles);

    const { calculateDelayProfilesDiff } = await import("./delay-profiles");
    const diff = await calculateDelayProfilesDiff(configProfiles, []);

    expect(diff?.defaultProfileChanged).toBe(true);
    expect(diff?.defaultProfileFieldChanges).toEqual([{ field: "usenetDelay", from: 0, to: 10 }]);
  });

  test("delayProfilesToDiffEntries - builds a DiffEntry for the default profile", async () => {
    const { delayProfilesToDiffEntries } = await import("./delay-profiles");

    const diff = {
      defaultProfileChanged: true,
      additionalProfilesChanged: false,
      missingTags: [],
      defaultProfile: {} as any,
      additionalProfiles: [],
      defaultProfileFieldChanges: [{ field: "usenetDelay", from: 0, to: 10 }],
      additionalProfilesFieldChanges: [],
    };

    const entries = delayProfilesToDiffEntries(diff);

    expect(entries).toEqual([
      { resourceType: "DelayProfile", name: "default", action: "update", fieldChanges: [{ field: "usenetDelay", from: 0, to: 10 }] },
    ]);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- delay-profiles.test.ts`
Expected: FAIL — `diff.defaultProfileFieldChanges` is `undefined`, and `delayProfilesToDiffEntries` doesn't exist yet.

- [ ] **Step 3: Implement — add `FieldChange`/`DiffEntry` import and a shared field-comparison helper**

Add to the top of `src/delay-profiles.ts`:

```ts
import { DiffEntry, FieldChange } from "./diffReport/diffReport.types";
```

- [ ] **Step 4: Replace `isDefaultProfileDifferent`/`isProfileDifferent` with structured comparisons**

Replace both functions (keep `getProfileTags` and `areTagsEqual` exactly as they are):

```ts
const compareProfileFields = (config: InputConfigDelayProfile, server: MergedDelayProfileResource): FieldChange[] => {
  const keys: ComparisonKeys[] = [
    "enableUsenet",
    "enableTorrent",
    "preferredProtocol",
    "usenetDelay",
    "torrentDelay",
    "bypassIfHighestQuality",
    "bypassIfAboveCustomFormatScore",
    "minimumCustomFormatScore",
    "order",
  ];

  const changes: FieldChange[] = [];
  for (const key of keys) {
    if (config[key] !== undefined && config[key] !== server[key]) {
      changes.push({ field: key, from: server[key], to: config[key] });
    }
  }
  return changes;
};

// Default profile: no tag comparison
const compareDefaultProfile = (
  config: InputConfigDelayProfile,
  server: MergedDelayProfileResource,
): { equal: boolean; changes: FieldChange[] } => {
  const changes = compareProfileFields(config, server);
  return { equal: changes.length === 0, changes };
};

// Additional profiles: includes tag comparison
const compareAdditionalProfile = (
  config: InputConfigDelayProfile,
  server: MergedDelayProfileResource,
  mappedTags: Array<number>,
): { equal: boolean; changes: FieldChange[] } => {
  const changes = compareProfileFields(config, server);

  if (!areTagsEqual(mappedTags, getProfileTags(server))) {
    changes.push({ field: "tags", from: getProfileTags(server), to: mappedTags });
  }

  return { equal: changes.length === 0, changes };
};
```

- [ ] **Step 5: Rewrite `calculateDelayProfilesDiff` to collect and return field changes**

Add the exported result type just above the function:

```ts
export interface DelayProfilesDiff {
  defaultProfileChanged: boolean;
  additionalProfilesChanged: boolean;
  missingTags: string[];
  defaultProfile?: InputConfigDelayProfile;
  additionalProfiles?: InputConfigDelayProfile[];
  defaultProfileFieldChanges: FieldChange[];
  additionalProfilesFieldChanges: FieldChange[][];
}
```

Replace the function body:

```ts
export const calculateDelayProfilesDiff = async (
  delayProfilesObj: { default?: InputConfigDelayProfile; additional?: InputConfigDelayProfile[] },
  tags: MergedTagResource[],
): Promise<DelayProfilesDiff | null> => {
  const { default: configDefault, additional: configAdditional = [] } = delayProfilesObj;

  if (!configDefault && configAdditional.length === 0) {
    logger.debug(`Config 'delay_profiles' not specified. Ignoring.`);
    return null;
  }

  const api = getUnifiedClient();
  const serverData: MergedDelayProfileResource[] = await api.getDelayProfiles();
  const { default: serverDefault, additional: serverAdditional = [] } = splitServerDelayProfiles(serverData);

  // Check default profile (no tag comparison for default)
  const defaultComparison: { equal: boolean; changes: FieldChange[] } =
    configDefault && serverDefault ? compareDefaultProfile(configDefault, serverDefault) : { equal: true, changes: [] };
  const defaultProfileChanged = !defaultComparison.equal;

  let additionalProfilesChanged = configAdditional.length !== serverAdditional.length;

  const additionalComparisons: Array<{ equal: boolean; changes: FieldChange[] }> = configAdditional.map((config, i) => {
    const mappedTags = config.tags?.map((tagName) => tags.find((t) => t.label === tagName)?.id).filter((t) => t !== undefined);
    const serverProfile = serverAdditional[i];

    if (!serverProfile) {
      logger.debug(`Server profile at index ${i} does not exist.`);
      return { equal: false, changes: [] };
    }

    return compareAdditionalProfile(config, serverProfile, mappedTags || []);
  });

  if (!additionalProfilesChanged) {
    additionalProfilesChanged = additionalComparisons.some((c) => !c.equal);
  }

  const additionalProfilesFieldChanges = additionalComparisons.map((c) => c.changes);

  if (!defaultProfileChanged && !additionalProfilesChanged) {
    logger.debug(`Delay profiles are in sync`);
    return null;
  }

  logger.info(`DelayProfiles changes detected - default: ${defaultProfileChanged}, additional: ${additionalProfilesChanged}`);

  const missingTags = configAdditional.flatMap((profile) => {
    return profile.tags?.filter((tagName) => !tags.some((t) => t.label === tagName)) || [];
  });

  return {
    defaultProfileChanged,
    additionalProfilesChanged,
    missingTags,
    defaultProfile: configDefault,
    additionalProfiles: configAdditional,
    defaultProfileFieldChanges: defaultComparison.changes,
    additionalProfilesFieldChanges,
  };
};
```

- [ ] **Step 6: Add the adapter**

Add at the end of `src/delay-profiles.ts`:

```ts
export function delayProfilesToDiffEntries(diff: DelayProfilesDiff): DiffEntry[] {
  const entries: DiffEntry[] = [];

  if (diff.defaultProfileChanged) {
    entries.push({ resourceType: "DelayProfile", name: "default", action: "update", fieldChanges: diff.defaultProfileFieldChanges });
  }

  if (diff.additionalProfilesChanged && diff.additionalProfiles) {
    diff.additionalProfiles.forEach((profile, i) => {
      const name = profile.tags && profile.tags.length > 0 ? profile.tags.join(",") : `profile-${i + 1}`;
      entries.push({
        resourceType: "DelayProfile",
        name,
        action: "update",
        fieldChanges: diff.additionalProfilesFieldChanges[i] ?? [],
      });
    });
  }

  return entries;
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm test -- delay-profiles.test.ts`
Expected: PASS — new tests plus all existing per-field assertions (`defaultProfileChanged`, `additionalProfilesChanged`, `missingTags`, etc. are untouched in shape).

- [ ] **Step 8: Wire into `src/index.ts`**

Update the `delay-profiles` import:

```ts
import { calculateDelayProfilesDiff, delayProfilesToDiffEntries, deleteAdditionalDelayProfiles, mapToServerDelayProfile } from "./delay-profiles";
```

Update the call site — add the collector push right after the diff is calculated (unconditional on the `if`, since `calculateDelayProfilesDiff` already returns `null` when nothing changed):

```ts
    const delayProfilesDiff = await calculateDelayProfilesDiff(config.delay_profiles, serverCache.tags);

    if (delayProfilesDiff) {
      diffCollector.add(delayProfilesToDiffEntries(delayProfilesDiff));
    }

    if (delayProfilesDiff?.defaultProfileChanged || delayProfilesDiff?.additionalProfilesChanged) {
      if (getEnvs().DRY_RUN) {
        logger.info("DryRun: Would update DelayProfiles.");
      } else {
        // ... rest of the execution block is unchanged ...
      }
    }
```

- [ ] **Step 9: Run full verification**

Run: `pnpm build && pnpm test && pnpm lint && pnpm typecheck`
Expected: all pass.

- [ ] **Step 10: Commit**

```bash
git add src/delay-profiles.ts src/index.ts src/delay-profiles.test.ts
git commit -m "$(cat <<'EOF'
feat: report field-level diffs for delay profiles

calculateDelayProfilesDiff previously only exposed two booleans
(defaultProfileChanged/additionalProfilesChanged) with no detail on
which fields differed. It now builds real FieldChange[] comparisons
for both the default profile and each additional profile, surfaced
through a new adapter into the per-instance diff report.
EOF
)"
```

---

### Task 11: JSON formatter + `CONFIGARR_DIFF_OUTPUT_FILE`

**Files:**
- Create: `src/diffReport/formatters/jsonFormatter.ts`
- Create: `src/diffReport/formatters/jsonFormatter.test.ts`
- Modify: `src/env.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `InstanceDiffReport` (Task 1), `allReports: InstanceDiffReport[]` (already accumulated across all instances in `run()` since Task 5).
- Produces: `writeJsonDiffReport(filePath: string, instances: InstanceDiffReport[], dryRun: boolean): void`. New env var `CONFIGARR_DIFF_OUTPUT_FILE: string | undefined`.

Every instance's report has been flowing into `allReports` since Task 5 without a consumer — this task is the only one that reads it, closing the loop opened at the very start of the plan.

- [ ] **Step 1: Write a failing test for the JSON writer**

```ts
// src/diffReport/formatters/jsonFormatter.test.ts
import fs from "node:fs";
import { describe, expect, test, vi, afterEach } from "vitest";
import { writeJsonDiffReport } from "./jsonFormatter";
import { InstanceDiffReport } from "../diffReport.types";

describe("writeJsonDiffReport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("writes a JSON document with generatedAt, dryRun, and instances", () => {
    const writeSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);

    const instances: InstanceDiffReport[] = [
      {
        arrType: "RADARR",
        instanceName: "instance1",
        entries: [{ resourceType: "QualityProfile", name: "HD", action: "create" }],
      },
    ];

    writeJsonDiffReport("/tmp/diff.json", instances, true);

    expect(writeSpy).toHaveBeenCalledTimes(1);
    const [filePath, content] = writeSpy.mock.calls[0]!;
    expect(filePath).toBe("/tmp/diff.json");

    const parsed = JSON.parse(content as string);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.instances).toEqual(instances);
    expect(typeof parsed.generatedAt).toBe("string");
    expect(() => new Date(parsed.generatedAt).toISOString()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- jsonFormatter.test.ts`
Expected: FAIL — `./jsonFormatter` module does not exist yet.

- [ ] **Step 3: Implement `writeJsonDiffReport`**

```ts
// src/diffReport/formatters/jsonFormatter.ts
import fs from "node:fs";
import { InstanceDiffReport } from "../diffReport.types";

export interface DiffReportDocument {
  generatedAt: string;
  dryRun: boolean;
  instances: InstanceDiffReport[];
}

export function writeJsonDiffReport(filePath: string, instances: InstanceDiffReport[], dryRun: boolean): void {
  const document: DiffReportDocument = {
    generatedAt: new Date().toISOString(),
    dryRun,
    instances,
  };

  fs.writeFileSync(filePath, JSON.stringify(document, null, 2), "utf-8");
}
```

This does not implement the per-instance `DiffFormatter` interface (`format(report): void`) from Task 4 — it deliberately operates on the whole run's accumulated `instances` array at once, written a single time at the end, matching the spec's "written once as a single JSON document after the whole run completes" (not per-instance, unlike the console formatter).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- jsonFormatter.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the `CONFIGARR_DIFF_OUTPUT_FILE` env var**

Modify `src/env.ts` — add to the Zod schema, alongside the other optional string fields (`CONFIG_LOCATION`, `SECRETS_LOCATION`):

```ts
  CONFIG_LOCATION: z.string().optional(),
  SECRETS_LOCATION: z.string().optional(),
  CONFIGARR_DIFF_OUTPUT_FILE: z.string().optional(),
```

- [ ] **Step 6: Wire the write call into `run()` in `src/index.ts`**

Add the import:

```ts
import { writeJsonDiffReport } from "./diffReport/formatters/jsonFormatter";
```

Add the write call at the end of `run()`, after the `Execution Summary` log line and before the `Telemetry.isEnabled()` finalize block:

```ts
  logger.info(`Execution Summary (success/failure/skipped) instances: ${totalStatus.join(" - ")}`);

  const diffOutputFile = getEnvs().CONFIGARR_DIFF_OUTPUT_FILE;
  if (diffOutputFile) {
    writeJsonDiffReport(diffOutputFile, allReports, getEnvs().DRY_RUN);
    logger.info(`Diff report written to ${diffOutputFile}`);
  }

  if (Telemetry.isEnabled()) {
    await getTelemetryInstance().finalizeTracking();
  }
```

- [ ] **Step 7: Run full verification**

Run: `pnpm build && pnpm test && pnpm lint && pnpm typecheck`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/diffReport/formatters/jsonFormatter.ts src/diffReport/formatters/jsonFormatter.test.ts src/env.ts src/index.ts
git commit -m "$(cat <<'EOF'
feat: add optional JSON diff report output

Setting CONFIGARR_DIFF_OUTPUT_FILE writes the full run's diff report
(every instance across every *arr type) as a single JSON document once
the run completes, additive to the always-on console report.
EOF
)"
```

---

### Task 12: End-to-end verification against the live stack

**Files:** none (verification only)

This is the final task: confirm the whole chain works against real `*arr` instances, in both `DRY_RUN=true` and a real run, and that dry-run and real-run reports show the same content (per the spec's core goal — "same report content in both modes").

- [ ] **Step 1: Run the full test suite one more time from a clean state**

Run: `pnpm build && pnpm test && pnpm lint && pnpm typecheck`
Expected: all pass.

- [ ] **Step 2: Start the live Docker stack in dry-run mode**

```bash
cd examples/full
docker-compose -f docker-compose.local.yml build
DRY_RUN=true docker-compose -f docker-compose.local.yml run --rm configarr
```

Expected: console output shows one `=== Diff Report: <ARR_TYPE> / <instance> ===` block per configured instance, replacing the old scattered `DryRun: Would update X.` lines, with real field-level detail (e.g. actual `minFormatScore: 0 -> 10` style lines) for every resource type that has a configured difference. No resource type should silently fall back to a generic message.

- [ ] **Step 3: Run the same stack for real (not dry-run), immediately after**

```bash
docker-compose -f docker-compose.local.yml run --rm configarr
```

Expected: the diff report block shows the *same* entries as the dry-run pass in Step 2 (same creates/updates/deletes, same field changes) — confirming the "one collection mechanism, not two" goal. Server state changes as expected (spot-check one or two updated resources via the *arr UI/API if available).

- [ ] **Step 4: Run once more immediately after Step 3, in dry-run mode again**

```bash
DRY_RUN=true docker-compose -f docker-compose.local.yml run --rm configarr
```

Expected: the diff report is now empty/"up to date" for everything that was just synced in Step 3 (proves the report reflects real state, not stale/cached data).

- [ ] **Step 5: Verify the JSON output**

```bash
CONFIGARR_DIFF_OUTPUT_FILE=/config/diff-report.json DRY_RUN=true docker-compose -f docker-compose.local.yml run --rm configarr
docker-compose -f docker-compose.local.yml run --rm configarr cat /config/diff-report.json | jq .
```

Expected: valid JSON, `dryRun: true`, one entry per instance under `instances`, and its `entries` match what the console output showed in the same run.

- [ ] **Step 6: Clean up**

```bash
docker-compose -f docker-compose.local.yml down
```

---

## Post-plan: array-reordering diffs (separate follow-up, not part of this plan)

The spec's "Known limitation" section documents that reordered arrays (e.g. a quality-profile's `items` reordered) collapse to one whole-array `{field, from, to}` `FieldChange` rather than a per-element diff — accepted as a v1 limitation. Per the user's explicit request, this is to be revisited **after** this plan is fully executed and verified (Task 12 complete), as a separate, small follow-up investigation — not a task in this plan's build order. It should start from `compareObjectsCarr`'s array-handling branch (`src/util.ts`, reworked in Task 1), likely using an LCS/edit-distance-style diff to detect moved-not-changed elements, scoped narrowly so it doesn't reopen the rest of this plan.

