# Specific *arr clients (no UnifiedClient)

Status: decided (2026-09-15). Implementation plan: [`.ai/docs/plans/2026-09-15-unified-client-removal.md`](../plans/2026-09-15-unified-client-removal.md).

Goal: callers use the concrete client (`SonarrClient`, `LidarrClient`, …) with proper generics. `UnifiedClient` is a type-erasing facade; delete it.

Prior art already on this path: `getSpecificClient` / `ArrTypeToClient` (`src/clients/unified-client.ts`), metadata + Lidarr/Readarr root folders, UI config (`ae95d14`), remote paths, Prowlarr Pattern C. `ArrTypeToClient` landed in `b9ad772`; extras left `IArrClient` in `ae95d14`; Lidarr/Readarr specific clients in `042c8e5`.

---

## Open questions (answer before coding)

Frozen 2026-09-15:

| #   | Decision                                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Typed singleton `getClient<T>()` — same seam as today’s `getSpecificClient`. No constructor-inject.                                                                                                     |
| 2   | Small capability interfaces. Delete mega-`IArrClient`.                                                                                                                                                  |
| 3   | Client methods return the generated `*Resource` for that arr. No `Merged*` as a client/cache return type. Mapping/TRaSH helpers may keep an intersection until those helpers split.                     |
| 4   | Use the concrete typed client whenever the call site knows the arr. Share System/Tags/DC **only** because those modules already have one code path across media + Prowlarr. No media stubs on Prowlarr. |

---

## Recommendation

Replace `UnifiedClient` with a **typed factory + process singleton**:

```ts
export type ArrTypeToClient = {
  RADARR: RadarrClient;
  SONARR: SonarrClient;
  LIDARR: LidarrClient;
  READARR: ReadarrClient;
  WHISPARR: WhisparrClient;
  PROWLARR: ProwlarrClient;
};

configureApi<T extends ArrType>(type: T, baseUrl: string, apiKey: string): Promise<ArrTypeToClient[T]>
getClient<T extends ArrType>(arrType: T): ArrTypeToClient[T]
unsetApi(): void
```

Lifecycle stays where it is today (`configureApi` / `unsetApi` around each instance in `runInstances`). Callers that know a literal arr type get a concrete class. Callers with a variable `ArrType` get a union — same as `getSpecificClient` today.

**Alternative (not first):** constructor-inject the client from `pipeline` into every syncer. Production functions currently take **zero** `IArrClient` params; coupling is the singleton. Full inject is a larger API change for no type win once `getClient<T>` exists. Revisit after the facade is gone.

**Do not:** DI framework, optional methods on a mega-interface, a new Pattern C for media managers.

---

## Why UnifiedClient dies

`UnifiedClient` (`src/clients/unified-client.ts:235`) is a switch + one-line forwards. Unique value is **lifecycle** (construct, `testConnection`, hold, `unsetApi`), not the class. `getSpecificClient` already unwraps `.api` with a type check (`:43`). No `instanceof`. `IArrClient` has **33 required methods, none optional** (`:175`) — the AGENTS.md “optional methods” claim is false.

`IArrClient<QP,QD,CF,L>` defaults to `Merged*` (Sonarr∩Radarr only). `UnifiedClient implements IArrClient` with no type args → erasure. Naming/MM/root/delay/tags/system are `any`. Extra methods (UI config, remote paths, metadata) live on concrete clients only.

Prowlarr implements default `IArrClient` and throws on media members (`src/clients/prowlarr-client.ts:174`) plus extras so the `getSpecificClient()` union stays structural (`:268`). That stub tax goes away when Prowlarr is not in media unions.

---

## Target architecture

```
src/clients/
  client.ts            # configureApi / getClient / unsetApi / ArrTypeToClient  (rename from unified-client.ts)
  connection.ts        # validateClientParams, logConnectionError, createConnectionErrorParts
  capabilities.ts      # small interfaces; not a mega IArrClient
  sonarr-client.ts     # implements media capabilities + its own extras
  radarr-client.ts
  lidarr-client.ts
  readarr-client.ts
  whisparr-client.ts
  prowlarr-client.ts   # System + Tags + DownloadClients only; own Prowlarr methods
```

Holder stores `{ type: T, api: ArrTypeToClient[T] }` (or equivalent). `getClient("LIDARR")` returns `LidarrClient`. Mismatch throws the same error `getSpecificClient` throws today.

`configureApi` constructs the concrete client directly (today’s constructor switch, without wrapping it). Returns that client. Pipeline may keep calling `getClient()` internally (Q1 default).

### Capability interfaces (Q2 default)

Used **only** where a module is shared across media *arrs (or media+Prowlarr for the three below). Not a reconstruction of `IArrClient`.

