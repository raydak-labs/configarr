# Quality profile stability implementation plan

[Design](../specs/2026-11-14-quality-profile-stability-design.md)

1. Add an optional integer group `id` (`>= 1000`) and enforce it during mapping, including lenient-validation mode.
2. Resolve ids in two passes: reserve explicit ids, reuse unclaimed server ids by group name, then allocate `1000 + index` without collisions.
3. Use item kind plus name for group/quality identity. Preserve undeclared qualities at their server-relative positions and compare ids and nested item lengths in diffs.
4. With upgrades disabled, honor configured cutoff values. Preserve omitted server cutoff fields on update, translating the cutoff to remapped ids when needed.
5. Add unit tests for id precedence and validation, ordering, same-name groups/qualities, cutoff preservation, and repeat-sync idempotency.
6. Add live group-reorder coverage to every supported media app, asserting stored ids, cutoff, and an up-to-date second run.
7. Update `docs/docs/configuration/config-file.md` and run `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm test:e2e:arr`.
