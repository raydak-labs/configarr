# Clean code and YAGNI cleanup

**Spec:** [2026-11-16-clean-code-yagni-design.md](../specs/2026-11-16-clean-code-yagni-design.md)

## Steps

1. Audit non-generated TypeScript and record a clean baseline with build, unit tests, formatting, and
   typecheck. Note unrelated baseline failures instead of changing unrelated files.
2. Simplify shared infrastructure:
   - Reuse the boolean environment schema and compact `getHelpers`.
   - Simplify logger level padding and remove dead configuration.
   - Use `unknown` for errors caught in `run.ts` and `ky-client.ts`.
3. Remove YAGNI candidates:
   - Unused HTTP response types and request-merge helper.
   - Unused custom-format types and the duplicate `ROOT_PATH` export.
   - Commented-out implementations in environment, HTTP, template, logger, and media-pipeline code.
4. Simplify FormData construction, custom-format field mapping, sparse checkout handling, and small utility
   functions without changing their return values or side effects.
5. Compact comments in touched notification and diff-report code while retaining security and API rationale.
6. Add FormData regression coverage to `ky-client.test.ts`; run focused tests for all touched behavior.
7. Verify with `pnpm build`, `pnpm test`, `pnpm lint`, and `pnpm typecheck`. Do not run arr e2e tests because
   no synchronization behavior changes.

## Follow-up: large module splits

**Spec:** [2026-11-16-large-module-splits-design.md](../specs/2026-11-16-large-module-splits-design.md)

8. Commit `refactor: extract Sonarr resource mapping`: move generated-resource conversion and quality-size
   mapping out of `sonarr-client.ts`; run Sonarr client, quality-profile Sonarr, and media-pipeline tests.
9. Commit `refactor: split quality profile mapping and synchronization`: extract quality/group/cutoff mapping
   and the base sync class; update direct imports and run quality-profile, config, and media-pipeline tests.
10. Commit `refactor: split config loading templates and merging`: extract template includes, instance
    merging, and media naming; update mocks and run config, arr, and importer tests.
11. Run the full validation gate on the combined commits, update PR #629, and check GitHub CI.
12. Commit `refactor: split media naming by arr type`: create a dedicated media-naming resource with a
    shared TRaSH lookup, thin Radarr and Sonarr mappers, and a contract-free dispatcher. Add focused tests,
    remove `configMediaNaming.ts`, and rerun the full validation gate.

**Follow-up spec:** [2026-11-16-media-naming-resource-design.md](../specs/2026-11-16-media-naming-resource-design.md)

13. Commit `refactor: use app-specific media naming classes`: replace the function dispatcher with a typed
    base class and thin per-app handlers. Construct handlers in the Radarr and Sonarr syncers, inject them
    through `MediaFeatureSyncs`, and test config-merge injection.

**Class design spec:** [2026-11-16-media-naming-classes-design.md](../specs/2026-11-16-media-naming-classes-design.md)
