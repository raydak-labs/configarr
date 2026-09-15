# Prowlarr support

Status: implemented (PR #520, issue #519). Experimental. Sync profiles added later, see below.

## Why

Prowlarr manages indexers for the \*arr stack and usually runs alongside the apps configarr
already supports, but it needed a separate tool to configure. This adds sync for its tags, sync
profiles, applications, indexers, indexer proxies and download clients, plus an optional trigger
that makes Prowlarr push its indexers to the connected apps.

Prowlarr is not a media manager. It has no quality profiles, custom formats, naming, root
folders, metadata profiles or delay profiles, so it gets its own config block and its own
minimal pipeline instead of being fed through the media `pipeline()`.

## Shape

`ProwlarrClient` (`src/clients/prowlarr-client.ts`) implements `IArrClient` against the
generated v1 API. Every media-manager member throws "not supported for Prowlarr", following the
existing `SonarrClient.updateRootFolder` precedent. The throwing stubs also cover the extras the
media clients share (UI config, download client config, remote paths) so the structural union in
`getSpecificClient()` still holds. `syncAppIndexers()` posts the `ApplicationIndexerSync`
command, whose name is a runtime string absent from the OpenAPI spec.

Prowlarr's `DownloadClientResource` is not added to the shared union because it lacks
`removeCompleted/FailedDownloads`. The client casts its download client returns to the shared
type, which lets the arr-agnostic `syncDownloadClients` run unchanged. Prowlarr SQLite still
requires `categories` on write (OpenAPI marks it optional; schema default is `[]`). `resolveConfig`
copies `categories` from the server resource, else the schema template, else `[]`, only for
`PROWLARR`.

Applications, indexers and indexer proxies are all provider resources: a named thing backed by
an implementation schema, with a `fields[]` array and numeric `tags[]`. They share
`ProviderResourceSync` (`src/prowlarr/providerResourceSync.ts`), which owns config validation,
schema template lookup, field merging (accepting snake_case keys), tag resolution, diffing,
`delete_unmanaged`, dry run and execution. Each subclass supplies its client calls, its template
lookup, its identity key, a list of extra top-level props, and an optional `loadContext()`:

| Subclass           | Identity                  | Template source | Extras                               |
| ------------------ | ------------------------- | --------------- | ------------------------------------ |
| `ApplicationSync`  | `name` + `implementation` | `type`          | `syncLevel`                          |
| `IndexerSync`      | `name`                    | `definition`    | `enable`, `priority`, `appProfileId` |
| `IndexerProxySync` | `name` + `implementation` | `type`          | none                                 |

Sync profiles are not provider resources. They have no implementation schema, no `fields[]` and
no tags, just a name and four settings, so `syncSyncProfiles` (`src/prowlarr/syncProfileSync.ts`)
is a plain function in the shape of `syncTags` rather than another `ProviderResourceSync`
subclass. Prowlarr's UI calls them Sync Profiles and its API calls them app profiles; the config
uses the UI name.

`syncProwlarrProviders` runs the sections in dependency order: tags, sync profiles, indexer
proxies, indexers, applications. Tags and profiles come first so the rest can reference them by
name.

Sync profiles are also handed to `IndexerSync` through its constructor, as the list of profiles
that will exist after this run. Refetching would be enough for a real run, since the profiles are
already on the server by then, but a dry run creates nothing, so an indexer pointed at a new
profile would fail to resolve it in exactly the run a user does to preview the change.

`prowlarrPipeline` in `src/index.ts` checks system status, loads server tags, runs the providers,
then the shared download client syncer, and returns an `InstanceDiffReport`.

## Behavioural rules

An omitted `tags` key means "not managed". The diff skips the tag comparison and the payload
re-sends the server's existing ids, so changing an unrelated field never wipes tags added in the
Prowlarr UI. An explicit `tags: []` does clear them.

The server returns `********` for `password` and `apikey` fields. That counts as unchanged when
the config supplies a non-empty value, so secrets are not rewritten on every run.

An indexer's `sync_profile` must name a profile that exists on the server or is listed under
`sync_profiles`. An unknown name fails and lists what is available, because silently picking
another profile would bind the indexer to the wrong sync rules. Without `sync_profile`, an update
keeps the existing profile and a create takes the first one on the server. A server with no
profiles at all fails rather than guessing id 1. `app_profile` was the original name for this key
and is still accepted, since it shipped in 1.31.0.

Sync profile names are matched case-insensitively. Indexers already resolved their profile
reference that way, so matching exactly in the profile sync would let a config entry named
`standard` create a second profile alongside `Standard` that an indexer reference could not then
tell apart.

A profile property the config leaves out keeps its value on the server, and takes Prowlarr's own
default only when the profile is created. Omitting `minimum_seeders` therefore does not reset a
value set in the UI, which matches how an omitted `tags` key behaves on the provider resources.

In a dry run, a profile that would be created has no id yet. An indexer referencing it resolves
to undefined, which drops `appProfileId` from that indexer's comparison rather than inventing an
id and reporting a change that is not real.

Names are capped at 100 characters and duplicate identity keys within a section are rejected.

## Error model

Failures in the core Prowlarr resources are fatal for the instance, matching how the media
pipeline treats quality profiles. The message is logged, then thrown, so `runProwlarr` counts
the instance as failed and `STOP_ON_ERROR` works. That covers tag create and delete, sync profile
create, update and delete, any provider create, update or delete, a failed profile fetch, and a
rejected
`ApplicationIndexerSync`. The last one matters because the user opted in with
`sync_indexers: true`, so reporting success would be misleading. Nothing is caught between
sections either, so a broken tag sync cannot leave a half-configured indexer behind.

Two things stay non-fatal. Validation of a single config entry logs and skips that entry while
the rest of the section syncs, matching the shared download client behaviour. Download clients
keep the media pipeline's catch-log-continue for parity with the other \*arrs.

## Risk

`delete_unmanaged` defaults off and is more dangerous here than on a media manager. Deleting
unmanaged applications unlinks the arr stack and deleting indexers removes them from every
connected app. Deleting a sync profile fails outright while an indexer still uses it, and
Prowlarr requires at least one profile to exist, so a config that lists none while enabling
`delete_unmanaged` cannot succeed. The docs carry an explicit warning.

## Out of scope

Notifications, DNS and host config, TRaSH or recyclarr templates, per-arr telemetry counters, and
an `arr-e2e` compose service. Applications cannot carry a sync profile: `ApplicationResource` has
no such field in the v1 API, only the `syncLevel` that is already supported.

Tag handling is duplicated across the media syncers and this one, with drift in case sensitivity
and creation semantics. Unifying it touches shipped media paths, so it belongs in its own change.