| Interface                      | Methods                             | Implementers                                         |
| ------------------------------ | ----------------------------------- | ---------------------------------------------------- |
| `SystemClient`                 | `getSystemStatus`, `testConnection` | all six                                              |
| `TagsClient`                   | `getTags`, `createTag`              | all six                                              |
| `DownloadClientsClient`        | schema/list/CRUD/test               | all six (Prowlarr already shares `downloadClients/`) |
| `QualityProfilesClient<QP>`    | get/create/update/delete            | media five                                           |
| `CustomFormatsClient<CF>`      | get/create/update/delete            | media five                                           |
| `QualityDefinitionsClient<QD>` | get/update                          | media five                                           |

**Not** capability interfaces (fields/methods differ → Pattern A): naming, media management, root folders, delay profiles, languages, metadata, UI config, remote paths, download-client _config_.

Media clients keep implementing the media capabilities **and** their own extra methods. Callers that need Lidarr metadata still take `LidarrClient`.

Delete `IArrClient` once no implementer and no import remain.

**Alternative (Q2 reject):** delete all shared interfaces; every module is Pattern A. Rejected for DC/tags/status because those modules already share one code path.

---

## Pattern A vs B (copy, do not invent a third)

Existing:

- **A — arr-specific resource:** factory `switch` + literal `getSpecificClient("LIDARR")`. `rootFolder/`, `metadataProfiles/`.
- **B — shared extra:** `getSpecificClient(arrType)` union. `uiConfigs/`, `remotePaths/`, `downloadClientConfig/`. Pays Prowlarr stub tax today because `ArrType` includes `PROWLARR`.
- **C — Prowlarr-only generic base:** `ProviderResourceSync`. Media managers do not get a Pattern C.

Rule:

- **A** when fields or methods differ per arr (QP, naming, delay, root folders, languages, metadata).
- **B** (capability + generic param) when the **method set** is identical and only the resource type varies (QD, CF — CF generated shapes are the same; QD is close). Still not `Merged*` as the return type: `CustomFormatsClient<CF>` / `QualityDefinitionsClient<QD>`.
- **B** (union on `MediaArrType`) when every media client shares the method **and** Prowlarr is excluded (`MediaArrType = Exclude<ArrType, "PROWLARR">`), **or** the method is one of the three shared capabilities (DC/tags/status) that Prowlarr actually implements.

| Module                                                | Pattern                              | Client type at seam                                                                                                                                                                            |
| ----------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `metadataProfiles/`                                   | A (done)                             | `LidarrClient` / `ReadarrClient`                                                                                                                                                               |
| `rootFolder/` Lidarr/Readarr                          | A (done)                             | same                                                                                                                                                                                           |
| `rootFolder/` generic (Sonarr/Radarr/Whisparr)        | A                                    | factory branch + those clients; stop using `IArrClient` in `GenericRootFolderSync`                                                                                                             |
| `quality-profiles.ts`                                 | A                                    | factory: language / `minUpgradeFormatScore` differ (Radarr+Whisparr have `language`; Lidarr/Readarr lack `minUpgradeFormatScore`). **Not** `MergedQualityProfileResource` as the client return |
| `quality-definitions.ts`                              | B via `QualityDefinitionsClient<QD>` | method set identical; generated QD still differs (`preferredSize` missing on Readarr; Lidarr/Readarr quality is id+name only)                                                                  |
| `custom-formats.ts`                                   | B via `CustomFormatsClient<CF>`      | generated CF shape is the same; still parameterize `CF` — do not return `MergedCustomFormatResource`                                                                                           |
| `media-management.ts` (naming + MM)                   | A                                    | per-arr naming/MM types; factory or literal                                                                                                                                                    |
| `delay-profiles.ts`                                   | A                                    | per-arr delay resource                                                                                                                                                                         |
| `tags.ts`                                             | B via `TagsClient`                   | media + Prowlarr                                                                                                                                                                               |
| `downloadClients/`                                    | B via `DownloadClientsClient`        | media + Prowlarr                                                                                                                                                                               |
| `uiConfigs/`, `remotePaths/`, `downloadClientConfig/` | B                                    | change param to `MediaArrType` so Prowlarr drops out of the union                                                                                                                              |
| `prowlarr/` providers                                 | C (done)                             | `ProwlarrClient`                                                                                                                                                                               |
| `index.ts` pipeline                                   | holder                               | `getClient(arrType)` / later inject                                                                                                                                                            |

Add `MediaArrType` next to `ArrType` in `src/types/common.types.ts`. Pipeline already splits Prowlarr (`prowlarrPipeline` at `src/index.ts:460`).

---

## Prowlarr (Q4 default)

