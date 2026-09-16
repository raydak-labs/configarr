# Per-arr instance syncers

Status: implemented (2026-09-16).

Replace `pipeline(arrType)` + `prowlarrPipeline()` in `src/index.ts` with per-arr classes. Support is which methods each syncer calls, not runtime `arrType` switches in a shared media body.

## External seam

`new SonarrSyncer().run(...)`, `new RadarrSyncer().run(...)`, …, `new ProwlarrSyncer().run(...)`.

No `createInstanceSync` factory. `configureApi` / `getClient` / `unsetApi` stay in `runInstances` in `index.ts`. Feature syncers take the typed client in the constructor.

## Shared media steps

`src/arr/mediaPipeline.ts`:

- `runMediaSyncToQualityProfiles` — start through quality-profile persist + optional unmanaged QP delete. Stops before metadata.
- `completeMediaSync` — root folders through remote paths, then `{ arrType, instanceName, entries }`.

One injected feature-sync instance per feature is passed in as `syncs`. Root folders use `ctx.syncs.root.syncRootFolders` (no second handler).

## TRaSH / metadata

- TRaSH only from Sonarr/Radarr via `createTrashOps("SONARR"|"RADARR")`. Whisparr/Lidarr/Readarr omit `trash`.
- Metadata only from Lidarr/Readarr via `new LidarrMetadataProfileSync(client)` / `new ReadarrMetadataProfileSync(client)` (never null), after quality profiles and before `completeMediaSync`.

## What was not done

- No `MediaClient` mega-interface.
- No constructor-inject of clients into feature syncers.
- Pattern B (`manageCf`, tags, UI config, remote paths, download client config) still takes `arrType`.
- No `UiConfigClient`.
- Pattern A class internals unchanged.
