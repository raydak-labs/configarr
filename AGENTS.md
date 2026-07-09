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

### ✅ Must Do After Every Implementation

1. **Run all three checks** - ALL must pass before considering work complete:
   ```bash
   pnpm build && pnpm test && pnpm lint
   ```
2. **Type checking** - Ensure no TypeScript errors:
   ```bash
   pnpm typecheck
   ```

### 🎯 Coding Standards

1. **Follow Existing Patterns**
   - Study similar existing code before implementing new features
   - Maintain consistency with current architecture
   - Use established patterns (e.g., rootFolder pattern for new modules)

2. **TypeScript Best Practices**
   - Use strict typing - avoid `any` when possible
   - Prefer interfaces for public APIs, types for internal use
   - Use type inference where it improves readability
   - Leverage union types and discriminated unions
   - Use `unknown` instead of `any` for truly unknown types

3. **Architecture Patterns**
   - **Base Classes** - Abstract common logic (e.g., `BaseMetadataProfileSync`, `BaseRootFolderSync`)
   - **Type-Specific Implementations** - Extend base classes for each \*arr type
   - **Factory Pattern** - Use factories to instantiate correct implementation
   - **Syncer Pattern** - Orchestrate sync operations (create/update/delete)

4. **Code Organization**
   - Group related functionality in directories (e.g., `metadataProfiles/`, `rootFolder/`)
   - Use meaningful file names that reflect purpose
   - Keep client abstractions in `clients/`
   - Type definitions in `types/` or local `*.types.ts` files
   - Generated API code in `__generated__/`

## AI-Internal Documentation

Store design, architecture, and implementation planning documents created during agent-assisted development in `.ai/docs/` — not in `docs/` (user-facing documentation for configarr.de):

- **`.ai/docs/specs/`** — feature design and architecture documents
- **`.ai/docs/plans/`** — step-by-step implementation plans

Use dated filenames (e.g. `2026-07-06-feature-name-design.md`). Cross-reference specs from plans when both exist.

## Project Structure

```
src/
├── __generated__/         # Auto-generated API clients (don't modify)
├── clients/               # API client abstractions
│   ├── unified-client.ts  # Unified interface for all *arr types
│   ├── radarr-client.ts
│   ├── sonarr-client.ts
│   └── ...
├── metadataProfiles/      # Metadata profiles sync (Lidarr/Readarr)
│   ├── metadataProfileBase.ts
│   ├── metadataProfileLidarr.ts
│   ├── metadataProfileReadarr.ts
│   └── metadataProfileSyncer.ts
├── rootFolder/            # Root folder sync
├── types/                 # Type definitions
│   ├── config.types.ts    # Configuration types
│   ├── common.types.ts    # Shared types
│   └── ...
├── config.ts              # Configuration loading/merging
├── index.ts               # Main entry point
└── ...
```

## Key Concepts

### \*arr Type Support

The project supports multiple \*arr applications with varying feature support:

- **Full Support**: Sonarr v4, Radarr v5
- **Experimental**: Lidarr, Readarr, Whisparr

### Unified Client Pattern

All \*arr clients implement `IArrClient` interface:

- Provides consistent API across different \*arr types
- Optional methods for features not supported by all types (e.g., `getMetadataProfiles?()`)
- Type-safe with generics for quality profiles, custom formats, etc.

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

- **Unit tests**: `*.test.ts` files alongside source
- **Samples**: Test data in `tests/samples/`
- **Mocking**: Use Vitest mocks for API clients
- **Coverage**: Run `pnpm coverage` to check coverage

## Common Tasks

### Adding Support for New \*arr Feature

1. Check if unified client needs new optional methods
2. Create feature directory (e.g., `featureName/`)
3. Implement base class with abstract methods
4. Create type-specific implementations
5. Add factory function and syncer
6. Update main pipeline in `index.ts`
7. Add tests
8. Run: `pnpm build && pnpm test && pnpm lint && pnpm typecheck`

### Modifying Existing Feature

1. Locate relevant files (base class, implementations, syncer)
2. Make changes following existing patterns
3. Update tests
4. Run: `pnpm build && pnpm test && pnpm lint && pnpm typecheck`

### Adding New Configuration Options

1. Update types in `types/config.types.ts`
2. Update configuration merging in `config.ts`
3. Implement feature logic
4. Update documentation (if needed)
5. Run all checks

## Important Notes

- **Never edit `CHANGELOG.md` manually** — it is created and maintained by CI/CD (e.g. release automation). Do not add, remove, or rewrite changelog entries by hand; describe user-facing changes in PRs/commits so the pipeline can record them.
- **Never commit without passing all checks**: build, test, lint, typecheck
- **Always use pnpm** - not npm or yarn
- **Backward compatibility** - Maintain existing APIs when refactoring
- **Type safety** - Prefer compile-time errors over runtime errors
- **Logging** - Use the `logger` instance for consistent logging
- **Error handling** - Graceful degradation, informative error messages

## Commit Message Conventions

`release-it` + `@release-it/conventional-changelog` (see `.release-it.json`) auto-generate `CHANGELOG.md` and GitHub Release notes from commit messages. Only `feat`, `fix`, and `refactor` (as "(internal) Refactorings") produce changelog entries — every other type is silently omitted. Pick the type based on whether a **user** of configarr would care:

- `feat:` / `fix:` — user-facing changes only: new features, behavior changes, bugs that affected the running application.
- `ci:` or `chore(ci):` — GitHub Actions workflows, release pipeline, zizmor, etc. Never `fix(ci):` or `feat(ci):`, even when fixing a real bug in a workflow — it's not user-facing and would add a bogus entry to the changelog.
- `docs:` — documentation-only changes.
- `chore:` — tooling/maintenance with no functional impact (dependency bumps are already handled by Renovate as `chore(deps):` / `fix(deps):`).
- `test:` / `style:` — test-only or formatting-only changes.

## Resources

- **Documentation**: https://configarr.de
- **Repository**: https://github.com/raydak-labs/configarr
- **TRaSH Guides**: https://trash-guides.info/
- **Recyclarr Compatibility**: Config templates are compatible

## Getting Help

When implementing new features:

1. Look for similar existing implementations
2. Follow established patterns (especially rootFolder/metadataProfiles)
3. Keep TypeScript strict typing
4. Test thoroughly
5. Ensure all checks pass
