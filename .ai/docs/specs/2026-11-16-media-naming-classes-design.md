# Class-based media naming handlers

**Status:** implemented (2026-11-16)
**Plan:** [2026-11-16-clean-code-yagni.md](../plans/2026-11-16-clean-code-yagni.md)
**Previous spec:** [2026-11-16-media-naming-resource-design.md](./2026-11-16-media-naming-resource-design.md)

## Scope change

The first media-naming split used a function dispatcher. That separated API contracts but did not follow
the repository's class-based pattern for app-specific resources. This change replaces the dispatcher with
handlers constructed by the app syncers.

## Decisions

- `MediaNamingBase<Resource>` owns shared TRaSH lookup and logging. It has no generated API imports.
- `MediaNamingRadarr` and `MediaNamingSonarr` are thin subclasses. Each imports only its own naming resource.
- `RadarrSyncer` and `SonarrSyncer` construct their mapper and inject it through `MediaFeatureSyncs`.
- `mediaPipeline.ts` passes the optional handler to `mergeConfigsAndTemplates`. Apps without a handler keep
  the existing unsupported-media-naming warning.
- Tests cover both concrete mappers and injection of `MediaNamingRadarr` into config merging.
