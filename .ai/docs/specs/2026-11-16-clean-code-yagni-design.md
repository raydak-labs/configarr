# Clean code and YAGNI cleanup

**Status:** implemented (2026-11-16)
**Plan:** [2026-11-16-clean-code-yagni.md](../plans/2026-11-16-clean-code-yagni.md)

## Problem

The non-generated source contains copied HTTP-client leftovers, unused exported types, commented-out
implementations, repeated environment parsing, and comments that narrate what the code already says.
These add reading and maintenance cost without providing behavior. The largest modules also exceed the
repository's size guidance, but splitting them would require separate feature-oriented design work.

## Decisions

- Keep configuration, synchronization, API payloads, and error propagation behavior unchanged.
- Reuse one Zod boolean transform for all boolean environment variables and read the parsed environment
  once per helper call.
- Remove unused declarations only after checking source, tests, and generated-client references.
- Replace reducers and intermediate arrays with direct loops or mappings where that shortens the code.
  Use `unknown` for caught errors in the touched files and remove an obsolete TypeScript suppression.
- Keep comments that explain security boundaries, API quirks, compatibility, or non-obvious control flow.
  Remove commented-out code, stale TODO prompts, and comments that repeat identifiers or control flow.
- Add a regression test for the simplified FormData construction. Existing tests cover the other touched
  behavior; no sync feature changes require new end-to-end cases.

## Out of scope

- Changes under `src/__generated__/`.
- Splitting `config.ts`, `qualityProfileBase.ts`, `mediaPipeline.ts`, or large API clients. Those efforts
  need their own specifications and behavior-focused coverage.
- New features, configuration changes, dependency updates, and formatting-only rewrites of untouched files.
