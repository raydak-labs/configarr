# Plan: typed per-*arr clients

Status: done (2026-09-16). Spec: [`.ai/docs/specs/2026-09-15-specific-clients-design.md`](../specs/2026-09-15-specific-clients-design.md).

The record of how the train was cut, kept for the ordering constraints — the code is the source of truth for the result. Every step gated on `pnpm typecheck && pnpm test && pnpm lint`, one commit per step.

## Order as executed

1. **Typed holder, facade still inside.** Export `ArrTypeToClient`; add `getClient<T>`; make `configureApi<T>` return `ArrTypeToClient[T]`. `getUnifiedClient` / `getSpecificClient` kept as aliases so no call site moves yet.
2. **Kill the facade.** Extract `validateClientParams` / `logConnectionError` / `createConnectionErrorParts` into `src/clients/connection.ts` (every concrete client and `ky-client.ts` need them). Holder becomes `{ type, api }`; `configureApi` constructs the concrete client directly. Rename `unified-client.ts` → `client.ts`. Loaders with no `arrType` in scope get it threaded from the caller rather than a no-arg getter.
3. **Prowlarr leaves the media unions.** Add `SystemClient` / `TagsClient` / `DownloadClientsClient`; `ProwlarrClient implements` those three and drops every throwing stub. Pattern B extras switch their param to `MediaArrType`.
4. **Pattern A per feature, one step each**, smallest first: root folders → quality definitions → custom formats → quality profiles (largest, `ServerCache._qp` moves with it) → naming + media management → delay profiles → languages. Each step retypes the client methods to that *arr's generated resource and drops the matching `Merged*` in the same commit.
5. **Delete `IArrClient` and `merged.types.ts`.** Separate from step 4's quality-profile commit — QP has to compile against capabilities first.
6. *_Per-*arr instance syncers*_ (`src/arr/*Syncer.ts` + `mediaPipeline.ts`), then inject the typed client into feature syncers and collapse the adapter-only Pattern A files.
7. **Docs last.** AGENTS.md / CLAUDE.md rewritten from "Unified Client Pattern" to the factory, capabilities, and Pattern A/B/C.

## Ordering constraints that bit

- Splitting `Merged*` later than the module that consumed it leaves the erasure in place — hence "same commit".
- Deleting `IArrClient` before quality profiles compile against capabilities breaks the tree.
- Lidarr/Readarr root folders called the global quality-profile loader; that had to move to `this.api.getQualityProfiles()` in the root-folder step, not the QP step.
- `mapImportCfToRequestCf` and the TRaSH mappers were allowed to keep an intersection **mapping** type past step 4 — it is not a client return type.

## Test migration

Spies on the old getters became `vi.spyOn(clientModule, "getClient")` returning only the methods under test, typed via `Pick<SonarrClient, …>`. No fake facade, no `getUnifiedClient` "kept for tests", no test-only DI container. Feature syncers that now take a client in the constructor are tested by passing a mock in.

## Follow-up cleanups shipped with the train

Bugs and waste found while the handlers were open: an unawaited Sonarr quality-definition PUT; a discarded Radarr language GET plus a redundant post-write QD GET; `areTagsEqual` sorting the server array in place; Lidarr/Readarr root folders refetching profiles per folder (now memoised per run, preferring `ServerCache.qualityProfiles`); the hardcoded `"1"` default delay-profile id (now carried on the diff); metadata profiles still on `T = any` with a duplicate list GET in `performDeletion`; `LOAD_LOCAL_SAMPLES` bypassing the constructed handler; and dead code — `ServerCache`'s string-key bag, its unused download-client schema slots, and the `compareNaming` / `compareMediamanagement` aliases.
