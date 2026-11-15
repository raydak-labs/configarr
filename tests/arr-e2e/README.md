# *arr live e2e tests

Opt-in Vitest suite against real *arr containers. **Not** part of `pnpm test`. Stack lives in `tests/arr-e2e/` (not `examples/full`).

Covers: **Sonarr**, **Radarr**, **Whisparr**, **Readarr**, **Lidarr** (nightly), **Prowlarr**, plus a **Deluge** download client for the secret e2e.

## Local

```bash
cd tests/arr-e2e
PUID=$(id -u) PGID=$(id -g) docker compose up -d
```

Wait until APIs respond (first boot ~30–90s), then from repo root:

```bash
pnpm test:e2e:arr
```

The suite only runs through its own config (`vitest.arr-e2e.config.ts`); `pnpm test` covers `src/**` and never picks it up, so there is no env flag to remember. If no container answers, the run fails immediately telling you to start the stack. Named volumes hold the DBs. Sonarr, Radarr, Readarr, Lidarr and Prowlarr get their API key from `<APP>__AUTH__APIKEY` env vars. Whisparr's eros base ignores those, so its container copies `fixtures/whisparr-config/config.xml` into the volume before starting. `/data/e2e` and `/data/e2e-b` are bind-mounted, so `PUID`/`PGID` must be your own user or *arr refuses the root folders.

## Layout and run order

One file per *arr, each owning its container end to end. `pnpm test:e2e:arr` runs everything in one vitest invocation (~30s locally) through the projects in `vitest.arr-e2e.config.ts`:

- One project per app and version, named as in `docker-compose.yml`: `sonarr-v4`, `sonarr-v5`, `radarr-v5`, `radarr-v6`, `radarr-v7`, `whisparr-v3`, `readarr-v0`, `lidarr-nightly`, `prowlarr-v2`. The Sonarr and Radarr feature files run once per version. Radarr projects assert the connected major (`radarr-v6` skips it when `RADARR_BASE_URL` is overridden).
- `pipeline` — `pipeline.e2e.test.ts`, which drives every default container from one config.yml. It has `sequence.groupOrder: 1`, so it starts after the other projects finish.

All other projects own disjoint containers and run concurrently. `ARR_E2E_SEQUENTIAL=true` runs one file at a time (~230s). Run a subset with `pnpm test:e2e:arr --project <name>` (repeatable), e.g. `--project radarr-v5 --project radarr-v7`. Projects on default containers and `pipeline` wait for every default container, so keep the whole stack up.

Each project's global setup waits for its containers, warms a shared Recyclarr/TRaSH cache in the OS temp dir under a cross-process lock (the only git network access), snapshots it into a per-project run directory, and pins `trashRevision` to the snapshot's commit, so configarr runs never `git pull`. Each file then copies that snapshot, because configarr checks out its revision on every run and two files sharing one clone would race on `.git/index.lock`. The run directory, including every config workspace, is deleted in teardown. configarr runs with an empty `HOME` so the user's git config stays out (simple-git drops `GIT_CONFIG_*`).

Each project's global setup also bundles `src/index.ts` (the Docker image's CLI) and `configarrWorker.ts` with esbuild. The warm-up runs the CLI as a fresh process. Tests run configarr in one long-lived worker per test file (`configarrRunner.ts`): it resets env, config, TRaSH cache, telemetry and the API client before each job, and returns stdout, stderr and the exit code like a process would. Per-run process startup was about 60% of CI time.

Each file cleans its *arr in `beforeAll`, snapshots the server-wide settings it overwrites (UI, media management, naming, default delay profile, quality definitions, download-client config), and restores plus cleans again in `afterAll` — regardless of which test failed.

## Ports / API key

Override with `SONARR_BASE_URL`, `SONARR_API_KEY`, …, `PROWLARR_BASE_URL`, `PROWLARR_API_KEY`. The normal suite tests Sonarr v4 and v5. The `sonarr-v5` project defaults to port `18990` and the test API key; override it independently with `SONARR_V5_BASE_URL` and `SONARR_V5_API_KEY`.

Radarr v5 and v7 run as the `radarr-v5` / `radarr-v7` projects; `radarr-v6` uses the default container.
Override their connections with `RADARR_V5_BASE_URL` / `RADARR_V5_API_KEY`
(and `V7`). v6 is the default container and uses `RADARR_BASE_URL`.
V7 is pinned to `develop-7.0.0.10815-ls275` (Radarr 7.0.0.10815). Refresh the tag, digest, and
the API specification in `generate-api.ts` together. Sonarr v5 is `develop-5.0.0.2941-ls207` (`v5-nightly`). The full Radarr coverage column below
runs on each major, including templates, settings and CRUD/idempotency.

The Radarr versions and the two Sonarr containers use separate config/database volumes. Do not share their volumes or use `docker compose down -v` if the local test databases should be retained.

