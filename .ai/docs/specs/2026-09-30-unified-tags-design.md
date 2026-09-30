# Unified tag handling — design

Status: planned
Related issue: [#524 Unify tag creation logic](https://github.com/raydak-labs/configarr/issues/524)
Origin: review thread on PR #520 (`src/prowlarr/tagSync.ts:37`) — "This could potentially be extracted and logic unified between all apps but not in scope of this PR as potential breaking changes might occur."

Plan: [`.ai/docs/plans/2026-09-30-unified-tags.md`](../plans/2026-09-30-unified-tags.md)

## Problem

Tag labels are resolved and created independently in six places:

| Location | Resolve | Create | Matching |
| --- | --- | --- | --- |
| `src/downloadClients/downloadClientBase.ts:108` | `resolveTagNamesToIds` (public method) | `createMissingTags` (`:411`) | case-insensitive, numbers passthrough |
| `src/prowlarr/providerResourceSync.ts:149` | `resolveTagNamesToIds` (verbatim copy) | `createMissingTags` (`:379`) | case-insensitive, numbers passthrough |
| `src/releaseProfiles/releaseProfileBase.ts:105` | local `resolveTagIds` | `createMissingTags` (`:172`) | exact match, dry-run placeholder ids |
| `src/arr/mediaPipeline.ts:329` | inline `createTag` loop for delay profiles | inline | n/a |
| `src/rootFolder/rootFolderLidarr.ts:59` / `rootFolderReadarr.ts:59` | inline per-tag `find` + create | inline | exact match |
| `src/delayProfiles/delayProfileBase.ts:46,143,174` | three inline exact-match lookups | (via the media pipeline) | exact match |
| `src/prowlarr/tagSync.ts:47` | own lowercased `Map` | own loop, plus `delete_unmanaged_tags` | case-insensitive |

The two `resolveTagNamesToIds` copies are byte-for-byte identical. Each copy differs in log wording, error type, dry-run handling and whether it pushes onto `ServerCache.tags`.

## Decisions

1. **Tags are Pattern B.** AGENTS.md already classifies tags as "same method set and same field set (custom formats, tags): one module". `src/tags/` becomes the single owner of *tag mechanics*: plain functions taking the injected client as first parameter, no `getClient(arrType)` inside, no per-*arr* tag classes, no new factory. Config-schema knowledge (which features reference tags) stays with the pipeline that owns the config.
2. **Unify matching to case-insensitive.** Today `release_profiles`, `delay_profiles` and root folders match labels exactly, so `tags: [Foo]` against a server tag `foo` creates a second tag. After this change it resolves to the existing one. Intentional behavior change; it removes duplicates rather than creating them.
3. **Strings are the default and recommended form; numeric ids stay supported but discouraged.** `tags: [1, 2]` keeps pushing the raw id straight into the resolved id list, but the shared resolver logs a deprecation warning naming the offending entry, and the docs recommend labels. No schema change; the new instance-level `tags:` block is `z.array(z.string())`.
4. **Promote the Prowlarr `tags:` / `delete_unmanaged_tags:` block to media \*arrs.** Same schema. `tags:` is deliberately redundant with per-feature creation: on a media \*arr every managed feature already creates the tags it references through `ensureTags`, so the block is a declarative spelling of the same effect, kept for parity with Prowlarr and so users have one obvious place to see their labels. `delete_unmanaged_tags:` is the half that is genuinely new — a keep-set over managed features did not exist for media.
5. **Media tag deletion is resilient to in-use tags; Prowlarr's is not.** Prowlarr's keep-set is complete: applications, indexers, indexer proxies and download clients are every tag-bearing resource it has, so a failure to delete is a real error worth failing the instance for. A media \*arr also has tag-bearing resources configarr does not manage — import lists, notifications, indexers, auto-tagging (`src/__generated__/sonarr/data-contracts.ts:301,788,853,1066,1106`). A tag held by one of those cannot be seen by the keep-set, and the server answers 409. So `deleteUnmanagedTags` takes an `onInUse` policy: `"throw"` for Prowlarr (unchanged behavior, existing tests stay green), `"skip"` for media (log a warning, leave the tag, keep going). Anything that is not an in-use conflict still throws for both. Rationale: an unmanaged-resource 409 must not discard the whole instance's diff report, because every other feature of that instance has already been applied by then.
6. **One `deleteTag` capability.** `TagsClient` gains `deleteTag(id: string): Promise<void>`. All six generated APIs already expose a tag-delete endpoint (`v1TagDelete` Lidarr/Readarr, `v3TagDelete` Sonarr/Radarr/Whisparr, `v1TagDelete` Prowlarr); the clients just never wrapped it.
7. **`src/prowlarr/tagSync.ts` stays, as a thin Prowlarr policy wrapper.** It keeps `referencedTagNames` (config-schema knowledge), the `onInUse: "throw"` policy and the download-client-failure guard. AGENTS.md keeps Prowlarr-only logic under `src/prowlarr/`; `src/tags/` holds only tag mechanics.
8. **Dry run creates nothing, everywhere.** Today a dry run still creates tags for download clients (`createMissingTags` runs before the `DRY_RUN` return in `downloadClientBase.ts`) and for Lidarr/Readarr root folders (`createTag` fires from inside `calculateDiff`). With creation centralized, `ensureTags` honors `DRY_RUN` and creates nothing. Synthetic negative ids are **opt-in per caller** via the `placeholders` map — release profiles and root folders pass one so their `tags` / `defaultTags` fields diff against something stable; Prowlarr's provider base does not, so its dry-run report keeps naming not-yet-created tags by label (`providerResourceSync.ts:279-281`) instead of showing a negative id. Synthetic ids are never pushed onto `ServerCache.tags`.

## Shape of the module

`src/tags/tags.ts` (Pattern B, client-injected):

- `loadServerTags(client)` — unchanged (already used by both pipelines).
- `resolveTagNames(tagNames, serverTags, opts?)` — the single resolver. Case-insensitive label lookup, numeric passthrough with a deprecation warning, optional `placeholders: Map<string, number>` (keyed by lowercased label) for dry-run id synthesis. Returns `{ ids, missing }`. Replaces all three existing resolvers, the three delay-profile lookups, the inline `find` calls in root folders, and the remaining internal callers of the two deleted resolvers (`downloadClientBase.ts:190,209`, `providerResourceSync.ts:278,338`).
- `ensureTags(client, serverCache, tagNames, opts?)` — resolve, create every missing label, push created tags onto `ServerCache.tags`, honor `DRY_RUN` (create nothing; synthesize ids only if the caller passed a `placeholders` map), dedupe case-insensitively, throw one consistent error on failure. Returns `{ ids, created }`: the resolved ids in input order plus the labels it actually created, so callers can record diff entries. Replaces the three `createMissingTags` copies and the two inline `createTag` loops.
- `collectTagLabels(...tagLists)` — folds `(string | number)[] | undefined` config tag lists into a lowercased `Set<string>` of labels, skipping numeric entries. The one place case-folding happens; both keep-set builders use it.
- `deleteUnmanagedTags(client, serverCache, { keep, onInUse })` — prune tags outside `keep`, one delete per tag, `TagSyncResult` in and out. The caller owns the `enabled` gate, the keep-set and the policy, matching how `syncUiConfig` / `syncRemotePaths` / `syncDownloadClientConfig` read their own config.
- `TagSyncResult` (`added` / `removed` / `diffEntries`) moves here from `src/prowlarr/tagSync.ts`; Prowlarr's `syncTags` becomes a thin wrapper over `ensureTags` plus diff-entry recording.

Callers keep their existing signatures and pass `client` / `serverCache`; no caller constructs a second handler. `TagSyncResult` moves to `src/tags/tag.types.ts`.

Two invariants the refactor must not break:
- **Release profiles keep resolving before they create.** `sync()` runs a placeholder-backed `calculateDiff` first so duplicate-profile and indexer validation throws *before* any tag is written to the server (`releaseProfileBase.ts:236`). The local resolver is therefore *replaced* by `resolveTagNames`, not deleted in favor of `ensureTags` — `calculateDiff` resolves twice, once with placeholders and once for real.
- **The numeric-id deprecation warning fires once per run per label**, not once per resolve call. The resolver is called per config item, so a module-level `Set` in `src/tags/tags.ts` guards it.

## Capability change

```ts
export interface TagsClient<T extends Tag = Tag> {
  getTags(): Promise<T[]>;
  createTag(tag: T): Promise<T>;
  deleteTag(id: string): Promise<void>;
}
```

Each `*Client` implements `deleteTag` with the same `+id` coercion Prowlarr already uses. Note this widens two composite aliases transitively — `ReleaseProfilesApi` (`capabilities.ts:71`) and the `DownloadClientsClient<T> & TagsClient` constructor parameter in `downloadClientBase.ts:65` — so every media client and every hand-rolled test mock must grow the method.

The two root-folder api aliases (`LidarrRootFolderApi`, `ReadarrRootFolderApi`) currently narrow tags to `Pick<TagsClient, "createTag">`; they widen to `TagsClient` because `ensureTags` needs the full capability.

## Pipeline placement

Media pipeline (`src/arr/mediaPipeline.ts`):

1. `loadServerTags` (existing) → `serverCache.tags`.
2. `ensureTags(client, serverCache, config.tags ?? [])` from `src/tags/tags.ts` right after tag loading, before any feature that resolves tag ids — called directly, never through Prowlarr's wrapper. One diff entry per created label, into the existing `DiffCollector`.
3. `deleteUnmanagedTags` as the last step, after every resource that can hold a tag is synced. Guarded on the download-client sync's `failed` count (the one failure signal the media pipeline actually has — root-folder failures throw and abort the run before any delete pass, so there is nothing to guard). `onInUse: "skip"`.

Prowlarr pipeline is unchanged in behavior: `src/prowlarr/tagSync.ts` keeps its `enabled` check, its `referencedTagNames`, the download-client-failure guard and `onInUse: "throw"`. The Prowlarr client is threaded in from `ProwlarrSyncer` (which already holds it) so the wrapper drops its internal `getClient("PROWLARR")` — the module must not resolve its own client. The reload-before-pruning stays in `prowlarrSyncer.ts`, where it lives today; the media path does not reload, because `ensureTags` pushes created tags into the cache as it goes.

## Out of scope

- No standalone `tags:` resource CRUD, no tag rename, no import/export of tags.
- A server-side "which resources hold this tag" sweep. Until that exists, media `delete_unmanaged_tags` can only see tags referenced by *managed* config; anything else is handled by the `onInUse: "skip"` policy rather than prevented.
- Dropping numeric tag ids (decision 3). They are deprecated in docs and warned about in logs, not removed.
- Custom format / quality profile tag fields (none exist).
