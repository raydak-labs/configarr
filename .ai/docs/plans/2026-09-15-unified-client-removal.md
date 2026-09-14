# Remove UnifiedClient

Spec (decisions + target): [`.ai/docs/specs/2026-09-15-specific-clients-design.md`](../specs/2026-09-15-specific-clients-design.md).

Read the spec first. Confirm the four open questions there before Phase 0. This plan assumes the **recommended defaults**.

Not code. Surgical. No DI framework, no optional mega-interface, no new Pattern C for media managers.

---

## Open questions

See spec. Short form:

1. Singleton `getClient<T>()` vs inject from `runInstances`?
2. Delete `IArrClient` vs capability interfaces?
3. Merged\* split in the same train vs later?
4. Prowlarr: shared System/Tags/DC capabilities vs own class only?

**This plan’s defaults:** (1) singleton first, inject later if cheap; (2) small capabilities, delete mega-interface; (3) split Merged\* for modules we touch — client returns are never `Merged*`; (4) Prowlarr implements System + Tags + DownloadClients only.

---

## Recommendation vs alternative

|              | Do this                                                                            | Alternative (later / reject)                                                                                                              |
| ------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Facade       | Delete `UnifiedClient`. Factory switch constructs the concrete client.             | Keep a thin typed holder class. Rejected: the holder is `{ type, api }`, not a class of 33 forwards.                                      |
| Lifecycle    | `configureApi<T>` returns `ArrTypeToClient[T]`; module singleton `getClient<T>()`. | Constructor-inject into every syncer. Defer: 0 prod fns take `IArrClient` today; blast radius is all call sites at once.                  |
| `IArrClient` | Split into capabilities in spec. Delete the 33-method interface.                   | Keep `IArrClient` with optional methods. Rejected: AGENTS.md already claims this and it is false (`unified-client.ts:175`, all required). |
| Merged\*     | Kill as **client return type** in the same PRs as the module.                      | Clients first, Merged\* later. Rejected: that leaves the erasure the facade was invented for (`merged.types.ts:21`).                      |
| Prowlarr     | Drop media/extra stubs. Pattern C stays.                                           | Keep stubs so unions typecheck. Rejected: that is the stub tax Pattern B currently pays.                                                  |

Copy existing patterns only (spec table). Highest-risk call sites today: `index.ts`, `custom-formats.ts`, `quality-profiles.ts`, `downloadClients/downloadClientBase.ts`.

---

## Current coupling (enough to navigate)

Process singleton, not params: `configureApi` / `getUnifiedClient` / `getSpecificClient` / `unsetApi` in `src/clients/unified-client.ts`.

|                                        | Count | Notes                              |
| -------------------------------------- | ----- | ---------------------------------- |
| Prod fns taking `IArrClient`           | 0     |                                    |
| Prod files importing the client module | ~28   |                                    |
| `getUnifiedClient`                     | ~18   | media pipeline + loaders           |
| `getSpecificClient`                    | ~9    | extras + Lidarr/Readarr + Prowlarr |

`getSpecificClient` (`:43`) already is the typed unwrap. Adapter is `switch(type)` + forwards (`UnifiedClient` `:235`). Rename `getSpecificClient` → `getClient` once there is no wrapper to be “specific” from.

Connection helpers (`validateClientParams`, `logConnectionError`, `createConnectionErrorParts`, `:54–133`) are used by every concrete client and `ky-client.ts`. They do not belong in the holder file.

---

## Phase 0 — freeze decisions

**Files:** none (or a one-line note in the spec status).

**What:** User answers Q1–Q4. If any default is rejected, adjust later phases (especially 2, 3, 5) before coding.

**Verify:** spec “Open questions” section updated with the chosen answers.

**Success:** no remaining “recommended default vs maybe”.

---

## Phase 1 — typed holder, UnifiedClient still inside

Smallest blast radius. Call sites keep working.

**Files:**

- `src/clients/unified-client.ts` — export `ArrTypeToClient`; add `getClient<T extends ArrType>(arrType: T): ArrTypeToClient[T]` (body = current `getSpecificClient`); `configureApi` generic return type `Promise<ArrTypeToClient[T]>` (still constructs `UnifiedClient` internally, then returns `.api`); keep `getUnifiedClient` / `getSpecificClient` as deprecated aliases.
- Tests that only need the alias: no change.

**What not:** delete class, rename file, touch syncers.

**Verify:** `pnpm typecheck && pnpm test && pnpm lint`

**Success:**

