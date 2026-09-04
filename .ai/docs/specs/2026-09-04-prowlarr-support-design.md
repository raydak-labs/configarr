# Prowlarr support — Tags, Applications, Indexers, Indexer Proxies & Download Clients

Status: implemented (2026-09-04)

## Why

Prowlarr is the indexer manager in the \*arr stack. Users want configarr to manage its
**Tags**, **Applications** (the Sonarr/Radarr/... sync targets), **Indexers**, **Indexer
Proxies** and **Download Clients**, plus an optional trigger to make Prowlarr push its
indexers to those apps.

## Provider-resource base

Applications, indexers and indexer proxies are all "provider" resources: a named thing
backed by an implementation schema with a `fields[]` array and numeric `tags[]`. They share
`src/prowlarr/providerResourceSync.ts` (`ProviderResourceSync<TConfig, TResource, TCtx>`),
which owns validation, field-merge, tag creation, diffing, dry-run and diff entries.
Subclasses (`ApplicationSync`, `IndexerSync`, `IndexerProxySync`) supply the client calls,
the schema-template lookup, the identity key, an `extras[]` list of extra top-level props
(`syncLevel`; `enable`/`priority`/`appProfileId`), a `templatePassthrough[]` key list, and
an optional `loadContext()` (indexers load app profiles to resolve `app_profile` → id).

`src/prowlarr/tagSync.ts` ensures `prowlarr.<instance>.tags` labels exist and optionally
prunes server tags not listed / ignored / referenced by a managed resource.
`src/prowlarr/prowlarrSyncer.ts` orchestrates: tags → indexer proxies → indexers →
applications. Indexers match the server by `name` and are based on a schema `definition`
(`definitionName`); applications and proxies match by `name` + `implementation`.

Prowlarr is not a media manager: no quality profiles, custom formats, quality definitions,
naming, media management, root folders, metadata profiles, delay profiles or languages. So it
gets a dedicated config schema and its own minimal pipeline rather than being fed through the
media `pipeline()`.

## Shape

- **API client**: generated from the upstream OpenAPI spec (`generate-api.ts` → `pnpm generateApi`)
  into `src/__generated__/prowlarr/`. Prowlarr uses the `/api/v1` prefix (method names `v1*`).
- **`ProwlarrClient`** (`src/clients/prowlarr-client.ts`) implements `IArrClient`. Real methods:
  system status, health/`testConnection`, tags, download-client CRUD + schema + test,
  application CRUD + schema + test, and `syncAppIndexers()` (`POST /api/v1/command`
  `{ name: "ApplicationIndexerSync" }`). Every media-manager `IArrClient` member throws
  `"<feature> is not supported for Prowlarr"` (same precedent as `SonarrClient.updateRootFolder`).
  It also carries throwing stubs for the client-specific extras the media clients share
  (`getUiConfig`, `getDownloadClientConfig`, remote-path mappings) so `getSpecificClient()`'s
  structural union stays intact.
- **`"PROWLARR"`** added to `ArrTypeConst`, `ArrTypeToClient`, and the `UnifiedClient` switch.
  `TrashArrSupportedConst` unchanged (Prowlarr excluded from TRaSH paths).
- **Download clients**: reuse `BaseDownloadClientSync` / `GenericDownloadClientSync` unchanged
  — it is already arr-type-agnostic and works through `getUnifiedClient()`. Prowlarr's
  `DownloadClientResource` is _not_ added to the shared union (it lacks
  `removeCompleted/FailedDownloads`); `ProwlarrClient` casts its download-client returns to the
  shared type instead.
- **Applications**: `src/applications/` — `application.types.ts`, `applicationSync.ts`
  (`ApplicationSync` class: validate + schema field-merge + tag resolution + diff +
  create/update/delete + optional `syncAppIndexers`), `applicationSyncer.ts` (thin
  `syncApplications(config, serverCache)` entry). Single class, no base/generic split, because
  Prowlarr is the only \*arr with this concept. Mirrors the download-client sync logic
  (identity on `name` + `implementation`, `********` secret masking, snake_case field
  normalization, partial vs full update).
- **Config**: dedicated `prowlarr:` / `prowlarrEnabled` in `InputConfigSchemaSchema`.
  `InputConfigProwlarrInstanceSchema` = `base_url` / `api_key` / `enabled` / `applications`
  (`data`, `delete_unmanaged`, `sync_indexers`) / `download_clients` (narrowed: `data`,
  `update_password`, `delete_unmanaged` — no `config` / `remote_paths`).
  `transformConfig` passes `prowlarr` through untouched (spread); Prowlarr instances never go
  through `mergeConfigsAndTemplates`.
- **Pipeline**: `prowlarrPipeline()` + `runProwlarr()` in `src/index.ts` (system status → tags
  → download clients → applications). `run()` invokes `runProwlarr` after the media
  `arrTypes` loop, gated on `prowlarrEnabled` (default on).
- **Telemetry**: `trackFeatureUsage` / `collectTelemetryData` instance param loosened to
  `Partial<Record<ArrType, InputConfigArrInstance[]>>` (no Prowlarr-specific counters added).

## Tag semantics

An omitted `tags` key on a provider config entry means "not managed": `isEqual` skips the
tag comparison and `resolveConfig` re-sends the server's existing tag ids, so an unrelated
field change never wipes tags added on the server. An explicit `tags: []` does clear them.
`tagSync` failures are non-fatal (count/diff only reflect successful writes); a provider that
actually needs a missing tag still fails its own create/update via
`ProviderResourceSync.createMissingTags`.

## Out of scope

Prowlarr indexers, indexer proxies, app sync profiles, notifications; `arr-e2e` compose
service; recyclarr/TRaSH templates for Prowlarr; per-arr telemetry counters for Prowlarr.
