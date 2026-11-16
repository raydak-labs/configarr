# Arr e2e repository isolation

**Status:** implemented (2026-11-16)
**Plan:** [2026-11-16-arr-e2e-repo-isolation.md](../plans/2026-11-16-arr-e2e-repo-isolation.md)

## Problem

`repoRootForCurrentFile()` used only the test file basename. Sonarr v4/v5 therefore shared
`repo-sonarr`, and Radarr v5/v6/v7 shared `repo-radarr`. Parallel projects ran Git checkout on the
same clone and failed nondeterministically with `.git/index.lock`. Sequential mode hid the race.

## Decisions

- Add `ARR_E2E_PROJECT_NAME` in the existing `project()` config helper. The root global setup reports
  an empty project name, so setup-time metadata cannot distinguish version projects.
- Include that configured name in each clone path. Keep `shared` as a fallback for direct helper use.
- Preserve the shared warm cache, its cross-process lock, pinned revisions, and concurrent test execution.
  Do not serialize checkouts or change production code.
- Rename the helper to `repoRootForCurrentProject()` and update the e2e README to describe per-project
  clones and the per-invocation run root.

## Verification

- Before: `--project sonarr-v4 --project sonarr-v5` reproduced lock failures.
- After: the same projects passed 54 tests in parallel.
- After: the normal parallel `pnpm test:e2e:arr` passed all 185 tests in 10 files.
