# Sonarr v5 API support

Status: proposed. Not yet implemented.

## Why

Sonarr v5.0.0.2569 shipped as a beta on 2026-10-12 on the `develop` branch. It introduces a
second, versioned API project (`src/Sonarr.Api.V5`) served at `/api/v5`, while `Sonarr.Api.V3`
remains available at `/api/v3`. The two surfaces differ in more than the route prefix: the v5 API
drops fields the v3 API still exposes, renames the whole settings group, and moves server-side
behavior between resources. Configarr currently generates its Sonarr client from
`src/Sonarr.Api.V3/openapi.json` on `develop`, so as soon as v5 beta users point configarr at a
v5 instance the sync silently operates on a different contract than the one the code was written
against.

This is not a "new arr" problem. Prowlarr needed a new arr because it is a different product with
a different feature set. Sonarr v5 is the same product with a second API contract that will
eventually replace the first, so it is modeled as a second contract for the same arr.

## Upstream facts

Verified against the Sonarr repo on 2026-10-12.

- `Sonarr.Api.V5/openapi.json` (openapi 3.0.4, version 5.0.0, 169 paths, 180 schemas) is the v5
  surface. Its description states it applies to Sonarr v5 only.
- `Sonarr.Api.V3/openapi.json` on `develop` is the v5-compatible v3 surface (155 `/api/v3` paths).
  Both routers are registered by the v5 host, so a v5 instance answers `/api/v3` too.
- Route prefix: `/api/v3/*` becomes `/api/v5/*`.
- The settings group is renamed from `config` to `settings`. Every configarr media-management,
  naming, UI-config and download-client-config call moves with it.
- Auth is unchanged: `X-Api-Key` header, plus `apikey` query parameter. Basic auth removal in v5
  affects the web UI, not the API key.

| Contract                  | v3 path                          | v5 path                            |
| ------------------------- | -------------------------------- | ---------------------------------- |
| system status             | `/api/v3/system/status`          | `/api/v5/system/status`            |
| health                    | `/api/v3/health`                 | `/api/v5/health`                   |
| custom format CRUD        | `/api/v3/customformat`           | `/api/v5/customformat`             |
| quality profile CRUD      | `/api/v3/qualityprofile`         | `/api/v5/qualityprofile`           |
| quality definition CRUD   | `/api/v3/qualitydefinition`      | `/api/v5/qualitydefinition`        |
| delay profile CRUD        | `/api/v3/delayprofile`           | `/api/v5/delayprofile`             |
| media management settings | `/api/v3/config/mediamanagement` | `/api/v5/settings/mediamanagement` |
| naming settings           | `/api/v3/config/naming`          | `/api/v5/settings/naming`          |
| UI settings               | `/api/v3/config/ui`              | `/api/v5/settings/ui`              |
| download client settings  | `/api/v3/config/downloadclient`  | `/api/v5/settings/downloadclient`  |
| root folders              | `/api/v3/rootfolder`             | `/api/v5/rootfolder`               |
| remote path mappings      | `/api/v3/remotepathmapping`      | `/api/v5/remotepathmapping`        |
| release profiles          | `/api/v3/releaseprofile`         | `/api/v5/releaseprofile`           |
| download client CRUD      | `/api/v3/downloadclient`         | `/api/v5/downloadclient`           |
| tags                      | `/api/v3/tag`                    | `/api/v5/tag`                      |

Fields whose meaning changes between the two contracts, which is what makes a naive generated
swap unsafe:

| Resource             | v3                                                         | v5                                            |
| -------------------- | ---------------------------------------------------------- | --------------------------------------------- |
| quality definition   | carries `minSize`, `maxSize`, `preferredSize`              | does not; those live on quality profile items |
| quality profile item | no size fields                                             | `minSize`, `maxSize`, `preferredSize`         |
| release profile      | single `indexerId`                                         | `indexerIds` array, plus `excludedTags`       |
| media settings       | `userRejectedExtensions`, `skipFreeSpaceCheckWhenGrabbing` | still absent (not yet ported)                 |
| naming settings      | same shape                                                 | same shape, only the path changed             |
| system status        | `sqliteVersion` and required flags relaxed                 | `sqliteVersion` removed, most flags required  |
| health               | no `reason`                                                | adds `reason` (`HealthCheckReason`)           |
| root folder          | `freeSpace` only                                           | adds `totalSpace`, `isEmpty`                  |
| tag details          | no `excludedReleaseProfileIds`                             | adds `excludedReleaseProfileIds`              |

Two upstream facts that matter for how far the shared pipeline can stretch:

- The v5 quality-profile schema (`/api/v5/qualityprofile/schema`) and the
  `QualityProfileSizeLimit` type both expose size limits per profile item. Quality definition size
  limits are still stored in the core model and still writable through `/api/v3/qualitydefinition`,
  so they remain manageable through the v3 contract only.
- `/api/v5/rootfolder/{id}` has no PUT. Configarr's `SonarrClient.updateRootFolder` already throws
  for that reason, so the v5 path keeps the same restriction.

## Shape

The unit of support is the **API contract**, not the arr. `ArrType` stays `"SONARR"`; a second,
testable axis selects the contract.

