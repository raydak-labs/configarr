# Large module splits

**Status:** implemented (2026-11-16)
**Plan:** [2026-11-16-clean-code-yagni.md](../plans/2026-11-16-clean-code-yagni.md)
**Previous spec:** [2026-11-16-clean-code-yagni-design.md](./2026-11-16-clean-code-yagni-design.md)

## Scope change

The initial cleanup deferred large module splits. The follow-up request makes them required, superseding
that part of the previous spec. Each large module is split in its own behavior-preserving commit.

## Decisions

- **Sonarr:** `sonarr-resource-mapper.ts` owns generated v3/v5 resource conversion, quality-size mapping,
  and related public resource types. `sonarr-client.ts` remains the API endpoint facade; app-only endpoint
  methods stay on that client as required by the architecture guidance.
- **Quality profiles:** `qualityProfileQualities.ts` owns quality/group mapping, ordering, and cutoff
  translation. `qualityProfileSyncBase.ts` owns server synchronization and its diff result type. Shared
  scoring, field helpers, validation, diff entries, and conflict checks stay in `qualityProfileBase.ts`.
- **Config:** `config.ts` retains file loading, secrets, transformation, and validation.
  `configTemplates.ts` handles include resolution and template application. `configMerge.ts` handles global,
  template, and instance merging. `configMediaNaming.ts` handles TRaSH naming conversion.
- Callers import moved declarations from their defining modules directly. No barrels or compatibility
  re-exports are introduced.
- Existing test suites remain the behavior oracle, with imports and mocks updated to the defining modules.
  Generated TypeScript and runtime behavior remain unchanged.

## Out of scope

- Feature redesign, endpoint consolidation, or behavior changes intended only to reduce line counts.
- Splitting other large files not named in the follow-up request.
- New arr e2e cases because no synchronization behavior changes.
