# Tags: one feature folder, stage functions in the pipeline — design

Status: implemented (2026-09-30)
Supersedes: decision 7 of [`.ai/docs/specs/2026-09-30-unified-tags-design.md`](./2026-09-30-unified-tags-design.md) (and the pipeline-placement section that followed from it)
Plan: [`.ai/docs/plans/2026-09-30-unified-tags.md`](../plans/2026-09-30-unified-tags.md)

## What changed and why

The unified-tags design left `src/prowlarr/tagSync.ts` in place as a "thin Prowlarr policy
wrapper" holding `referencedTagNames` and the `onInUse: "throw"` choice. That decision was made
before the shape of the other features was compared directly, and it does not hold up:

- **It duplicated the general stage.** `syncTags` re-implemented "ensure the configured labels,
  then record a diff entry per label with dry-run compensation" — the same two steps the media
  pipeline did inline. Two implementations of one rule, written with different variable names.
- **It was redundant with `EnsureTagsResult.missing`.** The wrapper resolved the labels a second
  time purely to build its dry-run report, even though `ensureTags` already returns them.
- **The file/no-file split was arbitrary.** Prowlarr got a named module while the media pipeline
  got inline code for the same stage, with no principle behind the difference — exactly the
  arrangement that let the two drift.

## Decision

`src/tags/` is the whole feature, shaped like every other feature in the repo
(`uiConfigs/uiConfigSyncer.ts`, `remotePaths/remotePathSyncer.ts`,
`downloadClientConfig/downloadClientConfigSyncer.ts`): a mechanics module plus a syncer module
of stage functions that the pipeline calls.

- `src/tags/tags.ts` — mechanics, no pipeline knowledge: `loadServerTags`, `resolveTagNames`,
  `ensureTags`, `deleteUnmanagedTags`, `collectTagLabels`, `collectTagIds`,
  `buildTagPlaceholders`.
- `src/tags/tagSync.ts` — the stage, called by both pipelines:
  - `syncInstanceTags(client, serverCache, labels)` — ensure the instance `tags` labels, report
    one create entry each, dry-run aware.
  - `deleteUnmanagedInstanceTags(client, serverCache, { deleteConfig, referencedTagLists, onInUse })`
    — no-op unless enabled; prunes everything outside `deleteConfig.ignore` + the supplied
    keep-set, and picks the in-use policy from `onInUse`.
- `src/prowlarr/tagSync.ts` is **deleted**. `syncProwlarrProviders` and `ProwlarrSyncer` call the
  shared stage directly and pass their own `referencedTagLists` (applications, indexers,
  indexer proxies, download clients) and `onInUse: "throw"`.

Per-pipeline differences are now **parameters**, not a separate module. That is the same
specialization pattern as `rootFolderBase.ts` → `LidarrRootFolderSync` / `ReadarrRootFolderSync`,
where the base owns the general logic and the per-arr classes supply what differs.

## Consequences

- Prowlarr's keep-set knowledge moved to the two syncers that own that config, which is where the
  rest of its per-resource wiring already lives.
- `TagSyncResult` and the stage types stay in `src/tags/tag.types.ts`.
- `src/prowlarr/tagSync.test.ts` became `src/tags/tagSync.test.ts`, rewritten against the new
  signature. The Prowlarr-specific keep-set is covered by `src/arr/prowlarrSyncer.test.ts`.
- AGENTS.md's Pattern B bullet was updated to describe the two-module shape, since the previous
  wording pointed at a file that no longer exists.

Behavior is unchanged: the same labels are ensured and the same tags pruned, per pipeline.
