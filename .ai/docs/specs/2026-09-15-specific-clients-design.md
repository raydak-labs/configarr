# Typed per-*arr clients (no UnifiedClient)

Status: implemented (2026-09-16). Amended 2026-09-16 with per-arr instance syncers and feature-sync client inject (see [Amendments](#amendments-2026-09-16)).
Implementation plan: [`.ai/docs/plans/2026-09-15-specific-clients.md`](../plans/2026-09-15-specific-clients.md).

Goal: every call site holds the concrete client (`SonarrClient`, `LidarrClient`, …) with the generated resource types of that *arr. `UnifiedClient` was a type-erasing facade — 33 required `IArrClient` methods, `Merged*` (Sonarr∩Radarr) defaults, `any` for naming/MM/root/delay, plus Prowlarr stubs that threw. Delete the facade, not just its types.

Prior art on this path before the train: `getSpecificClient` / `ArrTypeToClient` (`b9ad772`), metadata + Lidarr/Readarr root folders (`042c8e5`), UI config / remote paths (`ae95d14`), Prowlarr Pattern C.

---

## Decisions

| #   | Decision                                                                                                                                     | Rejected                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Typed factory + process singleton: `configureApi<T>` returns `ArrTypeToClient[T]`, `getClient<T>(arrType)` reads it, `unsetApi()` clears it. | DI framework. Full constructor-inject from `runInstances` into every loader — blast radius is all call sites at once for no type win once `getClient<T>` exists.      |
| 2   | Small capability interfaces in `src/clients/capabilities.ts`, only where a module already has one code path across *arrs.                    | Mega-`IArrClient` with optional methods (AGENTS.md claimed this existed; all 33 were required). Also: no interfaces at all — DC/tags/status genuinely share one path. |
| 3   | Client methods take and return that *arr's generated `*Resource`. `Merged*` dies with the modules that consumed it, in the same PRs.         | "Clients typed, returns still `Merged*`" plateau — that is the erasure the facade was invented for.                                                                   |
| 4   | Prowlarr implements System + Tags + DownloadClients only. No media stubs, no media unions.                                                   | Keeping throwing stubs so Pattern B unions typecheck (the stub tax). Splitting tags/DC into a second Prowlarr call path — sharing has been cheaper.                   |

---

## Patterns

Three patterns, no fourth. AGENTS.md carries the version an agent needs while writing code; this section records the reasoning.

- *_A — fields or methods differ per *arr.*_ One class file per *arr (`qualityProfileLidarr.ts`), shared behaviour as unnamed helpers on the typed base (`PathRootFolderSync`, `QualityDefinitionPreferredSync`, `attachMinUpgradeOnCreate`). The *arr is bound by a literal `getClient("LIDARR")` or by the client passed into the constructor.
- **B — identical method set _and_ field set** (custom formats, tags): one module behind a capability generic (`CustomFormatsClient<CF>`). The request type must be assignable to each *arr's generated resource so the client hands it to swagger unchanged.
- **C — Prowlarr-only** generic provider base (`src/prowlarr/providerResourceSync.ts`). Media managers never get a Pattern C.

**Why a variable `arrType` cannot carry a shared write path:** `getClient(arrType)` returns a union, so parameters intersect. Each *arr's `DownloadProtocol` / `QualitySource` is a distinct generated enum even when the string values match, and five of them do not unify — which is exactly where `as GeneratedResource` used to come back. Enum-bearing writes are therefore Pattern A with a literal client.

Per-module outcome:

| Module                                          | Pattern | Why                                                                                       |
| ----------------------------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| Quality profiles                                | A       | `language` (Radarr, Whisparr), `minUpgradeFormatScore` (not Lidarr/Readarr)               |
| Quality definitions                             | A       | `preferredSize` missing on Readarr; base `QualityDefinitionPreferredSync` covers the rest |
| Delay profiles                                  | A       | per-*arr `DownloadProtocol`; Lidarr `items[]`                                             |
| Naming + media management                       | A       | movies vs episodes vs tracks vs books — the old `any`                                     |
| Root folders                                    | A       | Lidarr/Readarr named folders + default profiles; others path-only (`PathRootFolderSync`)  |
| Metadata profiles                               | A       | Lidarr/Readarr only                                                                       |
| Custom formats, tags                            | B       | same shape everywhere                                                                     |
| Download clients                                | B       | capability generic; Prowlarr's resource typed from `__generated__/prowlarr`               |
| UI config, remote paths, download-client config | B       | `MediaArrType` param, so Prowlarr drops out of the union                                  |
| Prowlarr applications / indexers / proxies      | C       |                                                                                           |

## Type placement

The object handed to swagger **is** that *arr's generated resource — no assertion. A runtime `toContract` layer is the same hole with more code.

| Kind                   | Where                                                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Generated resource     | `__generated__/<arr>/data-contracts`, imported by that *arr's client and class file                                                             |
| OpenAPI gap            | intersection in that *arr's file only (`DelayProfileResource & { items: … }`), read back with a type guard; delete when OpenAPI grows the field |
| YAML / TRaSH / diff    | `src/<feature>/*.types.ts` — never a product payload (`ProwlarrDownloadClientResource`)                                                         |
| Structural base subset | unnamed fields on the base (`{ id?: number; name?: string \| null }`) that generated types are assignable to                                    |

YAML strings become generated enums once, in that *arr's mapper, via `toEnumOrThrow(Enum, value, label)`. If a regen drops a member, that throws at the mapper instead of silently asserting.

## Landmines

Real per-*arr divergence — do not re-flatten it:

| Topic                      | Reality                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| QP `language`              | Radarr + Whisparr (Whisparr via module augmentation). Sonarr generated QP has none. Lidarr/Readarr none.                              |
| QP `minUpgradeFormatScore` | Radarr / Sonarr / Whisparr yes; Lidarr / Readarr no.                                                                                  |
| Root folders               | Lidarr/Readarr: name, default profiles, tags (Readarr adds Calibre). Others: `unmappedFolders`, `updateRootFolder` throws.            |
| Delay                      | Shared OpenAPI shape; Lidarr nightly `items[]` is not in the spec.                                                                    |
| Download clients           | Prowlarr's `DownloadClientResource` is a different generated type from the media five — type it separately, do not widen dishonestly. |

## Non-goals

Considered and deliberately not done — revisit only with a new dated spec:

- **Reviving `*Generic.ts` or mashed names** (`qualityProfileLidarrReadarr.ts`, `QualityProfileRadarrWhisparrResource`). A thin Pattern A file whose body is `getApi()` plus two hooks is the intended shape.
- **Splitting Pattern B custom formats into five handlers** — method set and field set are identical.
- **Forcing QP writes onto `QualityProfilesClient<T>`** — `QualityProfileShared` is the mapping DTO, not any *arr's generated resource; the generic would need `as T` at the write.
- **Test wrappers around `createXSync`** stay (used by unit tests and e2e); `index.ts` must not route persist through them.
- *_Splitting UI config / remote paths / download-client config per *arr*_ — no divergence shown yet.
- **A single error policy** for persist failures (download clients log and continue, delay profiles throw). Product choice; needs its own change.
- **`MergedConfigInstance`, DI container, handler instance cache.**

---

## Amendments (2026-09-16)

### Per-*arr instance syncers

`pipeline(arrType)` + `prowlarrPipeline()` became one syncer class per *arr (`SonarrSyncer`, …, `ProwlarrSyncer`) in `src/arr/`, each with `run(...)`. Support is now _which methods a syncer calls_, not a runtime `arrType` switch inside a shared media body. No `createInstanceSync` factory; `configureApi` / `getClient` / `unsetApi` stay in `runInstances` (`src/index.ts`).

Shared media steps live in `src/arr/mediaPipeline.ts`:

- `runMediaSyncToQualityProfiles` — start through quality-profile persist and the optional unmanaged-QP delete.
- `completeMediaSync` — root folders through remote paths, returning `{ arrType, instanceName, entries }`.

Both take one already-constructed feature-sync instance per feature (`ctx.syncs.root.syncRootFolders`), so diff and persist hit the same object. TRaSH comes only from `createTrashOps("SONARR" | "RADARR")`; metadata only from `LidarrMetadataProfileSync` / `ReadarrMetadataProfileSync`, after quality profiles and before `completeMediaSync`.

Not done here: no `MediaClient` mega-interface, no `UiConfigClient`; Pattern B features still take `arrType`.

### Feature syncers take the typed client

Supersedes "instance syncers do not take clients" from the syncer amendment above. A Pattern A file that only bound `getClient("LITERAL")` (plus an enum) was a type adapter, not behaviour — and the instance syncer already holds the literal client. So: *_keep a per-*arr class only when behaviour or the generated payload differs*_; otherwise construct the shared base with the client, and with that *arr's enum when the mapper needs it.

```ts
const client = getClient("SONARR");
new StandardDelayProfileSync(client, DownloadProtocol);
new QualityDefinitionPreferredSync(client);
new MediaManagementSync(client);
new PathRootFolderSync(client);
new QualityProfileSonarrSync(client); // still a class: language / minUpgrade hooks
```

Dedicated classes remain for Lidarr delay, Lidarr/Readarr root folders, and Lidarr/Readarr metadata. Readarr QD uses `QualityDefinitionSync` (no preferred size). Production instance syncers construct feature classes directly — no `createXSync(arrType)` factory in the pipeline.

Rejected in this amendment:

- `FooSync<T extends MediaArrType>` resolving `getClient(arrType)` internally — the five-enum problem again.
- Constructor feature flags (`language: boolean`) — writes optional fields onto a shared DTO, which is how `IArrClient` started.
- Deleting the five QP classes — the language / `minUpgradeFormatScore` combinations are real adapters.
- Binding the enum in two places (instance syncer _and_ a `DelayProfileSonarrSync`) — bind once, next to the standard mapper.

Extension points: a new *arr with standard delay / preferred QD / path roots / MM needs a `*Syncer` and constructor calls, no new feature file; a Radarr-like QP needs a `qualityProfileFoo.ts` (or reuses an identical combo); an *arr-only payload needs a dedicated class taking that client; shared lifecycle goes on the base only.
