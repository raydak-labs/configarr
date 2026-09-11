# Prowlarr support — Tags, Applications, Indexers, Indexer Proxies & Download Clients

Status: implemented (2026-09-04, PR #520); review follow-ups applied 2026-09-11 — see
`.ai/docs/plans/2026-09-11-prowlarr-review-followups-plan.md`.

## Why

Issue #519: Prowlarr is the indexer manager in the \*arr stack and usually runs alongside the
supported apps, but configuring it still needed a second tool (e.g. Ansible). Users want
configarr to manage its **Tags**, **Applications** (the Sonarr/Radarr/... sync targets),
**Indexers**, **Indexer Proxies** and **Download Clients**, plus an optional trigger to make
Prowlarr push its indexers to those apps. Support is marked **experimental**.

Prowlarr is not a media manager: no quality profiles, custom formats, quality definitions,
naming, media management, root folders, metadata profiles, delay profiles or languages. So it
gets a dedicated config schema and its own minimal pipeline rather than being fed through the
media `pipeline()`.

## Shape

### API client

- `generate-api.ts` generates `src/__generated__/prowlarr/` from the upstream Prowlarr V1
  OpenAPI spec (`pnpm generateApi`). Prowlarr uses the `/api/v1` prefix (method names `v1*`).
- **`ProwlarrClient`** (`src/clients/prowlarr-client.ts`) implements `IArrClient`. Real methods:
  - system status, health (`testConnection`)
  - tags: list, create, **delete**
  - applications: schema, list, create, update, delete, test, plus `syncAppIndexers()`
    (`POST /api/v1/command` `{ name: "ApplicationIndexerSync" }`; command names are runtime
    strings, not in the OpenAPI spec)
  - indexers: schema, list, create, update, delete, test, plus `getAppProfiles()`
  - indexer proxies: schema, list, create, update, delete, test
  - download clients: schema, list, create, update, delete, test
  - Every media-manager `IArrClient` member throws `"<feature> is not supported for Prowlarr"`
    (same precedent as `SonarrClient.updateRootFolder`). It also carries throwing stubs for the
    client-specific extras the media clients share (`getUiConfig`, `getDownloadClientConfig`,
    remote-path mappings) so `getSpecificClient()`'s structural union stays intact.
- **`"PROWLARR"`** added to `ArrTypeConst`, `ArrTypeToClient`, and the `UnifiedClient` switch.
  `TrashArrSupportedConst` unchanged (Prowlarr excluded from TRaSH paths).
- **Download clients**: Prowlarr's `DownloadClientResource` is _not_ added to the shared union
  (it lacks `removeCompleted/FailedDownloads`); `ProwlarrClient` casts its download-client
  returns to the shared type instead.

### Provider-resource base (`src/prowlarr/`)

Applications, indexers and indexer proxies are all "provider" resources: a named thing backed by
an implementation schema with a `fields[]` array and numeric `tags[]`. They share
`providerResourceSync.ts` (`ProviderResourceSync<TConfig, TResource, TCtx>`), which owns:

- zod validation of each config entry + schema-template lookup (unknown template = error) +
  "may be required" field warnings + name length (≤100) + duplicate-key detection
- field merge onto the schema template (or onto the server fields for a _partial_ update),
  accepting snake_case keys (`normalizeConfigFields`)
- tag name → id resolution and `createMissingTags` (a failed tag create **throws**)
- diffing (`isEqual` / `calculateDiff`): extras, `fields.*`, `tags`; `********` secret masking
  for `password` / `apikey` fields
- partial-vs-full update heuristic: partial when no `fields` overrides but some extra/tag is set
- `delete_unmanaged: { enabled, ignore }` handling (`filterUnmanaged`)
- dry-run short-circuit and `DiffEntry[]` production
- create / update / delete execution

Subclasses supply the client calls, the schema-template lookup, the identity key, an `extras[]`
list of extra top-level props, a `templatePassthrough[]` key list, and an optional
`loadContext()`:

| Subclass           | File                  | Identity                  | Template                                         | Extras                                                                                       | Context / passthrough                                                                                                                                |
| ------------------ | --------------------- | ------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ApplicationSync`  | `applicationSync.ts`  | `name` + `implementation` | `type` = impl. name                              | `syncLevel` (default `fullSync`)                                                             | — ; also `syncApplications()` wrapper that runs `sync()` then the optional `syncAppIndexers` trigger                                                 |
| `IndexerSync`      | `indexerSync.ts`      | `name`                    | `definition` = `definitionName` or schema `name` | `enable` (default `true`), `priority` (default 25), `appProfileId` (from `app_profile` name) | `loadContext()` fetches app profiles; passthrough copies `protocol`, `privacy`, `capabilities`, `indexerUrls`, `definitionName`, … from the template |
| `IndexerProxySync` | `indexerProxySync.ts` | `name` + `implementation` | `type` = impl. name                              | —                                                                                            | —                                                                                                                                                    |

`tagSync.ts` (`syncTags`) ensures `prowlarr.<instance>.tags` labels exist and, with
`delete_unmanaged_tags`, prunes server tags that are neither listed, ignored, nor referenced by a
managed resource (applications / indexers / indexer_proxies / download_clients `tags`).

`prowlarrSyncer.ts` (`syncProwlarrProviders`) orchestrates per instance, in dependency order:
tags → indexer proxies → indexers → applications (+ optional `sync_indexers`). Each sub-sync only
runs when it has `data` or `delete_unmanaged.enabled` (applications also when `sync_indexers`).

`types.ts` re-exports the generated resource types and defines `ProwlarrSyncResult`.

### Config (`src/types/config.types.ts`)

Dedicated `prowlarr: Record<string, InputConfigProwlarrInstanceSchema>` / `prowlarrEnabled`
(default on; kept for parity with the other `<arr>Enabled` flags) in `InputConfigSchemaSchema`.

`InputConfigProwlarrInstanceSchema`:

- `base_url`, `api_key`, `enabled`
- `tags: string[]`, `delete_unmanaged_tags: { enabled, ignore }`
- `indexer_proxies: { data: [{ name, type, fields, tags }], delete_unmanaged }`
- `indexers: { data: [{ name, definition, enable, app_profile, priority, fields, tags }], delete_unmanaged }`
- `applications: { data: [{ name, type, sync_level, fields, tags }], delete_unmanaged, sync_indexers }`
- `download_clients: { data, update_password, delete_unmanaged }` — narrowed: no `config` /
  `remote_paths` (Prowlarr has no such endpoints)

`transformConfig` passes `prowlarr` through untouched (spread); Prowlarr instances never go
through `mergeConfigsAndTemplates` (no templates / TRaSH for Prowlarr).

### Pipeline (`src/index.ts`)

`prowlarrPipeline(instance, name)`: system status → `loadServerTags()` → `syncProwlarrProviders`
→ download clients via the unchanged, arr-type-agnostic `syncDownloadClients("PROWLARR", …)` →
`InstanceDiffReport`. `runProwlarr(entries)` loops the instances (honours `enabled: false`,
`STOP_ON_ERROR`, `LOG_STACKTRACE`) and is invoked by `run()` after the media `arrTypes` loop,
gated on `prowlarrEnabled`. Status is appended to the `totalStatus` summary line.

### Telemetry

`trackFeatureUsage` / `collectTelemetryData` instance param loosened to
`Partial<Record<ArrType, InputConfigArrInstance[]>>` (no Prowlarr-specific counters added).

### Docs & examples

- `docs/docs/configuration/experimental-support.md` — "Prowlarr v1" section (full example)
- `docs/docs/configuration/config-file.md` — "Prowlarr" section
- `config.yml.template`, `AGENTS.md` — Prowlarr mention
- `examples/full` — `prowlarr` + `flaresolverr` services, `prowlarr.xml`, config block, secret

### Tests

- `src/prowlarr/providerResourceSync.test.ts` — the base class through a test-local subclass:
  validation, field merge / partial update / passthrough, tags, every failure path, delete_unmanaged, dry-run
- `src/prowlarr/prowlarrSyncer.test.ts` — section ordering, skipping, and that any sub-sync failure
  aborts the run
- `src/prowlarr/applicationSync.test.ts` — validate, isEqual (syncLevel, secret masking, omitted
  tags), calculateDiff, create, sync_indexers trigger + failure, dry-run
- `src/prowlarr/indexerSync.test.ts` — definition lookup, name matching, create defaults, app-profile
  resolution and failures, delete unmanaged
- `src/prowlarr/indexerProxySync.test.ts` — validate, identity matching, create / update / delete, failures
- `src/prowlarr/tagSync.test.ts` — create missing, prune with keep-set, create/delete failures, no-op
- `src/clients/prowlarr-client.test.ts` — command name, id coercion, testConnection, unsupported stubs
- `src/config.test.ts` — Prowlarr config parsing / rejection / passthrough

## Behavioural rules

### Tag semantics

An omitted `tags` key on a provider config entry means "not managed": `isEqual` skips the tag
comparison and `resolveConfig` re-sends the server's existing tag ids, so an unrelated field
change never wipes tags added on the server. An explicit `tags: []` does clear them.

### Secrets

Server-masked `********` values for `password` / `apikey` fields count as unchanged when the config
supplies a non-empty value, so API keys are not re-sent every run.

### `sync_indexers`

When true, after the applications are synced configarr POSTs the `ApplicationIndexerSync`
command once. In dry-run it is only reported. A rejected command fails the instance.

### Error model

Failures in the core Prowlarr resources are **fatal for the instance**, matching the
quality-profile precedent in the media pipeline: log a descriptive message, then throw. This makes
`runProwlarr` count the instance as a failure and lets `STOP_ON_ERROR` work.

Fatal:

- `syncTags`: a tag that cannot be created or deleted.
- `ProviderResourceSync.sync`: any create / update / delete rejected by the server, and
  `createMissingTags`. The error carries the resource label and name
  (`Create Indexer 'x' failed: <message>`), and the server response body is logged at debug level.
- `syncProwlarrProviders`: nothing is caught; the first failing section aborts the remaining ones,
  so a broken tag sync never lets a half-configured indexer or application be written.
- `IndexerSync.loadContext`: a failed `getAppProfiles()`.
- `ApplicationSync`: a rejected `ApplicationIndexerSync` command. The user opted in with
  `sync_indexers: true`, so a silent success would be misreporting.

Non-fatal (logged and skipped):

- **Validation** of a single config entry (unknown implementation / definition, duplicate name,
  zod failure). The item is skipped and the rest of the section still syncs, matching the shared
  download-client behaviour.
- **Download clients** in `prowlarrPipeline`, which keep the media-pipeline behaviour
  (catch-log-continue) for parity with the other \*arrs.

### App profiles

An indexer's `app_profile` name must resolve to a profile that exists on the server; an unknown
name throws and names the available profiles. Without `app_profile`, an update keeps the indexer's
existing `appProfileId` and a create uses the first profile on the server. If the server has no app
profile at all, the sync fails rather than guessing id `1`.

### `delete_unmanaged`

Defaults off everywhere. On Prowlarr this is more dangerous than on a media manager: deleting
unmanaged applications unlinks the arr stack, deleting indexers removes them from every app.
Docs must carry an explicit warning.

## Out of scope

App sync profiles (only referenced by name from indexers), notifications, DNS/host config,
`arr-e2e` compose service, recyclarr/TRaSH templates for Prowlarr, per-arr telemetry counters for
Prowlarr.

## Review history

- Sourcery (2026-09-04): omitted `tags` wiped server tags → fixed (45cb492); tag-create failure
  silently counted → count/diff now only on success (45cb492), superseded by the throw-on-failure
  target above; `ApplicationIndexerSync` failure swallowed → kept non-fatal at the time, now part
  of the error-model follow-up.
- BlackDark (2026-09-10, changes requested): sub-sync error swallowing / `STOP_ON_ERROR`;
  app-profile fallback to `1`; unrelated `src/__generated__/sonarr/data-contracts.ts` churn;
  missing tests for indexer proxies / provider base / client failure paths; `delete_unmanaged`
  warning in docs; `prowlarrEnabled` flag stays; spec ⇄ implementation drift.
- All of the above addressed on 2026-09-11; `prowlarrEnabled` kept as-is per the reviewer's own
  follow-up ("okay to keep because have it for all").
