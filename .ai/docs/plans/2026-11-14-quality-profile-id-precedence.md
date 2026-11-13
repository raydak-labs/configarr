# Quality profile id precedence implementation plan

[Design](../specs/2026-11-14-quality-profile-id-precedence-design.md)

1. Split group-id resolution in `mapQualities()` into two passes: reserve explicit ids, then reuse
   unclaimed server ids by name.
2. Add the runtime `typeof`/integer/`>= 1000` guard beside the existing id checks.
3. Add `translateServerCutoff()` and use it on update when `upgrade.allowed` is false and
   `until_quality` is omitted; keep the existing fallback when translation is not possible.
4. Preserve `serverMatch.cutoffFormatScore` on update when `until_score` is omitted.
5. Add unit tests for precedence, runtime range validation, cutoff preservation and remap
   translation; update the Radarr diff test that previously expected a fallback.
6. Document the precedence and the preserved cutoff in `docs/docs/configuration/config-file.md`.
7. Run `pnpm build`, `pnpm test`, `pnpm lint` and `pnpm typecheck`. The `cloneGitRepo` test in
   `src/util.test.ts` exceeds its 5s timeout on Windows; it passes in isolation and when the suite
   is run with a larger timeout.