`ProwlarrClient` **stops** implementing `IArrClient`. Delete throwing media stubs and extra stubs (`getUiConfig`, remote paths, …). Keep real methods: applications/indexers/proxies, tags, download clients, `syncAppIndexers`, system/connection.

Pattern C unchanged. `getClient("PROWLARR")` returns `ProwlarrClient` only.

If Q4 is “own class only”: `downloadClients/` and `tags.ts` become two call paths (media capability vs Prowlarr methods). Do that only if sharing DC/tags proves more expensive than a second thin adapter — it has not so far.

---

## Merged\* types (Q3 default)

Comment at `src/types/merged.types.ts:21`:

> Those types are only to make the API client unified usable. … If someday we need specific fields per *arr instance then we have to split the API usage and modify every module.

That someday is this work.

- Client methods return the generated `*Resource` for that arr, or a generic parameter bound to it. **Not** `Merged*` as the client return type.
- Split `Merged*` in the same PRs as the modules that consume them (QP, CF, QD, delay, root generic, tags).
- `ServerCache` (`src/cache.ts`) currently stores `Merged*` + `ArrClientLanguageResource`. Genericize or narrow it when QP/CF/QD/languages migrate; do not leave cache as a `Merged*` dump while clients are already specific.
- Helpers that are truly Sonarr∩Radarr-shaped (`mapImportCfToRequestCf` in `util.ts`, TRaSH mapping) may keep a **mapping** intersection type until those helpers are split. That is not the client return type.

Do **not** leave a “clients typed, still return Merged\*” plateau.

---

## Hidden coupling to fix while touching root folders

Lidarr/Readarr root folders call `loadQualityProfilesFromServer()` (`src/rootFolder/rootFolderLidarr.ts:32`, `rootFolderReadarr.ts:31`), which still goes through the singleton + `MergedQualityProfileResource`. When QP migrates, those call sites must use `this.api.getQualityProfiles()` (already a `LidarrClient` / `ReadarrClient`).

`metadataProfileBase` / `rootFolderBase` still hold `IArrClient = getUnifiedClient()` for the generic path; Lidarr/Readarr subclasses override with `getSpecificClient("LIDARR")`. After this work the base has no `IArrClient`.

---

## Resource landmines (Phase 4)

Do not flatten these into `Merged*` again:

| Topic                           | Reality                                                                                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QP `language`                   | Radarr + Whisparr (Whisparr is a module-augmentation in `whisparr-client.ts`). Sonarr generated QP has **no** `language`. Lidarr/Readarr none.                                                    |
| QP `minUpgradeFormatScore`      | Radarr/Sonarr/Whisparr yes; Lidarr/Readarr **no**.                                                                                                                                                |
| `SonarrClient` create/update QP | takes a weaker local `SonarrQualityProfileResource` stub, not the full generated QP. Fix when QP migrates (bivariance hides this today).                                                          |
| Naming                          | Radarr movies vs Sonarr episodes vs Lidarr tracks vs Readarr books vs Whisparr episode-ish. `IArrClient` `any` exists because of this.                                                            |
| Root folders                    | Lidarr/Readarr: name, default profiles, tags. Readarr: Calibre fields. Radarr/Sonarr/Whisparr: `unmappedFolders`; `updateRootFolder` **throws**.                                                  |
| Delay                           | OpenAPI shape shared; Lidarr nightly `items[]` is hand-extended on `MergedDelayProfileResource`.                                                                                                  |
| Download clients (list)         | Five media types in `download-client.types.ts`; Prowlarr is **not** in that union (casts `as unknown`). Keep `DownloadClientsClient` but type Prowlarr DC separately or widen the union honestly. |
| `downloadClientConfigSyncer.ts` | unused `RadarrClient`…`WhisparrClient` imports — delete in the `MediaArrType` PR.                                                                                                                 |

E2E (`tests/arr-e2e/helpers.ts`) already constructs `new SonarrClient(...)`. No e2e rewrite. No unit tests for media client classes except `prowlarr-client.test.ts` — do not add a client-class test suite as part of this train unless a stub-deletion needs it.

## Tests

Stop spying `getUnifiedClient` and casting `as unknown as ReturnType<typeof getUnifiedClient>`. Mock the **concrete** client (or `getClient`) with the methods the test needs.

Do not introduce a test-only DI container. A `setClientForTests` is unnecessary if tests keep mocking the getter; prefer that until/unless pipeline inject lands.

---

## Docs (last)

Rewrite AGENTS.md / CLAUDE.md “Unified Client Pattern”: factory + `getClient<T>`, capability interfaces, Pattern A/B/C, Prowlarr does not implement media APIs. Delete “optional methods on IArrClient” and “check if unified client needs new optional methods”.
