# Configarr - AI Agent Quick Start Guide

## Project Overview

**Configarr** is a configuration and synchronization tool for \*arr applications (Sonarr, Radarr, Lidarr, Readarr, Whisparr). It integrates with TRaSH Guides to automate custom formats, quality profiles, and other settings.

- **Language**: TypeScript (Node.js)
- **Package Manager**: **pnpm** (always use `pnpm`, never `npm` or `yarn`)
- **Build Tool**: esbuild
- **Test Framework**: Vitest
- **Code Style**: Prettier

## Quick Setup

```bash
# Install dependencies
pnpm install

# Development
pnpm start              # Run the application
pnpm test              # Run tests
pnpm test:watch        # Run tests in watch mode
pnpm build             # Build for production
pnpm lint              # Check formatting
pnpm lint:fix          # Fix formatting
pnpm typecheck         # TypeScript type checking
```

## Development Rules

Before considering work complete, all must pass: `pnpm build && pnpm test && pnpm lint && pnpm typecheck`.

- Use strict typing; `unknown` over `any`. Interfaces for public APIs, types for internal use.
- Architecture: **Base Classes** abstract shared logic per feature (`BaseMetadataProfileSync`, `BaseRootFolderSync`) → **type-specific implementations** extend them per \*arr type → a **Factory** instantiates the right one → a **Syncer** orchestrates create/update/delete. See "Typed per-*arr clients" below for which pattern (A/B/C) a new feature needs.

## AI-Internal Documentation

Store design, architecture, and implementation planning documents created during agent-assisted development in `.ai/docs/` — not in `docs/` (user-facing documentation for configarr.de):

- **`.ai/docs/specs/`** — feature design and architecture decisions
- **`.ai/docs/plans/`** — step-by-step implementation plans

Specs are dated and fixed, not living documents — a spec is a record of the decision made at that time, not a description of current code (read the code for that). Do not edit a spec's decisions after the fact to match later changes.

- Filename: `YYYY-MM-DD-feature-name-design.md` (specs) / `YYYY-MM-DD-feature-name.md` (plans).
- Cross-link: plan links back to its spec at the top; spec links forward to its plan once one exists.
- When a spec's implementation lands, add a one-line `Status: implemented (YYYY-MM-DD)` at the top — don't rewrite the body.
- Superseding a past decision: write a new dated spec that links to the old one and states what changed and why. Never rewrite history in place.

## Key Concepts

### \*arr Type Support

The project supports multiple \*arr applications with varying feature support:

- **Full Support**: Sonarr v4, Radarr v5
- **Experimental**: Lidarr, Readarr, Whisparr
- **Experimental (Prowlarr v1)**: Tags, Applications, Indexers, Indexer Proxies, Download Clients
  (dedicated `prowlarr:` config block and its own minimal pipeline in `index.ts`; not a media
  manager, so quality profiles / custom formats / etc. do not apply). Provider resources share a
  generic base (`src/prowlarr/providerResourceSync.ts`); see `src/prowlarr/` and
  `src/clients/prowlarr-client.ts`.

### Typed per-*arr clients

Callers use `getClient<T>(arrType)` (`src/clients/client.ts`). A literal arr type returns that concrete class (`getClient("SONARR")` → `SonarrClient`). A variable `ArrType` / `MediaArrType` returns a union.

Media clients implement small capabilities in `src/clients/capabilities.ts` (System, Tags, DownloadClients, QualityProfiles, CustomFormats, QualityDefinitions) plus their own methods. Prowlarr implements System + Tags + DownloadClients only — no media stubs.

- **Pattern A** — fields or methods differ per arr: factory `switch` with **one case per arr** + literal `getClient("LIDARR")`. One class file per *arr (`qualityProfileLidarr.ts`). Shared _behavior_ lives on the base as unnamed helpers (`attachMinUpgradeOnCreate`, `PathRootFolderSync`). Do not mash products into filenames or type names (`qualityProfileLidarrReadarr.ts`, `QualityProfileRadarrWhisparrResource`).
  - Do not put per-arr classes in a `*Generic.ts` file. If 3+ arrs share behavior (path-only root folders, media naming persist), put that behavior on the typed base and keep one thin class file per arr. Pass-through CRUD belongs on the base via `getApi()` plus a capability generic (`DelayProfilesClient<T>`, `QualityDefinitionsClient<T>`) — same as download clients. YAML string → generated string enum uses `toEnumOrThrow(Enum, value, label)` with that arr’s enum object (`getClient("RADARR")` still binds the arr). A variable `arrType` cannot carry five distinct enums. Shared lifecycle lives on the typed base (`BaseDelayProfileSync`, `QualityDefinitionPreferredSync`, `MediaManagementSync`).
