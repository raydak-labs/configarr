# Agent guidance

Configarr is a TypeScript/Node.js tool that syncs YAML config and TRaSH/Recyclarr templates to \*arr apps.
Full support: Sonarr, Radarr. Experimental: Lidarr, Readarr, Whisparr, Prowlarr.

Rules below are defaults. A deviation needs the user's approval and a one-line comment in code saying why.

## Commands and tests

- Use **pnpm**; scripts in [package.json](package.json). Done means `pnpm build && pnpm test && pnpm lint && pnpm typecheck` pass (`pnpm lint:fix` for Prettier).
- Unit tests: Vitest, `<source>.test.ts` beside its source file; fixtures in `tests/samples/`; mock API clients.
  One test file per source file: add cases to `util.test.ts`, never split into `util.<topic>.test.ts`.
- Sync feature changes need e2e coverage per affected app, including an idempotent second run.
  Setup, matrix, `e2e-` fixtures and cleanup: [tests/arr-e2e/README.md](tests/arr-e2e/README.md). Run `pnpm test:e2e:arr` (separate from `pnpm test`).
- Keep Sonarr v4/v5 and Radarr v5/v6/v7 working; guard version-specific features.
  `pnpm test:e2e:arr` covers all versions; subset with `--project <name>`. Projects and the `ARR_E2E_SEQUENTIAL` switch: `vitest.arr-e2e.config.ts`.

## Architecture

- Entry points: `src/index.ts` (run loop in `src/run.ts`), `src/arr/*Syncer.ts`, the feature directory. Media apps share `src/arr/mediaPipeline.ts`; Prowlarr has its own pipeline without quality profiles or custom formats.
- Features run load → diff → write → opt-in unmanaged cleanup. Keep dry-run and diff reporting intact.
- The instance syncer calls `getClient("SONARR")` (literal type → concrete client) and injects it; feature code receives the client.
  One handler instance per feature per run handles load, diff, write, and cleanup.
- Feature shape by how apps differ:
  - Fields or methods differ: typed `<feature>Base.ts` plus one thin `<feature><App>.ts` per app, constructed in that app's syncer. Model: `src/qualityProfiles/`.
  - Identical across apps: one module of functions, client as first parameter (`manageCf(client, ...)`); pass differences in as arguments.
  - Prowlarr provider resources: extend `src/prowlarr/providerResourceSync.ts`.
- Shared client method sets: generic capabilities in `src/clients/capabilities.ts`. App-only methods stay on that app's client.
- `src/tags/` owns tags for all apps; use only `tags.ts` exports and `renderTags.ts` for diff labels.

## Types and naming

- Use generated resources from `src/__generated__/<app>/`; regenerate with `pnpm generateApi <app>`.
- Fix mapper or class types until they fit; casts, `Merged*` cross-app types, and `any` hide the mismatch. `unknown` at untyped boundaries.
  OpenAPI gaps: intersection type in that app's file only.
- YAML/TRaSH strings → generated enums via `toEnumOrThrow` (`src/util.ts`) in the app's mapper.
- `<feature>.types.ts` holds YAML, TRaSH, and diff types only.
- One app per file/type name (`qualityProfileLidarr.ts`); shared behavior goes on the base. Import the defining module directly (no barrels).
- Config: Zod schemas in `src/types/config.types.ts` and feature dirs; derive TS types. Merging lives in the feature (`src/notifications/mergeNotifications.ts`).
  Stay backward compatible; deprecate with a warning.
- Log via `logger` (`src/logger.ts`).

## Docs and commits

- User-visible changes update `docs/docs/` (https://configarr.de) and `examples/` where relevant.
- Agent docs: `.ai/docs/specs/YYYY-MM-DD-<name>-design.md`, `.ai/docs/plans/YYYY-MM-DD-<name>.md`, cross-linked, one each per PR unless the user agrees otherwise.
  Specs are historical: mark `Status: implemented (YYYY-MM-DD)` at the top; changed decisions go in a new spec linking the old.
- `CHANGELOG.md` is generated from commits by release-it. `feat:`/`fix:` user-facing, `refactor:` internal (all three hit release notes);
  `docs:`, `test:`, `style:`, `chore:` otherwise; CI fixes use `ci:` or `chore(ci):`.
