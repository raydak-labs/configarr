# Arr live e2e (GitHub #526)

Status: implemented (2026-09-16)

Plan: [`.ai/docs/plans/2026-09-16-arr-e2e.md`](../plans/2026-09-16-arr-e2e.md)

Single record for the whole change. Three same-day specs (config-only downloads, TRaSH template smoke, per-*arr files) were folded in here before the work merged, so decisions 5, 6, 7 and 10 below already carry their outcome rather than the position they replaced.

## Goal

Live Docker integration tests for every *arr (Sonarr, Radarr, Whisparr, Readarr, Lidarr, Prowlarr): create / update / delete + second-run idempotency, with cleanup so the stack can be reused. Easy local run; optional CI via existing `workflow_dispatch`.

## Decisions

| #   | Decision                                                                                                                                                                                                                              | Rejected                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | Stack is `tests/arr-e2e` compose (five media *arr + Prowlarr + FlareSolverr, `/data/e2e` and `/data/e2e-b` bind-mounted).                                                                                                             | `examples/full` as the e2e harness.                                                        |
| 2   | Prowlarr on the same compose (`lscr.io/linuxserver/prowlarr:2.5.2`, host `19696`). Default network so it can reach `http://sonarr:8989` / `http://radarr:7878`.                                                                       | Separate compose file; extra sidecar containers.                                           |
| 3   | Named resources prefix `e2e-`. `delete_unmanaged_*` ignore lists come from `nonE2eNames(...)`, never the raw server list. Never `root_folders: []` — pre-existing folders stay in the YAML.                                           | Deleting unmanaged without ignore; wiping all root folders.                                |
| 4   | Success = process exit + per-instance Diff Report `(up to date - no changes)` on run 2 + API GET (strip `id` / timestamps / `added`). Poll with `waitUntil` where the *arr applies the write asynchronously.                          | Regex stdout for `\bCreated\b` / `Updated` / `Deleted` (false positive: `Created CFs: 0`). |
| 5   | Config-only: download clients and indexers are created `enable: false` and persisted with `forceSave`, so no *arr connection test runs. TorrentBlackhole covers download-client CRUD; FlareSolverr covers Prowlarr's indexer proxies. | qBittorrent or a dummy Newznab indexer; treating pipeline exit 0 as proof.                 |
| 6   | Sonarr and Radarr additionally `include:` the documented Recyclarr templates (`sonarr-v4-*-web-1080p`, `radarr-*-hd-bluray-web`) as a create-only smoke: pipeline success, no `ERROR [` in the log, GET of the named profile.         | No templates at all; full CUDI coverage for templates.                                     |
| 7   | One test file per *arr, each holding its own literal payloads and owning its container. Cross-*arr behaviour lives with the owner (Prowlarr's application sync toward Sonarr/Radarr is in `prowlarr.e2e.test.ts`).                    | A shared suite factory parameterised by `MediaArrType`; `if (kind === …)` inside tests.    |
| 8   | Per-*arr files run in parallel; `pipeline.e2e.test.ts` (all six instances in one config.yml) runs alone afterwards. `globalSetup` waits for the APIs once and warms a template Recyclarr/TRaSH clone that each file copies.           | One serial pass (`fileParallelism: false`); a shared clone (races on `.git/index.lock`).   |
| 9   | Each file cleans its *arr in `beforeAll`, snapshots the server-wide settings a run overwrites, and restores + cleans in `afterAll`. Restores skip writes that change nothing.                                                         | Cleanup per feature block; unconditional write-back.                                       |
| 10  | Container auth comes from `<APP>__AUTH__*` env vars. Whisparr's base ignores them, so its container copies a fixture `config.xml` into the volume in its entrypoint.                                                                  | Bind-mounting `config.xml` (the app rewrites it, then 401s); a seed sidecar for all six.   |
| 11  | Tests construct `new SonarrClient(baseUrl, apiKey)` (etc.). `getClient()` is a process singleton.                                                                                                                                     | `configureApi` from e2e helpers.                                                           |
| 12  | The suite is gated by its own Vitest config, not an env flag: `pnpm test` only includes `src/**`, and a run with no reachable container fails immediately with the compose command.                                                   | `ARR_E2E=1` guard plus `describe.runIf`, which silently passed when the stack was down.    |
| 13  | Coverage lives in `tests/arr-e2e/README.md`. New sync features need matching e2e.                                                                                                                                                     | Ad-hoc per-PR smoke only.                                                                  |

## Product bugs this surfaced

- *arr connection-tests a download client or indexer on save even when `enable: false`, so configarr could not persist a disabled provider. Create/update now send `forceSave` when `enable` is false.
- Prowlarr returns 409/500 when an unmanaged tag, sync profile or indexer proxy is deleted while something still references it. Those deletes now run after apps, indexers and download clients, and the tag cleanup is skipped when a download-client change failed.
- Deferred unmanaged deletes filtered against the raw config instead of the validated set, so an invalid entry counted as managed.

## Constraints carried into the tests

- Lidarr delay YAML uses `items` (UsenetDownloadProtocol / TorrentDownloadProtocol); other *arrs use enableUsenet/enableTorrent. Never mix.
- Lidarr/Readarr root folders are objects (`name`, `metadata_profile`, `quality_profile`) in the same YAML as QP + metadata (pipeline order QP → metadata → root). Their metadata-profile test runs before their root-folder test, because a root folder referencing a profile blocks deleting it.
- Two bind mounts (`/data/e2e`, `/data/e2e-b`) so configarr can delete a folder by omitting it from YAML without an empty array. CI must run the containers as the runner user or *arr rejects those paths.
- Whisparr QP uses leaf `WEBDL-1080p` only (no VR). Readarr QD asserts min/max only (no preferredSize).
- Whisparr 3.5.0 rejects its own default naming config, so any `PUT /config/naming` carrying those defaults 400s.