- `configureApi("SONARR", …)` infers `SonarrClient`.
- `getClient("LIDARR")` is `LidarrClient`.
- `getClient(arrType)` for `ArrType` is the 6-way union.
- Runtime mismatch still throws (`unified-client.ts:47`).
- Existing tests green without rewriting spies.

---

## Phase 2 — extract connection helpers; delete UnifiedClient class

**Files:**

- New `src/clients/connection.ts` — move `validateClientParams`, `logConnectionError`, `createConnectionErrorParts`.
- `src/clients/*.ts` — import helpers from `connection.ts`.
- `src/ky-client.ts` — import `createConnectionErrorParts` from `connection.ts`.
- `src/clients/unified-client.ts` (or rename to `src/clients/client.ts` in this PR — one mechanical import sweep): holder `{ type, api }`; `configureApi` switch constructs `new SonarrClient(…)` etc., `testConnection()`, stores api; **no** forward methods.
- Delete class `UnifiedClient` and `getUnifiedClient`.
- `getSpecificClient` → re-export `getClient` or delete after grep is clean.

**Call-site change this phase:** every `getUnifiedClient()` becomes `getClient(arrType)` **where `arrType` is already in scope**. Where it is not (loaders with no arr param: `loadServerCustomFormats`, `loadQualityDefinitionFromServer`, `loadQualityProfilesFromServer`, `loadServerTags`, `media-management.ts` loaders, `delay-profiles.ts`): either pass `arrType` in (preferred, small signature change) **or** add `getClient()` with no arg returning the stored union (weaker). Prefer threading `arrType` from `pipeline` / existing syncer `getArrType()`.

**Do not** yet split `IArrClient` or Merged\* (except whatever `configureApi` return type already forces). Concrete clients still `implements IArrClient<…>` so the repo typechecks.

**Verify:** `pnpm typecheck && pnpm test && pnpm lint`

**Success:**

- `rg UnifiedClient src` → no class, no `getUnifiedClient`.
- `rg getUnifiedClient` → empty (tests included).
- Connection helpers have one home; clients still construct.
- Runtime: one instance, `unsetApi` in `finally` unchanged (`index.ts:443`).

**Test migration this phase:** spies on `getUnifiedClient` → spy `getClient` returning a **plain object with the methods the test already stubbed**. Do not invent full client fakes yet.

Touched tests (from current spies): `custom-formats.test.ts`, `quality-profiles.test.ts`, `delay-profiles.test.ts`, `downloadClientGeneric.test.ts`, `downloadClientConfigSyncer.test.ts`, `remotePathSyncer.test.ts`, `rootFolderBase.test.ts`, `metadataProfileLidarr.test.ts`, `metadataProfileReadarr.test.ts`, Prowlarr `*.test.ts` that mock both getters.

---

## Phase 3 — Prowlarr drops media `IArrClient`

Depends on Q4 = default.

**Files:**

- `src/clients/capabilities.ts` — add `SystemClient`, `TagsClient`, `DownloadClientsClient` (spec table).
- `src/clients/prowlarr-client.ts` — `implements` those three only; delete throwing stubs from `:174` and extra stubs from `:268`.
- `src/clients/prowlarr-client.test.ts` — drop any “not supported” assertions for media methods if present; keep real API tests.
- Prowlarr Pattern C files already use `getSpecificClient("PROWLARR")` (`providerResourceSync.ts:119`, `tagSync.ts:46`) → `getClient("PROWLARR")`.
- `src/downloadClients/downloadClientBase.ts` — `getApi(): DownloadClientsClient` (not `IArrClient`).
- Pattern B extras (`uiConfigs/`, `remotePaths/`, `downloadClientConfig/`): param type `MediaArrType` so the union has no Prowlarr (no stub methods needed). Guard/assert if somehow called with `PROWLARR`.

**Verify:** `pnpm typecheck && pnpm test && pnpm lint`

**Success:**

- `ProwlarrClient` has no QP/CF/QD/naming/root/delay/UI/remote-path methods.
- `getClient("PROWLARR")` is not assignable to `QualityProfilesClient`.
- `syncUiConfig` / remote paths / DC config do not type-accept `"PROWLARR"`.
- Prowlarr pipeline still loads tags + DC + system (`index.ts:460`).
- `downloadClients/` still runs for Prowlarr via `DownloadClientsClient`.

If Q4 is “own class only”: skip the three shared interfaces; split `tags.ts` / `downloadClientBase` into media vs Prowlarr call paths. Do not do both.

---

## Phase 4 — Pattern A for remaining media modules

