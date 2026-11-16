# Arr e2e repository isolation

**Spec:** [2026-11-16-arr-e2e-repo-isolation-design.md](../specs/2026-11-16-arr-e2e-repo-isolation-design.md)

## Steps

1. Reproduce the parallel failure on clean `main` and confirm sequential mode passes.
2. Trace clone paths and show that versioned projects share each app test file basename.
3. Inject the configured project name through `test.env` and include it in the clone path.
4. Re-run the two-Sonarr reproduction, then the complete parallel arr e2e suite.
5. Update helper names and `tests/arr-e2e/README.md`.
6. Run `pnpm build`, `pnpm test`, `pnpm lint`, and `pnpm typecheck`.