| App          | URL                    | API key                               |
| ------------ | ---------------------- | ------------------------------------- |
| Sonarr v4    | http://127.0.0.1:18989 | `e2etestapikey0123456789abcdef012`    |
| Sonarr v5    | http://127.0.0.1:18990 | same                                  |
| Radarr v6    | http://127.0.0.1:17878 | same                                  |
| Radarr v5    | http://127.0.0.1:17879 | same                                  |
| Radarr v7    | http://127.0.0.1:17880 | same                                  |
| Whisparr     | http://127.0.0.1:16969 | same                                  |
| Readarr      | http://127.0.0.1:18787 | same                                  |
| Lidarr       | http://127.0.0.1:18686 | same                                  |
| Prowlarr     | http://127.0.0.1:19696 | same                                  |
| Deluge       | http://127.0.0.1:18112 | web UI password `deluge` (secret e2e) |
| Deluge empty | http://127.0.0.1:18113 | empty password (secret e2e)           |
| FlareSolverr | http://127.0.0.1:18191 | — (Prowlarr proxy only)               |

The download-client secret tests seed Deluge clients in Sonarr, so the *arr container must be able to reach `deluge:8112` and `deluge-empty:8112`. Override the host and password with `DELUGE_E2E_HOST` / `DELUGE_E2E_PASSWORD`; the host-side readiness check uses `DELUGE_BASE_URL` (default `http://127.0.0.1:18112`). The empty-password test uses `DELUGE_EMPTY_E2E_HOST` and `DELUGE_EMPTY_BASE_URL` (default `http://127.0.0.1:18113`); its `web.json` fixture is mounted as `web.conf` and sets an empty password.

## File map

