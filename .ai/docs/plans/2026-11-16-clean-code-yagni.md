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
