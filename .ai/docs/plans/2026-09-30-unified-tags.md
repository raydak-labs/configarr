# Unified tag handling — implementation plan

Spec: [`.ai/docs/specs/2026-09-30-unified-tags-design.md`](../specs/2026-09-30-unified-tags-design.md)
Issue: [#524](https://github.com/raydak-labs/configarr/issues/524)
Branch: `feat/unify-tag-logic` (renamed from `refactor/` in round 2 — see commit type below)

Commit type: **`feat:`** — the new media-instance `tags:` / `delete_unmanaged_tags:` block is user-facing, as is the case-insensitivity change. A `refactor:` commit would bury both under "(internal) Refactorings".

Tooling: `pnpm` is not on `PATH` here; use `mise x pnpm@11.25.0 -- <cmd>` (verified working). `node` and `git` are present.

## Goal

`src/tags/` owns tag label resolution, creation and deletion mechanics for every \*arr; the Prowlarr pipeline keeps its Prowlarr-specific policy; media \*arr instances gain a `tags:` / `delete_unmanaged_tags:` block.

## Steps

Steps 1–4 are the issue (#524). Steps 5–7 are the feature built on top. They are separable: nothing in steps 2–4 reads `InputConfigArrInstanceSchema`, and `deleteTag` (step 1) is consumed only by `deleteUnmanagedTags`. Two things in step 4 exist only for step 5 — the `"skip"` arm of `onInUse` and the `deleteTag` implementations on the five media clients — so if the feature were dropped, steps 2–3 plus the Prowlarr-side half of step 4 would stand alone.

### 1. `deleteTag` on the tags capability
- `src/clients/capabilities.ts`: add `deleteTag(id: string): Promise<void>` to `TagsClient`.
- `src/clients/{sonarr,radarr,lidarr,readarr,whisparr}-client.ts`: implement against the already-generated `v3TagDelete` / `v1TagDelete`, with the `+id` coercion Prowlarr already uses.
- This widens two composite aliases transitively — `ReleaseProfilesApi` (`capabilities.ts:71`) and the `DownloadClientsClient<T> & TagsClient` constructor parameter (`downloadClientBase.ts:65`) — so it also breaks the hand-rolled api mocks in `src/releaseProfiles/releaseProfileBase.test.ts`, `src/releaseProfiles/releaseProfileLidarr.test.ts`, `src/downloadClients/downloadClientBase.test.ts` and `src/prowlarr/*.test.ts`. Use `pnpm typecheck` as the checklist; it is authoritative.

### 2. Shared resolver
- `src/tags/tags.ts`: add `resolveTagNames(tagNames, serverTags, opts?)` returning `{ ids, missing }` — case-insensitive label lookup, numeric passthrough, optional `placeholders: Map<string, number>` (keyed by **lowercased** label) for dry-run id synthesis.
- Numeric entries log a deprecation warning once per run naming the entry (strings are the default and recommended form; removal is a future change).
- Delete `resolveTagNamesToIds` from `src/downloadClients/downloadClientBase.ts:108` and `src/prowlarr/providerResourceSync.ts:149` (the duplicate). No shim: the only external caller is `downloadClientRadarr.test.ts`. The internal callers switch to `resolveTagNames` in the same pass: `downloadClientBase.ts:190` (`collectSharedFieldChanges`), `:209` (`resolveDownloadClientTags` — its "should have been created during batch tag creation" warning becomes unreachable once creation is guaranteed, so drop it and the assertions on it in `downloadClientMedia.test.ts` / `downloadClientProwlarr.test.ts`), `:416`, and `providerResourceSync.ts:278` (`isEqual`, which deliberately mixes missing labels into the diff — `{ ids, missing }` gives that for free), `:338`, `:383`.
- The release-profile resolver is handled in step 3, not here: it is replaced, not deleted.
- The deprecation warning for numeric ids fires once per run per label: the resolver runs per config item, so guard it with a module-level `Set` in `src/tags/tags.ts`.
- Replace all **three** inline exact-match lookups in `src/delayProfiles/delayProfileBase.ts` (`:46`, `:143`, `:174`) — leaving `:143` in place would keep reporting a case-variant label as missing and re-create the duplicate this change exists to remove — plus the inline `find` calls in `src/rootFolder/rootFolder{Lidarr,Readarr}.ts:60-77`.
- Behavior change for the commit message: release profiles, delay profiles and root folders now match labels case-insensitively.

### 3. Shared creation
- `src/tags/tags.ts`: add
  ```ts
  ensureTags(client: TagsClient, serverCache: ServerCache, tagNames: (string | number)[], opts?: { placeholders?: Map<string, number> /* keyed by lowercased label */ }): Promise<{ ids: number[]; created: string[] }>
  ```
  Dedupe case-insensitively, skip labels already on the server, create the rest, push created tags onto `serverCache.tags`, honor `DRY_RUN` (create nothing; synthesize ids only if the caller passed a `placeholders` map), throw one consistent error naming the label on failure. `ids` is in input order; `created` is the labels it actually wrote, so callers can record diff entries.
- Replace the three `createMissingTags` copies (`downloadClientBase.ts:411`, `providerResourceSync.ts:379`, `releaseProfileBase.ts:172`) and the two inline loops (`mediaPipeline.ts:329`, `rootFolder{Lidarr,Readarr}.ts:59`).
- Widen `LidarrRootFolderApi` / `ReadarrRootFolderApi` from `Pick<TagsClient, "createTag">` to `TagsClient`, or `ensureTags` will not typecheck at the root-folder call site.
- **Release profiles: replace the local resolver with `resolveTagNames`, do not delete it.** Both call sites switch — `releaseProfileBase.ts:200` (the placeholder-backed resolve inside `calculateDiff`) and `:175` (inside `createMissingTags`) — and `createMissingTags` itself is replaced by `ensureTags`, keeping the same position in `sync()`: `calculateDiff(configs, serverCache, true)` validates duplicate profiles and indexer names *before* any tag is written (`:236`), then tags are created, then the real re-diff runs. `calculateDiff` resolves twice, so the shared resolver's `placeholders` option earns its keep here.
- **Delay-profile tags keep being created by the media pipeline, not by the diff.** The inline loop at `mediaPipeline.ts:329` becomes `ensureTags(client, serverCache, delayProfilesDiff.missingTags)` in the same `if (delayProfilesDiff.missingTags.length > 0)` branch, preserving the existing log line and error behavior.
- **Prowlarr's provider base keeps its label-in-the-diff dry-run rendering.** It passes no `placeholders`, so in a dry run `missing` stays populated and `isEqual` still names not-yet-created tags by label (`providerResourceSync.ts:279-281`) instead of showing a negative id. Synthetic ids are never pushed to `serverCache.tags`.
- Dry-run behavior change for the commit message: a dry run no longer creates tags for download clients or Lidarr/Readarr root folders. Dry-run reports for release profiles, root folders and download clients may show synthetic negative tag ids.

### 4. Shared deletion, Prowlarr migration
- `src/tags/tags.ts`: add
  ```ts
  deleteUnmanagedTags(client: TagsClient, serverCache: ServerCache, opts: { keep: Iterable<string>; onInUse: "throw" | "skip" }): Promise<TagSyncResult>
  collectTagLabels(...tagLists: ((string | number)[] | undefined)[]): Set<string>
  ```
  The caller owns the `enabled` gate, the keep-set and the policy — same shape as `syncUiConfig` / `syncRemotePaths` / `syncDownloadClientConfig`. `onInUse: "skip"` logs a warning and leaves the tag; every other failure throws for both policies. `collectTagLabels` is the single case-folding collector both keep-set builders use (it must skip numeric entries — `download_clients` tags are `(string | number)[]` and a naive `.toLowerCase()` throws).
- `TagSyncResult` moves to `src/tags/tag.types.ts`.
- `src/prowlarr/tagSync.ts` becomes a thin wrapper: keep `referencedTagNames` (Prowlarr config-schema knowledge stays in `src/prowlarr/`), the `enabled` check, the download-client-failure guard and `onInUse: "throw"`. `syncTags` becomes `ensureTags` plus one diff entry per label in `created`. The Prowlarr client is threaded in from `ProwlarrSyncer` so the wrapper drops `getClient("PROWLARR")` — AGENTS.md:64 forbids a stage resolving its own client. The reload at `prowlarrSyncer.ts:53` is untouched and stays there. Prowlarr behavior is unchanged.
- `src/tags/tags.test.ts` (new) covers the module directly.

### 5. Media instance config block
- `src/types/config.types.ts`: add to `InputConfigArrInstanceSchema`, carrying over the Prowlarr comments:
  ```ts
  // Ensure these tag labels exist on the server (created if missing).
  tags: z.array(z.string()).optional(),
  // Delete server tags not listed in `tags` (and not referenced by managed resources).
  delete_unmanaged_tags: DeleteUnmanagedSchema.optional(),
  ```
  Not marked `@experimental` — this is stable behavior on full-support \*arrs.
- `src/arr/mediaPipeline.ts`:
  - call `ensureTags(client, serverCache, config.tags ?? [])` right after `loadServerTags` (`:166`), before any feature resolves tag ids, recording one diff entry per created label. Call `src/tags/tags.ts` directly — not the Prowlarr wrapper, which would drag `getClient` into the media pipeline;
  - set an explicit `downloadClientsFailed` flag in **both** branches: from `result.failed` (`:372` currently discards the result) and from the catch (`:375-380` swallows every non-`ConfigValidationError`, which is exactly the partially-applied case the guard exists for). Mirrors `prowlarrSyncer.ts:36,43`;
  - call `deleteUnmanagedTags` last, guarded on that flag, with a keep-set from `collectTagLabels` over `tags`, `delete_unmanaged_tags.ignore`, `delay_profiles` (default + additional), `release_profiles`, `root_folders` (object form only — narrow with `typeof f !== "string"`) and `download_clients.data`, and `onInUse: "skip"`. `MergedConfigInstance.release_profiles` is already `InputConfigReleaseProfile[]` (Recyclarr entries are filtered at merge), so no union narrowing is needed there.
  - No reload before the media delete pass: `ensureTags` pushes created tags into the cache as it goes.
  - Diff entries flow into the existing `DiffCollector`; `DiffEntry.resourceType` is a plain string with no formatter switch, so no report plumbing is needed.

### 6. Tests
- `src/tags/tags.test.ts` (new): resolver case-insensitivity, numeric passthrough + once-per-run deprecation warning, placeholder ids keyed by lowercased label, `ensureTags` create / dedupe / dry-run / failure and its `created` return, `collectTagLabels` skipping numeric entries, `deleteUnmanagedTags` keep-set, `onInUse` skip vs throw, non-409 failures still throwing under `skip`, cache updates.
- `src/arr/mediaPipeline.test.ts` (new, no precedent file today): tag sync placement before feature syncs, one diff entry per created label, delete pass last, skip-on-`failed > 0`, and skip when the download-client sync *throws*. Mirrors what `src/arr/prowlarrSyncer.test.ts:43-59` does for Prowlarr.
- `src/config.test.ts`: parse the new media `tags` / `delete_unmanaged_tags` block.
- Update existing suites that assert the old inline behavior: `src/downloadClients/downloadClientBase.test.ts`, `downloadClientMedia.test.ts`, `downloadClientRadarr.test.ts` (its `resolveTagNamesToIds` tests move to `src/tags/tags.test.ts`), `downloadClientProwlarr.test.ts`, `src/prowlarr/tagSync.test.ts`, `providerResourceSync.test.ts`, `applicationSync.test.ts`, `indexerSync.test.ts`, `indexerProxySync.test.ts`, `src/arr/prowlarrSyncer.test.ts` (its `../tags/tags` mock must export the new symbols too), `src/releaseProfiles/releaseProfileBase.test.ts`, `releaseProfileLidarr.test.ts`, `src/delayProfiles/delayProfileBase.test.ts`, `delayProfileLidarr.test.ts`, `src/rootFolder/rootFolderLidarr.test.ts`, `rootFolderReadarr.test.ts`, `src/clients/prowlarr-client.test.ts`.
- e2e (`tests/arr-e2e/`): the block is cross-cutting, so its assertions go in `tests/arr-e2e/pipeline.e2e.test.ts` (one config, every instance) rather than being duplicated into five per-\*arr files: an instance with `tags:` plus a tagged download client, and a `delete_unmanaged_tags` run that keeps a tag referenced by a managed feature and drops an orphan. Update the `Tags` row in `tests/arr-e2e/README.md` and add the fragments to `tests/arr-e2e/config.ts`. The "in-use tag is left alone" case is **not** an e2e assertion — producing a 409 needs a tag held by a resource configarr does not manage (import list / notification), which no client in this repo exposes; it is covered in `src/tags/tags.test.ts` instead. Note that the `nonE2eNames(...)` ignore-list helper (`helpers.ts:307`) keys on `name`; tags have `label`, so the tag e2e needs a label-based equivalent. Prowlarr e2e must keep passing unchanged.

### 7. Docs
- `docs/docs/configuration/config-file.md`: new section for the media-instance `tags:` / `delete_unmanaged_tags:` next to the other media cleanup blocks (`:646`, `:669`), following that file's conventions — version badge in the heading, a `# since vX.Y.Z` comment inside the YAML block, a `Notes:` line, and an explicit per-\*arr applicability note. **Not** labelled experimental: the schema keys carry no `@experimental` marker, so the neighbouring sections' `# (experimental) since vX.Y.Z` phrasing must not be copied.
- `docs/docs/configuration/experimental-support.md`: the Prowlarr section keeps its tag prose but points at the shared `config-file.md` section. It stays per-\*arr organized — no new shared section there, and nothing stable gets labelled experimental.
- `config.yml.template`: the `# Experimental: Prowlarr (tags, applications, ...)` heading needs rewording now that tags are not Prowlarr-only; add a commented media-instance example.
- `AGENTS.md`: update the Pattern B line to say `src/tags/` owns resolution, creation and deletion mechanics for all arrs, with Prowlarr keeping its policy in `src/prowlarr/tagSync.ts`.
- `tests/arr-e2e/README.md`: matrix row (step 6).
- Flip the spec status line to `Status: implemented (YYYY-MM-DD)` when the code lands (AGENTS.md:39).

## Verification

```bash
mise x pnpm@11.25.0 -- build
mise x pnpm@11.25.0 -- test
mise x pnpm@11.25.0 -- lint
mise x pnpm@11.25.0 -- typecheck
```

Plus `mise x pnpm@11.25.0 -- test:e2e:arr` for the e2e change (needs the compose stack up; not runnable in this environment — say so in the PR).

## Risk notes

- **Case-insensitive matching is a user-visible change** for release profiles, delay profiles and root folders: a config that previously created a second, differently-cased tag now reuses the existing one. New failure mode: `release_profiles` entries `tags: [Foo, foo]` previously produced two distinct ids, now collapse to one and trip the existing duplicate-profile validation (`ConfigValidationError`) — in a dry run too, since the validating `calculateDiff` runs before the `DRY_RUN` branch. Mention both in the PR body.
- **Media `delete_unmanaged_tags` deletes real tags.** Same blast radius as Prowlarr (untagging every resource that carried it). Default off, `ignore` supported, and the keep-set covers every tag-capable managed feature. It cannot see tags held by unmanaged resources (import lists, notifications, indexers, auto-tagging), which is why `onInUse: "skip"` exists — otherwise one 409 would discard the whole instance's diff report after every other feature had already been applied.
- **A dry run no longer creates tags** for download clients and Lidarr/Readarr root folders. That is a fix, but users may have learned to rely on the pre-warming.
- **Numeric tag ids are deprecated, not removed.** Labels are the default and recommended form; numeric entries still work and now warn.