One PR per row is fine (see slices). Each row: factory or literal client, **client return type is that arr’s generated resource**, update `ServerCache` / function signatures in the same PR.

Thread `arrType` (or the concrete client) so loaders stop using an untyped singleton.

| Module                    | Files                                                                     | Seam                                                                                                                                                                                                                                     | Merged\* in this PR                                                    |
| ------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Root generic              | `rootFolderBase.ts`, `rootFolderSyncer.ts`, tests                         | Factory already exists (`rootFolderSyncer.ts:9`). `GenericRootFolderSync` takes/holds Sonarr\|Radarr\|Whisparr client, not `IArrClient`. Lidarr/Readarr: replace `loadQualityProfilesFromServer()` with `this.api.getQualityProfiles()`. | `MergedRootFolderResource` → per-arr / generic on `BaseRootFolderSync` |
| Quality profiles          | `quality-profiles.ts`, `quality-profiles.test.ts`, `cache.ts`, `index.ts` | Pattern A factory. Highest risk. Fix `SonarrQualityProfileResource` stub; split `language` / `minUpgradeFormatScore`. See spec landmines.                                                                                                | `MergedQualityProfileResource` leaves this module and cache `_qp`      |
| Quality definitions       | `quality-definitions.ts`, tests, cache `_qd`                              | `QualityDefinitionsClient<QD>` — method set identical, still not `Merged*`                                                                                                                                                               | split QD                                                               |
| Custom formats            | `custom-formats.ts`, `util.ts` mapping, tests, cache `_cf`                | `CustomFormatsClient<CF>`. Generated CF shape is shared; still genericize. Mapping helpers may keep an intersection until TRaSH import is split                                                                                          | split CF                                                               |
| Naming + media management | `media-management.ts`, `index.ts:199` (`updateNaming` still `as any`)     | Pattern A: naming/MM types differ; factory like root folders                                                                                                                                                                             | drop `any` on get/update naming                                        |
| Delay profiles            | `delay-profiles.ts`, tests                                                | Pattern A                                                                                                                                                                                                                                | `MergedDelayProfileResource`                                           |
| Languages                 | `quality-profiles.ts` / `index.ts:69` / `cache.ts` `_languages`           | Pattern A or per-client `getLanguages()`; delete `ArrClientLanguageResource` as the cache type                                                                                                                                           | language resource per arr                                              |

**Hidden coupling:** `rootFolderLidarr.ts:32`, `rootFolderReadarr.ts:31` — must not call the old QP loader after QP is typed.

**Verify per PR:** `pnpm typecheck && pnpm test && pnpm lint`

**Success per module:**

- No `getUnifiedClient`, no `IArrClient`, no `Merged*` **as the type of values returned by the client** in that module.
- Factory/literal matches Pattern A (copy `createRootFolderSync` / `createMetadataProfileSync`).
- Tests mock the concrete client or `getClient("SONARR")` with that arr’s resource shapes.

**Do not** genericize TRaSH / recyclarr importers in these PRs unless a type error forces it.

---

## Phase 5 — delete `IArrClient` and leftover Merged\* client types

**Files:**

- `src/clients/unified-client.ts` / `capabilities.ts` / every `*-client.ts` `implements` clause.
- `src/downloadClients/downloadClientBase.test.ts` (`IArrClient` type import).
- `src/types/merged.types.ts` — delete types that no module imports; keep only leftovers still used by config mapping. If none, delete the file.
- `src/clients/unified-client.ts` `ArrClientQualityProfile` / `ArrClientCustomFormat` / `ArrClientQualityDefinition` / `ArrClientLanguageResource` — delete or move the tiny shapes into `capabilities.ts` if still needed as constraints.

**Verify:** `pnpm typecheck && pnpm test && pnpm lint && pnpm build`

**Success:**

- `rg IArrClient src` empty.
- `rg MergedQualityProfileResource` / `MergedCustomFormatResource` / `MergedQualityDefinitionResource` only in mapping/TRaSH leftovers, **not** in clients or `ServerCache` if Phase 4 finished.
- Media clients do not implement Prowlarr-only methods; Prowlarr does not implement media capabilities.

---

## Phase 6 — optional inject (only if cheap)

**When:** after Phase 2, if threading `arrType` into every loader was painful. Skip if `getClient(arrType)` is already clear.

**Files:** `src/index.ts` `pipeline` / `prowlarrPipeline` / `runInstances`; syncer entrypoints (`syncRootFolders`, `manageCf`, …).

**What:** `configureApi` already returns the client — pass it into `pipeline(client, …)` and down into functions that currently re-fetch the singleton. Tests construct a mock client and pass it in (true inject). No framework.

