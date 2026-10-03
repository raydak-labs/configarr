# Unified tag handling — design

Status: implemented (2026-09-30)
Issue: [#524](https://github.com/raydak-labs/configarr/issues/524) · Origin: review thread on PR #520

## Problem

Tag resolution and creation was duplicated in six places with differing matching, logging, dry-run
and error behavior. `downloadClientBase` and `prowlarr/providerResourceSync` held byte-identical
copies. Deletion existed only for Prowlarr.

## Decisions

1. **One module, Pattern B.** `src/tags/` owns tags for all arrs: client-injected functions, no
   `getClient(arrType)` inside, no per-_arr_ classes. Per-pipeline differences are parameters.
2. **Case-insensitive matching everywhere.** Release profiles, delay profiles and root folders
   matched exactly, so `tags: [Foo]` against server tag `foo` created a duplicate.
3. **Labels are the default; numeric ids deprecated.** Still supported (they pass through as raw
   ids) but log a once-per-run warning. The instance-level `tags:` block is `z.array(z.string())`.
4. **Promote Prowlarr's `tags:` / `delete_unmanaged_tags:` to media \*arrs.** `tags:` is
   deliberately redundant — every managed feature already creates the tags it references.
   `delete_unmanaged_tags:` is the genuinely new half.
5. **In-use policy differs per pipeline.** Prowlarr manages every tag-bearing resource, so a 409
   fails the instance. A media \*arr also has import lists, notifications and indexers that
   configarr does not manage, so a 409 is expected: skip with a warning. Otherwise an unmanaged
   resource would discard an instance whose other features had already been applied.
6. **`deleteTag` added to `TagsClient`.** All six generated APIs already expose the endpoint; only
   Prowlarr had wrapped it. This widens `ReleaseProfilesApi` and the download-client api type.
7. **Dry run creates nothing.** It previously created tags for download clients and Lidarr/Readarr
   root folders. Synthetic negative ids are opt-in per caller; Prowlarr's provider base keeps
   naming not-yet-created tags by label instead.

## Module

`src/tags/tags.ts` exports six functions; everything else is private.

| Export                                                   | Purpose                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| `loadServerTags(client)`                                 | read tags into `ServerCache`                                        |
| `resolveTagNames(names, serverTags, opts?)`              | → `{ ids, missing }`, case-insensitive, opt-in dry-run placeholders |
| `buildTagPlaceholders(names, serverTags)`                | synthetic ids keyed by lowercased label                             |
| `ensureTags(client, serverCache, names, opts?)`          | create missing labels → `{ ids, created, missing }`                 |
| `syncInstanceTags(client, serverCache, labels)`          | ensure + report one diff entry per created label                    |
| `deleteUnmanagedInstanceTags(client, serverCache, opts)` | prune outside the keep-set                                          |

`deleteUnmanagedInstanceTags` takes `deleteConfig`, `instanceLabels`, `referencedTagLists` and
`onInUse`. `instanceLabels` is always kept — it is what `syncInstanceTags` just ensured exists, so
pruning it would make each run create a tag and then delete it.

A prune that fails mid-way throws `TagDeletionError` carrying the deletions that already
succeeded, so a caller that continues still reports them.

## Invariants

- **Release profiles resolve before they create** — `calculateDiff` validates duplicate profiles
  and indexer names before any tag is written, and resolves twice (placeholders, then for real).
- **Deprecation warnings fire once per run per label** — the resolver runs per config item, so a
  module-level `Set` guards it.
- **Synthetic ids never reach the server or the cache** — they exist only inside one resolve call.

## Placement

Media: `syncInstanceTags` right after `loadServerTags`; prune last, guarded on the download-client
sync's failure count (root-folder failures throw and abort before any prune).

Prowlarr: same two stage functions, called from `syncProwlarrProviders` and `ProwlarrSyncer`, with
its own `referencedTagLists` and `onInUse: "throw"`. The client is threaded in rather than
resolved; the pre-prune tag reload stays in `prowlarrSyncer.ts`.

## Templates

A template may contribute `tags` labels and the whole `delete_unmanaged_tags` block. Both keys are
opt-in wherever they are set, the same authority `delete_unmanaged_metadata_profiles` gives a template:
a Recyclarr, URL or local template that sets `enabled: true` turns tag pruning on for the instance
that includes it, so a template author - or whoever hosts the file it is fetched from - decides that
alongside you. Ignore lists union across templates and the instance. Both keys must be carried by
`mergeConfigsAndTemplates` on the template _and_ the instance side, plus `MappedTemplates` — adding
the Zod key alone leaves the feature silently inert for any config file or template.

## Out of scope

Tag CRUD beyond ensure/prune, a server-side "what holds this tag" sweep, removing numeric ids,
and tag fields on custom formats or quality profiles.

## Revisions

An earlier draft kept `src/prowlarr/tagSync.ts` as a policy wrapper and split the stage into a
second module. Both were reversed during review: the wrapper duplicated the stage it delegated to,
and splitting one feature across two files invited exactly that drift. Its Prowlarr keep-set now
lives in the two syncers that own that config.