| File                       | Role                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `docker-compose.yml`       | Media *arr + Sonarr/Radarr version fixtures + Prowlarr + Deluge + FlareSolverr                                       |
| `fixtures/deluge/web.json` | Empty-password Deluge web config for the empty-secret e2e                                                            |
| `globalSetup.ts`           | Per project: wait for its APIs, warm and snapshot the template repos                                                 |
| `helpers.ts`               | Clients, config workspaces, assertions, cleanup, snapshot/restore                                                    |
| `configarrRunner.ts`       | Bundles configarr; runs it as a process (warm-up) or in the per-file worker (tests)                                  |
| `configarrWorker.ts`       | Worker entry: one configarr run per stdin job, state reset in between                                                |
| `config.ts`                | Only the config fragments that are identical for every *arr                                                          |
| `sonarr.e2e.test.ts`       | All Sonarr features + Recyclarr `WEB-1080p` include                                                                  |
| `radarr.e2e.test.ts`       | All Radarr features + Recyclarr `HD Bluray + WEB` include                                                            |
| `whisparr.e2e.test.ts`     | All Whisparr features                                                                                                |
| `readarr.e2e.test.ts`      | All Readarr features + metadata profiles, object root folders                                                        |
| `lidarr.e2e.test.ts`       | All Lidarr features + metadata profiles, `items[]` delay profiles (#481)                                             |
| `prowlarr.e2e.test.ts`     | Tags, sync profiles, proxies, indexers, applications, download clients                                               |
| `pipeline.e2e.test.ts`     | All six instances in one config.yml, twice, plus the cross-cutting instance `tags:` / `delete_unmanaged_tags:` block |

Per-*arr files are deliberately duplicated instead of generated from a shared factory: the payloads differ per app, and `if (kind === …)` in a test hides which app is actually being asserted. Only *arr-agnostic code is shared (`helpers.ts`, `config.ts`).

## Coverage

Host settings run on Sonarr v5 and Radarr v7; v4/v5/v6 reject the v7/v5-only block before other writes.

Feature × arr × create / update / delete / idempotent (second run Diff Report `(up to date - no changes)` + GET). `C` create, `U` update, `D` delete, `I` idempotent. `—` not applicable.

| Feature                        | Sonarr   | Radarr   | Whisparr | Readarr  | Lidarr   | Prowlarr |
| ------------------------------ | -------- | -------- | -------- | -------- | -------- | -------- |
| Custom formats                 | CUDI     | CUDI     | CUDI     | CUDI     | CUDI     | —        |
| Quality profiles               | CUDI     | CUDI     | CUDI     | CUDI     | CUDI     | —        |
| Quality definitions            | CUI      | CUI      | CUI      | CUI      | CUI      | —        |
| Root folders                   | CDI      | CDI      | CDI      | CUDI     | CUDI     | —        |
| Media settings (MM/naming/UI)  | CUI      | CUI      | CUI      | CUI      | CUI      | —        |
| General auth/TLS settings      | CUI      | CUI      | —        | —        | —        | —        |
| Delay profiles                 | CUDI     | CUDI     | CUDI     | CUDI     | CUDI     | —        |
| Release profiles               | CUDI     | CUDI     | CUDI     | CUDI     | CUDI     | —        |
| Download clients (blackhole)   | CUDI     | CUDI     | CUDI     | CUDI     | CUDI     | CUDI     |
| Existing indexer settings      | UI       | UI       | —        | —        | —        | —        |
| Global indexer config          | CUI      | CUI      | CUI      | CUI      | CUI      | —        |
| Notifications                  | CUDI     | CUDI     | CUDI     | CUDI     | CUDI     | CUDI     |
| DC config / remote paths       | CUI / CD | CUI / CD | CUI / CD | CUI / CD | CUI / CD | —        |
| Metadata profiles              | —        | —        | —        | CUDI     | CUDI     | —        |
| Metadata generation            | UI       | UI       | —        | —        | —        | —        |
| Tags                           | CDI      | CDI      | —        | —        | —        | CDI      |
| Sync profiles                  | —        | —        | —        | —        | —        | CUDI     |
| Applications                   | —        | —        | —        | —        | —        | CUDI     |
| Indexer proxies (FlareSolverr) | —        | —        | —        | —        | —        | CUDI     |
| Indexers                       | —        | —        | —        | —        | —        | CUDI     |
| TRaSH/Recyclarr templates      | C        | C        | —        | —        | —        | —        |

Letters = asserted GET after a configarr write/omit. Root-folder **update** for Sonarr/Radarr/Whisparr is N/A (path identity). Lidarr/Readarr update the folder `name` via YAML. Tags have no update API. Media-arr **CD** is the instance `tags:` / `delete_unmanaged_tags:` block, asserted on Sonarr in `pipeline.e2e.test.ts` and on each Radarr major in `radarr.e2e.test.ts`: it drops a seeded orphan tag while keeping a label listed in `tags` and a label referenced only by a managed delay profile. It is the same schema on all five, so Whisparr, Readarr and Lidarr are not re-asserted. Download clients and indexers stay `enable: false` (configuration only; no live download/search), except the Sonarr, Radarr and Prowlarr Deluge cases that exercise `update_password_on_test_fail` (password-only probe, credential replacement, empty secret) and the Sonarr qBittorrent case that checks an unreachable client keeps its stored secret. Prowlarr indexer fields are matched ignoring case and underscores: `prowlarr.e2e.test.ts` writes `single_file_release_use_filename` on a live schema that spells it that way, then updates it through the camelCase alias. DC **U** is `priority`. The delay-profile mapper is additionally exercised directly per *arr (legacy payload, or `items[]` for Lidarr).

## Rules for new sync features

- Extend every `tests/arr-e2e/<arr>.e2e.test.ts` the feature applies to. Copy the block and adjust the payload; do not add an `if` on the *arr type.
- Prefix managed names `e2e-`. Ignore lists for `delete_unmanaged_*` come from `nonE2eNames(...)`, never from the raw server list. Never `root_folders: []` — keep the pre-existing folders in the YAML.
- Assert GET + second-run diff up to date. Do not regex stdout for `Created`/`Updated`/`Deleted`.
- Poll with `waitUntil` where the *arr applies a write asynchronously (quality definitions, remote paths).
- Snapshot anything server-wide you overwrite and restore it in `afterAll`.
- Construct clients with `new SonarrClient(...)` (etc.). Do not call `configureApi`.
- See this README as the coverage source of truth.

## Known gaps

- **No qBittorrent / usenet backend.** Download-client e2e uses TorrentBlackhole with `enable: false`. Disabled clients are saved with `forceSave` so *arr does not connection-test a downloader.
- **Indexers** are created `enable: false` (config only). FlareSolverr is in compose for the Prowlarr proxy, same image as `examples/full`.
- **TRaSH/Recyclarr templates** are a Sonarr/Radarr create-only smoke (`WEB-1080p` / `HD Bluray + WEB`). No CUDI.
- **Whisparr 3.5.0 rejects its own default naming config** (`movieFolderFormat` / `sceneFolderFormat` must start with a literal subfolder, `sceneImportFolderFormat` must not be empty). A `PUT /config/naming` that carries those defaults 400s, so `media_naming_api` on Whisparr needs valid folder formats in the YAML. `restoreMediaBaseline` therefore skips writes that would not change anything.
- **Prowlarr applications** point at the Sonarr and Radarr containers. Prowlarr may create indexers there; the media-manager tests only update their own named fixtures.
- **In-use tags are never asserted against a live server.** A `delete_unmanaged_tags` run that hits a 409 needs a tag held by a resource configarr does not manage (import list, indexer), and no client in this repo exposes those endpoints. The `onInUse: "skip"` and `onInUse: "throw"` policies are covered in `src/tags/tags.test.ts` instead.