### 1. A contract discriminator

`src/types/common.types.ts` gains `SonarrApiVersion = "v3" | "v5"` and a resolver used everywhere
configarr needs to branch:

- config default `"v3"` (a config block without the key keeps today's behavior),
- optional per-instance override,
- an auto-probe that reads `/api/v5/system/status` once at startup and falls back to `/api/v3`.

Auto-probe is preferred over asking users to declare it, because the failure mode of getting it
wrong is a silent partial sync, not an error.

### 2. Generated clients per contract

`src/__generated__/sonarr/` keeps the v3 client. A new `src/__generated__/sonarr-v5/` holds the
v5 client, generated from `Sonarr.Api.V5/openapi.json` on `develop`. `generate-api.ts` gains an
entry. The existing generator already derives method names from the spec (`v3QualityprofileList`,
`v5QualityprofileList`), so the generated classes stay name-compatible.

### 3. One client class, two delegates

`src/clients/sonarr-client.ts` becomes a dispatcher that holds both generated `Api` instances and
routes each method to the right one. The class keeps implementing the same capability interfaces,
so every caller (`MediaManagementSync`, `QualityProfileBase`, `BaseDelayProfileSync`,
`downloadClientConfigSyncer`, `uiConfigSyncer`, `remotePathSyncer`, `tags.ts`,
`BaseReleaseProfileSync`) compiles and runs unchanged. The alternative, a second
`SonarrV5Client` class plus a `createClient` switch case plus a second syncer, would duplicate the
whole media pipeline for a change that is internal to one class.

The dispatcher must reject, at call time, the calls the v5 contract cannot serve, rather than
silently routing them to v3 and reporting success. Quality definition size limits are the case
that matters: they must be reported as unsupported on a v5 contract so a user with size limits in
their config sees a clear failure instead of a no-op.

### 4. Per-contract mapping, isolated

Three mappings differ enough to isolate:

- `mapConfigMediaNamingToApi` in `src/config.ts` keys on arr type only. The v5 naming settings
  resource has the identical field set to v3, so this mapper needs no contract parameter. Only the
  endpoint path moved, and the dispatcher owns that.
- `BaseReleaseProfileSync.mapToServer` writes `indexerId`. The v5 branch must write
  `indexerIds: []` and may set `excludedTags`, so it branches on contract.
- Quality definition size limits are excluded from the v5 contract with an explicit
  "not supported on Sonarr v5 API" error, matching how `SonarrClient.updateRootFolder` already
  throws. This is a behavior change for v5 beta users, so it is stated loudly rather than
  downgraded to a warning.

### 5. What is covered, and what is not

Every feature configarr has today runs against a v5 contract, with two deliberate exclusions.

Quality definition size limits (`minSize`, `maxSize`, `preferredSize`) are excluded, because v5
moved them from the quality definition resource to the quality profile item resource. Configarr's
`QualityDefinitionPreferredSync` reads and writes them on the definition, so on a v5 contract it
would silently no-op. The v3 contract still carries them, so nothing changes for v4 users.

Release profile indexer tags are the one request-shape change (`indexerId` to `indexerIds`), so
they are the first feature to land after the dispatcher. Everything else only changed endpoint
paths or gained optional fields, so it rides the dispatcher unchanged.

### 6. e2e

`tests/arr-e2e/` gains a `sonarr-v5` service pinned to `linuxserver/sonarr:5.0.0-develop` and a
`sonarrV5.e2e.test.ts` mirroring `sonarr.e2e.test.ts`. The existing e2e helpers key off
`ArrType`, so the contract flag is the only new axis the test config needs. The docker-compose
port is `18990` (`18989` is v4) and the CI `wait_one` line gains `/api/v5/system/status`.

## Consequences

- No new `ArrType`, no new config block, no new syncer, no new `MediaArrResources` entry, no new
  telemetry counters. One new enum, two new generated clients, one class body, one config field.
- `getClient("SONARR")` keeps returning one object. Call sites that need the contract get it
  through the client or the resolver, never through a new arr literal.
- Users on Sonarr v4 are untouched. The default is v3, which is what a v4 instance serves.
- The v5 client is generated from `develop`, so it tracks the beta. When v5 stable diverges, the
  regeneration step is the only move.
- Recyclarr templates and TRaSH guides are gated on `RADARR | SONARR`. They are keyed by arr, and
  the v5 contract serves the same profile and format shapes for the features that matter, so they
  keep working through the shared pipeline. Template authors do not need a v5-specific corpus.

## Open questions

1. Should the contract probe cache per instance, or per process? One configarr run targets one
   instance at a time (`configureApi` is a process-wide singleton), so per-process is enough.
2. TRaSH quality-profile size limits: v5 stores them per profile item, but the TRaSH payload keys
   them per quality definition. Until that is reconciled, size limits are v3-only. Resolving this
   needs a v5 instance to compare the profile-item payloads against the TRaSH format.
3. Whether to ship the contract flag at all before the probe is reliable. The flag is the escape
   hatch if the probe guesses wrong on a v5 instance that has v3 disabled.