**Verify:** `pnpm typecheck && pnpm test`

**Success:** loaders used by one pipeline take the client (or `arrType` + `getClient`) from the caller; no new global besides the holder used by `configureApi` itself.

If this is **not** cheap (every helper signature in `custom-formats.ts` / `quality-profiles.ts` explodes), **stop**. Singleton `getClient<T>` is the architecture.

---

## Phase 7 — docs (last)

**Files:** `AGENTS.md`, `CLAUDE.md` (they duplicate). Spec status → implemented.

Replace:

- “Unified Client Pattern” / “optional methods (`getMetadataProfiles?()`)” / “Check if unified client needs new optional methods”

With:

- `configureApi` + `getClient<T extends ArrType>(): ArrTypeToClient[T]`
- Capability interfaces only for shared media (and System/Tags/DC with Prowlarr)
- Pattern A factory + literal client when fields differ; Pattern B only for shared methods on `MediaArrType` (or the three Prowlarr-shared capabilities); Pattern C Prowlarr-only
- Prowlarr does not implement media APIs

**Verify:** grep AGENTS.md/CLAUDE.md for `UnifiedClient`, `IArrClient`, `optional method` — only historical/negative mentions gone.

**Success:** a new-feature agent following AGENTS.md would add a factory + specific client, not a method on a unified facade.

---

## Suggested PR slices

Small, reviewable, each green on `pnpm typecheck && pnpm test && pnpm lint`.

| PR  | Phase | Title-level scope                                                                   |
| --- | ----- | ----------------------------------------------------------------------------------- |
| 1   | 1     | Export `ArrTypeToClient`; add `getClient`; generic `configureApi`. Keep aliases.    |
| 2   | 2     | `connection.ts`; delete `UnifiedClient`; rename file to `client.ts`; migrate spies. |
| 3   | 3     | Capabilities System/Tags/DC; Prowlarr drops stubs; `MediaArrType` on extras.        |
| 4   | 4     | Root generic + Lidarr/Readarr QP loader fix (small, Pattern A already there).       |
| 5   | 4     | Quality definitions (smaller than QP).                                              |
| 6   | 4     | Custom formats.                                                                     |
| 7   | 4     | Quality profiles + `ServerCache._qp` (largest).                                     |
| 8   | 4     | Naming + media management.                                                          |
| 9   | 4     | Delay profiles + languages.                                                         |
| 10  | 5     | Delete `IArrClient`; prune Merged\*.                                                |
| 11  | 6     | Optional: inject client into pipelines. Skip if not cheap.                          |
| 12  | 7     | AGENTS.md / CLAUDE.md.                                                              |

Do not combine 7 (QP) with 10 (`IArrClient` deletion). QP must compile against capabilities or concrete clients first.

---

## Test migration rule (all phases)

| Before                                                                                                                 | After                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vi.spyOn(unifiedClient, "getUnifiedClient").mockReturnValue({ … } as unknown as ReturnType<typeof getUnifiedClient>)` | `vi.spyOn(clientModule, "getClient").mockReturnValue(mock)` where `mock` is the methods used, typed as `SonarrClient` (or the capability) via `as Pick<SonarrClient, "getCustomFormats" \| …>` / partial mock |
| Module mock `{ getUnifiedClient, getSpecificClient }`                                                                  | `{ getClient: vi.fn(() => mockClient) }`                                                                                                                                                                      |
| Inject (Phase 6 only)                                                                                                  | pass `mockClient` into the syncer; no getter spy                                                                                                                                                              |

Do not write a fake `UnifiedClient`. Do not keep `getUnifiedClient` “for tests”.

---

## Success criteria (whole train)

- No `UnifiedClient` class; no `getUnifiedClient`.
- `configureApi` returns `ArrTypeToClient[T]`; `getClient("READARR")` is `ReadarrClient`.
- `IArrClient` gone; capabilities exist only where the spec table says.
- Prowlarr has no media/extra stubs.
- Client methods in migrated modules do not return `Merged*`.
- Pattern A/B/C as in the spec table; no fourth pattern.
- `pnpm build && pnpm test && pnpm lint && pnpm typecheck` green.
- AGENTS.md matches the code.

---

## Out of scope

- New sync features, Recyclarr/TRaSH importer redesign, generated-client regen.
- DI container, optional methods on one interface, Pattern C for Sonarr/Radarr.
- Rewriting Prowlarr `ProviderResourceSync`.
- Splitting Merged\* in modules this train does not touch (only if they block typecheck).