- Pipeline: **one** `createXSync(arrType)` per feature per instance run. Load, diff, persist, and delete all go through that object (`persist` / `persistNaming` on the instance). Do not `new` a second handler to write. Test helpers that wrap `createXSync` are fine; `index.ts` must not call them for persist.
- **Pattern B** — same method set **and** same field set (custom formats, tags): one module. Capability generic (`CustomFormatsClient<CF>`). The request type must be assignable to each arr’s generated resource so the client passes it to swagger as-is. Do not split into 5 handlers.
- **Pattern C** — Prowlarr-only (`src/prowlarr/providerResourceSync.ts`). Media managers do not get a Pattern C.

Client methods take that arr’s generated resource from `__generated__/<arr>/data-contracts` (same type the handler in that arr’s class file uses). YAML/TRaSH strings become generated enums in that arr’s mapper (`toEnumOrThrow(DownloadProtocol, value, "preferredProtocol")`, or `toDownloadProtocol` when undefined should default). OpenAPI gaps are an intersection in that arr file only (`DelayProfileResource & { items: ... }` in `delayProfileLidarr.ts`).

Shared `src/<feature>/*.types.ts` holds YAML, TRaSH, and diff types — not product payloads (`ProwlarrDownloadClientResource`). Prowlarr uses `__generated__/prowlarr` `DownloadClientResource` in `downloadClientProwlarr.ts` / `prowlarr-client.ts`.

Import the real module (`qualityProfileBase.ts`). Do not add barrels that only re-export.

Do not introduce `Merged*` intersection types for client or cache returns. Do not assert mapping types onto generated resources (`as QualityProfileResource`); if it is not assignable, fix the mapper or the class’s type.

### Configuration System

- **YAML-based** configuration with `config.yml`
- **Template support** - Recyclarr templates, TRaSH Guides, local files, URLs
- **Secrets management** - `!secret`, `!env` and `!file` tags for sensitive data
- **Type-safe** - Zod schemas for validation

### Sync Architecture

Each feature (quality profiles, custom formats, metadata profiles, root folders) follows:

1. **Load** - Fetch current server state
2. **Calculate Diff** - Compare config vs. server
3. **Sync** - Create/update/delete resources
4. **Cleanup** - Optionally delete unmanaged items

## Testing

- Unit tests: `*.test.ts` alongside source. Samples: `tests/samples/`. Mock API clients with Vitest.

## Adding a New \*arr Feature

Add methods on the concrete \*arr clients (shared method sets go in `src/clients/capabilities.ts`), pick a pattern (A/B/C, see above), implement base + type-specific classes, wire the factory and syncer, update the pipeline in `index.ts`, add tests.

## Important Notes

- **Never edit `CHANGELOG.md` manually** — generated by CI release automation. Describe user-facing changes in commits/PRs instead.
- **Backward compatibility** — maintain existing APIs when refactoring.
- **Logging** — use the `logger` instance, not `console`.

## Commit Message Conventions

`release-it` + `@release-it/conventional-changelog` (see `.release-it.json`) auto-generate `CHANGELOG.md` and GitHub Release notes from commit messages. Only `feat`, `fix`, and `refactor` (as "(internal) Refactorings") produce changelog entries — every other type is silently omitted. Pick the type based on whether a **user** of configarr would care:

- `feat:` / `fix:` — user-facing changes only: new features, behavior changes, bugs that affected the running application.
- `ci:` or `chore(ci):` — GitHub Actions workflows, release pipeline, zizmor, etc. Never `fix(ci):` or `feat(ci):`, even when fixing a real bug in a workflow — it's not user-facing and would add a bogus entry to the changelog.
- `docs:` — documentation-only changes.
- `chore:` — tooling/maintenance with no functional impact (dependency bumps are already handled by Renovate as `chore(deps):` / `fix(deps):`).
- `test:` / `style:` — test-only or formatting-only changes.

## Resources

- Docs: https://configarr.de · Repo: https://github.com/raydak-labs/configarr · TRaSH Guides: https://trash-guides.info/
- Recyclarr config templates are compatible.
